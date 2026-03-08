import Foundation

/// Handles all communication with the OpenAI Chat Completions API.
/// The API key is stored exclusively in the Keychain — never in source code,
/// UserDefaults, or any plaintext store.
@MainActor
class OpenAIService: ObservableObject {

    // MARK: - Types

    struct Message: Codable, Sendable {
        let role: String
        let content: String
    }

    enum OpenAIError: LocalizedError {
        case noKey
        case httpError(Int)
        case parseError
        case networkError(Error)

        var errorDescription: String? {
            switch self {
            case .noKey:
                return "No API key set. Tap the gear icon to add your OpenAI key."
            case .httpError(let code):
                return "OpenAI returned HTTP \(code). Check your key and quota."
            case .parseError:
                return "Could not parse the OpenAI response."
            case .networkError(let err):
                return "Network error: \(err.localizedDescription)"
            }
        }
    }

    // MARK: - Private constants

    private static let keychainKey = "openai_api_key"
    private static let endpoint = URL(string: "https://api.openai.com/v1/chat/completions")!

    // MARK: - Published state

    @Published var hasKey: Bool = false
    @Published var maskedKey: String = "Not set"

    // MARK: - Init

    init() {
        refreshKeyState()
    }

    // MARK: - Key management (Keychain-backed)

    func saveKey(_ raw: String) {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        KeychainHelper.save(trimmed, for: Self.keychainKey)
        refreshKeyState()
    }

    func clearKey() {
        KeychainHelper.delete(for: Self.keychainKey)
        refreshKeyState()
    }

    private func refreshKeyState() {
        if let key = KeychainHelper.load(for: Self.keychainKey), !key.isEmpty {
            hasKey = true
            maskedKey = maskKey(key)
        } else {
            hasKey = false
            maskedKey = "Not set"
        }
    }

    private func maskKey(_ key: String) -> String {
        guard key.count > 10 else { return String(repeating: "•", count: key.count) }
        return String(key.prefix(7)) + "••••••••" + String(key.suffix(4))
    }

    // MARK: - API call

    func sendMessages(_ messages: [Message]) async throws -> String {
        guard let key = KeychainHelper.load(for: Self.keychainKey), !key.isEmpty else {
            throw OpenAIError.noKey
        }

        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "POST"
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let body: [String: Any] = [
            "model": "gpt-4o",
            "messages": messages.map { ["role": $0.role, "content": $0.content] },
            "temperature": 0.7,
            "max_tokens": 1024
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw OpenAIError.networkError(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw OpenAIError.parseError
        }
        guard http.statusCode == 200 else {
            throw OpenAIError.httpError(http.statusCode)
        }

        guard
            let json       = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let choices    = json["choices"] as? [[String: Any]],
            let first      = choices.first,
            let message    = first["message"] as? [String: Any],
            let content    = message["content"] as? String
        else {
            throw OpenAIError.parseError
        }

        return content
    }
}
