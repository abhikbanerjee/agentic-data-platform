# AgenticDT — Web Platform

Two React/JSX files for the browser-based platform:

| File | Description |
|------|-------------|
| `agentic-platform-web.jsx` | Full desktop enterprise portal — all 4 pillars, analyst workspace, knowledge graph, pipeline DAG |
| `agentic-platform-ios.jsx` | Interactive iOS simulator — phone frame prototype for mobile UX review |

## Run Locally

```bash
npm create vite@latest agenticdt-web -- --template react
cd agenticdt-web
npm install recharts lucide-react
cp ../agentic-platform-web.jsx src/App.jsx
npm run dev
```

## Open in Online Sandbox

Paste either file into:
- [StackBlitz React](https://stackblitz.com/fork/react)
- [CodeSandbox](https://codesandbox.io/s/new)

Both files use only: **React 18**, **recharts**, and **lucide-react** — no other dependencies.
