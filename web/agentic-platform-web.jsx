import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import {
  Database, GitBranch, Brain, CheckCircle, Activity,
  Home, Bell, Search, Plus, RefreshCw, Zap, Cloud,
  TrendingUp, AlertTriangle, Code, FileText, Shield,
  ArrowRight, User, MessageSquare, Send, Server,
  Settings, BarChart2, Layers, Network, ChevronRight,
  ChevronDown, X, AlertCircle, Eye, Upload, Filter,
  Link, Cpu, Play, Terminal, Star, CheckSquare, Menu,
  Check, Edit, Trash2, Lock, Unlock, Circle
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────────────
const agentActivityData = [
  { hour: "00", agents: 12 }, { hour: "03", agents: 8 }, { hour: "06", agents: 14 },
  { hour: "09", agents: 35 }, { hour: "12", agents: 31 }, { hour: "14", agents: 42 },
  { hour: "16", agents: 48 }, { hour: "18", agents: 29 }, { hour: "21", agents: 18 }, { hour: "23", agents: 11 },
];
const qualityTrendData = [
  { month: "Oct", score: 87 }, { month: "Nov", score: 90 }, { month: "Dec", score: 87 },
  { month: "Jan", score: 91 }, { month: "Feb", score: 93 }, { month: "Mar", score: 94 },
];
const pipelineHealthData = [
  { name: "Healthy", value: 221, color: "#10b981" },
  { name: "Warning", value: 19, color: "#f59e0b" },
  { name: "Failed", value: 7, color: "#ef4444" },
];
const dataSources = [
  { name: "Snowflake DW", type: "Warehouse", status: "connected", tables: 342, icon: "❄️", size: "4.2 TB" },
  { name: "AWS S3 Lake", type: "Object Store", status: "connected", tables: 1240, icon: "🪣", size: "89 TB" },
  { name: "Kafka Streams", type: "Streaming", status: "connected", tables: 28, icon: "⚡", size: "Live" },
  { name: "PostgreSQL", type: "OLTP", status: "connected", tables: 87, icon: "🐘", size: "780 GB" },
  { name: "REST APIs", type: "API Gateway", status: "scanning", tables: 14, icon: "🔗", size: "—" },
  { name: "BigQuery", type: "Analytics", status: "pending", tables: 0, icon: "📊", size: "—" },
];
const pipelines = [
  { id: "P001", name: "Customer 360 ETL", status: "healthy", lastRun: "2m ago", records: "2.3M", duration: "4m 32s", stages: 6, owner: "data-team" },
  { id: "P002", name: "Revenue Attribution", status: "healthy", lastRun: "15m ago", records: "890K", duration: "2m 11s", stages: 4, owner: "analytics" },
  { id: "P003", name: "Product Catalog Sync", status: "healing", lastRun: "1h ago", records: "450K", duration: "—", stages: 5, owner: "product" },
  { id: "P004", name: "User Events Stream", status: "healthy", lastRun: "30s ago", records: "15.2M", duration: "1m 08s", stages: 3, owner: "platform" },
  { id: "P005", name: "Inventory Forecast", status: "failed", lastRun: "3h ago", records: "—", duration: "—", stages: 7, owner: "supply-chain" },
  { id: "P006", name: "Marketing Attribution", status: "healthy", lastRun: "5m ago", records: "1.1M", duration: "3m 45s", stages: 5, owner: "marketing" },
];
const qualityDimensions = [
  { subject: "Completeness", score: 96 }, { subject: "Accuracy", score: 91 },
  { subject: "Consistency", score: 94 }, { subject: "Timeliness", score: 89 },
  { subject: "Uniqueness", score: 98 }, { subject: "Validity", score: 93 },
];
const qualityIssues = [
  { dataset: "customer_master", field: "phone_number", issue: "Format inconsistency", severity: "medium", records: 1240, aifix: "Normalize to E.164 format" },
  { dataset: "orders_fact", field: "ship_date", issue: "Null values (3.2%)", severity: "high", records: 8920, aifix: "Impute from delivery_date - avg_lead_time" },
  { dataset: "product_catalog", field: "category_id", issue: "Orphaned references", severity: "high", records: 342, aifix: "Map to parent via category hierarchy" },
  { dataset: "user_events", field: "session_id", issue: "Duplicate entries", severity: "low", records: 520, aifix: "Deduplicate with window function" },
];
const agentActivities = [
  { time: "2m ago", agent: "Schema Agent", action: "Detected 3 new tables in S3 prod-data-lake", status: "success" },
  { time: "5m ago", agent: "Heal Agent", action: "Auto-repaired Product Catalog Sync — null join key resolved", status: "success" },
  { time: "12m ago", agent: "Quality Agent", action: "Found 342 orphaned category_id records in product_catalog", status: "warning" },
  { time: "18m ago", agent: "Metadata Agent", action: "Registered 28 new Kafka topics to semantic registry", status: "success" },
  { time: "31m ago", agent: "Publish Agent", action: "Published customer_360_v2 to catalog with full lineage", status: "success" },
  { time: "1h ago", agent: "Deploy Agent", action: "Deployed Revenue Attribution app to production (v1.4.2)", status: "success" },
];
const kgNodes = [
  { id: "customer", label: "Customer", x: 340, y: 190, color: "#0891b2", r: 28, type: "entity" },
  { id: "order", label: "Order", x: 510, y: 120, color: "#8b5cf6", r: 22, type: "entity" },
  { id: "product", label: "Product", x: 510, y: 270, color: "#10b981", r: 22, type: "entity" },
  { id: "payment", label: "Payment", x: 670, y: 120, color: "#f59e0b", r: 20, type: "entity" },
  { id: "category", label: "Category", x: 670, y: 270, color: "#10b981", r: 18, type: "concept" },
  { id: "revenue", label: "Revenue", x: 810, y: 190, color: "#f59e0b", r: 20, type: "metric" },
  { id: "event", label: "Event", x: 180, y: 110, color: "#ef4444", r: 20, type: "entity" },
  { id: "segment", label: "Segment", x: 180, y: 280, color: "#0891b2", r: 18, type: "concept" },
  { id: "crm", label: "CRM Source", x: 340, y: 340, color: "#8b5cf6", r: 18, type: "source" },
];
const kgEdges = [
  { from: "customer", to: "order", label: "places" },
  { from: "customer", to: "event", label: "triggers" },
  { from: "customer", to: "segment", label: "belongs_to" },
  { from: "customer", to: "crm", label: "synced_from" },
  { from: "order", to: "product", label: "contains" },
  { from: "order", to: "payment", label: "settled_by" },
  { from: "product", to: "category", label: "classified_as" },
  { from: "payment", to: "revenue", label: "contributes_to" },
];
const initialChat = [
  { role: "assistant", content: "Hi Abhik 👋 I'm your Data Agent. Ask me anything about your data — I can query, build apps, and deploy to production for you." },
];
const agentResponses = {
  default: "I've analyzed your request and I'm generating the optimal query. Give me a moment...",
  revenue: `Here's the revenue attribution analysis you asked for:\n\n\`\`\`sql\nSELECT\n  c.channel_name,\n  SUM(o.revenue) AS total_revenue,\n  COUNT(DISTINCT o.customer_id) AS unique_customers,\n  ROUND(SUM(o.revenue) / SUM(SUM(o.revenue)) OVER () * 100, 2) AS pct_share\nFROM orders_fact o\nJOIN attribution_model a ON o.order_id = a.order_id\nJOIN channels c ON a.channel_id = c.id\nWHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'\nGROUP BY 1 ORDER BY 2 DESC;\n\`\`\`\n\nResult preview: Email (38.4%), Paid Search (27.1%), Organic (21.2%), Social (13.3%). Want me to **build a dashboard app** and deploy it?`,
  customer: `Running customer segmentation query...\n\n\`\`\`sql\nSELECT\n  s.segment_name,\n  COUNT(c.customer_id) AS customers,\n  AVG(c.ltv) AS avg_ltv,\n  AVG(c.churn_score) AS avg_churn_risk\nFROM customer_master c\nJOIN customer_segments s ON c.segment_id = s.id\nGROUP BY 1 ORDER BY avg_ltv DESC;\n\`\`\`\n\nFound 4 segments: Champions (12K), Loyal (34K), At-Risk (8.2K), Dormant (15K). **Shall I deploy a churn prevention dashboard?**`,
  quality: "I've run a full quality scan. Current score: **94.2%** ✅. Top issues: 342 orphaned category_ids, 8,920 null ship_dates. I can auto-apply fixes — want me to proceed?",
  pipeline: "Scanning all 247 pipelines... Found: 221 healthy ✅, 19 warnings ⚠️, 7 failed ❌. The Inventory Forecast pipeline failed at the enrichment stage. I'm preparing a self-heal patch now.",
};

// ─── UTILITY COMPONENTS ─────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const map = {
    healthy: "bg-emerald-100 text-emerald-700",
    healing: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    connected: "bg-emerald-100 text-emerald-700",
    scanning: "bg-blue-100 text-blue-700",
    pending: "bg-slate-100 text-slate-500",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      {trend && (
        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="text-sm font-medium text-slate-700">{label}</div>
    {sub && <div className="text-xs text-slate-400">{sub}</div>}
  </div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {action && action}
  </div>
);

// ─── DASHBOARD VIEW ──────────────────────────────────────────────────────────
const DashboardView = ({ setActiveView }) => (
  <div>
    <SectionHeader
      title="Platform Overview"
      subtitle="All agentic systems operational · Last refreshed 2 seconds ago"
      action={
        <button className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-700">
          <RefreshCw size={14} /> Refresh
        </button>
      }
    />
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard icon={Activity} label="Active Pipelines" value="247" sub="38 agents running" color="bg-cyan-600" trend="+12%" />
      <StatCard icon={CheckCircle} label="Data Quality Score" value="94.2%" sub="Across 1,842 datasets" color="bg-emerald-500" trend="+1.4%" />
      <StatCard icon={Brain} label="Schemas Registered" value="1,842" sub="In semantic registry" color="bg-violet-500" trend="+28 today" />
      <StatCard icon={Zap} label="AI Agent Actions" value="3,291" sub="Last 24 hours" color="bg-amber-500" trend="+18%" />
    </div>

    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Agent Activity — Today</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Live</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={agentActivityData}>
            <defs>
              <linearGradient id="agentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="agents" stroke="#0891b2" strokeWidth={2.5} fill="url(#agentGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Pipeline Health</h3>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={pipelineHealthData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
              {pipelineHealthData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [`${v} pipelines`, n]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 mt-2">
          {pipelineHealthData.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }}></span>{d.name}</span>
              <span className="font-semibold text-slate-700">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Recent Agent Activity</h3>
        <div className="flex flex-col gap-3">
          {agentActivities.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.status === "success" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-cyan-700">{a.agent}</div>
                <div className="text-xs text-slate-600 truncate">{a.action}</div>
              </div>
              <div className="text-xs text-slate-400 flex-shrink-0">{a.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Platform Pillars</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Upload, label: "Agentic Publishing", desc: "6 sources • 1,842 datasets", color: "bg-cyan-50 border-cyan-200", text: "text-cyan-700", view: "publish" },
            { icon: GitBranch, label: "Self-Healing Pipelines", desc: "247 pipelines • 38 agents", color: "bg-violet-50 border-violet-200", text: "text-violet-700", view: "pipelines" },
            { icon: Brain, label: "Semantic Engine", desc: "1,842 schemas • 9 entities", color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", view: "semantic" },
            { icon: CheckSquare, label: "Data Quality", desc: "94.2% score • 4 issues", color: "bg-amber-50 border-amber-200", text: "text-amber-700", view: "quality" },
          ].map((p, i) => (
            <button key={i} onClick={() => setActiveView(p.view)}
              className={`flex flex-col items-start gap-2 p-3 rounded-lg border ${p.color} hover:opacity-80 transition-opacity text-left`}>
              <p.icon size={18} className={p.text} />
              <div>
                <div className={`text-xs font-bold ${p.text}`}>{p.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── PILLAR 1 — AGENTIC DATA PUBLISHING ─────────────────────────────────────
const PublishView = () => {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const runScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setScanned(true); }, 2500);
  };

  return (
    <div>
      <SectionHeader
        title="Agentic Data Publishing"
        subtitle="AI agents automatically discover, schema-detect, document and publish datasets"
        action={
          <button onClick={runScan} className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-700">
            <Plus size={14} /> Connect New Source
          </button>
        }
      />

      {scanning && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <div className="text-sm font-semibold text-blue-800">Schema Agent scanning new source…</div>
            <div className="text-xs text-blue-600">Detecting tables · Profiling columns · Inferring types · Generating metadata</div>
          </div>
        </div>
      )}
      {scanned && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600" />
          <div>
            <div className="text-sm font-semibold text-emerald-800">Source connected! Agent detected 28 tables, generated metadata & lineage.</div>
            <div className="text-xs text-emerald-600">Published to data catalog · Registered in semantic engine · Quality baseline set</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {dataSources.map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.type}</div>
                </div>
              </div>
              <Badge status={s.status} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 border-t border-slate-50 pt-3">
              <span>{s.tables > 0 ? `${s.tables} tables` : "Pending"}</span>
              <span>{s.size}</span>
            </div>
            {s.status === "connected" && (
              <div className="mt-2 flex gap-2">
                <button className="flex-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 py-1.5 rounded-lg font-medium transition-colors">Browse</button>
                <button className="flex-1 text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 py-1.5 rounded-lg font-medium transition-colors">Lineage</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">AI-Published Datasets</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100"><Filter size={12} /> Filter</button>
            <button className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100"><Search size={12} /> Search</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              {["Dataset", "Source", "Published", "Tables", "Quality", "Lineage", "Actions"].map(h => (
                <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[
              { name: "customer_360_v2", source: "Snowflake DW", pub: "2h ago", tables: 12, quality: 96, lineage: true },
              { name: "revenue_attribution", source: "Snowflake DW", pub: "3h ago", tables: 8, quality: 94, lineage: true },
              { name: "user_events_stream", source: "Kafka Streams", pub: "Live", tables: 4, quality: 91, lineage: true },
              { name: "product_catalog_v3", source: "PostgreSQL", pub: "1d ago", tables: 6, quality: 88, lineage: false },
              { name: "marketing_attribution", source: "REST APIs", pub: "4h ago", tables: 5, quality: 93, lineage: true },
            ].map((d, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-medium text-cyan-700">{d.name}</td>
                <td className="px-5 py-3 text-slate-600">{d.source}</td>
                <td className="px-5 py-3 text-slate-500">{d.pub}</td>
                <td className="px-5 py-3 text-slate-600">{d.tables}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${d.quality}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{d.quality}%</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {d.lineage ? <span className="text-emerald-600 flex items-center gap-1"><Check size={13} /> Yes</span> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button className="text-xs text-cyan-600 hover:underline">View</button>
                    <button className="text-xs text-slate-400 hover:underline">Docs</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── PILLAR 2 — SELF-HEALING PIPELINES ──────────────────────────────────────
const PipelinesView = () => {
  const [selected, setSelected] = useState(pipelines[0]);
  const [healing, setHealing] = useState(false);
  const [healed, setHealed] = useState(false);

  const healPipeline = () => {
    setHealing(true);
    setTimeout(() => { setHealing(false); setHealed(true); }, 3000);
  };

  const DAGNode = ({ x, y, label, status, width = 90, height = 36 }) => {
    const color = status === "healthy" ? "#10b981" : status === "healing" ? "#f59e0b" : status === "failed" ? "#ef4444" : "#64748b";
    const bg = status === "healthy" ? "#f0fdf4" : status === "healing" ? "#fffbeb" : status === "failed" ? "#fef2f2" : "#f8fafc";
    return (
      <g>
        <rect x={x - width / 2} y={y - height / 2} width={width} height={height} rx="8" fill={bg} stroke={color} strokeWidth="2" />
        <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>{label}</text>
        {status === "healing" && (
          <circle cx={x + width / 2 - 8} cy={y - height / 2 + 8} r="5" fill="#f59e0b">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
      </g>
    );
  };

  const stages = [
    { label: "Source", x: 80, status: "healthy" },
    { label: "Ingest", x: 200, status: "healthy" },
    { label: "Validate", x: 320, status: selected.status === "failed" || selected.status === "healing" ? selected.status : "healthy" },
    { label: "Transform", x: 440, status: "healthy" },
    { label: "Enrich", x: 560, status: "healthy" },
    { label: "Load", x: 680, status: "healthy" },
  ];

  return (
    <div>
      <SectionHeader
        title="Self-Healing Data Pipelines"
        subtitle="AI agents monitor, diagnose and auto-repair pipeline failures in real-time"
        action={
          <button className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-700">
            <Plus size={14} /> Create with AI
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pipelines</div>
          <div className="divide-y divide-slate-50">
            {pipelines.map((p) => (
              <button key={p.id} onClick={() => { setSelected(p); setHealed(false); }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${selected.id === p.id ? "bg-cyan-50 border-l-2 border-cyan-500" : ""}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${p.status === "healthy" ? "bg-emerald-500" : p.status === "healing" ? "bg-amber-500" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.lastRun} · {p.stages} stages</div>
                </div>
                <Badge status={p.status} />
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">{selected.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>Owner: <span className="font-medium">{selected.owner}</span></span>
                  <span>Last run: <span className="font-medium">{selected.lastRun}</span></span>
                  <span>Records: <span className="font-medium">{selected.records}</span></span>
                  <Badge status={selected.status} />
                </div>
              </div>
              {(selected.status === "failed" || selected.status === "healing") && !healed && (
                <button onClick={healPipeline} className="flex items-center gap-2 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600">
                  {healing ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Healing…</> : <><RefreshCw size={12} /> Auto-Heal</>}
                </button>
              )}
              {healed && <Badge status="healthy" />}
            </div>
            <div className="overflow-x-auto">
              <svg viewBox="0 0 760 80" className="w-full h-20">
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                  </marker>
                </defs>
                {stages.map((s, i) => i < stages.length - 1 && (
                  <line key={i} x1={s.x + 45} y1={40} x2={stages[i + 1].x - 45} y2={40} stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" strokeDasharray={s.status !== "healthy" ? "4,3" : undefined} />
                ))}
                {stages.map((s, i) => (
                  <DAGNode key={i} x={s.x} y={40} label={s.label} status={healed ? "healthy" : s.status} />
                ))}
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Auto-Heal Log</h3>
            <div className="flex flex-col gap-2 text-xs">
              {[
                { time: "14:32:01", event: "Anomaly detected: null join key on customer_id in Validate stage", type: "warning" },
                { time: "14:32:03", event: "Heal Agent triggered — analyzing upstream schema diff", type: "info" },
                { time: "14:32:07", event: "Root cause: CRM source changed customer_id dtype from INT to VARCHAR", type: "info" },
                { time: "14:32:09", event: "Applying patch: cast customer_id to VARCHAR in ingest config", type: "success" },
                { time: "14:32:12", event: "Patch applied — re-running from Validate stage", type: "success" },
              ].map((e, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${e.type === "warning" ? "bg-amber-50" : e.type === "success" ? "bg-emerald-50" : "bg-slate-50"}`}>
                  <span className="text-slate-400 font-mono w-16 flex-shrink-0">{e.time}</span>
                  <span className={e.type === "warning" ? "text-amber-700" : e.type === "success" ? "text-emerald-700" : "text-slate-600"}>{e.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PILLAR 3 — SEMANTIC ENGINE ──────────────────────────────────────────────
const SemanticView = () => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const metadata = {
    customer: { owner: "data-platform", domain: "CRM", updated: "2m ago", attrs: ["customer_id", "name", "email", "segment_id", "ltv", "churn_score"], sources: ["Snowflake", "CRM API"] },
    order: { owner: "commerce-team", domain: "Commerce", updated: "5m ago", attrs: ["order_id", "customer_id", "total", "status", "created_at"], sources: ["PostgreSQL"] },
    product: { owner: "product-team", domain: "Catalog", updated: "1h ago", attrs: ["product_id", "name", "category_id", "price", "sku"], sources: ["PostgreSQL", "S3"] },
    payment: { owner: "finance-team", domain: "Finance", updated: "15m ago", attrs: ["payment_id", "order_id", "amount", "method", "status"], sources: ["Payment Gateway"] },
    revenue: { owner: "analytics", domain: "Finance", updated: "1d ago", attrs: ["revenue_id", "source", "amount", "period", "channel"], sources: ["DW Aggregation"] },
    event: { owner: "platform-team", domain: "Behavioral", updated: "Live", attrs: ["event_id", "customer_id", "type", "timestamp", "properties"], sources: ["Kafka"] },
    segment: { owner: "growth-team", domain: "Marketing", updated: "6h ago", attrs: ["segment_id", "name", "criteria", "size", "last_computed"], sources: ["ML Pipeline"] },
    category: { owner: "product-team", domain: "Catalog", updated: "2d ago", attrs: ["category_id", "name", "parent_id", "depth"], sources: ["PostgreSQL"] },
    crm: { owner: "sales-team", domain: "CRM", updated: "30m ago", attrs: ["crm_id", "sf_account_id", "stage", "arr", "csm"], sources: ["Salesforce API"] },
  };

  const node = selectedNode ? kgNodes.find(n => n.id === selectedNode) : null;
  const meta = selectedNode ? metadata[selectedNode] : null;

  const getNodePos = (id) => kgNodes.find(n => n.id === id) || { x: 0, y: 0 };

  return (
    <div>
      <SectionHeader
        title="Semantic Engine & Knowledge Graph"
        subtitle="Unified metadata registry with entity relationships, lineage and AI-powered semantic search"
      />

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "Registered Entities", value: "1,842", icon: Database, color: "text-cyan-600" },
          { label: "Relationships Mapped", value: "8,431", icon: Network, color: "text-violet-600" },
          { label: "Avg. Discovery Time", value: "< 2s", icon: Zap, color: "text-amber-500" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
            <s.icon size={22} className={s.color} />
            <div>
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Semantic search — e.g. 'customer lifetime value' or 'revenue by channel'"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm shadow-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100"
          />
        </div>
        {searchQuery.length > 2 && (
          <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-3 flex flex-col gap-1.5">
            {["customer.ltv", "revenue_attribution.channel_revenue", "orders_fact.total_revenue"].map(r => (
              <button key={r} className="flex items-center gap-2 text-sm text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-left w-full">
                <Database size={13} className="text-cyan-500" /> {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-500 mb-3">Click an entity to explore its metadata & relationships</div>
          <svg viewBox="0 50 900 340" className="w-full h-72 cursor-pointer">
            <defs>
              <marker id="km" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8" />
              </marker>
            </defs>
            {kgEdges.map((e, i) => {
              const f = getNodePos(e.from), t = getNodePos(e.to);
              const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2;
              return (
                <g key={i}>
                  <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#e2e8f0" strokeWidth="2" markerEnd="url(#km)" />
                  <text x={mx} y={my - 4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="500">{e.label}</text>
                </g>
              );
            })}
            {kgNodes.map((n) => (
              <g key={n.id} onClick={() => setSelectedNode(n.id === selectedNode ? null : n.id)} style={{ cursor: "pointer" }}>
                <circle cx={n.x} cy={n.y} r={n.r + 4} fill={selectedNode === n.id ? n.color : "transparent"} opacity="0.15" />
                <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={selectedNode && selectedNode !== n.id ? 0.5 : 1} />
                <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{n.label.slice(0, 3)}</text>
                <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" fontSize="11" fill="#334155" fontWeight="600">{n.label}</text>
                <text x={n.x} y={n.y + n.r + 26} textAnchor="middle" fontSize="9" fill="#94a3b8">{n.type}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          {node && meta ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: node.color }}>
                  <Database size={14} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{node.label}</div>
                  <div className="text-xs text-slate-400 capitalize">{node.type}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs mb-4">
                <div className="flex justify-between"><span className="text-slate-400">Domain</span><span className="font-medium text-slate-700">{meta.domain}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Owner</span><span className="font-medium text-slate-700">{meta.owner}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Updated</span><span className="font-medium text-slate-700">{meta.updated}</span></div>
              </div>
              <div className="mb-3">
                <div className="text-xs font-semibold text-slate-500 mb-2">Attributes</div>
                <div className="flex flex-wrap gap-1">
                  {meta.attrs.map(a => <span key={a} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">{a}</span>)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Sources</div>
                <div className="flex flex-col gap-1">
                  {meta.sources.map(s => <span key={s} className="text-xs text-cyan-700 bg-cyan-50 px-2 py-1 rounded flex items-center gap-1"><Link size={10} />{s}</span>)}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400">
              <Network size={32} className="mb-3 opacity-40" />
              <div className="text-sm font-medium">Select an entity</div>
              <div className="text-xs mt-1">Click any node in the knowledge graph to explore its metadata, attributes and source lineage.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── PILLAR 4 — DATA QUALITY ─────────────────────────────────────────────────
const QualityView = () => {
  const [fixApplied, setFixApplied] = useState({});

  const applyFix = (i) => setFixApplied(prev => ({ ...prev, [i]: true }));

  return (
    <div>
      <SectionHeader
        title="AI-Driven Data Quality"
        subtitle="Continuous quality monitoring with automated root cause analysis and AI-generated fixes"
      />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Overall Score", value: "94.2%", sub: "↑ 1.4% vs last week", color: "bg-emerald-500" },
          { label: "Rules Passing", value: "3,841", sub: "Out of 4,092 rules", color: "bg-cyan-600" },
          { label: "Open Issues", value: "4", sub: "2 high severity", color: "bg-amber-500" },
          { label: "Auto-Fixed Today", value: "38", sub: "By AI agents", color: "bg-violet-500" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className={`w-2 h-2 rounded-full ${s.color} mb-3`} />
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm font-medium text-slate-700 mt-1">{s.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Quality Dimensions</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={qualityDimensions}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b" }} />
              <Radar name="Score" dataKey="score" stroke="#0891b2" fill="#0891b2" fillOpacity={0.15} strokeWidth={2} />
              <Tooltip formatter={(v) => [`${v}%`, "Score"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Quality Trend (6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={qualityTrendData}>
              <defs>
                <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, "Score"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} fill="url(#qGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Quality Issues — AI Fix Available</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              {["Dataset", "Field", "Issue", "Severity", "Records", "AI Suggested Fix", "Action"].map(h => (
                <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {qualityIssues.map((q, i) => (
              <tr key={i} className={`hover:bg-slate-50 transition-colors ${fixApplied[i] ? "opacity-50" : ""}`}>
                <td className="px-5 py-3 font-mono text-xs text-cyan-700">{q.dataset}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate-600">{q.field}</td>
                <td className="px-5 py-3 text-slate-700">{q.issue}</td>
                <td className="px-5 py-3"><Badge status={q.severity} /></td>
                <td className="px-5 py-3 text-slate-600">{q.records.toLocaleString()}</td>
                <td className="px-5 py-3 text-xs text-slate-600 max-w-xs">{q.aifix}</td>
                <td className="px-5 py-3">
                  {fixApplied[i] ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600"><Check size={13} /> Applied</span>
                  ) : (
                    <button onClick={() => applyFix(i)} className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                      Apply Fix
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── ANALYST WORKSPACE ───────────────────────────────────────────────────────
const WorkspaceView = () => {
  const [messages, setMessages] = useState(initialChat);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const getResponse = (query) => {
    const q = query.toLowerCase();
    if (q.includes("revenue") || q.includes("attribution")) return agentResponses.revenue;
    if (q.includes("customer") || q.includes("segment") || q.includes("churn")) return agentResponses.customer;
    if (q.includes("quality") || q.includes("issue")) return agentResponses.quality;
    if (q.includes("pipeline") || q.includes("fail")) return agentResponses.pipeline;
    return agentResponses.default + `\n\n\`\`\`sql\nSELECT * FROM ${query.split(" ").slice(-1)[0] || "dataset"}_mart\nLIMIT 1000;\n\`\`\`\n\nQuery executed: 12ms · 1,000 rows returned. **Shall I build an app from this?**`;
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(m => [...m, { role: "assistant", content: getResponse(input) }]);
      setShowDeploy(true);
    }, 1400);
  };

  const formatContent = (content) => {
    const parts = content.split(/```[\w]*\n?([\s\S]*?)```/);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <div key={i} className="my-2 bg-slate-900 rounded-lg p-3 overflow-x-auto">
            <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap">{part}</pre>
          </div>
        );
      }
      return <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{part}</p>;
    });
  };

  return (
    <div>
      <SectionHeader
        title="Analyst Workspace"
        subtitle="Natural language to data · AI builds and deploys applications with zero human intervention"
      />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col" style={{ height: "600px" }}>
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <div className="w-7 h-7 bg-cyan-600 rounded-full flex items-center justify-center">
              <MessageSquare size={13} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Data Agent</div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Online</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === "assistant" ? "bg-cyan-600" : "bg-slate-700"}`}>
                  {m.role === "assistant" ? <MessageSquare size={13} className="text-white" /> : <User size={13} className="text-white" />}
                </div>
                <div className={`max-w-lg rounded-xl px-4 py-3 ${m.role === "assistant" ? "bg-slate-50 text-slate-800" : "bg-cyan-600 text-white"}`}>
                  {m.role === "assistant" ? formatContent(m.content) : <p className="text-sm">{m.content}</p>}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={13} className="text-white" />
                </div>
                <div className="bg-slate-50 rounded-xl px-4 py-3 flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="px-4 py-3 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Ask about your data… e.g. 'Show revenue by channel last 30 days'"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100"
              />
              <button onClick={sendMessage} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 rounded-xl transition-colors">
                <Send size={16} />
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              {["Revenue by channel", "Customer segments", "Pipeline status", "Quality issues"].map(s => (
                <button key={s} onClick={() => { setInput(s); }} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              {[
                { icon: BarChart2, label: "Build Dashboard App", desc: "Auto-generate from query results", color: "text-cyan-600", bg: "bg-cyan-50" },
                { icon: Code, label: "Export to Notebook", desc: "Pandas + Plotly ready", color: "text-violet-600", bg: "bg-violet-50" },
                { icon: Server, label: "Schedule as Job", desc: "Set refresh cadence", color: "text-emerald-600", bg: "bg-emerald-50" },
                { icon: Shield, label: "Apply Data Masking", desc: "PII detection + masking", color: "text-amber-600", bg: "bg-amber-50" },
              ].map((a, i) => (
                <button key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left border border-slate-100">
                  <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center flex-shrink-0`}>
                    <a.icon size={15} className={a.color} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{a.label}</div>
                    <div className="text-xs text-slate-400">{a.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {showDeploy && (
            <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Play size={16} />
                <span className="font-bold text-sm">Ready to Deploy</span>
              </div>
              <p className="text-xs text-cyan-100 mb-4">Your app is AI-generated and tested. Deploy to production with one click — zero DevOps needed.</p>
              <div className="flex flex-col gap-2 mb-4">
                {["App code generated ✓", "Unit tests passed ✓", "Data lineage verified ✓", "Permissions configured ✓"].map(s => (
                  <div key={s} className="text-xs text-cyan-50 flex items-center gap-1.5"><Check size={12} /> {s}</div>
                ))}
              </div>
              <button className="w-full bg-white text-cyan-700 font-bold py-2.5 rounded-xl text-sm hover:bg-cyan-50 transition-colors">
                🚀 Deploy to Production
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">My Apps</h3>
            <div className="flex flex-col gap-2">
              {[
                { name: "Revenue Dashboard", version: "v1.4", status: "live" },
                { name: "Churn Monitor", version: "v2.1", status: "live" },
                { name: "Inventory Tracker", version: "v0.9", status: "staging" },
              ].map((a, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50">
                  <span className="font-medium text-slate-700">{a.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{a.version}</span>
                    <Badge status={a.status === "live" ? "healthy" : "pending"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN LAYOUT ─────────────────────────────────────────────────────────────
const nav = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "publish", label: "Agentic Publishing", icon: Upload, pillar: "1" },
  { id: "pipelines", label: "Self-Healing Pipelines", icon: GitBranch, pillar: "2" },
  { id: "semantic", label: "Semantic Engine", icon: Brain, pillar: "3" },
  { id: "quality", label: "Data Quality", icon: CheckSquare, pillar: "4" },
  { id: "workspace", label: "Analyst Workspace", icon: MessageSquare },
];

export default function AgenticDataPlatform() {
  const [activeView, setActiveView] = useState("dashboard");
  const [notifOpen, setNotifOpen] = useState(false);
  const active = nav.find(n => n.id === activeView);

  const views = {
    dashboard: <DashboardView setActiveView={setActiveView} />,
    publish: <PublishView />,
    pipelines: <PipelinesView />,
    semantic: <SemanticView />,
    quality: <QualityView />,
    workspace: <WorkspaceView />,
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <Database size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">AgenticDT</div>
              <div className="text-slate-400 text-xs">Data Platform v2.0</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-2 mb-2">Navigation</div>
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${activeView === item.id ? "bg-cyan-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
            >
              <item.icon size={16} className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.pillar && (
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-bold ${activeView === item.id ? "bg-white/20 text-white" : "bg-slate-700 text-slate-400"}`}>
                  P{item.pillar}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center text-white text-xs font-bold">A</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">Abhik Banerjee</div>
              <div className="text-slate-400 text-xs">Data Analyst</div>
            </div>
            <Settings size={14} className="text-slate-400 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-900">{active?.label}</span>
          </div>
          <div className="flex-1 mx-4">
            <div className="relative max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search datasets, pipelines, entities…" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-1.5 text-sm focus:outline-none focus:border-cyan-300 focus:bg-white" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> 38 Agents Active
            </div>
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={16} className="text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center text-white text-xs font-bold cursor-pointer">A</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {views[activeView]}
        </main>
      </div>
    </div>
  );
}
