import Foundation

// MARK: - Data Models

struct PipelineItem: Identifiable, Decodable {
    let id: String
    let name: String
    let type: String          // "glue" | "stepfunction" | "eventbridge"
    let status: String
    let lastRun: String?
    let duration: String?
    let description: String?
    let owner: String?
    let arn: String?
    let schedule: String?
}

struct PipelinesResponse: Decodable {
    let gluePipelines:   [PipelineItem]?
    let sfPipelines:     [PipelineItem]?
    let ebPipelines:     [PipelineItem]?
}

struct DagNode: Identifiable, Decodable {
    var id: String { name }
    let name: String
    let type: String
    let next: String?
    let isEnd: Bool?
}

struct ExecutionSummary: Identifiable, Decodable {
    var id: String { name + (startDate ?? "") }
    let name: String
    let status: String
    let startDate: String?
    let stopDate: String?
    let error: String?
}

struct DagResponse: Decodable {
    let name: String
    let nodes: [DagNode]
    let recentExecutions: [ExecutionSummary]?
}

struct HealLogEntry: Identifiable, Decodable {
    var id: String { ts + msg }
    let ts: String
    let msg: String
}

struct HealResponse: Decodable {
    let logs: [HealLogEntry]
    let healedCount: Int?
    let failedCount: Int?
}

// MARK: - PipelineService

/// Communicates with the AgenticDT backend for all pipeline and self-healing operations.
/// Uses AppConfig.backendURL — resolved per Xcode build scheme, never hardcoded.
/// No AWS credentials are stored here; the backend handles all AWS calls.
@MainActor
class PipelineService: ObservableObject {

    // MARK: - Published state

    @Published var allPipelines: [PipelineItem] = []
    @Published var selectedDag:  DagResponse?
    @Published var healingLog:   [HealLogEntry] = []

    @Published var isLoadingPipelines = false
    @Published var isLoadingDag       = false
    @Published var isHealing          = false
    @Published var healingDone        = false

    @Published var pipelinesError: String?
    @Published var awsConnected:   Bool?       // nil = not yet checked

    // MARK: - Fetch all pipelines

    func fetchPipelines() async {
        isLoadingPipelines = true
        pipelinesError     = nil

        guard let url = URL(string: AppConfig.pipelinesEndpoint) else {
            pipelinesError = "Invalid backend URL: \(AppConfig.pipelinesEndpoint)"
            isLoadingPipelines = false
            return
        }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)

            guard let http = response as? HTTPURLResponse else {
                pipelinesError = "Unexpected response from server"
                isLoadingPipelines = false
                return
            }

            if http.statusCode == 503 {
                // AWS not configured
                if let body = try? JSONDecoder().decode([String: String].self, from: data) {
                    pipelinesError = body["hint"] ?? body["error"] ?? "AWS not configured"
                } else {
                    pipelinesError = "AWS credentials not configured on the backend"
                }
                awsConnected = false
                isLoadingPipelines = false
                return
            }

            guard http.statusCode == 200 else {
                pipelinesError = "Server error (\(http.statusCode))"
                isLoadingPipelines = false
                return
            }

            let decoded = try JSONDecoder().decode(PipelinesResponse.self, from: data)
            var combined: [PipelineItem] = []
            combined += decoded.gluePipelines   ?? []
            combined += decoded.sfPipelines     ?? []
            combined += decoded.ebPipelines     ?? []
            allPipelines = combined
            awsConnected = true

        } catch {
            pipelinesError = "Cannot reach backend at \(AppConfig.backendURL) — is it running?\n\(error.localizedDescription)"
            awsConnected = false
        }

        isLoadingPipelines = false
    }

    // MARK: - Fetch DAG for a pipeline

    func fetchDag(for pipeline: PipelineItem) async {
        isLoadingDag = true
        selectedDag  = nil

        let encodedId = pipeline.id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? pipeline.id
        let urlString = AppConfig.dagEndpoint(type: pipeline.type, id: encodedId)

        guard let url = URL(string: urlString) else {
            isLoadingDag = false
            return
        }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                selectedDag = try JSONDecoder().decode(DagResponse.self, from: data)
            }
        } catch { /* silently ignore */ }

        isLoadingDag = false
    }

    // MARK: - Trigger a pipeline run

    func triggerRun(for pipeline: PipelineItem) async {
        guard pipeline.type == "glue" || pipeline.type == "stepfunction" else { return }

        var urlString: String
        var body: [String: Any] = [:]

        if pipeline.type == "glue" {
            let encoded = pipeline.name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? pipeline.name
            urlString = AppConfig.glueRunEndpoint(jobName: encoded)
        } else {
            urlString = "\(AppConfig.backendURL)/api/pipelines/sf/run"
            body = ["stateMachineArn": pipeline.arn ?? ""]
        }

        guard let url = URL(string: urlString) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !body.isEmpty {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }

        _ = try? await URLSession.shared.data(for: request)

        // Refresh pipeline list after 2s to pick up new status
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        await fetchPipelines()
    }

    // MARK: - Trigger self-healing agent

    func triggerHealing() async {
        isHealing   = true
        healingDone = false
        healingLog  = [HealLogEntry(ts: ISO8601DateFormatter().string(from: Date()),
                                    msg: "🔗 Connecting to Self-Healing Agent...")]

        guard let url = URL(string: AppConfig.healEndpoint) else {
            healingLog.append(HealLogEntry(ts: ISO8601DateFormatter().string(from: Date()),
                                           msg: "❌ Invalid endpoint URL"))
            isHealing   = false
            healingDone = true
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 120  // healing can take a while

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            if let http = response as? HTTPURLResponse, http.statusCode == 503 {
                healingLog.append(HealLogEntry(
                    ts: ISO8601DateFormatter().string(from: Date()),
                    msg: "❌ AWS not configured on backend — add credentials to backend/.env"
                ))
            } else {
                let decoded = try JSONDecoder().decode(HealResponse.self, from: data)
                healingLog = decoded.logs
            }

            // Refresh after healing
            await fetchPipelines()

        } catch {
            healingLog.append(HealLogEntry(
                ts: ISO8601DateFormatter().string(from: Date()),
                msg: "❌ Network error: \(error.localizedDescription)"
            ))
        }

        isHealing   = false
        healingDone = true
    }

    // MARK: - Helpers

    func statusColor(_ status: String) -> String {
        switch status.uppercased() {
        case "RUNNING", "ACTIVE", "ENABLED":  return "blue"
        case "SUCCEEDED", "COMPLETED":         return "green"
        case "FAILED", "ERROR":                return "red"
        case "STOPPED", "DISABLED":            return "gray"
        default:                               return "yellow"
        }
    }
}
