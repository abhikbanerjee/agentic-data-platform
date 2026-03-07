import SwiftUI

struct MLPlatformView: View {
    @EnvironmentObject var vm: PlatformViewModel
    
    @State private var isDeploying = false
    @State private var deployDone = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PillarHeaderView(
                        title: "ML Platform",
                        subtitle: "Infinite AI · Model lifecycle · Vector DB · Feature pipelines"
                    )
                    
                    // Stats Cards
                    HStack(spacing: 12) {
                        CardView(
                            title: "24",
                            subtitle: "Models Deployed",
                            color: Color("AccentCyan"),
                            icon: "square.and.arrow.up"
                        )
                        CardView(
                            title: "94.2%",
                            subtitle: "Avg Accuracy",
                            color: Color("AccentCyan"),
                            icon: "chart.bar.fill"
                        )
                    }
                    
                    HStack(spacing: 12) {
                        CardView(
                            title: "38ms",
                            subtitle: "P99 Latency",
                            color: Color("AccentCyan"),
                            icon: "bolt.fill"
                        )
                        CardView(
                            title: "2.1B",
                            subtitle: "Vectors",
                            color: Color("AccentCyan"),
                            icon: "square.stack.3d.up.fill"
                        )
                    }
                    
                    // ML Lifecycle Pipeline
                    VStack(alignment: .leading, spacing: 12) {
                        Text("ML Lifecycle")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        MLLifecycleView()
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // ML Models
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Deployed Models")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        ForEach(mlModels) { model in
                            MLModelCard(model: model)
                        }
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // Vector Database
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Vector Database")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        VectorDBCard()
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // Deploy Button
                    Button(action: deployModel) {
                        HStack {
                            if isDeploying {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .scaleEffect(0.8)
                            } else if deployDone {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Image(systemName: "rocket.fill")
                            }
                            Text("Deploy Model v3.3")
                            Spacer()
                        }
                        .padding()
                        .foregroundColor(.white)
                        .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                        .cornerRadius(8)
                    }
                    .disabled(isDeploying)
                    
                    // Success Banner
                    if deployDone {
                        VStack(spacing: 8) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Model deployed successfully")
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
            .navigationTitle("ML Platform")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func deployModel() {
        isDeploying = true
        Task {
            try? await Task.sleep(nanoseconds: 2_500_000_000)
            deployDone = true
            isDeploying = false
        }
    }
    
    private var mlModels: [MLModel] {
        [
            MLModel(id: UUID(), name: "Customer Churn", framework: "XGBoost", version: "v3.2", accuracy: 0.923, latency: 28, status: .deployed, tool: "Infinite AI"),
            MLModel(id: UUID(), name: "Revenue Forecast", framework: "LSTM", version: "v2.1", accuracy: 0.891, latency: 45, status: .deployed, tool: "Infinite AI"),
            MLModel(id: UUID(), name: "Anomaly Detection", framework: "Isolation Forest", version: "v1.4", accuracy: 0.967, latency: 12, status: .deployed, tool: "Arthur.ai"),
            MLModel(id: UUID(), name: "Segment Classifier", framework: "Random Forest", version: "v5.0", accuracy: 0.944, latency: 19, status: .deployed, tool: "LUMA"),
            MLModel(id: UUID(), name: "LTV Predictor", framework: "Gradient Boost", version: "v2.3", accuracy: 0.912, latency: 33, status: .monitoring, tool: "Infinite AI"),
            MLModel(id: UUID(), name: "Fraud Detector", framework: "Neural Net", version: "v4.1", accuracy: 0.988, latency: 8, status: .deployed, tool: "Arthur.ai")
        ]
    }
}

enum ModelStatus: String {
    case training = "training"
    case deployed = "deployed"
    case monitoring = "monitoring"
    case deprecated = "deprecated"
    
    var color: Color {
        switch self {
        case .training:
            return .orange
        case .deployed:
            return .green
        case .monitoring:
            return .yellow
        case .deprecated:
            return .red
        }
    }
}

struct MLModel: Identifiable {
    let id: UUID
    let name: String
    let framework: String
    let version: String
    let accuracy: Double
    let latency: Int
    let status: ModelStatus
    let tool: String
}

struct MLLifecycleView: View {
    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 4) {
                LifecycleStage(label: "Develop", tool: "Infinite AI", color: .blue)
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                    .font(.caption)
                
                LifecycleStage(label: "Train", tool: "Infinite AI", color: .blue)
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                    .font(.caption)
                
                LifecycleStage(label: "Serve", tool: "Online/Offline", color: Color("AccentCyan"))
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                    .font(.caption)
                
                LifecycleStage(label: "Monitor", tool: "Arthur.ai", color: .orange)
                
                Image(systemName: "arrow.right")
                    .foregroundColor(.gray)
                    .font(.caption)
                
                LifecycleStage(label: "Registry", tool: "LUMA", color: .purple)
            }
        }
        .padding()
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .cornerRadius(8)
    }
}

struct LifecycleStage: View {
    let label: String
    let tool: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundColor(.white)
            
            Text(tool)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity)
        .padding(6)
        .background(color)
        .cornerRadius(4)
    }
}

struct MLModelCard: View {
    let model: MLModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(model.name)
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    HStack(spacing: 8) {
                        Text(model.framework)
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text(model.version)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                
                Spacer()
                
                StatusBadge(
                    text: model.status.rawValue.capitalized,
                    color: model.status.color
                )
            }
            
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Image(systemName: "chart.bar.fill")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text("Accuracy")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    
                    Text(String(format: "%.1f%%", model.accuracy * 100))
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                }
                
                Divider()
                    .frame(height: 40)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Image(systemName: "bolt.fill")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text("Latency")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    
                    Text("\(model.latency)ms")
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                }
                
                Spacer()
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Tool")
                        .font(.caption)
                        .foregroundColor(.gray)
                    
                    Text(model.tool)
                        .font(.caption2)
                        .foregroundColor(Color(red: 0.08, green: 0.10, blue: 0.20))
                }
            }
        }
        .padding()
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .cornerRadius(8)
    }
}

struct VectorDBCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Pinecone / Weaviate")
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    Text("TBD - Evaluation phase")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                StatusBadge(
                    text: "Active",
                    color: .green
                )
            }
            
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("2.1B")
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    Text("Vectors Indexed")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Divider()
                    .frame(height: 40)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("1536")
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    Text("Dimensions")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Divider()
                    .frame(height: 40)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("< 5ms")
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    Text("Search Latency")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
            }
        }
        .padding()
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .cornerRadius(8)
    }
}

#Preview {
    MLPlatformView()
        .environmentObject(PlatformViewModel())
}
