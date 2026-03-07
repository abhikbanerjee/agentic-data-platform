import SwiftUI

struct IngestionHubView: View {
    @EnvironmentObject var vm: PlatformViewModel
    
    @State private var isHealingLag = false
    @State private var isDetectingSchema = false
    @State private var lagHealed = false
    @State private var schemasDetected = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PillarHeaderView(
                        title: "Ingestion Hub",
                        subtitle: "Real-time & semi-real-time streaming via Confluent/MSK → Flink/Spark"
                    )
                    
                    // Stats Cards
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        IngestionStatCard(value: "284",   label: "Active Streams",  icon: "arrow.triangle.2.circlepath", color: Color("AccentCyan"))
                        IngestionStatCard(value: "3.2M",  label: "msg/sec",         icon: "bolt.fill",                   color: Color("AccentCyan"))
                        IngestionStatCard(value: "198ms", label: "Avg Lag",         icon: "timer",                       color: Color("AccentCyan"))
                        IngestionStatCard(value: "97.2%", label: "Schema Health",   icon: "checkmark.circle.fill",       color: Color("AccentCyan"))
                    }
                    .padding(.horizontal)
                    
                    // Streaming Topology
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Streaming Topology")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        StreamingTopologyView()
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // Streams List
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Active Streams")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        ForEach(sampleStreams) { stream in
                            StreamRow(stream: stream)
                        }
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // Action Buttons
                    VStack(spacing: 12) {
                        Button(action: detectSchemas) {
                            HStack {
                                if isDetectingSchema {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .scaleEffect(0.8)
                                } else if schemasDetected {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                } else {
                                    Image(systemName: "wand.and.stars")
                                }
                                Text("Auto-Detect Schemas")
                                Spacer()
                            }
                            .padding()
                            .foregroundColor(.white)
                            .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                            .cornerRadius(8)
                        }
                        .disabled(isDetectingSchema)
                        
                        Button(action: healLag) {
                            HStack {
                                if isHealingLag {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .scaleEffect(0.8)
                                } else if lagHealed {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                } else {
                                    Image(systemName: "wrench.and.screwdriver")
                                }
                                Text("Heal Lag")
                                Spacer()
                            }
                            .padding()
                            .foregroundColor(.white)
                            .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                            .cornerRadius(8)
                        }
                        .disabled(isHealingLag)
                    }
                    
                    // Success Banners
                    if schemasDetected {
                        VStack(spacing: 8) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Schemas detected successfully")
                                    .font(.callout)
                                Spacer()
                            }
                        }
                        .padding()
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(8)
                        .transition(.opacity)
                    }
                    
                    if lagHealed {
                        VStack(spacing: 8) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Lag healed successfully")
                                    .font(.callout)
                                Spacer()
                            }
                        }
                        .padding()
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(8)
                        .transition(.opacity)
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Ingestion Hub")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func detectSchemas() {
        isDetectingSchema = true
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            schemasDetected = true
            isDetectingSchema = false
        }
    }
    
    private func healLag() {
        isHealingLag = true
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            lagHealed = true
            isHealingLag = false
        }
    }
    
    private var sampleStreams: [StreamEntry] {
        [
            StreamEntry(id: UUID(), source: "CRM Events", broker: "Confluent", processor: "Flink", target: "Snowflake", msgSec: 42000, lagMs: 180, schemaStatus: "detected", isHealthy: true),
            StreamEntry(id: UUID(), source: "Order Updates", broker: "MSK", processor: "Spark", target: "Teradata", msgSec: 38000, lagMs: 220, schemaStatus: "detected", isHealthy: true),
            StreamEntry(id: UUID(), source: "Payment Stream", broker: "Confluent", processor: "Flink", target: "S3 Lake", msgSec: 91000, lagMs: 145, schemaStatus: "detected", isHealthy: true),
            StreamEntry(id: UUID(), source: "User Behavior", broker: "MSK", processor: "Spark", target: "Feature Store", msgSec: 128000, lagMs: 310, schemaStatus: "pending", isHealthy: false),
            StreamEntry(id: UUID(), source: "Inventory Feed", broker: "Confluent", processor: "Flink", target: "Snowflake", msgSec: 19000, lagMs: 165, schemaStatus: "detected", isHealthy: true),
            StreamEntry(id: UUID(), source: "Risk Signals", broker: "MSK", processor: "Spark", target: "Graph DB", msgSec: 7500, lagMs: 890, schemaStatus: "detected", isHealthy: false)
        ]
    }
}

struct StreamEntry: Identifiable {
    let id: UUID
    let source: String
    let broker: String
    let processor: String
    let target: String
    let msgSec: Int
    let lagMs: Int
    let schemaStatus: String
    let isHealthy: Bool
}

struct StreamRow: View {
    let stream: StreamEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(stream.source)
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    HStack(spacing: 4) {
                        Text(stream.broker)
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                            .foregroundColor(.white)
                            .cornerRadius(4)
                        
                        Image(systemName: "arrow.right")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text(stream.processor)
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                            .foregroundColor(.white)
                            .cornerRadius(4)
                        
                        Image(systemName: "arrow.right")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text(stream.target)
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                            .foregroundColor(.white)
                            .cornerRadius(4)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    HStack(spacing: 8) {
                        Text("\(formatMessageRate(stream.msgSec))")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text("\(stream.lagMs)ms")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    
                    HStack(spacing: 8) {
                        StatusBadge(
                            text: stream.schemaStatus.capitalized,
                            color: stream.schemaStatus == "detected" ? .green : .yellow
                        )
                        
                        Image(systemName: "circle.fill")
                            .font(.caption)
                            .foregroundColor(stream.isHealthy ? .green : .red)
                    }
                }
            }
        }
        .padding()
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .cornerRadius(8)
    }
    
    private func formatMessageRate(_ rate: Int) -> String {
        if rate >= 1_000_000 {
            return String(format: "%.1fM msg/s", Double(rate) / 1_000_000)
        } else if rate >= 1_000 {
            return String(format: "%.1fK msg/s", Double(rate) / 1_000)
        }
        return "\(rate) msg/s"
    }
}

struct StreamingTopologyView: View {
    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 8) {
                TopologyBox(label: "Sources", color: .blue)
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                
                TopologyBox(label: "Confluent/MSK", color: Color("AccentCyan"))
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                
                TopologyBox(label: "Flink/Spark", color: .orange)
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                
                TopologyBox(label: "Targets", color: .green)
            }
        }
        .padding()
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .cornerRadius(8)
    }
}

struct TopologyBox: View {
    let label: String
    let color: Color
    
    var body: some View {
        VStack {
            Text(label)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.white)
                .padding(8)
        }
        .frame(minWidth: 60)
        .background(color)
        .cornerRadius(6)
    }
}

// MARK: - Stat Card
private struct IngestionStatCard: View {
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

#Preview {
    IngestionHubView()
        .environmentObject(PlatformViewModel())
}
