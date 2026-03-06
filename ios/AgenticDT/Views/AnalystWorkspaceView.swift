import SwiftUI

struct AnalystWorkspaceView: View {
    @EnvironmentObject var vm: PlatformViewModel
    @State private var inputText: String = ""
    @State private var showDeployBanner: Bool = false
    @FocusState private var isFocused: Bool

    private let quickSuggestions = [
        "Revenue by channel", "Customer segments", "Pipeline status", "Quality issues"
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Agent header
                AgentHeader()

                // Chat messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 14) {
                            if vm.chatMessages.isEmpty {
                                EmptyStateView()
                                    .padding(.top, 60)
                            } else {
                                ForEach(vm.chatMessages) { message in
                                    MessageBubble(message: message)
                                        .id(message.id)
                                }
                                if vm.isAgentTyping {
                                    TypingIndicator()
                                }
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 16)
                        .id("bottom")
                    }
                    .onChange(of: vm.chatMessages.count) { _ in
                        withAnimation { proxy.scrollTo("bottom", anchor: .bottom) }
                    }
                    .onChange(of: vm.isAgentTyping) { _ in
                        withAnimation { proxy.scrollTo("bottom", anchor: .bottom) }
                    }
                }

                // Deploy banner
                if showDeployBanner {
                    DeployBanner { showDeployBanner = false }
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                // Input area
                VStack(spacing: 10) {
                    // Quick suggest chips
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(quickSuggestions, id: \.self) { suggestion in
                                Button { inputText = suggestion } label: {
                                    Text(suggestion)
                                        .font(.caption).bold()
                                        .padding(.horizontal, 12).padding(.vertical, 7)
                                        .background(Color("AccentCyan").opacity(0.1))
                                        .foregroundColor(Color("AccentCyan"))
                                        .overlay(Capsule().stroke(Color("AccentCyan").opacity(0.3), lineWidth: 1))
                                        .clipShape(Capsule())
                                }
                            }
                        }
                        .padding(.horizontal, 14)
                    }

                    // Text input row
                    HStack(spacing: 10) {
                        TextField("Ask about your data…", text: $inputText, axis: .vertical)
                            .font(.subheadline)
                            .padding(12)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .focused($isFocused)
                            .lineLimit(1...4)
                            .submitLabel(.send)
                            .onSubmit { sendMessage() }

                        Button(action: sendMessage) {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.title)
                                .foregroundColor(inputText.isEmpty ? Color(.systemGray4) : Color("AccentCyan"))
                        }
                        .disabled(inputText.isEmpty || vm.isAgentTyping)
                    }
                    .padding(.horizontal, 14)
                }
                .padding(.vertical, 10)
                .background(Color(.systemBackground))
                .overlay(Divider(), alignment: .top)
            }
            .navigationTitle("Data Agent")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color(.systemGroupedBackground))
            .animation(.easeInOut, value: showDeployBanner)
        }
    }

    private func sendMessage() {
        guard !inputText.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        let query = inputText
        inputText = ""
        isFocused = false
        Task {
            await vm.sendMessage(query)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                withAnimation { showDeployBanner = true }
            }
        }
    }
}

// MARK: - Sub-views

private struct AgentHeader: View {
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Color("AccentCyan")).frame(width: 40, height: 40)
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.subheadline).foregroundColor(.white)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Data Agent").font(.subheadline).bold()
                HStack(spacing: 5) {
                    Circle().fill(.green).frame(width: 7, height: 7)
                    Text("Online · GPT-4 + Custom Models")
                        .font(.caption2).foregroundColor(.secondary)
                }
            }
            Spacer()
            Image(systemName: "ellipsis.circle")
                .font(.title3).foregroundColor(.secondary)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(Color(.systemBackground))
        .overlay(Divider(), alignment: .bottom)
    }
}

private struct MessageBubble: View {
    let message: ChatMessage
    var isUser: Bool { message.role == .user }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isUser { Spacer(minLength: 40) }

            if !isUser {
                ZStack {
                    Circle().fill(Color("AccentCyan")).frame(width: 30, height: 30)
                    Image(systemName: "bubble.left.fill").font(.caption).foregroundColor(.white)
                }
                .alignmentGuide(.bottom) { d in d[.bottom] }
            }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.subheadline)
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(isUser ? Color("AccentCyan") : Color(.systemBackground))
                    .foregroundColor(isUser ? .white : .primary)
                    .clipShape(
                        RoundedCornerShape(radius: 18, corners: isUser
                            ? [.topLeft, .topRight, .bottomLeft]
                            : [.topLeft, .topRight, .bottomRight])
                    )
                    .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 1)

                Text(message.timestamp, format: .dateTime.hour().minute())
                    .font(.system(size: 10)).foregroundColor(.secondary)
            }

            if !isUser { Spacer(minLength: 40) }

            if isUser {
                Circle().fill(Color(.systemGray4)).frame(width: 30, height: 30)
                    .overlay(Text("A").font(.caption).bold().foregroundColor(.white))
                    .alignmentGuide(.bottom) { d in d[.bottom] }
            }
        }
    }
}

private struct TypingIndicator: View {
    @State private var phase: CGFloat = 0

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            ZStack {
                Circle().fill(Color("AccentCyan")).frame(width: 30, height: 30)
                Image(systemName: "bubble.left.fill").font(.caption).foregroundColor(.white)
            }
            HStack(spacing: 5) {
                ForEach(0..<3) { i in
                    Circle().fill(Color(.systemGray4)).frame(width: 8, height: 8)
                        .offset(y: sin(phase + Double(i) * 0.8) * -4)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(Color(.systemBackground))
            .clipShape(RoundedCornerShape(radius: 18, corners: [.topLeft, .topRight, .bottomRight]))
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 1)
            Spacer()
        }
        .onAppear {
            withAnimation(.linear(duration: 0.8).repeatForever(autoreverses: false)) {
                phase = .pi * 2
            }
        }
    }
}

private struct DeployBanner: View {
    let onDismiss: () -> Void
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "rocket.fill").font(.title3).foregroundColor(.white)
            VStack(alignment: .leading, spacing: 2) {
                Text("Ready to Deploy").font(.subheadline).bold().foregroundColor(.white)
                Text("App generated, tested & verified. One tap to production.").font(.caption2).foregroundColor(.white.opacity(0.8))
            }
            Spacer()
            Button(action: onDismiss) {
                Text("Deploy 🚀")
                    .font(.caption).bold()
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(.white)
                    .foregroundColor(Color("AccentCyan"))
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(LinearGradient(colors: [Color("AccentCyan"), .blue], startPoint: .leading, endPoint: .trailing))
    }
}

private struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left.and.bubble.right.fill")
                .font(.system(size: 48)).foregroundColor(Color("AccentCyan").opacity(0.4))
            Text("Ask your Data Agent anything")
                .font(.headline).foregroundColor(.primary)
            Text("Query your data, build applications and deploy to production — all in plain English. No SQL or DevOps required.")
                .font(.subheadline).foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)
        }
    }
}

// MARK: - Custom Shape for chat bubbles

struct RoundedCornerShape: Shape {
    var radius: CGFloat
    var corners: UIRectCorner

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}
