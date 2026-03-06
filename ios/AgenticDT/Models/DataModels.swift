import Foundation
import SwiftUI

// MARK: - Pipeline
struct DataPipeline: Identifiable, Hashable {
    let id: String
    let name: String
    var status: PipelineStatus
    let lastRun: String
    let records: String
    let duration: String
    let stages: Int
    let owner: String
}

enum PipelineStatus: String, CaseIterable {
    case healthy = "Healthy"
    case healing = "Healing"
    case failed  = "Failed"

    var color: Color {
        switch self {
        case .healthy: return Color("AccentGreen")
        case .healing: return .orange
        case .failed:  return .red
        }
    }
    var systemIcon: String {
        switch self {
        case .healthy: return "checkmark.circle.fill"
        case .healing: return "arrow.clockwise.circle.fill"
        case .failed:  return "xmark.circle.fill"
        }
    }
}

// MARK: - Data Source
struct DataSource: Identifiable {
    let id = UUID()
    let name: String
    let type: String
    var status: SourceStatus
    let tables: Int
    let icon: String
    let size: String
}

enum SourceStatus: String {
    case connected = "Connected"
    case scanning  = "Scanning"
    case pending   = "Pending"

    var color: Color {
        switch self {
        case .connected: return Color("AccentGreen")
        case .scanning:  return .blue
        case .pending:   return .gray
        }
    }
}

// MARK: - Published Dataset
struct PublishedDataset: Identifiable {
    let id = UUID()
    let name: String
    let source: String
    let publishedAt: String
    let tables: Int
    let qualityScore: Double
    let hasLineage: Bool
}

// MARK: - Knowledge Graph
struct KGNode: Identifiable {
    let id: String
    let label: String
    var position: CGPoint
    let color: Color
    let type: String
    let domain: String
    let attrs: [String]
    let sources: [String]
    let owner: String
}

struct KGEdge: Identifiable {
    let id = UUID()
    let fromId: String
    let toId: String
    let label: String
}

// MARK: - Quality
struct QualityDimension: Identifiable {
    let id = UUID()
    let name: String
    let score: Double
}

struct QualityIssue: Identifiable {
    let id = UUID()
    let dataset: String
    let field: String
    let issue: String
    let severity: IssueSeverity
    let recordCount: Int
    let aiSuggestedFix: String
    var isFixed: Bool = false
}

enum IssueSeverity: String {
    case high   = "High"
    case medium = "Medium"
    case low    = "Low"

    var color: Color {
        switch self {
        case .high:   return .red
        case .medium: return .orange
        case .low:    return .gray
        }
    }
}

// MARK: - Chat
struct ChatMessage: Identifiable {
    let id = UUID()
    let role: MessageRole
    let content: String
    let timestamp: Date
}

enum MessageRole {
    case user, assistant
}

// MARK: - Agent Activity
struct AgentActivity: Identifiable {
    let id = UUID()
    let agentName: String
    let action: String
    let timeAgo: String
    let isSuccess: Bool
}

// MARK: - Sample Data
extension DataPipeline {
    static let samples: [DataPipeline] = [
        DataPipeline(id: "P001", name: "Customer 360 ETL",        status: .healthy, lastRun: "2m ago",  records: "2.3M",  duration: "4m 32s", stages: 6, owner: "data-team"),
        DataPipeline(id: "P002", name: "Revenue Attribution",     status: .healthy, lastRun: "15m ago", records: "890K",  duration: "2m 11s", stages: 4, owner: "analytics"),
        DataPipeline(id: "P003", name: "Product Catalog Sync",    status: .healing, lastRun: "1h ago",  records: "450K",  duration: "—",       stages: 5, owner: "product"),
        DataPipeline(id: "P004", name: "User Events Stream",      status: .healthy, lastRun: "30s ago", records: "15.2M", duration: "1m 08s", stages: 3, owner: "platform"),
        DataPipeline(id: "P005", name: "Inventory Forecast",      status: .failed,  lastRun: "3h ago",  records: "—",     duration: "—",       stages: 7, owner: "supply-chain"),
        DataPipeline(id: "P006", name: "Marketing Attribution",   status: .healthy, lastRun: "5m ago",  records: "1.1M",  duration: "3m 45s", stages: 5, owner: "marketing"),
    ]
}

extension DataSource {
    static let samples: [DataSource] = [
        DataSource(name: "Snowflake DW",  type: "Warehouse",     status: .connected, tables: 342,  icon: "❄️", size: "4.2 TB"),
        DataSource(name: "AWS S3 Lake",   type: "Object Store",  status: .connected, tables: 1240, icon: "🪣", size: "89 TB"),
        DataSource(name: "Kafka Streams", type: "Streaming",     status: .connected, tables: 28,   icon: "⚡", size: "Live"),
        DataSource(name: "PostgreSQL",    type: "OLTP",          status: .connected, tables: 87,   icon: "🐘", size: "780 GB"),
        DataSource(name: "REST APIs",     type: "API Gateway",   status: .scanning,  tables: 14,   icon: "🔗", size: "—"),
        DataSource(name: "BigQuery",      type: "Analytics",     status: .pending,   tables: 0,    icon: "📊", size: "—"),
    ]
}

extension PublishedDataset {
    static let samples: [PublishedDataset] = [
        PublishedDataset(name: "customer_360_v2",       source: "Snowflake DW", publishedAt: "2h ago",  tables: 12, qualityScore: 0.96, hasLineage: true),
        PublishedDataset(name: "revenue_attribution",   source: "Snowflake DW", publishedAt: "3h ago",  tables: 8,  qualityScore: 0.94, hasLineage: true),
        PublishedDataset(name: "user_events_stream",    source: "Kafka Streams",publishedAt: "Live",    tables: 4,  qualityScore: 0.91, hasLineage: true),
        PublishedDataset(name: "product_catalog_v3",    source: "PostgreSQL",   publishedAt: "1d ago",  tables: 6,  qualityScore: 0.88, hasLineage: false),
        PublishedDataset(name: "marketing_attribution", source: "REST APIs",    publishedAt: "4h ago",  tables: 5,  qualityScore: 0.93, hasLineage: true),
    ]
}

extension QualityIssue {
    static let samples: [QualityIssue] = [
        QualityIssue(dataset: "customer_master",  field: "phone_number", issue: "Format inconsistency (1,240 records)", severity: .medium, recordCount: 1240, aiSuggestedFix: "Normalize to E.164 format"),
        QualityIssue(dataset: "orders_fact",      field: "ship_date",    issue: "Null values (3.2%)",                   severity: .high,   recordCount: 8920, aiSuggestedFix: "Impute from delivery_date − avg_lead_time"),
        QualityIssue(dataset: "product_catalog",  field: "category_id",  issue: "Orphaned references (342 records)",   severity: .high,   recordCount: 342,  aiSuggestedFix: "Map to parent category using hierarchy"),
        QualityIssue(dataset: "user_events",      field: "session_id",   issue: "Duplicate entries (0.3%)",            severity: .low,    recordCount: 520,  aiSuggestedFix: "Deduplicate with window function"),
    ]
}

extension AgentActivity {
    static let samples: [AgentActivity] = [
        AgentActivity(agentName: "Schema Agent",   action: "Detected 3 new tables in S3 prod-data-lake",              timeAgo: "2m",  isSuccess: true),
        AgentActivity(agentName: "Heal Agent",     action: "Auto-repaired Product Catalog Sync — null join resolved", timeAgo: "5m",  isSuccess: true),
        AgentActivity(agentName: "Quality Agent",  action: "Found 342 orphaned category_id records",                  timeAgo: "12m", isSuccess: false),
        AgentActivity(agentName: "Metadata Agent", action: "Registered 28 Kafka topics to semantic registry",         timeAgo: "18m", isSuccess: true),
        AgentActivity(agentName: "Publish Agent",  action: "Published customer_360_v2 with full lineage",             timeAgo: "31m", isSuccess: true),
        AgentActivity(agentName: "Deploy Agent",   action: "Deployed Revenue Attribution app v1.4.2 to production",   timeAgo: "1h",  isSuccess: true),
    ]
}
