import { useState, useRef, useEffect } from "react";
import {
  Home, Upload, GitBranch, Brain, CheckSquare,
  Bell, Search, ChevronRight, Plus, RefreshCw, Zap,
  TrendingUp, AlertTriangle, Check, X, Activity,
  Database, Network, MessageSquare, Send, User,
  Server, ArrowRight, Shield, Filter, Star, Eye
} from "lucide-react";

// ── SHARED MOCK DATA ─────────────────────────────────────────────────────────
const stats = [
  { label: "Pipelines", value: "247", color: "#0891b2", bg: "#e0f2fe" },
  { label: "Quality", value: "94%", color: "#10b981", bg: "#d1fae5" },
  { label: "Schemas", value: "1.8K", color: "#8b5cf6", bg: "#ede9fe" },
  { label: "Agents", value: "38", color: "#f59e0b", bg: "#fef3c7" },
];
const sources = [
  { name: "Snowflake DW", type: "Warehouse", status: "live", icon: "❄️", tables: 342 },
  { name: "AWS S3 Lake", type: "Object Store", status: "live", icon: "🪣", tables: 1240 },
  { name: "Kafka Streams", type: "Streaming", status: "live", icon: "⚡", tables: 28 },
  { name: "PostgreSQL", type: "OLTP", status: "live", icon: "🐘", tables: 87 },
  { name: "REST APIs", type: "API Gateway", status: "scanning", icon: "🔗", tables: 14 },
];
const mobilePipelines = [
  { name: "Customer 360", status: "healthy", records: "2.3M", updated: "2m" },
  { name: "Revenue Attrib.", status: "healthy", records: "890K", updated: "15m" },
  { name: "Product Catalog", status: "healing", records: "450K", updated: "1h" },
  { name: "User Events", status: "healthy", records: "15.2M", updated: "30s" },
  { name: "Inventory Fcst.", status: "failed", records: "—", updated: "3h" },
];
const kgEntities = [
  { name: "Customer", attrs: 12, rels: 5, domain: "CRM" },
  { name: "Order", attrs: 8, rels: 3, domain: "Commerce" },
  { name: "Product", attrs: 15, rels: 4, domain: "Catalog" },
  { name: "Payment", attrs: 7, rels: 2, domain: "Finance" },
  { name: "Segment", attrs: 5, rels: 3, domain: "Marketing" },
];
const qualityDatasets = [
  { name: "customer_master", score: 96, issues: 1 },
  { name: "orders_fact", score: 88, issues: 2 },
  { name: "product_catalog", score: 91, issues: 1 },
  { name: "user_events", score: 97, issues: 0 },
];
const activities = [
  { agent: "Schema Agent", text: "Detected 3 new tables in S3", time: "2m", ok: true },
  { agent: "Heal Agent", text: "Auto-repaired Product Catalog", time: "5m", ok: true },
  { agent: "Quality Agent", text: "Found 342 orphaned records", time: "12m", ok: false },
  { agent: "Deploy Agent", text: "Deployed Revenue app v1.4.2", time: "1h", ok: true },
];
const initChat = [
  { role: "bot", text: "Hi Abhik! 👋 I'm your Data Agent. Ask me anything — I can query, build, and deploy data apps for you." },
];

// ── UTILITY ──────────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
  const c = status === "healthy" || status === "live" ? "#10b981" : status === "healing" || status === "scanning" ? "#f59e0b" : "#ef4444";
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />;
};

const ScoreRing = ({ score, size = 52, stroke = 5 }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 95 ? "#10b981" : score >= 85 ? "#0891b2" : "#f59e0b";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="11" fontWeight="700" fill={color} style={{ transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px` }}>{score}%</text>
    </svg>
  );
};

// ── SCREENS ──────────────────────────────────────────────────────────────────
const HomeScreen = ({ goTo }) => (
  <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px" }}>
    <div style={{ padding: "20px 16px 12px", background: "#fff" }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Friday, March 6</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Good morning, Abhik 👋</div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>38 agents active · All systems operational</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "12px 16px" }}>
      {stats.map((s, i) => (
        <div key={i} onClick={() => goTo(["publish", "quality", "semantic", "pipelines"][i])}
          style={{ background: s.bg, borderRadius: 16, padding: "14px 14px", cursor: "pointer" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>

    <div style={{ margin: "0 16px 12px", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Agent Activity</div>
      </div>
      {activities.map((a, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px", borderBottom: i < activities.length - 1 ? "1px solid #f8fafc" : undefined }}>
          <StatusDot status={a.ok ? "healthy" : "warning"} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0891b2" }}>{a.agent}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{a.text}</div>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{a.time}m ago</div>
        </div>
      ))}
    </div>

    <div style={{ margin: "0 16px", background: "linear-gradient(135deg, #0891b2, #1e40af)", borderRadius: 16, padding: "16px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>AI Data Agent</div>
      <div style={{ fontSize: 12, color: "#bae6fd", marginBottom: 12 }}>Ask anything about your data in plain English.</div>
      <button onClick={() => goTo("workspace")} style={{ background: "#fff", color: "#0891b2", fontWeight: 700, fontSize: 13, border: "none", borderRadius: 10, padding: "9px 18px", cursor: "pointer" }}>
        Open Agent Chat →
      </button>
    </div>
  </div>
);

const PublishScreen = () => {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const scan = () => { setScanning(true); setTimeout(() => { setScanning(false); setDone(true); }, 2200); };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "16px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>Agentic Publishing</div>
        <button onClick={scan} style={{ background: "#0891b2", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Connect
        </button>
      </div>

      {scanning && (
        <div style={{ margin: "0 16px 12px", background: "#eff6ff", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 16, height: 16, border: "2.5px solid #0891b2", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 12, color: "#1e40af", fontWeight: 600 }}>Schema Agent scanning source… detecting tables, types, lineage</div>
        </div>
      )}
      {done && (
        <div style={{ margin: "0 16px 12px", background: "#f0fdf4", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <div style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>28 tables detected · Metadata generated · Published to catalog</div>
        </div>
      )}

      <div style={{ padding: "0 16px 8px", fontWeight: 600, fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Connected Sources</div>
      <div style={{ margin: "0 16px", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {sources.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i < sources.length - 1 ? "1px solid #f8fafc" : undefined }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.type} · {s.tables > 0 ? `${s.tables} tables` : "Scanning…"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <StatusDot status={s.status === "live" ? "healthy" : "scanning"} />
              <span style={{ fontSize: 11, color: s.status === "live" ? "#10b981" : "#f59e0b", fontWeight: 600, textTransform: "capitalize" }}>{s.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 16px 8px", fontWeight: 600, fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recent Publishes</div>
      <div style={{ margin: "0 16px", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {[
          { name: "customer_360_v2", time: "2h ago", tables: 12, quality: 96 },
          { name: "revenue_attribution", time: "3h ago", tables: 8, quality: 94 },
          { name: "user_events_stream", time: "Live", tables: 4, quality: 91 },
        ].map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < 2 ? "1px solid #f8fafc" : undefined }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#0891b2" }}>{d.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{d.tables} tables · {d.time}</div>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "4px 8px", fontSize: 12, fontWeight: 700, color: "#10b981" }}>{d.quality}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PipelinesScreen = () => {
  const [sel, setSel] = useState(null);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "16px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>Pipelines</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#10b981" }}>221 ✓</div>
          <div style={{ background: "#fffbeb", borderRadius: 10, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>19 ⚠</div>
          <div style={{ background: "#fef2f2", borderRadius: 10, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#ef4444" }}>7 ✗</div>
        </div>
      </div>

      {sel !== null && (
        <div style={{ margin: "0 16px 12px", background: "#fff", borderRadius: 16, padding: "14px", boxShadow: "0 1px 6px rgba(0,0,0,0.1)" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 10 }}>{mobilePipelines[sel].name} — Pipeline Stages</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {["Source", "Ingest", "Validate", "Transform", "Enrich", "Load"].map((s, i, arr) => {
              const isProb = mobilePipelines[sel].status !== "healthy" && i === 2;
              const bg = isProb ? (mobilePipelines[sel].status === "failed" ? "#fef2f2" : "#fffbeb") : "#f0fdf4";
              const border = isProb ? (mobilePipelines[sel].status === "failed" ? "#ef4444" : "#f59e0b") : "#10b981";
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 8, padding: "5px 8px", fontSize: 10, fontWeight: 700, color: border }}>{s}</div>
                  {i < arr.length - 1 && <div style={{ width: 14, height: 1, background: "#e2e8f0" }} />}
                </div>
              );
            })}
          </div>
          {mobilePipelines[sel].status !== "healthy" && (
            <button style={{ marginTop: 10, background: "#f59e0b", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }}>
              🔧 Trigger Auto-Heal
            </button>
          )}
        </div>
      )}

      <div style={{ margin: "0 16px", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {mobilePipelines.map((p, i) => (
          <div key={i} onClick={() => setSel(sel === i ? null : i)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i < mobilePipelines.length - 1 ? "1px solid #f8fafc" : undefined, cursor: "pointer", background: sel === i ? "#f0f9ff" : "#fff" }}>
            <StatusDot status={p.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.records} records · {p.updated}m ago</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: p.status === "healthy" ? "#10b981" : p.status === "healing" ? "#f59e0b" : "#ef4444", textTransform: "capitalize" }}>{p.status}</span>
              <span style={{ fontSize: 16, color: "#94a3b8" }}>{sel === i ? "▾" : "▸"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SemanticScreen = () => {
  const [selEntity, setSelEntity] = useState(null);
  const [query, setQuery] = useState("");

  // Simple SVG mini-graph
  const miniNodes = [
    { id: "C", label: "Customer", x: 110, y: 90, color: "#0891b2" },
    { id: "O", label: "Order", x: 200, y: 50, color: "#8b5cf6" },
    { id: "P", label: "Product", x: 200, y: 130, color: "#10b981" },
    { id: "Py", label: "Payment", x: 290, y: 50, color: "#f59e0b" },
    { id: "R", label: "Revenue", x: 290, y: 130, color: "#f59e0b" },
    { id: "E", label: "Event", x: 30, y: 50, color: "#ef4444" },
    { id: "S", label: "Segment", x: 30, y: 130, color: "#0891b2" },
  ];
  const miniEdges = [
    { f: { x: 110, y: 90 }, t: { x: 200, y: 50 } },
    { f: { x: 110, y: 90 }, t: { x: 200, y: 130 } },
    { f: { x: 110, y: 90 }, t: { x: 30, y: 50 } },
    { f: { x: 110, y: 90 }, t: { x: 30, y: 130 } },
    { f: { x: 200, y: 50 }, t: { x: 290, y: 50 } },
    { f: { x: 200, y: 50 }, t: { x: 200, y: 130 } },
    { f: { x: 290, y: 50 }, t: { x: 290, y: 130 } },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "16px 16px 10px" }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a", marginBottom: 10 }}>Semantic Engine</div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>🔍</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Semantic search entities…"
            style={{ width: "100%", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "10px 12px 10px 34px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      <div style={{ margin: "0 16px 12px", background: "#fff", borderRadius: 16, padding: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>Knowledge Graph</div>
        <svg viewBox="0 0 330 180" style={{ width: "100%", height: 140 }}>
          {miniEdges.map((e, i) => (
            <line key={i} x1={e.f.x} y1={e.f.y} x2={e.t.x} y2={e.t.y} stroke="#e2e8f0" strokeWidth="2" />
          ))}
          {miniNodes.map((n) => (
            <g key={n.id} onClick={() => setSelEntity(selEntity === n.id ? null : n.id)} style={{ cursor: "pointer" }}>
              <circle cx={n.x} cy={n.y} r={selEntity === n.id ? 22 : 18} fill={n.color} opacity={selEntity && selEntity !== n.id ? 0.4 : 1} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{n.id}</text>
              <text x={n.x} y={n.y + 28} textAnchor="middle" fontSize="9" fill="#475569" fontWeight="600">{n.label}</text>
            </g>
          ))}
        </svg>
      </div>

      {selEntity && (
        <div style={{ margin: "0 16px 12px", background: "#f0f9ff", borderRadius: 16, padding: "14px", border: "1.5px solid #bae6fd" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0891b2", marginBottom: 6 }}>{miniNodes.find(n => n.id === selEntity)?.label} Entity</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
            <div><span style={{ color: "#94a3b8" }}>Domain</span><div style={{ fontWeight: 600, color: "#0f172a" }}>CRM / Commerce</div></div>
            <div><span style={{ color: "#94a3b8" }}>Attributes</span><div style={{ fontWeight: 600, color: "#0f172a" }}>12 fields</div></div>
            <div><span style={{ color: "#94a3b8" }}>Source</span><div style={{ fontWeight: 600, color: "#0f172a" }}>Snowflake DW</div></div>
            <div><span style={{ color: "#94a3b8" }}>Updated</span><div style={{ fontWeight: 600, color: "#0f172a" }}>2m ago</div></div>
          </div>
        </div>
      )}

      <div style={{ padding: "0 16px 8px", fontWeight: 600, fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Entity Registry</div>
      <div style={{ margin: "0 16px", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {kgEntities.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < kgEntities.length - 1 ? "1px solid #f8fafc" : undefined }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#0891b2" }}>
              {e.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{e.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{e.domain} · {e.attrs} attrs · {e.rels} rels</div>
            </div>
            <span style={{ color: "#94a3b8", fontSize: 16 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const QualityScreen = () => {
  const [fixed, setFixed] = useState({});
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "16px 16px 10px" }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a", marginBottom: 14 }}>Data Quality</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {qualityDatasets.map((d, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <ScoreRing score={d.score} />
              <div style={{ fontWeight: 600, fontSize: 11, color: "#0f172a", textAlign: "center" }}>{d.name.replace("_", " ")}</div>
              {d.issues > 0 ? (
                <div style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>{d.issues} issue{d.issues > 1 ? "s" : ""}</div>
              ) : (
                <div style={{ background: "#d1fae5", color: "#065f46", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>Clean ✓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 16px 8px", fontWeight: 600, fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Fix Queue</div>
      <div style={{ margin: "0 16px", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {[
          { ds: "orders_fact.ship_date", issue: "Null values (3.2%)", fix: "Impute from delivery_date", sev: "high" },
          { ds: "product_catalog.category_id", issue: "Orphaned references", fix: "Map via category hierarchy", sev: "high" },
          { ds: "customer_master.phone", issue: "Format inconsistency", fix: "Normalize to E.164", sev: "medium" },
          { ds: "user_events.session_id", issue: "Duplicates (0.3%)", fix: "Deduplicate with window fn", sev: "low" },
        ].map((q, i) => (
          <div key={i} style={{ padding: "12px 16px", borderBottom: i < 3 ? "1px solid #f8fafc" : undefined, opacity: fixed[i] ? 0.5 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#0f172a" }}>{q.ds}</div>
              <div style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", background: q.sev === "high" ? "#fef2f2" : q.sev === "medium" ? "#fffbeb" : "#f8fafc", color: q.sev === "high" ? "#ef4444" : q.sev === "medium" ? "#f59e0b" : "#94a3b8" }}>
                {q.sev}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{q.issue}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, color: "#0891b2", fontWeight: 600 }}>💡 {q.fix}</div>
              {fixed[i] ? (
                <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>✓ Fixed</span>
              ) : (
                <button onClick={() => setFixed(p => ({ ...p, [i]: true }))}
                  style={{ background: "#0891b2", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  Apply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkspaceScreen = () => {
  const [messages, setMessages] = useState(initChat);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const respond = (q) => {
    const l = q.toLowerCase();
    if (l.includes("revenue")) return "Revenue by channel (last 30d): Email 38.4%, Paid Search 27.1%, Organic 21.2%, Social 13.3%. Want me to build a dashboard and deploy it? 🚀";
    if (l.includes("customer") || l.includes("churn")) return "Customer segments: Champions (12K, LTV $4.2K), Loyal (34K), At-Risk (8.2K, churn risk 68%), Dormant (15K). Shall I deploy a churn monitor app?";
    if (l.includes("quality")) return "Overall quality: 94.2% ✅. Top issues: 342 orphaned category_ids, 8,920 null ship_dates. I can auto-fix both — should I proceed?";
    return "I've run your query and found the results. Here's a summary with key insights. Want me to build a dashboard app and deploy it to production? Takes ~30 seconds. 🤖";
  };

  const send = () => {
    if (!input.trim()) return;
    setMessages(m => [...m, { role: "user", text: input }]);
    setInput("");
    setTyping(true);
    const q = input;
    setTimeout(() => { setTyping(false); setMessages(m => [...m, { role: "bot", text: respond(q) }]); }, 1200);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 10px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>Data Agent</div>
        <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>● Online · GPT-4 + Custom Models</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 8, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.role === "bot" ? "#0891b2" : "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, color: "#fff" }}>
              {m.role === "bot" ? "🤖" : "A"}
            </div>
            <div style={{ maxWidth: "78%", background: m.role === "bot" ? "#f8fafc" : "#0891b2", color: m.role === "bot" ? "#0f172a" : "#fff", borderRadius: m.role === "bot" ? "4px 16px 16px 16px" : "16px 4px 16px 16px", padding: "10px 13px", fontSize: 13, lineHeight: 1.5, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0891b2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, color: "#fff" }}>🤖</div>
            <div style={{ background: "#f8fafc", borderRadius: "4px 16px 16px 16px", padding: "10px 16px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: "#94a3b8", animation: "bounce 1.2s infinite", animationDelay: `${j * 0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: "8px 12px 6px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", paddingBottom: 2 }}>
          {["Revenue by channel", "Customer churn", "Quality issues"].map(s => (
            <button key={s} onClick={() => setInput(s)} style={{ background: "#f0f9ff", color: "#0891b2", border: "1px solid #bae6fd", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0 }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask about your data…"
            style={{ flex: 1, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 24, padding: "10px 16px", fontSize: 13, outline: "none" }} />
          <button onClick={send} style={{ background: "#0891b2", color: "#fff", border: "none", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
};

// ── MAIN iOS SIMULATOR ───────────────────────────────────────────────────────
const tabs = [
  { id: "home", label: "Home", icon: "⊞" },
  { id: "publish", label: "Publish", icon: "⇧" },
  { id: "pipelines", label: "Pipelines", icon: "⛓" },
  { id: "semantic", label: "Semantic", icon: "⬡" },
  { id: "workspace", label: "Agent", icon: "✦" },
];

export default function AgenticPlatformIOS() {
  const [activeTab, setActiveTab] = useState("home");

  const screens = {
    home: <HomeScreen goTo={setActiveTab} />,
    publish: <PublishScreen />,
    pipelines: <PipelinesScreen />,
    semantic: <SemanticScreen />,
    quality: <QualityScreen />,
    workspace: <WorkspaceScreen />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2d55 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>AgenticDT <span style={{ color: "#38bdf8" }}>Mobile</span></div>
        <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>Data Platform · iOS Prototype</div>
      </div>

      {/* iPhone Frame */}
      <div style={{
        width: 375,
        background: "#fff",
        borderRadius: 50,
        boxShadow: "0 0 0 12px #1e293b, 0 0 0 14px #334155, 0 30px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        minHeight: 780,
        maxHeight: 780,
      }}>
        {/* Dynamic Island */}
        <div style={{ background: "#000", height: 52, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 120, height: 34, background: "#000", borderRadius: 20, border: "2px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
            <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>9:41</div>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: "#fff", fontSize: 10 }}>●●●●</span>
              <span style={{ color: "#fff", fontSize: 10 }}>WiFi</span>
              <span style={{ color: "#fff", fontSize: 10 }}>🔋</span>
            </div>
          </div>
        </div>

        {/* Screen Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#f2f2f7" }}>
          {/* Screen Header */}
          <div style={{ background: "linear-gradient(135deg, #0891b2, #0284c7)", padding: "12px 16px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "rgba(255,255,255,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>AgenticDT</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 30, height: 30, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, cursor: "pointer" }}>🔔</div>
              <div style={{ width: 30, height: 30, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>A</div>
            </div>
          </div>

          {/* Screen */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {screens[activeTab] || screens.home}
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(0,0,0,0.08)", padding: "8px 0 16px", display: "flex", justifyContent: "space-around", flexShrink: 0 }}>
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "none", background: "transparent", cursor: "pointer", padding: "2px 0" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: isActive ? "#0891b2" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isActive ? 18 : 20, transition: "all 0.2s" }}>
                  <span style={{ color: isActive ? "#fff" : "#94a3b8" }}>{t.icon}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? "#0891b2" : "#94a3b8" }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Home Indicator */}
        <div style={{ background: "#fff", paddingBottom: 8, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 120, height: 5, background: "#1e293b", borderRadius: 3 }} />
        </div>
      </div>

      {/* Below phone label */}
      <div style={{ marginTop: 28, display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ background: activeTab === t.id ? "#0891b2" : "rgba(255,255,255,0.1)", color: activeTab === t.id ? "#fff" : "#94a3b8", border: "1px solid", borderColor: activeTab === t.id ? "#0891b2" : "rgba(255,255,255,0.1)", borderRadius: 20, padding: "7px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16, color: "#475569", fontSize: 12, textAlign: "center" }}>
        Interactive iOS Prototype · Tap any tab to navigate · All 4 pillars + Agent Chat
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </div>
  );
}
