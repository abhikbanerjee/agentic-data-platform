import SwiftUI

struct PipelinesView: View {
    @EnvironmentObject var vm: PlatformViewModel
    @State private var selectedPipeline: DataPipeline?

    var healthyCount: Int { vm.pipelines.filter { $0.status == .healthy }.count }
    var healingCount: Int { vm.pipelines.filter { $0.status == .healing }.count }
    var failedCount:  Int { vm.pipelines.filter { $0.status == .failed  }.count }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PillarHeaderView(
                        title: "Self-Healing Pipelines",
                        subtitle: "AI monitors, diagnoses and auto-repairs failures in real-time"
                    )

                    // Health summary bar
                    CardView {
                        HStack(spacing: 0) {
                            HealthChip(count: healthyCount, label: "Healthy", color: .green)
                            Divider()
                            HealthChip(count: healingCount, label: "Healing", color: .orange)
                            Divider()
                            HealthChip(count: failedCount,  label: "Failed",  color: .red)
                        }
                    }
                    .padding(.horizontal)

                    // Pipeline detail
                    if let pipeline = selectedPipeline {
                        PipelineDetailCard(pipeline: pipeline) {
                            Task { await vm.healPipeline(id: pipeline.id) }
                            // Refresh selection after heal
                            if let updated = vm.pipelines.first(where: { $0.id == pipeline.id }) {
                                selectedPipeline = updated
                            }
                        }
                        .padding(.horizontal)
                        .transition(.move(edge: .top).combined(with: .opacity))
                    }

                    // Pipeline list
                    VStack(alignment: .leading, spacing: 8) {
                        Text("ALL PIPELINES")
                            .font(.caption).bold().foregroundColor(.secondary)
                            .padding(.horizontal)
                        CardView {
                            VStack(spacing: 0) {
                                ForEach(vm.pipelines) { pipeline in
                                    Button {
                                        withAnimation(.spring(response: 0.35)) {
                                            selectedPipeline = selectedPipeline?.id == pipeline.id ? nil : pipeline
                                        }
                                    } label: {
                                        PipelineRow(pipeline: pipeline, isSelected: selectedPipeline?.id == pipeline.id)
                                    }
                                    .buttonStyle(.plain)
                                    if pipeline.id != vm.pipelines.last?.id { Divider().padding(.leading, 52) }
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Pipelines")
            .navigationBarTitleDisplayMode(.inline)
            .animation(.easeInOut, value: selectedPipeline?.id)
        }
    }
}

// MARK: - Sub-views

private struct HealthChip: View {
    let count: Int
    let label: String
    let color: Color
    var body: some View {
        VStack(spacing: 4) {
            Text("\(count)").font(.title3).bold().foregroundColor(color)
            Text(label).font(.caption2).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }
}

private struct PipelineRow: View {
    let pipeline: DataPipeline
    let isSelected: Bool
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: pipeline.status.systemIcon)
                .foregroundColor(pipeline.status.color)
                .font(.title3)
                .frame(width: 36, height: 36)
                .background(pipeline.status.color.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 3) {
                Text(pipeline.name).font(.subheadline).bold().foregroundColor(.primary)
                Text("\(pipeline.stages) stages · \(pipeline.records) records · \(pipeline.lastRun)")
                    .font(.caption2).foregroundColor(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                StatusBadge(text: pipeline.status.rawValue, color: pipeline.status.color)
                Text(pipeline.owner).font(.caption2).foregroundColor(.secondary)
            }
            Image(systemName: isSelected ? "chevron.up" : "chevron.down")
                .font(.caption2).foregroundColor(.secondary)
        }
        .padding(.horizontal).padding(.vertical, 12)
        .background(isSelected ? Color("AccentCyan").opacity(0.05) : Color.clear)
    }
}

private struct PipelineDetailCard: View {
    let pipeline: DataPipeline
    let onHeal: () -> Void

    private let stageNames = ["Source", "Ingest", "Validate", "Transform", "Enrich", "Load"]

    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(pipeline.name).font(.headline).bold()
                        Text("Owner: \(pipeline.owner)  ·  Duration: \(pipeline.duration)")
                            .font(.caption).foregroundColor(.secondary)
                    }
                    Spacer()
                    if pipeline.status != .healthy {
                        Button(action: onHeal) {
                            Label(pipeline.status == .healing ? "Healing…" : "Auto-Heal", systemImage: "arrow.clockwise")
                                .font(.subheadline).bold()
                                .padding(.horizontal, 12).padding(.vertical, 7)
                                .background(Color.orange)
                                .foregroundColor(.white)
                                .clipShape(Capsule())
                        }
                        .disabled(pipeline.status == .healing)
                    }
                }

                // Stage DAG
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(Array(stageNames.prefix(pipeline.stages).enumerated()), id: \.offset) { i, stage in
                            HStack(spacing: 6) {
                                StageChip(name: stage, stageIndex: i, pipeline: pipeline)
                                if i < pipeline.stages - 1 {
                                    Image(systemName: "arrow.right")
                                        .font(.caption2).foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Heal log
                VStack(alignment: .leading, spacing: 6) {
                    Text("AUTO-HEAL LOG")
                        .font(.caption2).bold().foregroundColor(.secondary)
                    ForEach(healLogEntries, id: \.self) { entry in
                        HStack(alignment: .top, spacing: 6) {
                            Text(entry.prefix(9))
                                .font(.system(.caption2, design: .monospaced))
                                .foregroundColor(.secondary)
                            Text(String(entry.dropFirst(9)))
                                .font(.caption2)
                                .foregroundColor(entry.contains("Patch") ? .green : entry.contains("Anomaly") ? .orange : .secondary)
                        }
                    }
                }
                .padding(10)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .padding(16)
        }
    }

    private var healLogEntries: [String] {
        ["14:32:01 Anomaly detected: null join key on customer_id at Validate",
         "14:32:03 Heal Agent triggered — analysing upstream schema diff",
         "14:32:07 Root cause: CRM changed customer_id dtype INT → VARCHAR",
         "14:32:09 Patch applied: cast customer_id to VARCHAR in ingest config",
         "14:32:12 Pipeline restarted from Validate stage ✓"]
    }
}

private struct StageChip: View {
    let name: String
    let stageIndex: Int
    let pipeline: DataPipeline

    var stageStatus: PipelineStatus {
        guard pipeline.status != .healthy else { return .healthy }
        return stageIndex == 2 ? pipeline.status : stageIndex < 2 ? .healthy : .healthy
    }

    var body: some View {
        Text(name)
            .font(.caption2).bold()
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(stageStatus.color.opacity(0.12))
            .foregroundColor(stageStatus.color)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(stageStatus.color.opacity(0.4), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
