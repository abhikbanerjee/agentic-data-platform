import SwiftUI

struct SemanticEngineView: View {
    @State private var searchText: String = ""
    @State private var selectedEntity: KGEntityInfo? = nil

    let entities: [KGEntityInfo] = KGEntityInfo.samples

    var filteredEntities: [KGEntityInfo] {
        searchText.isEmpty ? entities : entities.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.domain.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PillarHeaderView(
                        title: "Semantic Engine",
                        subtitle: "Unified metadata registry, knowledge graph & semantic search"
                    )

                    // Stats row
                    HStack(spacing: 12) {
                        MiniStatCard(value: "1,842", label: "Entities", icon: "cylinder.fill", color: Color("AccentCyan"))
                        MiniStatCard(value: "8,431", label: "Relations", icon: "arrow.triangle.branch", color: .purple)
                        MiniStatCard(value: "< 2s", label: "Discovery", icon: "bolt.fill", color: .orange)
                    }
                    .padding(.horizontal)

                    // Semantic search
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "magnifyingglass").foregroundColor(.secondary)
                            TextField("Semantic search — e.g. 'customer lifetime value'", text: $searchText)
                                .font(.subheadline)
                        }
                        .padding(12)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
                        .padding(.horizontal)

                        if !searchText.isEmpty {
                            CardView {
                                VStack(spacing: 0) {
                                    ForEach(["customer.ltv", "revenue_attribution.channel_revenue", "orders_fact.total_revenue"].prefix(3), id: \.self) { result in
                                        HStack(spacing: 10) {
                                            Image(systemName: "cylinder.fill").font(.caption).foregroundColor(Color("AccentCyan"))
                                            Text(result).font(.subheadline).foregroundColor(.primary)
                                            Spacer()
                                            Image(systemName: "arrow.up.right").font(.caption2).foregroundColor(.secondary)
                                        }
                                        .padding(.horizontal, 14).padding(.vertical, 11)
                                        if result != "orders_fact.total_revenue" { Divider().padding(.leading, 36) }
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }

                    // Knowledge Graph
                    VStack(alignment: .leading, spacing: 8) {
                        Text("KNOWLEDGE GRAPH")
                            .font(.caption).bold().foregroundColor(.secondary)
                            .padding(.horizontal)
                        CardView {
                            KnowledgeGraphView(selectedEntity: $selectedEntity, entities: entities)
                                .frame(height: 260)
                                .padding(8)
                        }
                        .padding(.horizontal)
                    }

                    // Entity detail panel
                    if let entity = selectedEntity {
                        EntityDetailCard(entity: entity)
                            .padding(.horizontal)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    // Entity Registry
                    VStack(alignment: .leading, spacing: 8) {
                        Text("ENTITY REGISTRY")
                            .font(.caption).bold().foregroundColor(.secondary)
                            .padding(.horizontal)
                        CardView {
                            VStack(spacing: 0) {
                                ForEach(filteredEntities) { entity in
                                    Button {
                                        withAnimation(.spring()) {
                                            selectedEntity = selectedEntity?.id == entity.id ? nil : entity
                                        }
                                    } label: {
                                        EntityRegistryRow(entity: entity, isSelected: selectedEntity?.id == entity.id)
                                    }
                                    .buttonStyle(.plain)
                                    if entity.id != filteredEntities.last?.id { Divider().padding(.leading, 52) }
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Semantic Engine")
            .navigationBarTitleDisplayMode(.inline)
            .animation(.easeInOut, value: selectedEntity?.id)
        }
    }
}

// MARK: - Knowledge Graph Canvas
struct KnowledgeGraphView: View {
    @Binding var selectedEntity: KGEntityInfo?
    let entities: [KGEntityInfo]

    // Layout positions (normalized 0-1)
    private let nodeLayout: [(id: String, x: CGFloat, y: CGFloat)] = [
        ("customer",  0.38, 0.45),
        ("order",     0.60, 0.22),
        ("product",   0.60, 0.68),
        ("payment",   0.82, 0.22),
        ("revenue",   0.82, 0.68),
        ("event",     0.16, 0.22),
        ("segment",   0.16, 0.68),
        ("crm",       0.38, 0.82),
    ]
    private let edges: [(from: String, to: String)] = [
        ("customer","order"), ("customer","product"), ("customer","event"),
        ("customer","segment"), ("customer","crm"), ("order","payment"),
        ("product","revenue"), ("payment","revenue")
    ]

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Edges
                ForEach(edges, id: \.from) { edge in
                    if let f = nodeLayout.first(where: { $0.id == edge.from }),
                       let t = nodeLayout.first(where: { $0.id == edge.to }) {
                        Path { p in
                            p.move(to: CGPoint(x: f.x * geo.size.width, y: f.y * geo.size.height))
                            p.addLine(to: CGPoint(x: t.x * geo.size.width, y: t.y * geo.size.height))
                        }
                        .stroke(Color(.systemGray4), lineWidth: 1.5)
                    }
                }
                // Nodes
                ForEach(nodeLayout, id: \.id) { node in
                    if let entity = entities.first(where: { $0.id == node.id }) {
                        let isSelected = selectedEntity?.id == entity.id
                        let size: CGFloat = entity.id == "customer" ? 42 : 32
                        Button {
                            withAnimation(.spring()) {
                                selectedEntity = isSelected ? nil : entity
                            }
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(entity.nodeColor)
                                    .frame(width: size, height: size)
                                    .shadow(color: entity.nodeColor.opacity(isSelected ? 0.6 : 0.2),
                                            radius: isSelected ? 10 : 4)
                                Text(String(entity.name.prefix(2)))
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white)
                            }
                        }
                        .buttonStyle(.plain)
                        .position(x: node.x * geo.size.width, y: node.y * geo.size.height)
                        .overlay(
                            Text(entity.name)
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundColor(.secondary)
                                .position(x: node.x * geo.size.width,
                                          y: node.y * geo.size.height + size / 2 + 10),
                            alignment: .topLeading
                        )
                        .scaleEffect(isSelected ? 1.2 : 1.0)
                    }
                }
            }
        }
    }
}

// MARK: - Supporting Views & Models

private struct MiniStatCard: View {
    let value, label, icon: String
    let color: Color
    var body: some View {
        CardView {
            HStack(spacing: 10) {
                Image(systemName: icon).font(.subheadline).foregroundColor(color)
                VStack(alignment: .leading, spacing: 2) {
                    Text(value).font(.subheadline).bold()
                    Text(label).font(.caption2).foregroundColor(.secondary)
                }
            }
            .padding(12)
        }
    }
}

private struct EntityRegistryRow: View {
    let entity: KGEntityInfo
    let isSelected: Bool
    var body: some View {
        HStack(spacing: 12) {
            Text(String(entity.name.prefix(1)))
                .font(.headline).bold().foregroundColor(.white)
                .frame(width: 36, height: 36)
                .background(entity.nodeColor)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 3) {
                Text(entity.name).font(.subheadline).bold().foregroundColor(.primary)
                Text("\(entity.domain) · \(entity.attributeCount) attrs · \(entity.relationCount) relations")
                    .font(.caption2).foregroundColor(.secondary)
            }
            Spacer()
            Image(systemName: isSelected ? "chevron.up" : "chevron.right")
                .font(.caption2).foregroundColor(.secondary)
        }
        .padding(.horizontal).padding(.vertical, 11)
        .background(isSelected ? Color("AccentCyan").opacity(0.05) : Color.clear)
    }
}

private struct EntityDetailCard: View {
    let entity: KGEntityInfo
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 12) {
                    Image(systemName: "cylinder.fill")
                        .foregroundColor(entity.nodeColor)
                        .frame(width: 38, height: 38)
                        .background(entity.nodeColor.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entity.name).font(.headline).bold()
                        Text(entity.entityType).font(.caption).foregroundColor(.secondary)
                    }
                }

                HStack(spacing: 20) {
                    MetaPair(label: "Domain",  value: entity.domain)
                    MetaPair(label: "Owner",   value: entity.owner)
                    MetaPair(label: "Updated", value: entity.updatedAt)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("ATTRIBUTES").font(.caption2).bold().foregroundColor(.secondary)
                    FlowLayout(items: entity.attributes) { attr in
                        Text(attr).font(.system(.caption2, design: .monospaced))
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("SOURCES").font(.caption2).bold().foregroundColor(.secondary)
                    ForEach(entity.sources, id: \.self) { source in
                        HStack(spacing: 6) {
                            Image(systemName: "link").font(.caption2)
                            Text(source).font(.caption)
                        }
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Color("AccentCyan").opacity(0.08))
                        .foregroundColor(Color("AccentCyan"))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
            .padding(16)
        }
    }
}

private struct MetaPair: View {
    let label, value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.caption2).foregroundColor(.secondary)
            Text(value).font(.caption).bold()
        }
    }
}

struct FlowLayout<T: Identifiable, Content: View>: View {
    let items: [T]
    let content: (T) -> Content
    var body: some View {
        // Simple wrapping layout using LazyVGrid as approximation
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], alignment: .leading, spacing: 6) {
            ForEach(items) { item in content(item) }
        }
    }
}

// MARK: - KGEntityInfo

struct KGEntityInfo: Identifiable {
    let id: String
    let name: String
    let entityType: String
    let domain: String
    let owner: String
    let updatedAt: String
    let nodeColor: Color
    let attributes: [AttributeItem]
    let sources: [String]
    let attributeCount: Int
    let relationCount: Int
}

struct AttributeItem: Identifiable {
    let id = UUID()
    let value: String
}

extension KGEntityInfo {
    static let samples: [KGEntityInfo] = [
        KGEntityInfo(id: "customer", name: "Customer", entityType: "Entity", domain: "CRM", owner: "data-platform", updatedAt: "2m ago",
                     nodeColor: Color("AccentCyan"),
                     attributes: ["customer_id","name","email","segment_id","ltv","churn_score"].map { AttributeItem(value: $0) },
                     sources: ["Snowflake DW", "CRM API"], attributeCount: 12, relationCount: 5),
        KGEntityInfo(id: "order", name: "Order", entityType: "Entity", domain: "Commerce", owner: "commerce-team", updatedAt: "5m ago",
                     nodeColor: .purple,
                     attributes: ["order_id","customer_id","total","status","created_at"].map { AttributeItem(value: $0) },
                     sources: ["PostgreSQL"], attributeCount: 8, relationCount: 3),
        KGEntityInfo(id: "product", name: "Product", entityType: "Entity", domain: "Catalog", owner: "product-team", updatedAt: "1h ago",
                     nodeColor: .green,
                     attributes: ["product_id","name","category_id","price","sku"].map { AttributeItem(value: $0) },
                     sources: ["PostgreSQL","S3"], attributeCount: 15, relationCount: 4),
        KGEntityInfo(id: "payment", name: "Payment", entityType: "Entity", domain: "Finance", owner: "finance-team", updatedAt: "15m ago",
                     nodeColor: .orange,
                     attributes: ["payment_id","order_id","amount","method","status"].map { AttributeItem(value: $0) },
                     sources: ["Payment Gateway"], attributeCount: 7, relationCount: 2),
        KGEntityInfo(id: "revenue", name: "Revenue", entityType: "Metric", domain: "Finance", owner: "analytics", updatedAt: "1d ago",
                     nodeColor: .yellow,
                     attributes: ["revenue_id","source","amount","period","channel"].map { AttributeItem(value: $0) },
                     sources: ["DW Aggregation"], attributeCount: 5, relationCount: 2),
        KGEntityInfo(id: "event", name: "Event", entityType: "Entity", domain: "Behavioral", owner: "platform-team", updatedAt: "Live",
                     nodeColor: .red,
                     attributes: ["event_id","customer_id","type","timestamp","properties"].map { AttributeItem(value: $0) },
                     sources: ["Kafka"], attributeCount: 9, relationCount: 2),
        KGEntityInfo(id: "segment", name: "Segment", entityType: "Concept", domain: "Marketing", owner: "growth-team", updatedAt: "6h ago",
                     nodeColor: Color("AccentCyan"),
                     attributes: ["segment_id","name","criteria","size","last_computed"].map { AttributeItem(value: $0) },
                     sources: ["ML Pipeline"], attributeCount: 5, relationCount: 3),
        KGEntityInfo(id: "crm", name: "CRM Source", entityType: "Source", domain: "CRM", owner: "sales-team", updatedAt: "30m ago",
                     nodeColor: .purple,
                     attributes: ["crm_id","sf_account_id","stage","arr","csm"].map { AttributeItem(value: $0) },
                     sources: ["Salesforce API"], attributeCount: 6, relationCount: 1),
    ]
}
