import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var vm: PlatformViewModel
    @Binding var selectedTab: ContentView.Tab

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Greeting
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Good morning, Abhik 👋")
                                .font(.title2).bold()
                            Text("\(vm.activeAgentCount) agents active · All systems operational")
                                .font(.caption).foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "bell.badge")
                            .font(.title3)
                            .foregroundColor(Color("AccentCyan"))
                    }
                    .padding(.horizontal)

                    // Stat Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        StatCard(value: "\(vm.activePipelineCount)", label: "Active Pipelines",
                                 icon: "arrow.triangle.branch", color: Color("AccentCyan"))
                        StatCard(value: "\(Int(vm.overallQualityScore * 100))%", label: "Quality Score",
                                 icon: "checkmark.shield.fill", color: .green)
                        StatCard(value: "\(vm.registeredSchemas / 1000).\(vm.registeredSchemas % 1000 / 100)K", label: "Schemas Registered",
                                 icon: "brain", color: .purple)
                        StatCard(value: "3.2K", label: "Agent Actions / 24h",
                                 icon: "bolt.fill", color: .orange)
                    }
                    .padding(.horizontal)

                    // Pillar Cards
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Platform Pillars")
                            .font(.headline).padding(.horizontal)
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            PillarCard(title: "Agentic Publishing", subtitle: "6 sources · 1,842 datasets",
                                       icon: "arrow.up.circle.fill", color: Color("AccentCyan"),
                                       tab: .publish, selectedTab: $selectedTab)
                            PillarCard(title: "Self-Healing Pipelines", subtitle: "247 pipelines · 38 agents",
                                       icon: "arrow.triangle.branch", color: .purple,
                                       tab: .pipelines, selectedTab: $selectedTab)
                            PillarCard(title: "Semantic Engine", subtitle: "1,842 schemas · 9 entities",
                                       icon: "brain", color: .green,
                                       tab: .semantic, selectedTab: $selectedTab)
                            PillarCard(title: "Data Quality", subtitle: "94.2% · 4 open issues",
                                       icon: "checkmark.shield.fill", color: .orange,
                                       tab: .quality, selectedTab: $selectedTab)
                        }
                        .padding(.horizontal)
                    }

                    // Agent Activity
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Recent Agent Activity")
                            .font(.headline).padding(.horizontal).padding(.bottom, 10)
                        CardView {
                            VStack(spacing: 0) {
                                ForEach(vm.agentActivities.prefix(6)) { activity in
                                    AgentActivityRow(activity: activity)
                                    if activity.id != vm.agentActivities.prefix(6).last?.id {
                                        Divider().padding(.horizontal)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    // AI Agent CTA
                    Button { selectedTab = .workspace } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("AI Data Agent")
                                    .font(.headline).foregroundColor(.white)
                                Text("Ask anything · Build apps · Deploy in 30s")
                                    .font(.caption).foregroundColor(.white.opacity(0.8))
                            }
                            Spacer()
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.title2).foregroundColor(.white)
                        }
                        .padding(18)
                        .background(
                            LinearGradient(colors: [Color("AccentCyan"), .blue], startPoint: .leading, endPoint: .trailing)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 20)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("AgenticDT")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 4) {
                        Circle().fill(.green).frame(width: 8, height: 8)
                        Text("\(vm.activeAgentCount) Active")
                            .font(.caption2).bold()
                            .foregroundColor(.green)
                    }
                }
            }
        }
    }
}

// MARK: - Sub-components

private struct StatCard: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)
                    .frame(width: 36, height: 36)
                    .background(color.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                Text(value)
                    .font(.title2).bold()
                Text(label)
                    .font(.caption).foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
        }
    }
}

private struct PillarCard: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    let tab: ContentView.Tab
    @Binding var selectedTab: ContentView.Tab

    var body: some View {
        Button { selectedTab = tab } label: {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: icon)
                    .font(.title3).foregroundColor(color)
                    .frame(width: 36, height: 36)
                    .background(color.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.caption).bold().foregroundColor(.primary)
                        .multilineTextAlignment(.leading)
                    Text(subtitle)
                        .font(.caption2).foregroundColor(.secondary)
                        .multilineTextAlignment(.leading)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }
}

private struct AgentActivityRow: View {
    let activity: AgentActivity

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(activity.isSuccess ? Color.green : Color.orange)
                .frame(width: 8, height: 8)
                .padding(.top, 5)
            VStack(alignment: .leading, spacing: 2) {
                Text(activity.agentName)
                    .font(.caption).bold()
                    .foregroundColor(Color("AccentCyan"))
                Text(activity.action)
                    .font(.caption2).foregroundColor(.secondary)
                    .lineLimit(2)
            }
            Spacer()
            Text(activity.timeAgo)
                .font(.caption2).foregroundColor(.secondary)
        }
        .padding(.horizontal).padding(.vertical, 10)
    }
}
