import SwiftUI

struct DataQualityView: View {
    @EnvironmentObject var vm: PlatformViewModel

    private let dimensions: [(name: String, score: Double)] = [
        ("Completeness", 0.96), ("Accuracy", 0.91), ("Consistency", 0.94),
        ("Timeliness", 0.89),   ("Uniqueness", 0.98), ("Validity", 0.93),
    ]
    private let datasetScores: [(name: String, score: Double, issues: Int)] = [
        ("customer_master", 0.96, 1),
        ("orders_fact",     0.88, 2),
        ("product_catalog", 0.91, 1),
        ("user_events",     0.97, 0),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PillarHeaderView(
                        title: "Data Quality",
                        subtitle: "Continuous AI-driven quality monitoring with automated root cause analysis"
                    )

                    // Top stats
                    HStack(spacing: 12) {
                        QualityStatCard(value: "94.2%", label: "Overall Score",   icon: "checkmark.shield.fill", color: .green)
                        QualityStatCard(value: "3,841", label: "Rules Passing",   icon: "checkmark.circle",      color: Color("AccentCyan"))
                        QualityStatCard(value: "38",    label: "Auto-Fixed Today",icon: "bolt.fill",              color: .purple)
                    }
                    .padding(.horizontal)

                    // Dataset quality rings
                    VStack(alignment: .leading, spacing: 8) {
                        Text("DATASET SCORES").font(.caption).bold().foregroundColor(.secondary).padding(.horizontal)
                        CardView {
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 0) {
                                ForEach(datasetScores, id: \.name) { ds in
                                    DatasetScoreCell(name: ds.name, score: ds.score, issues: ds.issues)
                                        .padding(.vertical, 14)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Quality dimensions hexagonal bar chart
                    VStack(alignment: .leading, spacing: 8) {
                        Text("QUALITY DIMENSIONS").font(.caption).bold().foregroundColor(.secondary).padding(.horizontal)
                        CardView {
                            VStack(spacing: 8) {
                                ForEach(dimensions, id: \.name) { dim in
                                    DimensionBar(name: dim.name, score: dim.score)
                                }
                            }
                            .padding(14)
                        }
                        .padding(.horizontal)
                    }

                    // Issues with AI fix
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("AI FIX QUEUE").font(.caption).bold().foregroundColor(.secondary)
                            Spacer()
                            let openCount = vm.qualityIssues.filter { !$0.isFixed }.count
                            if openCount > 0 {
                                Text("\(openCount) open").font(.caption2).bold().foregroundColor(.orange)
                            }
                        }
                        .padding(.horizontal)

                        CardView {
                            VStack(spacing: 0) {
                                ForEach(vm.qualityIssues) { issue in
                                    QualityIssueCard(issue: issue) {
                                        vm.applyQualityFix(id: issue.id)
                                    }
                                    if issue.id != vm.qualityIssues.last?.id {
                                        Divider().padding(.horizontal)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Data Quality")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Sub-views

private struct QualityStatCard: View {
    let value, label, icon: String
    let color: Color
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: icon).font(.title3).foregroundColor(color)
                Text(value).font(.title3).bold()
                Text(label).font(.caption2).foregroundColor(.secondary).lineLimit(2)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct DatasetScoreCell: View {
    let name: String
    let score: Double
    let issues: Int
    var body: some View {
        VStack(spacing: 8) {
            QualityScoreRing(score: score, size: 56)
            Text(name.replacingOccurrences(of: "_", with: " "))
                .font(.caption2).bold().multilineTextAlignment(.center).lineLimit(2)
            if issues > 0 {
                Text("\(issues) issue\(issues > 1 ? "s" : "")")
                    .font(.system(size: 9, weight: .bold))
                    .padding(.horizontal, 7).padding(.vertical, 2)
                    .background(Color.orange.opacity(0.12))
                    .foregroundColor(.orange)
                    .clipShape(Capsule())
            } else {
                Text("Clean ✓")
                    .font(.system(size: 9, weight: .bold))
                    .padding(.horizontal, 7).padding(.vertical, 2)
                    .background(Color.green.opacity(0.12))
                    .foregroundColor(.green)
                    .clipShape(Capsule())
            }
        }
        .frame(maxWidth: .infinity)
    }
}

private struct DimensionBar: View {
    let name: String
    let score: Double
    @State private var appeared = false

    var barColor: Color {
        score >= 0.95 ? .green : score >= 0.90 ? Color("AccentCyan") : .orange
    }

    var body: some View {
        HStack(spacing: 10) {
            Text(name)
                .font(.caption).foregroundColor(.secondary)
                .frame(width: 90, alignment: .leading)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6).fill(Color(.systemGray5)).frame(height: 8)
                    RoundedRectangle(cornerRadius: 6).fill(barColor)
                        .frame(width: appeared ? geo.size.width * score : 0, height: 8)
                        .animation(.easeOut(duration: 0.9), value: appeared)
                }
            }
            .frame(height: 8)
            Text("\(Int(score * 100))%")
                .font(.caption2).bold().foregroundColor(barColor)
                .frame(width: 34, alignment: .trailing)
        }
        .onAppear { appeared = true }
    }
}

private struct QualityIssueCard: View {
    let issue: QualityIssue
    let onFix: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 6) {
                    Text(issue.dataset)
                        .font(.caption).bold()
                        .foregroundColor(Color("AccentCyan"))
                    Text("·")
                        .font(.caption).foregroundColor(.secondary)
                    Text(issue.field)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(.secondary)
                }
                Text(issue.issue)
                    .font(.caption2).foregroundColor(.primary)
                HStack(spacing: 4) {
                    Image(systemName: "lightbulb.fill").font(.caption2).foregroundColor(.yellow)
                    Text(issue.aiSuggestedFix).font(.caption2).foregroundColor(Color("AccentCyan"))
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 8) {
                StatusBadge(text: issue.severity.rawValue, color: issue.severity.color)
                if issue.isFixed {
                    Label("Fixed", systemImage: "checkmark.circle.fill")
                        .font(.caption2).bold().foregroundColor(.green)
                } else {
                    Button(action: onFix) {
                        Text("Apply Fix")
                            .font(.caption2).bold()
                            .padding(.horizontal, 10).padding(.vertical, 6)
                            .background(Color("AccentCyan"))
                            .foregroundColor(.white)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.horizontal).padding(.vertical, 12)
        .opacity(issue.isFixed ? 0.5 : 1.0)
        .animation(.easeInOut, value: issue.isFixed)
    }
}
