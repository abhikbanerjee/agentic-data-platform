import SwiftUI

struct GovernanceView: View {
    @EnvironmentObject var vm: PlatformViewModel
    
    @State private var isAutoTagging = false
    @State private var tagsDone = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PillarHeaderView(
                        title: "Governance & Mesh",
                        subtitle: "Immuta policies · Data Mesh control plane · Entitlements"
                    )
                    
                    // Stats Cards
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        GovStatCard(value: "47",    label: "Active Policies",  icon: "lock.shield",           color: Color("AccentCyan"))
                        GovStatCard(value: "12",    label: "Data Contracts",   icon: "doc.text",              color: Color("AccentCyan"))
                        GovStatCard(value: "8",     label: "Pending Requests", icon: "clock",                 color: Color("AccentCyan"))
                        GovStatCard(value: "99.1%", label: "Compliance",       icon: "checkmark.circle.fill", color: Color("AccentCyan"))
                    }
                    .padding(.horizontal)
                    
                    // Data Mesh Domains
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Data Mesh Domains")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        ForEach(meshDomains) { domain in
                            MeshDomainCard(domain: domain)
                        }
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // Immuta Policies
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Immuta Policies")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        ForEach(immutaPolicies) { policy in
                            ImmutaPolicyRow(policy: policy)
                        }
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // Control Plane Capabilities
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Control Plane Capabilities")
                            .font(.headline)
                            .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            ForEach(capabilities, id: \.self) { capability in
                                VStack {
                                    Text(capability)
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.white)
                                        .multilineTextAlignment(.center)
                                        .padding(8)
                                }
                                .frame(minHeight: 50)
                                .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                                .cornerRadius(8)
                            }
                        }
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    
                    // Auto-Tag Button
                    Button(action: autoTagAssets) {
                        HStack {
                            if isAutoTagging {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .scaleEffect(0.8)
                            } else if tagsDone {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Image(systemName: "tag.fill")
                            }
                            Text("Auto-Tag Assets")
                            Spacer()
                        }
                        .padding()
                        .foregroundColor(.white)
                        .background(Color(red: 0.08, green: 0.10, blue: 0.20))
                        .cornerRadius(8)
                    }
                    .disabled(isAutoTagging)
                    
                    // Success Banner
                    if tagsDone {
                        VStack(spacing: 8) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Assets tagged successfully")
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
            .navigationTitle("Governance & Mesh")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func autoTagAssets() {
        isAutoTagging = true
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            tagsDone = true
            isAutoTagging = false
        }
    }
    
    private var capabilities: [String] {
        ["Manage Publishers", "Manage Consumers", "Tag-based Access", "Credential Vending", "AD Group Creation", "Audit & Compliance"]
    }
    
    private var meshDomains: [MeshDomain] {
        [
            MeshDomain(id: UUID(), name: "Customer 360", publisher: "CRM Team", consumers: 14, contracts: 3, status: "active"),
            MeshDomain(id: UUID(), name: "Commerce", publisher: "Commerce Team", consumers: 22, contracts: 4, status: "active"),
            MeshDomain(id: UUID(), name: "Finance", publisher: "Finance Team", consumers: 8, contracts: 2, status: "active"),
            MeshDomain(id: UUID(), name: "Behavioral", publisher: "Platform Team", consumers: 31, contracts: 5, status: "active")
        ]
    }
    
    private var immutaPolicies: [ImmutaPolicy] {
        [
            ImmutaPolicy(id: UUID(), name: "PII Masking", type: "Data Masking", datasets: 142, users: 890, active: true),
            ImmutaPolicy(id: UUID(), name: "GDPR Compliance", type: "Purpose Limitation", datasets: 89, users: 450, active: true),
            ImmutaPolicy(id: UUID(), name: "Row-Level Security", type: "Access Control", datasets: 234, users: 1200, active: true),
            ImmutaPolicy(id: UUID(), name: "Attribute Encryption", type: "Encryption", datasets: 67, users: 230, active: true)
        ]
    }
}

struct MeshDomain: Identifiable {
    let id: UUID
    let name: String
    let publisher: String
    let consumers: Int
    let contracts: Int
    let status: String
}

struct ImmutaPolicy: Identifiable {
    let id: UUID
    let name: String
    let type: String
    let datasets: Int
    let users: Int
    let active: Bool
}

struct MeshDomainCard: View {
    let domain: MeshDomain
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(domain.name)
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    Text(domain.publisher)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                StatusBadge(
                    text: domain.status.capitalized,
                    color: .green
                )
            }
            
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(domain.consumers)")
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    Text("Consumers")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Divider()
                    .frame(height: 40)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(domain.contracts)")
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    Text("Contracts")
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

struct ImmutaPolicyRow: View {
    let policy: ImmutaPolicy
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(policy.name)
                        .font(.headline)
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    
                    Text(policy.type)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                Image(systemName: policy.active ? "toggle.2" : "toggle.power.off")
                    .foregroundColor(policy.active ? Color("AccentCyan") : .gray)
            }
            
            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Image(systemName: "table.fill")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text("\(policy.datasets) datasets")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Divider()
                    .frame(height: 14)
                
                HStack(spacing: 4) {
                    Image(systemName: "person.fill")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text("\(policy.users) users")
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

// MARK: - Stat Card
private struct GovStatCard: View {
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
    GovernanceView()
        .environmentObject(PlatformViewModel())
}
