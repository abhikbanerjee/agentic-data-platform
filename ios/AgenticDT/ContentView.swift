import SwiftUI

struct ContentView: View {
    @EnvironmentObject var vm: PlatformViewModel
    @State private var selectedTab: Tab = .dashboard

    // 5 grouped tabs covering all 10 CCB sections
    enum Tab: String, CaseIterable {
        case dashboard   = "Home"
        case dataFlow    = "Data Flow"
        case intelligence = "Intelligence"
        case governance  = "Governance"
        case aiOps       = "AI & Ops"

        var systemImage: String {
            switch self {
            case .dashboard:    return "square.grid.2x2.fill"
            case .dataFlow:     return "arrow.triangle.branch"
            case .intelligence: return "brain"
            case .governance:   return "lock.shield.fill"
            case .aiOps:        return "cpu.fill"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {

            // ── Tab 1: Home / Dashboard ──────────────────────────
            DashboardView(selectedTab: $selectedTab)
                .tabItem { Label(Tab.dashboard.rawValue, systemImage: Tab.dashboard.systemImage) }
                .tag(Tab.dashboard)

            // ── Tab 2: Data Flow (Ingestion + Pipelines + Storage) ─
            NavigationStack {
                List {
                    Section("Ingestion") {
                        NavigationLink { IngestionHubView() } label: {
                            SectionRow(icon: "bolt.fill", color: .cyan,
                                       title: "Ingestion Hub",
                                       subtitle: "Confluent/MSK · Flink/Spark · Real-time")
                        }
                        NavigationLink { PublishingView() } label: {
                            SectionRow(icon: "arrow.up.circle.fill", color: .blue,
                                       title: "Agentic Publishing",
                                       subtitle: "Auto-publish & register datasets")
                        }
                    }
                    Section("Processing & Storage") {
                        NavigationLink { PipelinesView() } label: {
                            SectionRow(icon: "arrow.triangle.branch", color: .purple,
                                       title: "Pipelines & Orchestration",
                                       subtitle: "Airflow · Control-M · Self-healing DAGs")
                        }
                        NavigationLink { StorageView() } label: {
                            SectionRow(icon: "externaldrive.fill", color: .teal,
                                       title: "Storage & Warehouse",
                                       subtitle: "S3 Lake · Snowflake · Teradata · Feature Store")
                        }
                    }
                }
                .navigationTitle("Data Flow")
                .navigationBarTitleDisplayMode(.large)
            }
            .tabItem { Label(Tab.dataFlow.rawValue, systemImage: Tab.dataFlow.systemImage) }
            .tag(Tab.dataFlow)

            // ── Tab 3: Intelligence (Semantic + Quality) ─────────
            NavigationStack {
                List {
                    Section("Understanding") {
                        NavigationLink { SemanticEngineView() } label: {
                            SectionRow(icon: "brain", color: .indigo,
                                       title: "Semantic Engine",
                                       subtitle: "Knowledge graph · Catalog · Lineage · Discovery")
                        }
                        NavigationLink { DataQualityView() } label: {
                            SectionRow(icon: "checkmark.shield.fill", color: .green,
                                       title: "Data Quality",
                                       subtitle: "Agentic checks · Auto-remediation · Trends")
                        }
                    }
                }
                .navigationTitle("Intelligence")
                .navigationBarTitleDisplayMode(.large)
            }
            .tabItem { Label(Tab.intelligence.rawValue, systemImage: Tab.intelligence.systemImage) }
            .tag(Tab.intelligence)

            // ── Tab 4: Governance (Mesh + Access Control) ────────
            NavigationStack {
                List {
                    Section("Access & Policy") {
                        NavigationLink { GovernanceView() } label: {
                            SectionRow(icon: "lock.shield.fill", color: .orange,
                                       title: "Governance & Mesh",
                                       subtitle: "Immuta · Data Mesh · Entitlements · Tagging")
                        }
                    }
                }
                .navigationTitle("Governance")
                .navigationBarTitleDisplayMode(.large)
            }
            .tabItem { Label(Tab.governance.rawValue, systemImage: Tab.governance.systemImage) }
            .tag(Tab.governance)

            // ── Tab 5: AI & Ops (ML Platform + Workspace + Ops) ──
            NavigationStack {
                List {
                    Section("AI & Analytics") {
                        NavigationLink { MLPlatformView() } label: {
                            SectionRow(icon: "cpu.fill", color: .purple,
                                       title: "ML Platform",
                                       subtitle: "Infinite AI · Model lifecycle · Vector DB")
                        }
                        NavigationLink { AnalystWorkspaceView() } label: {
                            SectionRow(icon: "bubble.left.and.bubble.right.fill", color: Color("AccentCyan"),
                                       title: "Analyst Workspace",
                                       subtitle: "NL→SQL · Athena · Starburst · Deploy to prod")
                        }
                    }
                    Section("Operations") {
                        NavigationLink { OperationsView() } label: {
                            SectionRow(icon: "gauge.with.dots.needle.67percent", color: .red,
                                       title: "Operations",
                                       subtitle: "E2E monitoring · Observability · Alerts")
                        }
                    }
                }
                .navigationTitle("AI & Ops")
                .navigationBarTitleDisplayMode(.large)
            }
            .tabItem { Label(Tab.aiOps.rawValue, systemImage: Tab.aiOps.systemImage) }
            .tag(Tab.aiOps)
        }
        .accentColor(Color("AccentCyan"))
    }
}

// MARK: - Section Row (used in grouped tab lists)
private struct SectionRow: View {
    let icon: String
    let color: Color
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 42, height: 42)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.subheadline).bold()
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Shared UI Components

struct PillarHeaderView: View {
    let title: String
    let subtitle: String
    var actionLabel: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.title2).bold()
                        .foregroundColor(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                if let label = actionLabel, let action = action {
                    Button(action: action) {
                        Label(label, systemImage: "plus")
                            .font(.subheadline).bold()
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Color("AccentCyan"))
                            .foregroundColor(.white)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }
}

struct StatusBadge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption2).bold()
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .foregroundColor(color)
            .clipShape(Capsule())
    }
}

struct CardView<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }

    var body: some View {
        content
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
    }
}

struct QualityScoreRing: View {
    let score: Double
    let size: CGFloat

    var ringColor: Color {
        score >= 0.95 ? .green : score >= 0.85 ? Color("AccentCyan") : .orange
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(.systemGray5), lineWidth: 5)
            Circle()
                .trim(from: 0, to: score)
                .stroke(ringColor, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.8), value: score)
            Text("\(Int(score * 100))%")
                .font(.system(size: size * 0.22, weight: .bold, design: .rounded))
                .foregroundColor(ringColor)
        }
        .frame(width: size, height: size)
    }
}
