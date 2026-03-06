import SwiftUI

struct ContentView: View {
    @EnvironmentObject var vm: PlatformViewModel
    @State private var selectedTab: Tab = .dashboard

    enum Tab: String, CaseIterable {
        case dashboard  = "Dashboard"
        case publish    = "Publish"
        case pipelines  = "Pipelines"
        case semantic   = "Semantic"
        case quality    = "Quality"
        case workspace  = "Agent"

        var systemImage: String {
            switch self {
            case .dashboard:  return "square.grid.2x2.fill"
            case .publish:    return "arrow.up.circle.fill"
            case .pipelines:  return "arrow.triangle.branch"
            case .semantic:   return "brain"
            case .quality:    return "checkmark.shield.fill"
            case .workspace:  return "bubble.left.and.bubble.right.fill"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView(selectedTab: $selectedTab)
                .tabItem { Label(Tab.dashboard.rawValue, systemImage: Tab.dashboard.systemImage) }
                .tag(Tab.dashboard)

            PublishingView()
                .tabItem { Label(Tab.publish.rawValue, systemImage: Tab.publish.systemImage) }
                .tag(Tab.publish)

            PipelinesView()
                .tabItem { Label(Tab.pipelines.rawValue, systemImage: Tab.pipelines.systemImage) }
                .tag(Tab.pipelines)

            SemanticEngineView()
                .tabItem { Label(Tab.semantic.rawValue, systemImage: Tab.semantic.systemImage) }
                .tag(Tab.semantic)

            DataQualityView()
                .tabItem { Label(Tab.quality.rawValue, systemImage: Tab.quality.systemImage) }
                .tag(Tab.quality)

            AnalystWorkspaceView()
                .tabItem { Label(Tab.workspace.rawValue, systemImage: Tab.workspace.systemImage) }
                .tag(Tab.workspace)
        }
        .accentColor(Color("AccentCyan"))
    }
}

// MARK: - Shared UI Components

struct PillarHeaderView: View {
    let title: String
    let subtitle: String
    var actionLabel: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.title2).bold()
                        .foregroundColor(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                if let label = actionLabel, let action = action {
                    Button(action: action) {
                        Label(label, systemImage: "plus")
                            .font(.subheadline).bold()
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Color("AccentCyan"))
                            .foregroundColor(.white)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }
}

struct StatusBadge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption2).bold()
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .foregroundColor(color)
            .clipShape(Capsule())
    }
}

struct CardView<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }

    var body: some View {
        content
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
    }
}

struct QualityScoreRing: View {
    let score: Double
    let size: CGFloat

    var ringColor: Color {
        score >= 0.95 ? .green : score >= 0.85 ? Color("AccentCyan") : .orange
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(.systemGray5), lineWidth: 5)
            Circle()
                .trim(from: 0, to: score)
                .stroke(ringColor, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.8), value: score)
            Text("\(Int(score * 100))%")
                .font(.system(size: size * 0.22, weight: .bold, design: .rounded))
                .foregroundColor(ringColor)
        }
        .frame(width: size, height: size)
    }
}
