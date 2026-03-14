import Foundation

/// Centralised configuration for AgenticDT.
///
/// Backend URL resolution order:
///   1. Info.plist  BackendBaseURL  (set per Xcode build scheme via BACKEND_BASE_URL build setting)
///   2. Hardcoded fallback → localhost (development only)
///
/// How to configure per environment in Xcode:
///   • Open project → select target → Build Settings → + (Add User-Defined Setting)
///   • Key:   BACKEND_BASE_URL
///   • Debug: http://localhost:3001          (simulator)
///             http://192.168.x.x:3001        (physical device — your Mac's LAN IP)
///   • Release / Archive: https://api.agenticdt.com   (your deployed backend)
///
/// Then in Info.plist add:
///   <key>BackendBaseURL</key>
///   <string>$(BACKEND_BASE_URL)</string>
///
/// AWS credentials NEVER appear here — they live only on the backend server.
enum AppConfig {

    // MARK: - Backend URL

    static var backendURL: String {
        // Read the URL baked in at compile time via the build setting
        if let url = Bundle.main.infoDictionary?["BackendBaseURL"] as? String,
           !url.isEmpty,
           !url.hasPrefix("$(") {          // guard against unreplaced placeholder
            return url
        }
        // Safe fallback for simulator
        return "http://localhost:3001"
    }

    // MARK: - Endpoint helpers

    static var healthEndpoint:    String { "\(backendURL)/health" }
    static var chatEndpoint:      String { "\(backendURL)/api/chat" }
    static var pipelinesEndpoint: String { "\(backendURL)/api/pipelines" }
    static var healEndpoint:      String { "\(backendURL)/api/pipelines/heal" }
    static var awsStatusEndpoint: String { "\(backendURL)/api/aws/status" }

    // MARK: - Ingestion pipeline endpoints

    static var ingestConfigEndpoint: String { "\(backendURL)/api/ingest/config" }
    static var ingestStartEndpoint:  String { "\(backendURL)/api/ingest/start" }

    static func ingestStatusEndpoint(executionArn: String, runId: String) -> String {
        let encoded = executionArn.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? executionArn
        return "\(backendURL)/api/ingest/status/\(encoded)?runId=\(runId)"
    }
    static func ingestSampleEndpoint(runId: String) -> String { "\(backendURL)/api/ingest/sample/\(runId)" }
    static func ingestLogsEndpoint(runId: String)   -> String { "\(backendURL)/api/ingest/logs?runId=\(runId)" }
    static func metadataEndpoint(runId: String)     -> String { "\(backendURL)/api/metadata/\(runId)" }
    static func metadataEnrichEndpoint(runId: String) -> String { "\(backendURL)/api/metadata/\(runId)/enrich" }
    static func metadataRegisterEndpoint(runId: String) -> String { "\(backendURL)/api/metadata/\(runId)/register" }

    static func dagEndpoint(type: String, id: String) -> String {
        "\(backendURL)/api/pipelines/\(type)/\(id)/dag"
    }

    static func glueRunEndpoint(jobName: String) -> String {
        "\(backendURL)/api/pipelines/glue/\(jobName)/run"
    }

    // MARK: - Environment detection

    /// True when running in a simulator (never ship credentials — purely informational)
    static var isSimulator: Bool {
        #if targetEnvironment(simulator)
        return true
        #else
        return false
        #endif
    }

    static var environmentName: String {
        #if DEBUG
        return "Debug"
        #else
        return "Release"
        #endif
    }
}
