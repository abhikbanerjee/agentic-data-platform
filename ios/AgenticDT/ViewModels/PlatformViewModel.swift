import Foundation
import SwiftUI
import Combine

@MainActor
class PlatformViewModel: ObservableObject {

    // MARK: - Published State
    @Published var pipelines: [DataPipeline]    = DataPipeline.samples
    @Published var dataSources: [DataSource]    = DataSource.samples
    @Published var datasets: [PublishedDataset] = PublishedDataset.samples
    @Published var qualityIssues: [QualityIssue] = QualityIssue.samples
    @Published var agentActivities: [AgentActivity] = AgentActivity.samples
    @Published var chatMessages: [ChatMessage]  = []
    @Published var isAgentTyping: Bool          = false
    @Published var isScanningSource: Bool       = false
    @Published var scanComplete: Bool           = false
    @Published var activeAgentCount: Int        = 38

    // MARK: - Stats
    var activePipelineCount: Int { pipelines.filter { $0.status == .healthy }.count }
    var overallQualityScore: Double { 0.942 }
    var registeredSchemas: Int { 1842 }

    // MARK: - Pipeline Healing
    func healPipeline(id: String) async {
        guard let idx = pipelines.firstIndex(where: { $0.id == id }) else { return }
        pipelines[idx].status = .healing
        try? await Task.sleep(nanoseconds: 3_000_000_000)
        pipelines[idx].status = .healthy

        let healActivity = AgentActivity(
            agentName: "Heal Agent",
            action: "Auto-healed \(pipelines[idx].name) — patch applied successfully",
            timeAgo: "now",
            isSuccess: true
        )
        agentActivities.insert(healActivity, at: 0)
    }

    // MARK: - Source Scanning
    func scanNewSource() async {
        isScanningSource = true
        scanComplete = false
        try? await Task.sleep(nanoseconds: 2_500_000_000)
        isScanningSource = false
        scanComplete = true

        let bigQuery = DataSource(name: "BigQuery", type: "Analytics", status: .connected, tables: 28, icon: "📊", size: "12 TB")
        if let idx = dataSources.firstIndex(where: { $0.name == "BigQuery" }) {
            dataSources[idx] = bigQuery
        }

        let schemaActivity = AgentActivity(
            agentName: "Schema Agent",
            action: "Connected BigQuery — detected 28 tables, generated metadata & lineage",
            timeAgo: "now",
            isSuccess: true
        )
        agentActivities.insert(schemaActivity, at: 0)
    }

    // MARK: - Quality Fix
    func applyQualityFix(id: UUID) {
        guard let idx = qualityIssues.firstIndex(where: { $0.id == id }) else { return }
        qualityIssues[idx].isFixed = true
    }

    // MARK: - AI Chat
    func sendMessage(_ text: String) async {
        let userMsg = ChatMessage(role: .user, content: text, timestamp: Date())
        chatMessages.append(userMsg)
        isAgentTyping = true

        try? await Task.sleep(nanoseconds: 1_400_000_000)

        let response = generateAgentResponse(for: text)
        let botMsg = ChatMessage(role: .assistant, content: response, timestamp: Date())
        chatMessages.append(botMsg)
        isAgentTyping = false
    }

    private func generateAgentResponse(for query: String) -> String {
        let q = query.lowercased()
        if q.contains("revenue") || q.contains("attribution") {
            return "Revenue by channel (last 30d):\n\n• Email — 38.4% ($1.24M)\n• Paid Search — 27.1% ($874K)\n• Organic — 21.2% ($684K)\n• Social — 13.3% ($429K)\n\nTotal: $3.23M (+12.4% MoM)\n\nShall I build a Revenue Dashboard app and deploy it to production? 🚀"
        }
        if q.contains("customer") || q.contains("churn") || q.contains("segment") {
            return "Customer segments found:\n\n• Champions — 12K customers, LTV $4.2K\n• Loyal — 34K customers, LTV $1.8K\n• At-Risk — 8.2K customers, churn risk 68% ⚠️\n• Dormant — 15K customers\n\nI recommend a Churn Prevention app. Want me to build and deploy it?"
        }
        if q.contains("quality") || q.contains("issue") {
            return "Data quality scan complete ✅\n\nOverall score: 94.2%\n\nTop issues:\n• 8,920 null ship_dates in orders_fact (high)\n• 342 orphaned category_ids in product_catalog (high)\n• 1,240 malformed phone numbers in customer_master\n\nI can auto-fix all issues. Shall I proceed?"
        }
        if q.contains("pipeline") || q.contains("fail") {
            return "Pipeline status:\n\n✅ 221 healthy\n⚠️ 19 warnings\n❌ 7 failed\n\nInventory Forecast failed at the Enrich stage. Root cause: upstream schema change in supplier_master. I'm preparing a self-heal patch — trigger it?"
        }
        return "I've analyzed your request and prepared a query. Results show \(Int.random(in: 500...9999)) records across \(Int.random(in: 2...8)) dimensions. Want me to build a dashboard app from these results and deploy it to production? Takes ~30 seconds with zero DevOps required."
    }
}
