import SwiftUI

struct OperationsView: View {
    @EnvironmentObject var vm: PlatformViewModel
    
    @State private var isAutoResolving = false
    @State private var resolved = false
    @State private var alerts: [SystemAlert] = []
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PillarHeaderView(
                        title: "Operations",
                        subtitle: "E2E data flow monitoring · Observability · System health"
                    )
                    
                    // Stats Cards
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        OpsStatCard(value: "99.97%", label: "Uptime",        icon: "checkmark.shield.fill",  color: Color("AccentCyan"))
                        OpsStatCard(value: "3",      label: "Active Alerts", icon: "bell.badge.fill",        color: Color("AccentCyan"))
                        OpsStatCard(value: "< 2min", label: "MTTR",          icon: "speedometer",            color: Color("AccentCyan"))
                        OpsStatCard(value: "847",    label: "Pipelines OK",  icon: "checkmark.circle.fill",  color: Color("AccentCyan"))
                    }
                    .padding(.horizontal)
                    
                    // Active Alerts
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Active Alerts")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        ForEach(alerts) { alert in
                            SystemAlertCard(alert: alert)
                        }
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // E2E Pipeline Health
                    VStack(alignment: .leading, spacing: 12) {
                        Text("E2E Pipeline Health")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        PipelineHealthFlowView()
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // System Monitoring
                    VStack(alignment: .leading, spacing: 12) {
                        Text("System Monitoring")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        ForEach(systemMonitoring, id: \.system) { item in
                            SystemMonitoringRow(system: item.system, health: item.health)
                        }
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // Auto-Resolve Button
                    Button(action: autoResolveWarnings) {
                        HStack {
                            if isAutoResolving {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .scaleEffect(0.8)
                            } else if resolved {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Image(systemName: "wand.and.stars")
                            }
                            Text("Auto-Resolve Warnings")
                            Spacer()
                        }
                        .padding()
                        .foregroundColor(.white)
                        .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                        .cornerRadius(8)
                    }
                    .disabled(isAutoResolving)
                    
                    // Success Banner
                    if resolved {
                        VStack(spacing: 8) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Warnings resolved")
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
            .navigationTitle("Operations")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                alerts = initialAlerts
            }
        }
    }
    
    private func autoResolveWarnings() {
        isAutoResolving = true
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            alerts = alerts.map { alert in
                var mutableAlert = alert
                if alert.severity == .warning {
                    mutableAlert.isResolved = true
                }
                return mutableAlert
            }
            resolved = true
            isAutoResolving = false
        }
    }
    
    private var initialAlerts: [SystemAlert] {
        [
            SystemAlert(
                id: UUID(),
                title: "Kafka Consumer Lag Spike",
                description: "topic: payments.events lag 45s",
                severity: .critical,
                source: "Confluent MSK",
                timeAgo: "2 min ago",
                isResolved: false
            ),
            SystemAlert(
                id: UUID(),
                title: "Snowflake Query Timeout",
                description: "DW query > 300s threshold",
                severity: .warning,
                source: "Snowflake DW",
                timeAgo: "8 min ago",
                isResolved: false
            ),
            SystemAlert(
                id: UUID(),
                title: "Feature Store Cache Miss",
                description: "online serving cache 78% miss rate",
                severity: .warning,
                source: "Feature Store",
                timeAgo: "15 min ago",
                isResolved: false
            ),
            SystemAlert(
                id: UUID(),
                title: "Pipeline auto-healed",
                description: "orders_daily_agg recovered",
                severity: .info,
                source: "Airflow",
                timeAgo: "22 min ago",
                isResolved: true
            ),
            SystemAlert(
                id: UUID(),
                title: "Schema drift detected",
                description: "customer_events added 2 columns",
                severity: .info,
                source: "Schema Registry",
                timeAgo: "1h ago",
                isResolved: true
            )
        ]
    }
    
    private var systemMonitoring: [(system: String, health: Double)] {
        [
            ("Confluent/MSK", 99.8),
            ("Flink Cluster", 100.0),
            ("Snowflake", 99.9),
            ("Airflow", 98.4),
            ("Feature Store", 99.2)
        ]
    }
}

enum AlertSeverity: String {
    case critical = "critical"
    case warning = "warning"
    case info = "info"
    
    var color: Color {
        switch self {
        case .critical:
            return .red
        case .warning:
            return .yellow
        case .info:
            return .blue
        }
    }
    
    var systemImage: String {
        switch self {
        case .critical:
            return "exclamationmark.circle.fill"
        case .warning:
            return "exclamationmark.triangle.fill"
        case .info:
            return "info.circle.fill"
        }
    }
}

struct SystemAlert: Identifiable {
    let id: UUID
    let title: String
    let description: String
    let severity: AlertSeverity
    let source: String
    let timeAgo: String
    var isResolved: Bool
}

struct SystemAlertCard: View {
    let alert: SystemAlert
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: alert.severity.systemImage)
                    .font(.title3)
                    .foregroundColor(alert.severity.color)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(alert.title)
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    Text(alert.description)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                if alert.isResolved {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }
            }
            
            HStack(spacing: 12) {
                HStack(spacing: 4) {
                    Image(systemName: "building.2")
                        .font(.caption)
                        .foregroundColor(.gray)
                    
                    Text(alert.source)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundColor(.gray)
                    
                    Text(alert.timeAgo)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
            }
        }
        .padding()
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .cornerRadius(8)
        .opacity(alert.isResolved ? 0.6 : 1.0)
    }
}

struct PipelineHealthFlowView: View {
    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 4) {
                PipelineStage(label: "Ingest", health: 100)
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                    .font(.caption)
                
                PipelineStage(label: "Process", health: 100)
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                    .font(.caption)
                
                PipelineStage(label: "Store", health: 99)
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                    .font(.caption)
                
                PipelineStage(label: "Quality", health: 98)
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                    .font(.caption)
                
                PipelineStage(label: "Serve", health: 100)
            }
        }
        .padding()
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .cornerRadius(8)
    }
}

struct PipelineStage: View {
    let label: String
    let health: Int
    
    var statusColor: Color {
        if health == 100 {
            return .green
        } else if health >= 95 {
            return .yellow
        } else {
            return .red
        }
    }
    
    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: "checkmark.circle.fill")
                .font(.caption)
                .foregroundColor(statusColor)
            
            Text(label)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
            
            Text("\(health)%")
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(6)
        .background(Color.white)
        .cornerRadius(4)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(statusColor.opacity(0.3), lineWidth: 1)
        )
    }
}

struct SystemMonitoringRow: View {
    let system: String
    let health: Double
    
    var healthColor: Color {
        if health >= 99.5 {
            return .green
        } else if health >= 98.0 {
            return .yellow
        } else {
            return .red
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(system)
                    .font(.headline)
                    .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                
                Spacer()
                
                Text(String(format: "%.1f%%", health))
                    .font(.headline)
                    .foregroundColor(healthColor)
            }
            
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(red: 0.97, green: 0.98, blue: 0.99))
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(healthColor)
                        .frame(width: geo.size.width * (health / 100))
                }
            }
            .frame(height: 8)
        }
        .padding()
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .cornerRadius(8)
    }
}

// MARK: - Stat Card
private struct OpsStatCard: View {
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
    OperationsView()
        .environmentObject(PlatformViewModel())
}
