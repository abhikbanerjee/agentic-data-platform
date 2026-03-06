# AgenticDT — Agentic Driven Data Platform

> A next-generation data platform built around four AI-driven pillars, drastically reducing time-to-insight for analysts with minimal human intervention.

---

## Platform Pillars

| # | Pillar | Description |
|---|--------|-------------|
| 1 | **Agentic Data Publishing** | AI agents auto-discover sources, detect schemas, generate metadata, and publish datasets to the catalog |
| 2 | **Self-Healing Data Pipelines** | Continuous AI monitoring detects failures, performs root-cause analysis, and applies patches without human intervention |
| 3 | **Semantic Engine** | Unified metadata registry, knowledge graph with entity relationships, and AI-powered semantic search |
| 4 | **Data Quality** | Automated quality scoring across 6 dimensions, AI-suggested fixes, and one-click remediation |

**Analyst Workspace** — a conversational AI interface for querying data, building applications, and deploying them to production in under 30 seconds.

---

## Repository Structure

```
agentic-data-platform/
├── README.md
├── .gitignore
│
├── web/                          # React/JSX Web Platform
│   ├── README.md
│   ├── agentic-platform-web.jsx  # Full enterprise portal (all 4 pillars)
│   └── agentic-platform-ios.jsx  # Interactive iOS prototype (React)
│
└── ios/                          # Native SwiftUI iOS App
    ├── project.yml               # XcodeGen project spec
    ├── README.md
    ├── AgenticDT/
    │   ├── AgenticDTApp.swift    # App entry point
    │   ├── ContentView.swift     # TabView navigation + shared UI
    │   ├── Assets.xcassets/      # Color assets (AccentCyan, AccentGreen)
    │   ├── Models/
    │   │   └── DataModels.swift  # All data structs + sample data
    │   ├── ViewModels/
    │   │   └── PlatformViewModel.swift  # @MainActor ViewModel
    │   └── Views/
    │       ├── DashboardView.swift
    │       ├── PublishingView.swift
    │       ├── PipelinesView.swift
    │       ├── SemanticEngineView.swift
    │       ├── DataQualityView.swift
    │       └── AnalystWorkspaceView.swift
    └── AgenticDTTests/
        └── AgenticDTTests.swift
```

---

## Getting Started

### Web Platform (React)

The web files are self-contained `.jsx` files. Open them in any React environment:

```bash
# If you have a React sandbox (e.g. Vite):
npm create vite@latest my-app -- --template react
cp web/agentic-platform-web.jsx my-app/src/App.jsx
npm install recharts lucide-react
npm run dev
```

Or open directly in [StackBlitz](https://stackblitz.com) or [CodeSandbox](https://codesandbox.io) by pasting the file contents.

### iOS Native App (SwiftUI)

#### Option A — Using XcodeGen (Recommended)

```bash
# Install XcodeGen (once)
brew install xcodegen

# Generate the Xcode project
cd ios
xcodegen generate

# Open in Xcode
open AgenticDT.xcodeproj
```

#### Option B — Manual Xcode Setup

1. Open Xcode → **File → New → Project**
2. Choose **App** → set Product Name to `AgenticDT`, Team to yours, Bundle ID `com.agenticdt.app`
3. Set Interface: **SwiftUI**, Language: **Swift**, minimum iOS **16.0**
4. Delete the generated `ContentView.swift`
5. Drag all files from `ios/AgenticDT/` into the Xcode project navigator
6. In Assets.xcassets, add the colors `AccentCyan` and `AccentGreen` from `ios/AgenticDT/Assets.xcassets/`
7. Build and run on Simulator or device (`⌘R`)

#### Requirements

- Xcode 15+
- iOS 16.0+ deployment target
- Swift 5.9+
- No external dependencies — pure SwiftUI + native frameworks

---

## Features

### Pillar 1 — Agentic Data Publishing
- Source catalog with live connection status (Snowflake, S3, Kafka, PostgreSQL, REST APIs, BigQuery)
- One-tap "Connect" triggers Schema Agent scan with animated status
- Published datasets table with quality scores and lineage indicators

### Pillar 2 — Self-Healing Pipelines
- Real-time pipeline health summary (Healthy / Healing / Failed counts)
- Tap any pipeline to expand a visual stage DAG
- "Auto-Heal" button triggers async repair with live heal log

### Pillar 3 — Semantic Engine
- Interactive knowledge graph (9 entities, 8 relationships)
- Tap any node to view domain, owner, attributes, and source lineage
- Entity registry with semantic search
- Animated attribute bars on detail expand

### Pillar 4 — Data Quality
- Overall quality score + per-dataset ring gauges
- 6-dimension quality breakdown with animated progress bars
- AI Fix Queue — one-tap remediation for each issue

### Analyst Workspace
- Conversational Data Agent (NL → insights)
- Quick-suggest chips for common queries
- Animated typing indicator + deploy-to-production banner
- Async response generation via `PlatformViewModel`

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feature/my-feature`
2. Commit your changes: `git commit -m 'feat: add my feature'`
3. Push to the branch: `git push origin feature/my-feature`
4. Open a Pull Request

---

## Team Setup

To invite team members to this private repo:

1. Go to `github.com/YOUR_USERNAME/agentic-data-platform`
2. **Settings → Collaborators → Add people**
3. Enter each team member's GitHub username or email

---

*Built with ❤️ using SwiftUI, React, and Agentic AI*
