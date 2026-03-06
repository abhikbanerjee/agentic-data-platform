import SwiftUI

struct PublishingView: View {
    @EnvironmentObject var vm: PlatformViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PillarHeaderView(
                        title: "Agentic Publishing",
                        subtitle: "AI discovers, schema-detects and publishes datasets automatically",
                        actionLabel: "Connect",
                        action: {
                            Task { await vm.scanNewSource() }
                        }
                    )

                    // Scan status banners
                    if vm.isScanningSource {
                        ScanBanner(state: .scanning)
                            .padding(.horizontal)
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }
                    if vm.scanComplete && !vm.isScanningSource {
                        ScanBanner(state: .complete)
                            .padding(.horizontal)
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }

                    // Data Sources
                    VStack(alignment: .leading, spacing: 8) {
                        SectionLabel(text: "Connected Sources")
                        CardView {
                            VStack(spacing: 0) {
                                ForEach(vm.dataSources) { source in
                                    DataSourceRow(source: source)
                                    if source.id != vm.dataSources.last?.id { Divider().padding(.leading, 60) }
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Published Datasets
                    VStack(alignment: .leading, spacing: 8) {
                        SectionLabel(text: "AI-Published Datasets")
                        CardView {
                            VStack(spacing: 0) {
                                ForEach(vm.datasets) { dataset in
                                    PublishedDatasetRow(dataset: dataset)
                                    if dataset.id != vm.datasets.last?.id { Divider().padding(.leading, 16) }
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Agentic Publishing")
            .navigationBarTitleDisplayMode(.inline)
            .animation(.easeInOut, value: vm.isScanningSource)
            .animation(.easeInOut, value: vm.scanComplete)
        }
    }
}

// MARK: - Sub-views

private enum ScanState { case scanning, complete }

private struct ScanBanner: View {
    let state: ScanState
    var body: some View {
        HStack(spacing: 12) {
            if state == .scanning {
                ProgressView().tint(.blue)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Schema Agent scanning…")
                        .font(.subheadline).bold().foregroundColor(.blue)
                    Text("Detecting tables · Inferring types · Generating metadata")
                        .font(.caption).foregroundColor(.blue.opacity(0.8))
                }
            } else {
                Image(systemName: "checkmark.circle.fill").foregroundColor(.green).font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Source connected! 28 tables discovered.")
                        .font(.subheadline).bold().foregroundColor(.green)
                    Text("Published to catalog · Lineage traced · Quality baseline set")
                        .font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(state == .scanning ? Color.blue.opacity(0.08) : Color.green.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(state == .scanning ? Color.blue.opacity(0.3) : Color.green.opacity(0.3), lineWidth: 1))
    }
}

private struct DataSourceRow: View {
    let source: DataSource
    var body: some View {
        HStack(spacing: 14) {
            Text(source.icon).font(.title2)
                .frame(width: 40, height: 40)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 3) {
                Text(source.name).font(.subheadline).bold()
                Text("\(source.type) · \(source.tables > 0 ? "\(source.tables) tables" : "Pending")")
                    .font(.caption).foregroundColor(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                StatusBadge(text: source.status.rawValue, color: source.status.color)
                Text(source.size).font(.caption2).foregroundColor(.secondary)
            }
        }
        .padding(.horizontal).padding(.vertical, 12)
    }
}

private struct PublishedDatasetRow: View {
    let dataset: PublishedDataset
    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(dataset.name)
                    .font(.subheadline).bold()
                    .foregroundColor(Color("AccentCyan"))
                HStack(spacing: 8) {
                    Text(dataset.source).font(.caption2)
                    Text("·").font(.caption2)
                    Text("\(dataset.tables) tables").font(.caption2)
                    Text("·").font(.caption2)
                    Text(dataset.publishedAt).font(.caption2)
                }
                .foregroundColor(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                QualityScoreRing(score: dataset.qualityScore, size: 40)
                HStack(spacing: 3) {
                    Image(systemName: dataset.hasLineage ? "checkmark.circle.fill" : "minus.circle")
                        .font(.caption2)
                        .foregroundColor(dataset.hasLineage ? .green : .secondary)
                    Text(dataset.hasLineage ? "Lineage" : "No lineage")
                        .font(.caption2).foregroundColor(.secondary)
                }
            }
        }
        .padding(.horizontal).padding(.vertical, 12)
    }
}

private struct SectionLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.caption).bold()
            .foregroundColor(.secondary)
            .padding(.horizontal)
    }
}
