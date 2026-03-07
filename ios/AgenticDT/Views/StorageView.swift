import SwiftUI

struct StorageView: View {
    @EnvironmentObject var vm: PlatformViewModel
    
    @State private var isOptimizing = false
    @State private var optimizeDone = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PillarHeaderView(
                        title: "Storage & Warehouse",
                        subtitle: "Data Lake · Snowflake · Teradata · Feature Store · Graph DB"
                    )
                    
                    // Stats Cards
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        StorageStatCard(value: "2.8PB",  label: "Total Data",  icon: "internaldrive.fill",       color: Color("AccentCyan"))
                        StorageStatCard(value: "61,600", label: "Tables",      icon: "table",                    color: Color("AccentCyan"))
                        StorageStatCard(value: "12,400", label: "Features",    icon: "square.stack.3d.up.fill",  color: Color("AccentCyan"))
                        StorageStatCard(value: "< 50ms", label: "Query P99",   icon: "bolt.fill",                color: Color("AccentCyan"))
                    }
                    .padding(.horizontal)
                    
                    // Storage Systems
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Storage Systems")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        ForEach(storageSystems) { system in
                            StorageSystemCard(system: system)
                        }
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // Optimize Button
                    Button(action: optimizePartitions) {
                        HStack {
                            if isOptimizing {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .scaleEffect(0.8)
                            } else if optimizeDone {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Image(systemName: "sparkles")
                            }
                            Text("Optimize Partitions")
                            Spacer()
                        }
                        .padding()
                        .foregroundColor(.white)
                        .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                        .cornerRadius(8)
                    }
                    .disabled(isOptimizing)
                    
                    // Success Banner
                    if optimizeDone {
                        VStack(spacing: 8) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Partitions optimized successfully")
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
            .navigationTitle("Storage & Warehouse")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func optimizePartitions() {
        isOptimizing = true
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            optimizeDone = true
            isOptimizing = false
        }
    }
    
    private var storageSystems: [StorageSystem] {
        [
            StorageSystem(
                id: UUID(),
                name: "S3 Data Lake",
                icon: "internaldrive.fill",
                type: "Data Lake",
                size: "2.3PB",
                growth: "+180GB/day",
                status: "healthy",
                details: ["Parquet/ORC", "Lake Formation", "45,000 tables"],
                color: .cyan
            ),
            StorageSystem(
                id: UUID(),
                name: "Snowflake DW",
                icon: "cloud.fill",
                type: "Data Warehouse",
                size: "450TB",
                growth: "+25GB/day",
                status: "healthy",
                details: ["32 credits/day", "3,200 schemas", "Auto-scaling"],
                color: .blue
            ),
            StorageSystem(
                id: UUID(),
                name: "Teradata Vantage",
                icon: "externaldrive.fill",
                type: "Data Warehouse",
                size: "680TB",
                growth: "+12GB/day",
                status: "healthy",
                details: ["Exadata-linked", "1,800 tables", "In-DB analytics"],
                color: .purple
            ),
            StorageSystem(
                id: UUID(),
                name: "Feature Store",
                icon: "square.stack.3d.up.fill",
                type: "Feature Store",
                size: "125TB",
                growth: "+5GB/day",
                status: "healthy",
                details: ["12,400 features", "98.2% online SLA", "Feast-compatible"],
                color: .green
            ),
            StorageSystem(
                id: UUID(),
                name: "Graph Database",
                icon: "circle.hexagongrid.fill",
                type: "Graph DB",
                size: "89TB",
                growth: "+2GB/day",
                status: "building",
                details: ["1.2B entities", "4.8B relations", "TBD production"],
                color: .orange
            )
        ]
    }
}

struct StorageSystem: Identifiable {
    let id: UUID
    let name: String
    let icon: String
    let type: String
    let size: String
    let growth: String
    let status: String
    let details: [String]
    let color: Color
}

struct StorageSystemCard: View {
    let system: StorageSystem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: system.icon)
                    .font(.title2)
                    .foregroundColor(system.color)
                    .frame(width: 40, alignment: .center)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(system.name)
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    HStack(spacing: 8) {
                        Text(system.size)
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text(system.growth)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                
                Spacer()
                
                StatusBadge(
                    text: system.status.capitalized,
                    color: system.status == "healthy" ? .green : .yellow
                )
            }
            
            HStack(spacing: 8) {
                StatusBadge(
                    text: system.type,
                    color: system.color
                )
            }
            
            VStack(alignment: .leading, spacing: 6) {
                ForEach(system.details, id: \.self) { detail in
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundColor(system.color)
                        
                        Text(detail)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            }
        }
        .padding()
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .cornerRadius(8)
    }
}

// MARK: - Stat Card
private struct StorageStatCard: View {
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
    StorageView()
        .environmentObject(PlatformViewModel())
}
