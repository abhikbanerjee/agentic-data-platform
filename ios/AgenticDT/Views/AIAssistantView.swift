import SwiftUI

// MARK: - Local message model

private struct LocalMessage: Identifiable {
    let id = UUID()
    let role: MessageRole
    var content: String
    let timestamp: Date
    var pendingAction: AIAction? = nil
    var actionStatus: ActionStatus = .none
}

private enum MessageRole { case user, assistant }
private enum ActionStatus { case none, approved, rejected }

// MARK: - Action model (human-in-the-loop)

private struct AIAction: Identifiable {
    let id = UUID()
    let type: String
    let title: String
    let description: String
}

// MARK: - Main view

struct AIAssistantView: View {
    @EnvironmentObject var vm: PlatformViewModel

    @StateObject private var openAI  = OpenAIService()
    @StateObject private var speech  = SpeechManager()

    @State private var messages: [LocalMessage] = []
    @State private var inputText: String = ""
    @State private var isTyping: Bool = false
    @State private var isExecuting: Bool = false
    @State private var showSettings: Bool = false
    @FocusState private var isFocused: Bool

    private let bottomID = "chatBottom"

    private let quickPrompts = [
        "Create a data pipeline",
        "Register metadata",
        "Trigger self-healing",
        "Show quality issues",
        "Deploy ML model",
        "Data lineage report"
    ]

    // Platform-aware system prompt
    private var systemPrompt: String {
        """
        You are AgenticDT Assistant, the AI interface for the AgenticDT Agentic Driven Data Platform. \
        You help data engineers, platform teams, and analysts automate data operations.

        Platform context:
        - \(vm.pipelines.count) active pipelines (\(vm.activePipelineCount) healthy)
        - \(vm.dataSources.count) registered data sources
        - \(Int(vm.overallQualityScore * 100))% overall data quality score
        - \(vm.registeredSchemas) registered schemas
        - \(vm.activeAgentCount) active AI agents
        - Stack: Confluent/MSK, Apache Flink, Spark, Airflow, Snowflake, S3, Teradata, Immuta

        When you want to perform a platform action (create pipeline, register metadata, trigger \
        self-healing, fix quality, deploy model), embed EXACTLY ONE structured block at the end \
        of your message using this format — no deviations:
        [ACTION:{"type":"ACTION_TYPE","title":"Short title","description":"One sentence describing what will happen"}]

        Valid ACTION_TYPE values: CREATE_PIPELINE, REGISTER_METADATA, TRIGGER_HEALING, QUALITY_FIX, DEPLOY_MODEL

        Be concise. Use real-looking platform data. Always ask for approval before acting.
        """
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {

                // ── Agent header ──────────────────────────────────────
                AssistantHeader(openAI: openAI, showSettings: $showSettings)

                // ── Message list ──────────────────────────────────────
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 14) {
                            if messages.isEmpty {
                                AIEmptyStateView()
                                    .padding(.top, 60)
                            } else {
                                ForEach(messages) { msg in
                                    if msg.role == .user {
                                        UserBubble(text: msg.content, time: msg.timestamp)
                                    } else {
                                        AssistantBubble(
                                            text: msg.content,
                                            time: msg.timestamp,
                                            action: msg.pendingAction,
                                            actionStatus: msg.actionStatus,
                                            onApprove: { approve(messageID: msg.id) },
                                            onReject:  { reject(messageID: msg.id)  }
                                        )
                                    }
                                }
                                if isTyping   { AITypingIndicator() }
                                if isExecuting { ExecutingIndicator() }
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 16)

                        Color.clear.frame(height: 1).id(bottomID)
                    }
                    .onChange(of: messages.count) { _ in
                        scroll(proxy)
                    }
                    .onChange(of: isTyping) { _ in
                        scroll(proxy)
                    }
                    .onChange(of: isExecuting) { _ in
                        scroll(proxy)
                    }
                    // Live voice transcript shown while listening
                    .onChange(of: speech.transcript) { newTranscript in
                        inputText = newTranscript
                    }
                }

                // ── Error banner (speech permissions) ─────────────────
                if let err = speech.permissionError {
                    ErrorBanner(text: err)
                }

                // ── Input bar ─────────────────────────────────────────
                InputBar(
                    text: $inputText,
                    isFocused: $isFocused,
                    isListening: speech.isListening,
                    isBusy: isTyping || isExecuting,
                    quickPrompts: quickPrompts,
                    onSend: { Task { await send() } },
                    onMic: {
                        if speech.isListening { speech.stopListening() }
                        else { Task { await speech.startListening() } }
                    }
                )
            }
            .navigationTitle("AI Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color(.systemGroupedBackground))
            .sheet(isPresented: $showSettings) {
                SettingsSheet(openAI: openAI)
            }
        }
    }

    // MARK: - Helpers

    private func scroll(_ proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.25)) {
            proxy.scrollTo(bottomID, anchor: .bottom)
        }
    }

    // MARK: - Send message

    private func send() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        // Stop voice if active
        if speech.isListening { speech.stopListening() }

        inputText = ""
        isFocused = false

        // Append user message
        let userMsg = LocalMessage(role: .user, content: text, timestamp: Date())
        messages.append(userMsg)
        isTyping = true

        // Build history for OpenAI
        let history = buildHistory(adding: text)

        do {
            let reply = try await openAI.sendMessages(history)
            isTyping = false

            // Parse any embedded action
            let action  = parseAction(from: reply)
            let display = stripAction(from: reply)

            var botMsg = LocalMessage(role: .assistant, content: display, timestamp: Date())
            botMsg.pendingAction = action
            messages.append(botMsg)

        } catch {
            isTyping = false
            let errMsg = LocalMessage(
                role: .assistant,
                content: "⚠️ \(error.localizedDescription)",
                timestamp: Date()
            )
            messages.append(errMsg)
        }
    }

    // MARK: - Build OpenAI message history

    private func buildHistory(adding newUserText: String) -> [OpenAIService.Message] {
        var history: [OpenAIService.Message] = [
            .init(role: "system", content: systemPrompt)
        ]
        // Include previous turns (last 10 for token budget)
        let recent = messages.suffix(10)
        for m in recent {
            history.append(.init(role: m.role == .user ? "user" : "assistant", content: m.content))
        }
        history.append(.init(role: "user", content: newUserText))
        return history
    }

    // MARK: - Action parsing

    private func parseAction(from text: String) -> AIAction? {
        guard let range = text.range(of: #"\[ACTION:\{.*?\}\]"#, options: .regularExpression) else {
            return nil
        }
        let raw = String(text[range])
        // Extract JSON between [ACTION: and ]
        guard
            let jsonStart = raw.range(of: "{"),
            let jsonEnd   = raw.range(of: "}", options: .backwards)
        else { return nil }

        let jsonString = String(raw[jsonStart.lowerBound...jsonEnd.upperBound])
        guard
            let data = jsonString.data(using: .utf8),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
            let type  = json["type"],
            let title = json["title"],
            let desc  = json["description"]
        else { return nil }

        return AIAction(type: type, title: title, description: desc)
    }

    private func stripAction(from text: String) -> String {
        text.replacingOccurrences(
            of: #"\[ACTION:\{.*?\}\]"#,
            with: "",
            options: .regularExpression
        ).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Human-in-the-loop: Approve

    private func approve(messageID: UUID) {
        guard let idx = messages.firstIndex(where: { $0.id == messageID }) else { return }
        messages[idx].actionStatus = .approved

        let actionTitle = messages[idx].pendingAction?.title ?? "action"

        Task {
            isExecuting = true
            try? await Task.sleep(nanoseconds: 2_400_000_000)
            isExecuting = false

            let successMsg = LocalMessage(
                role: .assistant,
                content: "✅ **\(actionTitle)** completed successfully. The platform has been updated.",
                timestamp: Date()
            )
            messages.append(successMsg)
        }
    }

    // MARK: - Human-in-the-loop: Reject

    private func reject(messageID: UUID) {
        guard let idx = messages.firstIndex(where: { $0.id == messageID }) else { return }
        messages[idx].actionStatus = .rejected

        let cancelMsg = LocalMessage(
            role: .assistant,
            content: "Understood — action cancelled. Let me know if you'd like to try something different.",
            timestamp: Date()
        )
        messages.append(cancelMsg)
    }
}

// MARK: - Assistant header

private struct AssistantHeader: View {
    @ObservedObject var openAI: OpenAIService
    @Binding var showSettings: Bool

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: [Color("AccentCyan"), .blue],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 42, height: 42)
                Image(systemName: "brain.head.profile")
                    .font(.subheadline)
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("AgenticDT Assistant")
                    .font(.subheadline).bold()
                HStack(spacing: 5) {
                    Circle()
                        .fill(openAI.hasKey ? Color.green : Color.orange)
                        .frame(width: 7, height: 7)
                    Text(openAI.hasKey ? "Online · GPT-4o" : "No API key — tap ⚙️")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            Button { showSettings = true } label: {
                Image(systemName: "gearshape.fill")
                    .font(.title3)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
        .overlay(Divider(), alignment: .bottom)
    }
}

// MARK: - User bubble

private struct UserBubble: View {
    let text: String
    let time: Date

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            Spacer(minLength: 40)
            VStack(alignment: .trailing, spacing: 4) {
                Text(text)
                    .font(.subheadline)
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(Color("AccentCyan"))
                    .foregroundColor(.white)
                    .clipShape(RoundedCornerShape(radius: 18,
                                                  corners: [.topLeft, .topRight, .bottomLeft]))
                    .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
                Text(time, format: .dateTime.hour().minute())
                    .font(.system(size: 10)).foregroundColor(.secondary)
            }
            Circle()
                .fill(Color(.systemGray4))
                .frame(width: 30, height: 30)
                .overlay(Text("A").font(.caption).bold().foregroundColor(.white))
                .alignmentGuide(.bottom) { d in d[.bottom] }
        }
    }
}

// MARK: - Assistant bubble (with optional action card)

private struct AssistantBubble: View {
    let text: String
    let time: Date
    let action: AIAction?
    let actionStatus: ActionStatus
    let onApprove: () -> Void
    let onReject: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            // Avatar
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: [Color("AccentCyan"), .blue],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 30, height: 30)
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 11)).foregroundColor(.white)
            }
            .alignmentGuide(.bottom) { d in d[.bottom] }

            VStack(alignment: .leading, spacing: 8) {
                // Message text
                if !text.isEmpty {
                    Text(text)
                        .font(.subheadline)
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .background(Color(.systemBackground))
                        .foregroundColor(.primary)
                        .clipShape(RoundedCornerShape(radius: 18,
                                                      corners: [.topLeft, .topRight, .bottomRight]))
                        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 1)
                }

                // Action approval card
                if let action = action, actionStatus == .none {
                    ActionApprovalCard(action: action,
                                       onApprove: onApprove,
                                       onReject: onReject)
                } else if actionStatus == .approved {
                    StatusChip(text: "Action approved", color: .green,
                               icon: "checkmark.circle.fill")
                } else if actionStatus == .rejected {
                    StatusChip(text: "Action cancelled", color: .orange,
                               icon: "xmark.circle.fill")
                }

                Text(time, format: .dateTime.hour().minute())
                    .font(.system(size: 10)).foregroundColor(.secondary)
            }

            Spacer(minLength: 40)
        }
    }
}

// MARK: - Human-in-the-loop approval card

private struct ActionApprovalCard: View {
    let action: AIAction
    let onApprove: () -> Void
    let onReject: () -> Void

    private var iconName: String {
        switch action.type {
        case "CREATE_PIPELINE":   return "arrow.triangle.branch"
        case "REGISTER_METADATA": return "tag.fill"
        case "TRIGGER_HEALING":   return "cross.circle.fill"
        case "QUALITY_FIX":       return "checkmark.shield.fill"
        case "DEPLOY_MODEL":      return "cpu.fill"
        default:                  return "bolt.fill"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: iconName)
                    .font(.title3)
                    .foregroundColor(Color("AccentCyan"))
                    .frame(width: 36, height: 36)
                    .background(Color("AccentCyan").opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 2) {
                    Text(action.title)
                        .font(.subheadline).bold()
                    Text(action.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            Text("Approve this action?")
                .font(.caption).bold()
                .foregroundColor(.secondary)

            HStack(spacing: 10) {
                Button(action: onApprove) {
                    Label("Approve", systemImage: "checkmark")
                        .font(.subheadline).bold()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color("AccentCyan"))
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                Button(action: onReject) {
                    Label("Cancel", systemImage: "xmark")
                        .font(.subheadline).bold()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(.systemGray5))
                        .foregroundColor(.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .padding(14)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color("AccentCyan").opacity(0.4), lineWidth: 1.5)
        )
        .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
    }
}

// MARK: - Status chip (post-approval)

private struct StatusChip: View {
    let text: String
    let color: Color
    let icon: String

    var body: some View {
        Label(text, systemImage: icon)
            .font(.caption).bold()
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(color.opacity(0.1))
            .foregroundColor(color)
            .clipShape(Capsule())
    }
}

// MARK: - Typing indicator

private struct AITypingIndicator: View {
    @State private var phase: CGFloat = 0

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: [Color("AccentCyan"), .blue],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 30, height: 30)
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 11)).foregroundColor(.white)
            }
            HStack(spacing: 5) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(Color(.systemGray4))
                        .frame(width: 8, height: 8)
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

// MARK: - Executing indicator

private struct ExecutingIndicator: View {
    var body: some View {
        HStack(spacing: 10) {
            ProgressView()
                .progressViewStyle(.circular)
                .tint(Color("AccentCyan"))
            Text("Executing action…")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .background(Color(.systemBackground))
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Error banner

private struct ErrorBanner: View {
    let text: String
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "mic.slash.fill").foregroundColor(.white)
            Text(text).font(.caption).foregroundColor(.white)
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .frame(maxWidth: .infinity)
        .background(Color.orange)
    }
}

// MARK: - Input bar

private struct InputBar: View {
    @Binding var text: String
    @FocusState.Binding var isFocused: Bool
    let isListening: Bool
    let isBusy: Bool
    let quickPrompts: [String]
    let onSend: () -> Void
    let onMic:  () -> Void

    var body: some View {
        VStack(spacing: 10) {
            // Quick prompt chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(quickPrompts, id: \.self) { prompt in
                        Button { text = prompt } label: {
                            Text(prompt)
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

            // Text field row
            HStack(spacing: 10) {
                // Mic button
                Button(action: onMic) {
                    Image(systemName: isListening ? "stop.circle.fill" : "mic.fill")
                        .font(.title2)
                        .foregroundColor(isListening ? .red : Color(.systemGray3))
                        .symbolEffect(.pulse, isActive: isListening)
                }

                TextField("Ask anything or speak…", text: $text, axis: .vertical)
                    .font(.subheadline)
                    .padding(12)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .focused($isFocused)
                    .lineLimit(1...4)
                    .submitLabel(.send)
                    .onSubmit { onSend() }

                // Send button
                Button(action: onSend) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title)
                        .foregroundColor(text.isEmpty || isBusy
                                         ? Color(.systemGray4)
                                         : Color("AccentCyan"))
                }
                .disabled(text.isEmpty || isBusy)
            }
            .padding(.horizontal, 14)
        }
        .padding(.vertical, 10)
        .background(Color(.systemBackground))
        .overlay(Divider(), alignment: .top)
    }
}

// MARK: - Empty state

private struct AIEmptyStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: [Color("AccentCyan").opacity(0.15), .blue.opacity(0.1)],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 90, height: 90)
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 40))
                    .foregroundColor(Color("AccentCyan"))
            }
            Text("AgenticDT Assistant")
                .font(.title3).bold()
            Text("Ask me to create pipelines, register metadata, trigger self-healing, fix data quality issues, or deploy models — by typing or speaking.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)
        }
    }
}

// MARK: - Settings sheet

private struct SettingsSheet: View {
    @ObservedObject var openAI: OpenAIService
    @Environment(\.dismiss) private var dismiss

    @State private var draftKey: String = ""
    @State private var showKey: Bool = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        Label("OpenAI API Key", systemImage: "key.fill")
                            .font(.subheadline).bold()
                        Text("Stored securely in the iOS Keychain. Never transmitted anywhere except directly to OpenAI.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)

                    if openAI.hasKey {
                        HStack {
                            Text("Current key")
                                .foregroundColor(.secondary)
                                .font(.subheadline)
                            Spacer()
                            Text(openAI.maskedKey)
                                .font(.subheadline)
                                .foregroundColor(Color("AccentCyan"))
                        }
                    }

                    HStack {
                        Group {
                            if showKey {
                                TextField("sk-…", text: $draftKey)
                            } else {
                                SecureField("sk-…", text: $draftKey)
                            }
                        }
                        .font(.subheadline)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                        Button {
                            showKey.toggle()
                        } label: {
                            Image(systemName: showKey ? "eye.slash" : "eye")
                                .foregroundColor(.secondary)
                        }
                    }

                    Button {
                        openAI.saveKey(draftKey)
                        draftKey = ""
                        dismiss()
                    } label: {
                        Label(openAI.hasKey ? "Update Key" : "Save Key", systemImage: "checkmark")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color("AccentCyan"))
                    .disabled(draftKey.trimmingCharacters(in: .whitespaces).isEmpty)
                } header: {
                    Text("API Configuration")
                }

                if openAI.hasKey {
                    Section {
                        Button(role: .destructive) {
                            openAI.clearKey()
                            dismiss()
                        } label: {
                            Label("Remove API Key", systemImage: "trash")
                                .frame(maxWidth: .infinity)
                        }
                    } header: {
                        Text("Danger Zone")
                    }
                }

                Section {
                    Label("Your key is stored in the iOS Keychain with kSecAttrAccessibleWhenUnlockedThisDeviceOnly — it never leaves the device except in API calls sent directly to OpenAI over HTTPS.", systemImage: "lock.shield.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } header: {
                    Text("Security")
                }
            }
            .navigationTitle("Assistant Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    AIAssistantView()
        .environmentObject(PlatformViewModel())
}
