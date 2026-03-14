import Foundation

/// Handles all communication with the AgenticDT backend proxy for chat completions.
/// The backend URL is resolved from AppConfig (injected per build scheme via Xcode build settings).
/// AWS credentials NEVER appear in this file or any other client-side code.
@MainActor
class OpenAIService: ObservableObject {

    // MARK: - Types

    struct Message: Codable, Sendable {
        let role: String
        let content: String
    }

    enum OpenAIError: LocalizedError {
        case notConfigured
        case httpError(Int)
        case parseError
        case networkError(Error)

        var errorDescription: String? {
            switch self {
            case .notConfigured:
                return "Backend not configured. Please contact your administrator."
            case .httpError(let code):
                return "Backend returned HTTP \(code). Please try again."
            case .parseError:
                return "Could not parse the response from the server."
            case .networkError(let err):
                return "Network error: \(err.localizedDescription)"
            }
        }
    }

    // MARK: - Constants

    private static let keychainKey = "backend_configured"

    // MARK: - Published state

    @Published var hasKey: Bool = false
    @Published var maskedKey: String = "Not configured"

    // MARK: - Init

    init() {
        refreshBackendState()
    }

    // MARK: - Backend configuration management (Keychain-backed)

    func markBackendConfigured() {
        KeychainHelper.save("configured", for: Self.keychainKey)
        refreshBackendState()
    }

    func clearBackendConfig() {
        KeychainHelper.delete(for: Self.keychainKey)
        refreshBackendState()
    }

    private func refreshBackendState() {
        if let value = KeychainHelper.load(for: Self.keychainKey), !value.isEmpty {
            hasKey = true
            maskedKey = "Connected to \(AppConfig.backendURL)"
        } else {
            hasKey = false
            maskedKey = "Not configured"
        }
    }

    // MARK: - API call

    /// Send a chat message to the backend proxy.
    /// - Parameters:
    ///   - messages: Conversation history
    ///   - systemPrompt: Optional system instruction for the model
    func sendMessages(_ messages: [Message], systemPrompt: String = "") async throws -> String {
        guard hasKey else { throw OpenAIError.notConfigured }

        guard let url = URL(string: AppConfig.chatEndpoint) else {
            throw OpenAIError.parseError
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let body: [String: Any] = [
            "messages":    messages.map { ["role": $0.role, "content": $0.content] },
            "systemPrompt": systemPrompt,
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw OpenAIError.networkError(error)
        }

        guard let http = response as? HTTPURLResponse else { throw OpenAIError.parseError }
        guard http.statusCode == 200 else { throw OpenAIError.httpError(http.statusCode) }

        // Try the new simple format { "reply": "..." } first, then legacy OpenAI format
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let reply = json["reply"] as? String { return reply }
            if let choices = json["choices"] as? [[String: Any]],
               let msg = choices.first?["message"] as? [String: Any],
               let content = msg["content"] as? String {
                return content
            }
        }
        throw OpenAIError.parseError
    }
}
