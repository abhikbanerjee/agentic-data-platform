import SwiftUI
import UniformTypeIdentifiers

// MARK: - Main View

struct IngestionHubView: View {
    @StateObject private var svc = IngestionService()

    @State private var transformColumn = ""
    @State private var newColumnName   = ""
    @State private var showFilePicker  = false
    @State private var selectedFile: (data: Data, name: String)? = nil
    @State private var showSample      = false
    @State private var showMetaPanel   = true

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerSection
                    configBanner
                    uploadSection
                    if !svc.steps.allSatisfy({ $0.status == .waiting }) {
                        stepsSection
                    }
                    if let err = svc.errorMessage { errorCard(err) }
                    if let q   = svc.quality        { qualityCard(q) }
                    if svc.sampleData != nil         { sampleSection }
                    if svc.metadata   != nil && svc.registration == nil { metadataPanel }
                    if let reg = svc.registration    { registeredCard(reg) }
                }
                .padding(.bottom, 40)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Ingestion Hub")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showFilePicker) { filePicker }
            .task { await svc.checkConfig() }
            .onDisappear { svc.stopPolling() }
        }
    }

    // MARK: - Header

    var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("S3 → Glue ETL → Quality Profiler")
                .font(.subheadline).foregroundColor(.secondary)
            Text("Upload a CSV and the pipeline will parse, transform, and AI-profile every column automatically.")
                .font(.caption).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal).padding(.top, 8)
    }

    // MARK: - Config banner

    @ViewBuilder var configBanner: some View {
        if svc.isConfigured == false {
            HStack(spacing: 10) {
                Image(systemName: "exclamationmark.triangle.fill").foregroundColor(.orange)
                Text("Pipeline infrastructure not provisioned. Run setup.sh to configure AWS resources.")
                    .font(.caption).foregroundColor(.orange)
            }
            .padding(12)
            .background(Color.orange.opacity(0.1))
            .cornerRadius(10)
            .padding(.horizontal)
        }
    }

    // MARK: - Upload & run

    var uploadSection: some View {
        VStack(spacing: 14) {
            Button { showFilePicker = true } label: {
                HStack(spacing: 12) {
                    Image(systemName: selectedFile == nil ? "doc.badge.plus" : "doc.fill.badge.checkmark")
                        .font(.title2)
                        .foregroundColor(selectedFile == nil ? .accentColor : .green)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(selectedFile?.name ?? "Choose CSV file")
                            .font(.subheadline).fontWeight(.medium)
                        Text(selectedFile == nil ? "Tap to select from Files" : "File ready — configure transform below")
                            .font(.caption).foregroundColor(selectedFile == nil ? .secondary : .green)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).foregroundColor(.secondary)
                }
                .padding(16)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
            }

            GroupBox(label: Label("Column Transform (optional)", systemImage: "arrow.triangle.2.circlepath")) {
                VStack(spacing: 10) {
                    TextField("Source column  (e.g. revenue)", text: $transformColumn)
                        .textFieldStyle(.roundedBorder).autocorrectionDisabled().textInputAutocapitalization(.never)
                    TextField("New column name  (e.g. revenue_derived)", text: $newColumnName)
                        .textFieldStyle(.roundedBorder).autocorrectionDisabled().textInputAutocapitalization(.never)
                }.padding(.top, 6)
            }

            Button {
                Task {
                    guard let file = selectedFile else { return }
                    await svc.startPipeline(
                        fileData: file.data, fileName: file.name,
                        transformColumn: transformColumn.isEmpty ? "id" : transformColumn,
                        newColumnName: newColumnName.isEmpty ? "\(transformColumn.isEmpty ? "id" : transformColumn)_derived" : newColumnName
                    )
                }
            } label: {
                HStack {
                    if svc.isRunning {
                        ProgressView().progressViewStyle(.circular).scaleEffect(0.85)
                        Text("Pipeline Running…")
                    } else {
                        Image(systemName: "play.fill")
                        Text("Run Ingestion Pipeline")
                    }
                }
                .font(.subheadline).fontWeight(.semibold)
                .frame(maxWidth: .infinity).padding(14)
                .background(canRun ? Color.accentColor : Color.gray.opacity(0.3))
                .foregroundColor(.white).cornerRadius(12)
            }
            .disabled(!canRun)

            if svc.quality != nil || svc.isRunning {
                Button(role: .destructive) { svc.reset(); selectedFile = nil } label: {
                    Label("Reset Pipeline", systemImage: "arrow.counterclockwise")
                        .font(.caption).foregroundColor(.red)
                }
            }
        }
        .padding(.horizontal)
    }

    var canRun: Bool {
        selectedFile != nil && !svc.isRunning && svc.isConfigured == true
    }

    // MARK: - Step progress

    var stepsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Pipeline Progress")
                .font(.headline).padding(.horizontal).padding(.bottom, 8)
            ForEach(Array(svc.steps.enumerated()), id: \.element.id) { idx, step in
                HStack(spacing: 14) {
                    VStack(spacing: 0) {
                        if idx > 0 {
                            Rectangle().fill(Color.gray.opacity(0.2)).frame(width: 2, height: 12)
                        }
                        ZStack {
                            Circle().fill(step.status.color.opacity(0.15)).frame(width: 36, height: 36)
                            if step.status == .running {
                                ProgressView().progressViewStyle(.circular).scaleEffect(0.7).tint(step.status.color)
                            } else {
                                Image(systemName: step.status.sfSymbol)
                                    .font(.system(size: 15, weight: .semibold)).foregroundColor(step.status.color)
                            }
                        }
                        if idx < svc.steps.count - 1 {
                            Rectangle().fill(Color.gray.opacity(0.2)).frame(width: 2, height: 12)
                        }
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 5) {
                            Text(step.icon)
                            Text(step.name).font(.subheadline).fontWeight(.medium)
                        }
                        Text(stepLabel(step.status)).font(.caption).foregroundColor(step.status.color)
                    }
                    Spacer()
                }
                .padding(.horizontal).padding(.vertical, 2)
            }
        }
        .padding(.vertical, 14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14).padding(.horizontal)
    }

    func stepLabel(_ s: IngestStep.StepStatus) -> String {
        switch s {
        case .waiting: return "Waiting"
        case .running: return "In progress…"
        case .done:    return "Complete"
        case .error:   return "Failed"
        }
    }

    // MARK: - Error

    func errorCard(_ msg: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "xmark.octagon.fill").foregroundColor(.red).font(.title3)
            VStack(alignment: .leading, spacing: 4) {
                Text("Pipeline Failed").font(.subheadline).fontWeight(.semibold).foregroundColor(.red)
                Text(msg).font(.caption).foregroundColor(.secondary)
            }
        }
        .padding(14)
        .background(Color.red.opacity(0.07)).cornerRadius(12).padding(.horizontal)
    }

    // MARK: - Quality card

    func qualityCard(_ q: QualityStats) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Quality Report").font(.headline)
                Spacer()
                let passed = q.passed ?? false
                HStack(spacing: 4) {
                    Image(systemName: passed ? "checkmark.circle.fill" : "xmark.circle.fill")
                    Text(passed ? "PASSED" : "FAILED").font(.caption).fontWeight(.bold)
                }
                .foregroundColor(passed ? .green : .red)
                .padding(.horizontal, 10).padding(.vertical, 4)
                .background((passed ? Color.green : Color.red).opacity(0.1)).cornerRadius(8)
            }
            HStack(spacing: 24) {
                ZStack {
                    Circle().stroke(Color.gray.opacity(0.15), lineWidth: 10).frame(width: 72, height: 72)
                    Circle()
                        .trim(from: 0, to: CGFloat((q.quality_score ?? 0) / 100))
                        .stroke(scoreColor(q.quality_score ?? 0), style: StrokeStyle(lineWidth: 10, lineCap: .round))
                        .rotationEffect(.degrees(-90)).frame(width: 72, height: 72)
                    Text("\(Int(q.quality_score ?? 0))%")
                        .font(.system(size: 16, weight: .bold)).foregroundColor(scoreColor(q.quality_score ?? 0))
                }
                VStack(alignment: .leading, spacing: 6) {
                    qRow("Rows",    (q.total_rows ?? 0).formatted())
                    qRow("Columns", "\(q.total_columns ?? 0)")
                    qRow("Files",   "\(q.parquet_files ?? 1)")
                    qRow("Issues",  "\(q.issues?.count ?? 0)")
                }
            }
            if let issues = q.issues, !issues.isEmpty {
                Divider()
                ForEach(issues) { issue in
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: issue.severity == "critical" ? "exclamationmark.octagon.fill" : "exclamationmark.triangle.fill")
                            .foregroundColor(issue.severity == "critical" ? .red : .orange)
                            .font(.caption).padding(.top, 2)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(issue.column).font(.caption).fontWeight(.semibold)
                            Text(issue.message).font(.caption2).foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14).padding(.horizontal)
    }

    func scoreColor(_ s: Double) -> Color { s >= 80 ? .green : s >= 60 ? .orange : .red }
    func qRow(_ label: String, _ val: String) -> some View {
        HStack(spacing: 6) {
            Text(label).font(.caption).foregroundColor(.secondary).frame(width: 56, alignment: .leading)
            Text(val).font(.caption).fontWeight(.medium)
        }
    }

    // MARK: - Sample preview

    var sampleSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button { withAnimation { showSample.toggle() } } label: {
                HStack {
                    Image(systemName: "tablecells")
                    Text("Data Preview (first 20 rows)").font(.subheadline).fontWeight(.medium)
                    Spacer()
                    Image(systemName: showSample ? "chevron.up" : "chevron.down")
                        .font(.caption).foregroundColor(.secondary)
                }.foregroundColor(.primary)
            }
            if showSample, let sample = svc.sampleData {
                ScrollView(.horizontal, showsIndicators: true) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 0) {
                            ForEach(sample.columns, id: \.self) { col in
                                Text(col).font(.caption2).fontWeight(.bold)
                                    .frame(width: 100, alignment: .leading)
                                    .padding(.horizontal, 8).padding(.vertical, 6)
                                    .background(Color.accentColor.opacity(0.1))
                            }
                        }
                        Divider()
                        ForEach(Array(sample.rows.prefix(20).enumerated()), id: \.offset) { idx, row in
                            HStack(spacing: 0) {
                                ForEach(sample.columns, id: \.self) { col in
                                    let val: String? = row[col] ?? nil
                                    Text(val ?? "null")
                                        .font(.caption2).italic(val == nil)
                                        .foregroundColor(val == nil ? .secondary.opacity(0.5) : .primary)
                                        .frame(width: 100, alignment: .leading)
                                        .padding(.horizontal, 8).padding(.vertical, 5)
                                }
                            }
                            .background(idx % 2 == 0 ? Color.clear : Color.gray.opacity(0.04))
                        }
                    }
                }.cornerRadius(8)
            }
        }
        .padding(16)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14).padding(.horizontal)
    }

    // MARK: - Metadata panel

    var metadataPanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Column Metadata Review").font(.headline)
                    Text("AI-generated — edit descriptions, tags, and PII flags")
                        .font(.caption).foregroundColor(.secondary)
                }
                Spacer()
                Button {
                    Task { await svc.enrichMetadata() }
                } label: {
                    if svc.isEnrichingMeta {
                        ProgressView().scaleEffect(0.75)
                    } else {
                        Label("Re-run AI", systemImage: "brain").font(.caption).fontWeight(.medium)
                    }
                }
                .disabled(svc.isEnrichingMeta)
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(Color.teal.opacity(0.1)).foregroundColor(.teal).cornerRadius(8)
            }
            .padding(16)

            Divider()

            Button { withAnimation { showMetaPanel.toggle() } } label: {
                HStack {
                    Text("\(svc.metadata?.columns?.count ?? 0) columns")
                        .font(.caption).foregroundColor(.secondary)
                    Spacer()
                    Image(systemName: showMetaPanel ? "chevron.up" : "chevron.down")
                        .font(.caption).foregroundColor(.secondary)
                }
                .padding(.horizontal, 16).padding(.vertical, 8)
            }

            if showMetaPanel, let cols = svc.metadata?.columns {
                ForEach(cols) { col in
                    metaRow(col)
                    Divider().padding(.leading, 16)
                }
            }

            Divider()

            Button {
                Task { await svc.registerMetadata() }
            } label: {
                HStack {
                    if svc.isRegisteringMeta {
                        ProgressView().progressViewStyle(.circular).scaleEffect(0.8).tint(.white)
                        Text("Registering…")
                    } else {
                        Image(systemName: "externaldrive.badge.checkmark")
                        Text("Register to Catalog")
                    }
                }
                .font(.subheadline).fontWeight(.semibold)
                .frame(maxWidth: .infinity).padding(14)
                .background(Color.teal).foregroundColor(.white).cornerRadius(10)
            }
            .disabled(svc.isRegisteringMeta).padding(16)
        }
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14).padding(.horizontal)
    }

    func metaRow(_ col: MetadataColumn) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Text(col.name).font(.subheadline).fontWeight(.semibold)
                Text(col.data_type).font(.caption2)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Color.gray.opacity(0.15)).cornerRadius(4).foregroundColor(.secondary)
                if let sem = col.semantic_type, sem != "other" {
                    Text(sem).font(.caption2)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.teal.opacity(0.12)).cornerRadius(4).foregroundColor(.teal)
                }
                if svc.metadataEdits[col.name]?.pii_flag == true {
                    Text("PII").font(.caption2).fontWeight(.bold)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.red.opacity(0.12)).cornerRadius(4).foregroundColor(.red)
                }
                Spacer()
                Text("\(Int(col.null_pct ?? 0))% null").font(.caption2).foregroundColor(.secondary)
            }
            TextField("Add description…", text: Binding(
                get: { svc.metadataEdits[col.name]?.description ?? "" },
                set: { svc.metadataEdits[col.name, default: IngestionService.MetaEdit(description: "", tags: "", pii_flag: false)].description = $0 }
            )).font(.caption).textFieldStyle(.roundedBorder)

            HStack(spacing: 10) {
                TextField("Tags (comma-separated)", text: Binding(
                    get: { svc.metadataEdits[col.name]?.tags ?? "" },
                    set: { svc.metadataEdits[col.name, default: IngestionService.MetaEdit(description: "", tags: "", pii_flag: false)].tags = $0 }
                )).font(.caption).textFieldStyle(.roundedBorder)
                HStack(spacing: 4) {
                    Toggle("", isOn: Binding(
                        get: { svc.metadataEdits[col.name]?.pii_flag ?? false },
                        set: { svc.metadataEdits[col.name, default: IngestionService.MetaEdit(description: "", tags: "", pii_flag: false)].pii_flag = $0 }
                    )).labelsHidden().toggleStyle(.switch).scaleEffect(0.75)
                    Text("PII").font(.caption2).foregroundColor(.secondary)
                }
            }
        }
        .padding(14)
    }

    // MARK: - Registered card

    func registeredCard(_ reg: CatalogRegistration) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "checkmark.seal.fill").font(.title2).foregroundColor(.green)
            VStack(alignment: .leading, spacing: 4) {
                Text("Registered to Catalog").font(.subheadline).fontWeight(.semibold).foregroundColor(.green)
                Text("Catalog ID: \(reg.catalog_id)").font(.caption).foregroundColor(.secondary)
                if let date = ISO8601DateFormatter().date(from: reg.registered_at) {
                    Text(date, style: .datetime).font(.caption2).foregroundColor(.secondary)
                }
            }
        }
        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.green.opacity(0.08)).cornerRadius(14).padding(.horizontal)
    }

    // MARK: - File picker

    var filePicker: some View {
        DocumentPickerView(allowedTypes: [.commaSeparatedText, .plainText]) { url in
            do {
                let data = try Data(contentsOf: url)
                selectedFile = (data: data, name: url.lastPathComponent)
            } catch {
                svc.errorMessage = "Could not read file: \(error.localizedDescription)"
            }
        }
        .ignoresSafeArea()
    }
}

// MARK: - Document Picker

struct DocumentPickerView: UIViewControllerRepresentable {
    let allowedTypes: [UTType]
    let onPick: (URL) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onPick: onPick) }
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: allowedTypes)
        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false
        return picker
    }
    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onPick: (URL) -> Void
        init(onPick: @escaping (URL) -> Void) { self.onPick = onPick }
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else { return }
            _ = url.startAccessingSecurityScopedResource()
            onPick(url)
            url.stopAccessingSecurityScopedResource()
        }
    }
}

#Preview {
    IngestionHubView()
        .environmentObject(PlatformViewModel())
}
