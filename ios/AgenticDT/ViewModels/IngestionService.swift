import Foundation
import SwiftUI

// MARK: - Models

struct IngestStep: Identifiable {
    let id: Int
    let name: String
    let icon: String
    var status: StepStatus

    enum StepStatus: String {
        case waiting, running, done, error
        var color: Color {
            switch self {
            case .waiting: return .gray.opacity(0.4)
            case .running: return Color(red: 0.0, green: 0.72, blue: 0.72)
            case .done:    return .green
            case .error:   return .red
            }
        }
        var sfSymbol: String {
            switch self {
            case .waiting: return "circle"
            case .running: return "arrow.trianglehead.2.clockwise"
            case .done:    return "checkmark.circle.fill"
            case .error:   return "xmark.circle.fill"
            }
        }
    }
}

struct QualityStats: Codable {
    let run_id: String?
    let total_rows: Int?
    let total_columns: Int?
    let quality_score: Double?
    let passed: Bool?
    let issues: [QualityIssue]?
    let parquet_files: Int?
    let column_stats: [String: ColumnStat]?

    struct QualityIssue: Codable, Identifiable {
        var id: String { column + message }
        let column: String
        let severity: String
        let message: String
    }
    struct ColumnStat: Codable {
        let null_pct: Double?
        let unique_count: Int?
        let semantic_type: String?
    }
}

struct MetadataColumn: Codable, Identifiable {
    var id: String { name }
    let name: String
    let data_type: String
    let semantic_type: String?
    let null_pct: Double?
    let pii_flag: Bool?
    let description: String?
    let tags: [String]?
}

struct DatasetMetadata: Codable {
    let run_id: String?
    let dataset_name: String?
    let source_file: String?
    let total_rows: Int?
    let total_columns: Int?
    let quality_score: Double?
    let columns: [MetadataColumn]?
}

struct SampleData: Codable {
    let columns: [String]
    let rows: [[String: String?]]
    let total_rows: Int?
}

struct CatalogRegistration: Codable {
    let catalog_id: String
    let registered_at: String
    let run_id: String?
}

// MARK: - Service

@MainActor
class IngestionService: ObservableObject {

    // MARK: - Pipeline state
    @Published var isConfigured: Bool? = nil   // nil = checking, true/false = result
    @Published var isRunning = false
    @Published var steps: [IngestStep] = Self.defaultSteps()
    @Published var runId: String? = nil
    @Published var executionArn: String? = nil
    @Published var errorMessage: String? = nil

    // MARK: - Results
    @Published var quality: QualityStats? = nil
    @Published var sampleData: SampleData? = nil
    @Published var metadata: DatasetMetadata? = nil
    @Published var metadataEdits: [String: MetaEdit] = [:]   // col name → edits
    @Published var isEnrichingMeta = false
    @Published var isRegisteringMeta = false
    @Published var registration: CatalogRegistration? = nil

    // MARK: - Poll timer
    private var pollTask: Task<Void, Never>? = nil

    struct MetaEdit {
        var description: String
        var tags: String          // comma-separated
        var pii_flag: Bool
    }

    static func defaultSteps() -> [IngestStep] { [
        IngestStep(id: 1, name: "Load to S3",         icon: "☁️",  status: .waiting),
        IngestStep(id: 2, name: "Parse with Glue",    icon: "⚙️",  status: .waiting),
        IngestStep(id: 3, name: "Transform Column",   icon: "🔄",  status: .waiting),
        IngestStep(id: 4, name: "Quality & Profile",  icon: "🔬",  status: .waiting),
    ]}

    // MARK: - Check pipeline config

    func checkConfig() async {
        guard let url = URL(string: AppConfig.ingestConfigEndpoint) else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            isConfigured = json?["configured"] as? Bool ?? false
        } catch {
            isConfigured = nil
        }
    }

    // MARK: - Start pipeline

    func startPipeline(fileData: Data, fileName: String, transformColumn: String, newColumnName: String) async {
        isRunning = true
        errorMessage = nil
        quality = nil
        sampleData = nil
        metadata = nil
        metadataEdits = [:]
        registration = nil
        steps = [
            IngestStep(id: 1, name: "Load to S3",        icon: "☁️",  status: .running),
            IngestStep(id: 2, name: "Parse with Glue",   icon: "⚙️",  status: .waiting),
            IngestStep(id: 3, name: "Transform Column",  icon: "🔄",  status: .waiting),
            IngestStep(id: 4, name: "Quality & Profile", icon: "🔬",  status: .waiting),
        ]

        guard let url = URL(string: AppConfig.ingestStartEndpoint) else {
            errorMessage = "Invalid backend URL"; isRunning = false; return
        }

        // Build multipart form
        let boundary = "Boundary-\(UUID().uuidString)"
        var body = Data()
        func field(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n".data(using: .utf8)!)
        }
        field("transformColumn", transformColumn)
        field("newColumnName", newColumnName)
        body.append("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\nContent-Type: text/csv\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        req.httpBody = body

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
                let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
                errorMessage = msg ?? "Failed to start pipeline (HTTP \((resp as? HTTPURLResponse)?.statusCode ?? 0))"
                isRunning = false; return
            }
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            executionArn = json?["executionArn"] as? String
            runId = json?["runId"] as? String
            if let rawSteps = json?["steps"] as? [[String: Any]] {
                applySteps(rawSteps)
            }
            guard executionArn != nil else {
                errorMessage = "Backend did not return executionArn"; isRunning = false; return
            }
            startPolling()
        } catch {
            errorMessage = "Network error: \(error.localizedDescription)"; isRunning = false
        }
    }

    // MARK: - Polling

    private func startPolling() {
        pollTask?.cancel()
        pollTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 5_000_000_000)   // 5 s
                if Task.isCancelled { break }
                await pollStatus()
            }
        }
    }

    private func pollStatus() async {
        guard let arn = executionArn, let rid = runId else { return }
        guard let url = URL(string: AppConfig.ingestStatusEndpoint(executionArn: arn, runId: rid)) else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            if let rawSteps = json?["steps"] as? [[String: Any]] { applySteps(rawSteps) }

            // Quality stats arrived → pipeline done
            if let rawStats = json?["qualityStats"] as? [String: Any],
               let statsData = try? JSONSerialization.data(withJSONObject: rawStats) {
                quality = try? JSONDecoder().decode(QualityStats.self, from: statsData)
                isRunning = false
                pollTask?.cancel()
                // Auto-load sample
                if let rid2 = runId { await loadSample(runId: rid2) }
                // Auto-load enriched metadata
                if let rawMeta = json?["enrichedMeta"] as? [String: Any],
                   let metaData = try? JSONSerialization.data(withJSONObject: rawMeta) {
                    metadata = try? JSONDecoder().decode(DatasetMetadata.self, from: metaData)
                    buildEdits()
                }
            }
            if let errDetail = json?["errorDetail"] as? String {
                errorMessage = errDetail; isRunning = false; pollTask?.cancel()
            }
            let sfnStatus = json?["sfnStatus"] as? String ?? ""
            if ["FAILED","TIMED_OUT","ABORTED"].contains(sfnStatus) && json?["qualityStats"] == nil {
                isRunning = false; pollTask?.cancel()
                if errorMessage == nil { errorMessage = "Pipeline \(sfnStatus.lowercased())" }
            }
        } catch { /* keep polling */ }
    }

    func stopPolling() { pollTask?.cancel() }

    // MARK: - Load sample rows

    func loadSample(runId: String) async {
        guard let url = URL(string: AppConfig.ingestSampleEndpoint(runId: runId)) else { return }
        if let (data, _) = try? await URLSession.shared.data(from: url) {
            sampleData = try? JSONDecoder().decode(SampleData.self, from: data)
        }
    }

    // MARK: - Metadata

    func enrichMetadata() async {
        guard let rid = runId else { return }
        isEnrichingMeta = true
        defer { isEnrichingMeta = false }
        guard let url = URL(string: AppConfig.metadataEnrichEndpoint(runId: rid)) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let (data, _) = try? await URLSession.shared.data(for: req),
           let decoded = try? JSONDecoder().decode(DatasetMetadata.self, from: data) {
            metadata = decoded
            buildEdits()
        }
    }

    func registerMetadata() async {
        guard let rid = runId, let meta = metadata else { return }
        isRegisteringMeta = true
        defer { isRegisteringMeta = false }
        guard let url = URL(string: AppConfig.metadataRegisterEndpoint(runId: rid)) else { return }

        let approvedColumns = (meta.columns ?? []).map { col -> [String: Any] in
            let edit = metadataEdits[col.name]
            return [
                "name":        col.name,
                "data_type":   col.data_type,
                "description": edit?.description ?? col.description ?? "",
                "tags":        (edit?.tags ?? "").split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) },
                "pii_flag":    edit?.pii_flag ?? col.pii_flag ?? false,
                "semantic_type": col.semantic_type ?? "",
                "null_pct":    col.null_pct ?? 0,
            ]
        }
        let payload: [String: Any] = [
            "run_id":         rid,
            "dataset_name":   meta.dataset_name ?? rid,
            "source_file":    meta.source_file ?? "unknown",
            "total_rows":     meta.total_rows ?? 0,
            "total_columns":  meta.total_columns ?? 0,
            "quality_score":  meta.quality_score ?? 0,
            "columns":        approvedColumns,
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        if let (data, _) = try? await URLSession.shared.data(for: req) {
            registration = try? JSONDecoder().decode(CatalogRegistration.self, from: data)
        }
    }

    // MARK: - Helpers

    func reset() {
        pollTask?.cancel()
        isRunning = false; steps = Self.defaultSteps()
        runId = nil; executionArn = nil; errorMessage = nil
        quality = nil; sampleData = nil; metadata = nil
        metadataEdits = [:]; registration = nil
    }

    private func applySteps(_ raw: [[String: Any]]) {
        steps = raw.map { s in
            let status: IngestStep.StepStatus
            switch s["status"] as? String {
            case "running": status = .running
            case "done":    status = .done
            case "error":   status = .error
            default:        status = .waiting
            }
            return IngestStep(
                id:     s["id"]   as? Int    ?? 0,
                name:   s["name"] as? String ?? "",
                icon:   s["icon"] as? String ?? "",
                status: status
            )
        }
    }

    private func buildEdits() {
        guard let cols = metadata?.columns else { return }
        for col in cols where metadataEdits[col.name] == nil {
            metadataEdits[col.name] = MetaEdit(
                description: col.description ?? "",
                tags:        (col.tags ?? []).joined(separator: ", "),
                pii_flag:    col.pii_flag ?? false
            )
        }
    }
}
