import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, Zap, Database, Network, TrendingUp, AlertCircle, Shield,
  Brain, Users, Settings, ChevronRight, Play, Pause, RotateCw,
  CheckCircle, Clock, AlertTriangle, Home, Layers, Lock, GitBranch,
  BarChart3, Workflow, Filter, Search, RefreshCw, Download, Plus,
  Gauge, Eye, Cloud, MapPin, Copy, Menu, X, MessageSquare, ChevronDown, Upload, Paperclip
} from 'lucide-react';

function AgenticDataPlatform() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [agentRunning, setAgentRunning] = useState(false);
  const [schemaDetected, setSchemaDetected] = useState(false);
  const [lagHealed, setLagHealed] = useState(false);
  const [mlModelsDeployed, setMlModelsDeployed] = useState(3);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [qualityScore, setQualityScore] = useState(87);
  const [selectedPipeline, setSelectedPipeline] = useState(null);

  // ── Pipeline / AWS state ──────────────────────────────────────────────────
  const [awsPipelines, setAwsPipelines] = useState(null);       // null = not loaded
  const [pipelinesLoading, setPipelinesLoading] = useState(false);
  const [pipelinesError, setPipelinesError] = useState(null);
  const [selectedDag, setSelectedDag] = useState(null);
  const [dagLoading, setDagLoading] = useState(false);
  const [healingLog, setHealingLog] = useState([]);
  const [isHealing, setIsHealing] = useState(false);
  const [healingDone, setHealingDone] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(null);   // id of pipeline being triggered

  // ── Pipeline refs + effects (hoisted here to avoid hook-inside-const-component flicker) ──
  const healLogRef = useRef(null);

  // Auto-scroll healing console
  useEffect(() => {
    if (healLogRef.current) healLogRef.current.scrollTop = healLogRef.current.scrollHeight;
  }, [healingLog]);

  // Load pipelines when Pipelines tab is first opened
  useEffect(() => {
    if (activeNav === 'pipelines' && awsPipelines === null && !pipelinesLoading) {
      fetchPipelines();
    }
  }, [activeNav]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load DAG whenever the selected pipeline changes (only on pipelines tab)
  useEffect(() => {
    if (activeNav !== 'pipelines') return;
    if (activePipeline && (activePipeline.type === 'glue' || activePipeline.type === 'stepfunction')) {
      fetchDag(activePipeline);
    }
  }, [selectedPipeline, activeNav]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mock dashboard data
  const kpiData = [
    { label: 'Data Sources', value: '284', change: '+12%', icon: Database },
    { label: 'Daily Records', value: '2.4B', change: '+8.3%', icon: TrendingUp },
    { label: 'Uptime', value: '99.97%', change: '-0.01%', icon: CheckCircle },
    { label: 'Query Latency', value: '245ms', change: '-15%', icon: Zap }
  ];

  const streamMetrics = [
    { id: 'confluent-1', source: 'Confluent Topic: orders-v2', topic: 'orders-v2', broker: 'MSK-cluster-1', processor: 'Flink', target: 'S3 (Parquet)', msgSec: 45230, lag: 124, schema: 'detected', status: 'healthy' },
    { id: 'confluent-2', source: 'Confluent Topic: events-raw', topic: 'events-raw', broker: 'MSK-cluster-1', processor: 'Spark', target: 'Snowflake', msgSec: 98450, lag: 312, schema: 'pending', status: 'warning' },
    { id: 'confluent-3', source: 'Confluent Topic: telemetry', topic: 'telemetry', broker: 'MSK-cluster-2', processor: 'Flink', target: 'ClickHouse', msgSec: 234100, lag: 89, schema: 'detected', status: 'healthy' }
  ];

  const pipelineData = [
    { id: 'etl-main', name: 'ETL-Main-Pipeline', status: 'running', lastRun: '2h ago', nextRun: '3h', owner: 'Data Eng', dags: 24, healableIssues: 2 },
    { id: 'ml-feature', name: 'ML-Feature-Engineering', status: 'success', lastRun: '1h ago', nextRun: '2h', owner: 'ML Team', dags: 18, healableIssues: 0 },
    { id: 'data-quality', name: 'Data-Quality-Checks', status: 'running', lastRun: '15m ago', nextRun: '1h', owner: 'Data Gov', dags: 12, healableIssues: 1 }
  ];

  const storageMetrics = [
    { name: 'S3 Data Lake', size: '2.3PB', growth: '+180GB/day', tables: 45000, format: 'Parquet/ORC' },
    { name: 'Snowflake DW', size: '450TB', growth: '+25GB/day', tables: 3200, compute: '32 credits/day' },
    { name: 'Feature Store', size: '125TB', growth: '+5GB/day', features: 12400, online: '98.2%' },
    { name: 'Graph Database', size: '89TB', growth: '+2GB/day', entities: '1.2B', relations: '4.8B' }
  ];

  const chartData = [
    { time: '00:00', ingestion: 1200, processing: 950, quality: 850 },
    { time: '04:00', ingestion: 2210, processing: 1290, quality: 920 },
    { time: '08:00', ingestion: 2290, processing: 1500, quality: 1050 },
    { time: '12:00', ingestion: 2000, processing: 1680, quality: 1100 },
    { time: '16:00', ingestion: 2181, processing: 1450, quality: 980 },
    { time: '20:00', ingestion: 2500, processing: 1800, quality: 1200 },
    { time: '23:59', ingestion: 2100, processing: 1350, quality: 950 }
  ];

  const qualityIssues = [
    { id: 1, table: 'customer_360', issue: 'Null values > 5%', severity: 'high', autoFixed: true, timestamp: '2h ago' },
    { id: 2, table: 'order_events', issue: 'Schema mismatch', severity: 'critical', autoFixed: true, timestamp: '1h ago' },
    { id: 3, table: 'inventory', issue: 'Freshness SLA breach', severity: 'medium', autoFixed: false, timestamp: '30m ago' }
  ];

  const mlModels = [
    { id: 'model-1', name: 'Churn Prediction v3.2', accuracy: '94.7%', lastTrain: '2d ago', status: 'serving', framework: 'XGBoost', monitors: ['drift', 'performance'] },
    { id: 'model-2', name: 'Product Recommendation', accuracy: '92.1%', lastTrain: '1d ago', status: 'serving', framework: 'PyTorch', monitors: ['drift'] },
    { id: 'model-3', name: 'Anomaly Detection v2.0', accuracy: '96.3%', lastTrain: '3d ago', status: 'training', framework: 'TensorFlow', monitors: ['performance', 'latency'] }
  ];

  const queries = [
    { id: 1, user: 'alice@company.com', sql: 'SELECT * FROM customer_360 WHERE..', execution: '2.3s', rows: '45,200', source: 'Athena' },
    { id: 2, user: 'bob@company.com', sql: 'WITH agg AS (SELECT department...)', execution: '5.1s', rows: '128,450', source: 'Starburst' },
    { id: 3, user: 'carol@company.com', sql: 'SELECT order_date, SUM(revenue)...', execution: '1.8s', rows: '365', source: 'Snowflake SQL' }
  ];

  const dataAssets = [
    { name: 'customer_360', owner: 'Data Team', quality: 94, governance: 'PII tagged', lineage: 'Visible' },
    { name: 'product_catalog', owner: 'Product Team', quality: 91, governance: 'Public', lineage: 'Visible' },
    { name: 'transaction_events', owner: 'Finance', quality: 97, governance: 'Restricted', lineage: 'Visible' }
  ];

  // Agentic action handlers
  const handleAutoDetectSchema = () => {
    setAgentRunning(true);
    setTimeout(() => {
      setSchemaDetected(true);
      setAgentRunning(false);
    }, 2000);
  };

  const handleHealLag = () => {
    setAgentRunning(true);
    setTimeout(() => {
      setLagHealed(true);
      setAgentRunning(false);
    }, 2500);
  };

  const handleTrainModel = () => {
    setAgentRunning(true);
    setTimeout(() => {
      setMlModelsDeployed(mlModelsDeployed + 1);
      setAgentRunning(false);
    }, 3000);
  };

  const handleAutoRemediateQuality = () => {
    setAgentRunning(true);
    setTimeout(() => {
      setQualityScore(qualityScore + 3);
      setAgentRunning(false);
    }, 2000);
  };

  // StatCard component
  const StatCard = ({ icon: Icon, label, value, change, color = 'teal' }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-600 text-sm font-medium">{label}</span>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <div className="mb-2">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
      <div className={`text-xs font-medium ${change.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
        {change}
      </div>
    </div>
  );

  // CCB Architecture Map Component
  const CCBArchitectureMap = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">CCB Data Architecture Layers</h3>
      <div className="space-y-4">
        {/* Data Sources Layer */}
        <div className="border-l-4 border-blue-500 pl-4">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Layer 1: Data Sources</div>
          <div className="grid grid-cols-4 gap-2">
            {['Salesforce', 'SAP', 'Mainframe', 'APIs'].map((source) => (
              <div key={source} className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-center text-blue-900 font-medium cursor-pointer hover:bg-blue-100 transition">
                {source}
              </div>
            ))}
          </div>
        </div>

        {/* Ingestion Layer */}
        <div className="border-l-4 border-cyan-500 pl-4 pt-4">
          <div className="text-xs font-bold text-cyan-700 uppercase tracking-wide mb-2">Layer 2: Ingestion</div>
          <div className="grid grid-cols-4 gap-2">
            {['Confluent', 'MSK', 'Kafka Connect', 'Informatica'].map((tool) => (
              <button
                key={tool}
                onClick={() => setActiveNav('ingestion')}
                className="bg-cyan-50 border border-cyan-200 rounded p-2 text-xs text-center text-cyan-900 font-medium hover:bg-cyan-100 transition"
              >
                {tool}
              </button>
            ))}
          </div>
        </div>

        {/* Processing Layer */}
        <div className="border-l-4 border-purple-500 pl-4 pt-4">
          <div className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Layer 3: Processing</div>
          <div className="grid grid-cols-4 gap-2">
            {['Flink', 'Spark', 'Control-M', 'Airflow'].map((tool) => (
              <button
                key={tool}
                onClick={() => setActiveNav('pipelines')}
                className="bg-purple-50 border border-purple-200 rounded p-2 text-xs text-center text-purple-900 font-medium hover:bg-purple-100 transition"
              >
                {tool}
              </button>
            ))}
          </div>
        </div>

        {/* Storage Layer */}
        <div className="border-l-4 border-teal-500 pl-4 pt-4">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-2">Layer 4: Storage & Warehouse</div>
          <div className="grid grid-cols-4 gap-2">
            {['S3 Lake', 'Snowflake', 'Teradata', 'Feature Store'].map((tool) => (
              <button
                key={tool}
                onClick={() => setActiveNav('storage')}
                className="bg-teal-50 border border-teal-200 rounded p-2 text-xs text-center text-teal-900 font-medium hover:bg-teal-100 transition"
              >
                {tool}
              </button>
            ))}
          </div>
        </div>

        {/* Access & Analytics Layer */}
        <div className="border-l-4 border-orange-500 pl-4 pt-4">
          <div className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-2">Layer 5: Access & Analytics</div>
          <div className="grid grid-cols-4 gap-2">
            {['Athena', 'Starburst', 'Tableau', 'Analyst AI'].map((tool) => (
              <button
                key={tool}
                onClick={() => setActiveNav('analyst')}
                className="bg-orange-50 border border-orange-200 rounded p-2 text-xs text-center text-orange-900 font-medium hover:bg-orange-100 transition"
              >
                {tool}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // StreamingTopology Component
  const StreamingTopology = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Real-time Streaming Topology</h3>
      <div className="flex items-center justify-between bg-gray-50 rounded p-4 border border-gray-200">
        <div className="text-center">
          <div className="bg-blue-100 border-2 border-blue-500 rounded px-4 py-3 inline-block">
            <div className="text-xs font-bold text-blue-900">Data Sources</div>
            <div className="text-sm text-blue-800 mt-1">Salesforce, SAP, APIs</div>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 text-gray-400" />
        <div className="text-center">
          <div className="bg-cyan-100 border-2 border-cyan-500 rounded px-4 py-3 inline-block">
            <div className="text-xs font-bold text-cyan-900">Confluent / MSK</div>
            <div className="text-sm text-cyan-800 mt-1">Kafka Broker</div>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 text-gray-400" />
        <div className="text-center">
          <div className="bg-purple-100 border-2 border-purple-500 rounded px-4 py-3 inline-block">
            <div className="text-xs font-bold text-purple-900">Flink / Spark</div>
            <div className="text-sm text-purple-800 mt-1">Stream Processor</div>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 text-gray-400" />
        <div className="text-center">
          <div className="bg-teal-100 border-2 border-teal-500 rounded px-4 py-3 inline-block">
            <div className="text-xs font-bold text-teal-900">Target Systems</div>
            <div className="text-sm text-teal-800 mt-1">S3, Snowflake, DW</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Dashboard View
  const DashboardView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
        <p className="text-gray-600 mb-6">Real-time overview of your Agentic Data Platform</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <StatCard
            key={kpi.label}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            color="teal"
          />
        ))}
      </div>

      {/* Architecture Map */}
      <CCBArchitectureMap />

      {/* Agent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Live Agent Activity
          </h3>
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded p-3 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-900">Auto-Detect Schema Agent</div>
                <div className="text-sm text-green-700">Detected 47 new data sources • 2 min ago</div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-blue-900">Data Quality Remediation Agent</div>
                <div className="text-sm text-blue-700">Fixed 12 quality issues • 5 min ago</div>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded p-3 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-purple-900">Pipeline Healing Agent</div>
                <div className="text-sm text-purple-700">Healed 3 failed DAGs • 15 min ago</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Throughput (Records/Hour)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="ingestion" stackId="1" stroke="#0891B2" fill="#06B6D4" />
              <Area type="monotone" dataKey="processing" stackId="1" stroke="#8B5CF6" fill="#A78BFA" />
              <Area type="monotone" dataKey="quality" stackId="1" stroke="#EC4899" fill="#F472B6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // ── Ingestion pipeline state ────────────────────────────────────────────────
  const [ingestFile, setIngestFile]           = useState(null);
  const [ingestTransformCol, setIngestTransformCol] = useState('');
  const [ingestNewCol, setIngestNewCol]       = useState('');
  const [ingestRunning, setIngestRunning]     = useState(false);
  const [ingestRun, setIngestRun]             = useState(null);
  const [ingestSteps, setIngestSteps]         = useState([]);
  const [ingestQuality, setIngestQuality]     = useState(null);
  const [ingestError, setIngestError]         = useState(null);
  const [ingestPipelineReady, setIngestPipelineReady] = useState(null);
  const [ingestLogs, setIngestLogs]           = useState([]);
  const [ingestLogsOpen, setIngestLogsOpen]   = useState(false);
  const [ingestLogsLoading, setIngestLogsLoading] = useState(false);
  const [ingestSample, setIngestSample]       = useState(null);
  const [chatAttachFile, setChatAttachFile]   = useState(null);
  // Quality-only mode
  const [ingestMode, setIngestMode]           = useState('full');       // 'full' | 'quality'
  const [lastEtlRun, setLastEtlRun]           = useState(null);         // last successful ETL run info
  const [lastEtlRunLoading, setLastEtlRunLoading] = useState(false);
  // Passcode gate
  const [passcode, setPasscode]               = useState('');           // verified passcode for this session
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput]     = useState('');
  const [passcodeError, setPasscodeError]     = useState('');
  const [pendingAction, setPendingPipelineAction] = useState(null);     // 'full' | 'quality' — action to run after passcode
  const ingestFileRef                         = useRef(null);
  const ingestPollRef                         = useRef(null);
  const chatFileInputRef                      = useRef(null);

  const [ingestMeta, setIngestMeta]               = useState(null);  // raw metadata from S3
  const [ingestMetaEdits, setIngestMetaEdits]     = useState({});    // { colName: { description, tags, pii_flag } }
  const [ingestMetaLoading, setIngestMetaLoading] = useState(false);
  const [ingestMetaEnriching, setIngestMetaEnriching] = useState(false);
  const [ingestMetaRegistering, setIngestMetaRegistering] = useState(false);
  const [ingestMetaRegistered, setIngestMetaRegistered] = useState(null); // { catalog_id, registered_at }

  useEffect(() => {
    if (activeNav !== 'ingestion') return;
    fetch(`${BACKEND}/api/ingest/config`)
      .then(r => r.json())
      .then(d => setIngestPipelineReady(d.configured))
      .catch(() => setIngestPipelineReady(null)); // null = backend unreachable (don't show warning)
  }, [activeNav]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearInterval(ingestPollRef.current), []);

  const startIngestPoll = (executionArn, runId) => {
    clearInterval(ingestPollRef.current);
    ingestPollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${BACKEND}/api/ingest/status/${encodeURIComponent(executionArn)}?runId=${runId}`);
        const d = await r.json();
        if (d.steps) setIngestSteps(d.steps);

        if (d.sfnStatus === 'SUCCEEDED') {
          // Pipeline finished — stop polling regardless of quality outcome
          clearInterval(ingestPollRef.current);
          setIngestRunning(false);
          if (d.runId) fetchIngestSample(d.runId);

          // Set quality state: use real stats, or a bypass placeholder so downstream
          // conditions (metadata panel, chat message) always have something to work with
          if (d.qualityStats) {
            setIngestQuality(d.qualityStats);
          } else {
            setIngestQuality({
              bypassed:      true,
              passed:        null,
              quality_score: null,
              warning:       d.qualityWarningMsg || 'Quality check was skipped — pipeline continued to metadata generation',
            });
          }

          // Always load enriched metadata — independent of quality outcome
          if (d.enrichedMeta) {
            setIngestMeta(d.enrichedMeta);
            const edits = {};
            (d.enrichedMeta.columns || []).forEach(col => {
              edits[col.name] = {
                description: col.description || '',
                tags:        (col.tags || []).join(', '),
                pii_flag:    col.pii_flag || false,
              };
            });
            setIngestMetaEdits(edits);
          }
        } else if (d.errorDetail) {
          setIngestError(d.errorDetail);
          clearInterval(ingestPollRef.current);
          setIngestRunning(false);
        } else if (['FAILED','TIMED_OUT','ABORTED'].includes(d.sfnStatus)) {
          clearInterval(ingestPollRef.current);
          setIngestRunning(false);
        }
      } catch { /* keep polling */ }
    }, 5000);
  };

  // ── Passcode helpers ────────────────────────────────────────────────────────
  const passcodeHeaders = () => passcode ? { 'x-pipeline-passcode': passcode } : {};

  const guardWithPasscode = (action) => {
    if (passcode) {
      // Already verified this session — run immediately
      if (action === 'full') _doIngestRun();
      else _doQualityOnlyRun();
    } else {
      setPendingPipelineAction(action);
      setPasscodeInput('');
      setPasscodeError('');
      setShowPasscodeModal(true);
    }
  };

  const handlePasscodeSubmit = async () => {
    if (passcodeInput.length !== 4) { setPasscodeError('Enter exactly 4 digits'); return; }
    // Verify against backend by making a lightweight probe request
    try {
      const r = await fetch(`${BACKEND}/api/ingest/config`, {
        headers: { 'x-pipeline-passcode': passcodeInput },
      });
      if (r.status === 401 || r.status === 403) {
        const d = await r.json().catch(() => ({}));
        setPasscodeError(d.error || 'Incorrect passcode — try again');
        return;
      }
      // Accepted — store for the session and proceed
      setPasscode(passcodeInput);
      setShowPasscodeModal(false);
      if (pendingAction === 'full') _doIngestRun(passcodeInput);
      else _doQualityOnlyRun(passcodeInput);
    } catch {
      setPasscodeError('Could not reach backend — check connection');
    }
  };

  const handleIngestRun = () => guardWithPasscode('full');

  const _doIngestRun = async (code) => {
    const pc = code || passcode;
    if (!ingestFile) return;
    setIngestRunning(true);
    setIngestError(null);
    setIngestQuality(null);
    setIngestRun(null);
    setIngestSteps([
      { id: 1, name: 'Load to S3',           icon: '☁️',  status: 'running' },
      { id: 2, name: 'Parse with Glue',       icon: '⚙️',  status: 'waiting' },
      { id: 3, name: 'Transform Column',       icon: '🔄',  status: 'waiting' },
      { id: 4, name: 'Quality & Profile',       icon: '🔬',  status: 'waiting' },
    ]);
    const form = new FormData();
    form.append('file', ingestFile);
    form.append('transformColumn', ingestTransformCol || '');
    form.append('newColumnName',   ingestNewCol || '');
    try {
      const r = await fetch(`${BACKEND}/api/ingest/start`, {
        method: 'POST', body: form,
        headers: pc ? { 'x-pipeline-passcode': pc } : {},
      });
      const d = await r.json();
      if (r.status === 401 || r.status === 403) {
        setPasscode(''); setIngestError('Passcode rejected — please re-enter'); setIngestRunning(false); return;
      }
      if (!r.ok) { setIngestError(d.error || 'Failed to start pipeline'); setIngestRunning(false); return; }
      setIngestRun(d);
      if (d.steps) setIngestSteps(d.steps);
      startIngestPoll(d.executionArn, d.runId);
    } catch (e) {
      setIngestError(`Network error: ${e.message}`);
      setIngestRunning(false);
    }
  };

  const fetchIngestLogs = async () => {
    if (!ingestRun?.runId) return;
    setIngestLogsLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/ingest/logs?runId=${ingestRun.runId}`);
      const d = await r.json();
      setIngestLogs(d.events || []);
    } catch {
      setIngestLogs([{ timestamp: Date.now(), message: 'Could not fetch logs — check backend is running', logGroup: '' }]);
    } finally {
      setIngestLogsLoading(false);
    }
  };

  const fetchIngestSample = async (runId) => {
    try {
      const r = await fetch(`${BACKEND}/api/ingest/sample/${runId}`);
      if (r.ok) {
        const d = await r.json();
        setIngestSample(d);
      }
    } catch { /* sample is optional */ }
  };

  const fetchMetadata = async (runId, enrich = false) => {
    setIngestMetaLoading(true);
    try {
      const endpoint = enrich
        ? `${BACKEND}/api/metadata/${runId}/enrich`
        : `${BACKEND}/api/metadata/${runId}`;
      const r = await fetch(endpoint, enrich ? { method: 'POST' } : undefined);
      if (r.ok) {
        const d = await r.json();
        setIngestMeta(d);
        // Initialise edits map from existing values
        const edits = {};
        (d.columns || []).forEach(col => {
          edits[col.name] = {
            description: col.description || '',
            tags:        (col.tags || []).join(', '),
            pii_flag:    col.pii_flag || false,
          };
        });
        setIngestMetaEdits(edits);
      }
    } catch (e) { console.error('fetchMetadata', e); }
    finally { setIngestMetaLoading(false); setIngestMetaEnriching(false); }
  };

  const handleEnrichMeta = async () => {
    if (!ingestRun?.runId) return;
    setIngestMetaEnriching(true);
    await fetchMetadata(ingestRun.runId, true);
  };

  const handleRegisterMetadata = async () => {
    if (!ingestMeta || !ingestRun?.runId) return;
    setIngestMetaRegistering(true);
    try {
      // Merge user edits back into columns
      const approvedColumns = (ingestMeta.columns || []).map(col => ({
        ...col,
        description: ingestMetaEdits[col.name]?.description ?? col.description,
        tags:        (ingestMetaEdits[col.name]?.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        pii_flag:    ingestMetaEdits[col.name]?.pii_flag ?? col.pii_flag,
      }));
      const payload = { ...ingestMeta, columns: approvedColumns };
      const r = await fetch(`${BACKEND}/api/metadata/${ingestRun.runId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const d = await r.json();
        setIngestMetaRegistered(d);
      } else {
        const e = await r.json();
        alert(`Registration failed: ${e.error}`);
      }
    } catch (e) { alert(`Registration error: ${e.message}`); }
    finally { setIngestMetaRegistering(false); }
  };

  const fetchLastEtlRun = async () => {
    setLastEtlRunLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/ingest/last-etl-run`);
      if (r.ok) setLastEtlRun(await r.json());
      else setLastEtlRun(null);
    } catch { setLastEtlRun(null); }
    finally { setLastEtlRunLoading(false); }
  };

  const handleQualityOnlyRun = () => guardWithPasscode('quality');

  const _doQualityOnlyRun = async (code) => {
    const pc = code || passcode;
    setIngestRunning(true);
    setIngestError(null);
    setIngestQuality(null);
    setIngestRun(null);
    setIngestSteps([
      { id: 1, name: 'Load to S3',       icon: '☁️',  status: 'skipped' },
      { id: 2, name: 'Parse with Glue',  icon: '⚙️',  status: 'skipped' },
      { id: 3, name: 'Transform Column', icon: '🔄',  status: 'skipped' },
      { id: 4, name: 'Quality & Profile',icon: '🔬',  status: 'running' },
    ]);
    try {
      const r = await fetch(`${BACKEND}/api/ingest/quality-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(pc ? { 'x-pipeline-passcode': pc } : {}) },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (r.status === 401 || r.status === 403) {
        setPasscode(''); setIngestError('Passcode rejected — please re-enter'); setIngestRunning(false); return;
      }
      if (!r.ok) { setIngestError(d.error || 'Failed to start quality check'); setIngestRunning(false); return; }
      setIngestRun(d);
      if (d.steps) setIngestSteps(d.steps);
      startIngestPoll(d.executionArn, d.runId);
    } catch (e) {
      setIngestError(`Network error: ${e.message}`);
      setIngestRunning(false);
    }
  };

  const ingestStepColor = (status) => {
    if (status === 'done')    return { ring: 'border-green-500 bg-green-50',   label: 'bg-green-100 text-green-800' };
    if (status === 'running') return { ring: 'border-blue-500 bg-blue-50',     label: 'bg-blue-100 text-blue-800' };
    if (status === 'warning') return { ring: 'border-yellow-400 bg-yellow-50', label: 'bg-yellow-100 text-yellow-700' };
    if (status === 'error')   return { ring: 'border-red-500 bg-red-50',       label: 'bg-red-100 text-red-800' };
    if (status === 'skipped') return { ring: 'border-gray-200 bg-gray-50 opacity-50', label: 'bg-gray-100 text-gray-400' };
    return                           { ring: 'border-gray-200 bg-gray-50',     label: 'bg-gray-100 text-gray-500' };
  };

  const IngestionHubView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ingestion Hub</h2>
        <p className="text-gray-500 mt-1">CSV → S3 → Glue ETL → Column Transform → Lambda Quality Check — one click</p>
      </div>

      {ingestPipelineReady === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Pipeline infrastructure not provisioned</p>
              <p className="text-sm text-amber-700 mt-1">Run the one-time setup script to create the S3 bucket, Glue job, Lambda, and Step Functions state machine.</p>
              <pre className="mt-3 bg-amber-100 rounded p-3 text-xs text-amber-900 overflow-x-auto">{`cd backend/aws\nchmod +x setup.sh && ./setup.sh`}</pre>
              <p className="text-xs text-amber-600 mt-2">Then restart the backend — the Ingestion tab will become fully active.</p>
            </div>
          </div>
        </div>
      )}
      {ingestPipelineReady === null && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
            <p className="text-sm text-gray-600">Checking pipeline status… make sure the backend is running at <code className="bg-gray-100 px-1 rounded text-xs">{BACKEND}</code></p>
          </div>
        </div>
      )}

      {/* ── Passcode modal ── */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 flex flex-col items-center">
            <div className="text-4xl mb-3">🔐</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Pipeline Passcode</h3>
            <p className="text-sm text-gray-500 mb-5 text-center">Enter the 4-digit passcode to run the pipeline</p>
            <div className="flex gap-3 mb-2">
              {[0,1,2,3].map(i => (
                <input
                  key={i}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={passcodeInput[i] || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    const next = passcodeInput.split('');
                    next[i] = val.slice(-1);
                    const newCode = next.join('').slice(0, 4);
                    setPasscodeInput(newCode);
                    setPasscodeError('');
                    if (val && i < 3) {
                      document.getElementById(`pc-digit-${i+1}`)?.focus();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !passcodeInput[i] && i > 0) {
                      document.getElementById(`pc-digit-${i-1}`)?.focus();
                    }
                    if (e.key === 'Enter' && passcodeInput.length === 4) handlePasscodeSubmit();
                  }}
                  id={`pc-digit-${i}`}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              ))}
            </div>
            {passcodeError && <p className="text-xs text-red-600 mt-1 mb-3">{passcodeError}</p>}
            <div className="flex gap-3 mt-4 w-full">
              <button onClick={() => setShowPasscodeModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handlePasscodeSubmit} disabled={passcodeInput.length !== 4}
                className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-40 transition">
                Confirm
              </button>
            </div>
            {passcode && (
              <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                <span>✓</span> Session unlocked — passcode remembered
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {/* ── Mode toggle ── */}
        <div className="flex items-center gap-2 mb-5 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => setIngestMode('full')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${ingestMode === 'full' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            ⚡ Full Pipeline
          </button>
          <button
            onClick={() => { setIngestMode('quality'); fetchLastEtlRun(); }}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${ingestMode === 'quality' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            🔬 Quality Check Only
          </button>
        </div>

        {/* ── Full pipeline config ── */}
        {ingestMode === 'full' && (<>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">1. Data Source (CSV)</label>
              <div
                onClick={() => ingestFileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${ingestFile ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'}`}
              >
                <input ref={ingestFileRef} type="file" accept=".csv,.tsv,.txt" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setIngestFile(f); setIngestRun(null); setIngestSteps([]); setIngestQuality(null); setIngestError(null); }}} />
                {ingestFile ? (
                  <><Database className="w-7 h-7 text-teal-600 mx-auto mb-1" /><p className="text-sm font-semibold text-teal-800 truncate">{ingestFile.name}</p><p className="text-xs text-teal-600">{(ingestFile.size/1024).toFixed(1)} KB</p></>
                ) : (
                  <><Plus className="w-7 h-7 text-gray-400 mx-auto mb-1" /><p className="text-sm text-gray-500">Click to upload CSV</p><p className="text-xs text-gray-400">Max 100 MB</p></>
                )}
              </div>
            </div>
            <div className="md:col-span-2 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">2. Column to Transform</label>
                <input type="text" value={ingestTransformCol} onChange={e => setIngestTransformCol(e.target.value)}
                  placeholder="e.g.  first_name  /  revenue  /  status"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <p className="text-xs text-gray-400 mt-1">String → UPPER + char count · Integer → Low/Medium/High · Float → rounded + % of max</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">3. New Derived Column Name</label>
                <input type="text" value={ingestNewCol} onChange={e => setIngestNewCol(e.target.value)}
                  placeholder={ingestTransformCol ? `${ingestTransformCol}_derived` : 'e.g.  name_normalized'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          </div>
          <button onClick={handleIngestRun} disabled={!ingestFile || ingestRunning || ingestPipelineReady === false || ingestPipelineReady === null}
            className="w-full py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2 text-base">
            {ingestRunning ? <><RotateCw className="w-5 h-5 animate-spin" /> Pipeline Running…</> : <><Play className="w-5 h-5" /> Run Ingestion Pipeline</>}
          </button>
        </>)}

        {/* ── Quality-only config ── */}
        {ingestMode === 'quality' && (<>
          <div className="mb-5">
            <p className="text-sm text-gray-600 mb-3">Runs the quality profiler + AI metadata enrichment against the last successful Glue ETL output — no file upload or ETL needed.</p>
            <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Last Successful ETL Run</p>
              {lastEtlRunLoading && (
                <p className="text-sm text-gray-500 animate-pulse">Fetching last run info…</p>
              )}
              {!lastEtlRunLoading && !lastEtlRun && (
                <p className="text-sm text-red-600">No successful ETL run found. Run the full pipeline at least once first.</p>
              )}
              {!lastEtlRunLoading && lastEtlRun && (
                <div className="space-y-1 text-sm">
                  <div className="flex gap-3 flex-wrap">
                    <span className="text-gray-600">Source file:</span>
                    <span className="font-semibold text-gray-900">{lastEtlRun.inputS3Path?.split('/').pop() || '—'}</span>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <span className="text-gray-600">Run ID:</span>
                    <code className="text-xs text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">{lastEtlRun.runId}</code>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <span className="text-gray-600">Completed:</span>
                    <span className="text-gray-700">{lastEtlRun.completedAt ? new Date(lastEtlRun.completedAt).toLocaleString() : '—'}</span>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <span className="text-gray-600">Output:</span>
                    <span className="text-xs text-gray-500 font-mono truncate">{lastEtlRun.outputS3Path}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={handleQualityOnlyRun}
            disabled={!lastEtlRun || ingestRunning || ingestPipelineReady === false || ingestPipelineReady === null}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2 text-base">
            {ingestRunning ? <><RotateCw className="w-5 h-5 animate-spin" /> Quality Check Running…</> : <><span>🔬</span> Run Quality &amp; Profile Agent</>}
          </button>
        </>)}
      </div>

      {ingestSteps.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Pipeline Progress</h3>
            {ingestRun?.reusedEtlRunId && (
              <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full font-medium">
                🔬 Quality-only · reusing ETL run <code>{ingestRun.reusedEtlRunId}</code>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ingestSteps.map((step) => {
              const c = ingestStepColor(step.status);
              return (
                <div key={step.id} className={`border-2 ${c.ring} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl mb-2 ${step.status === 'running' ? 'animate-pulse' : 'opacity-75'}`}>{step.icon}</div>
                  <p className={`text-xs font-semibold ${step.status === 'skipped' ? 'text-gray-400' : 'text-gray-700'}`}>{step.name}</p>
                  <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.label}`}>
                    {step.status === 'done' ? '✓ done' : step.status === 'running' ? '⏳ running' : step.status === 'warning' ? '⚠ bypassed' : step.status === 'error' ? '✗ error' : step.status === 'skipped' ? '— skipped' : '○ waiting'}
                  </span>
                </div>
              );
            })}
          </div>
          {ingestRun && (
            <div className="mt-4 text-xs text-gray-400 font-mono bg-gray-50 rounded px-3 py-2">
              Run ID: {ingestRun.runId} · {ingestRun.executionArn?.split(':').pop()}
            </div>
          )}
        </div>
      )}

      {ingestError && (
        <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
          <div className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900 text-sm">Pipeline Error</p>
              <p className="text-sm text-red-700 mt-1">{ingestError}</p>
              <button
                onClick={() => { setIngestLogsOpen(o => !o); if (!ingestLogsOpen) fetchIngestLogs(); }}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 transition"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${ingestLogsOpen ? 'rotate-180' : ''}`} />
                {ingestLogsOpen ? 'Hide' : 'View'} CloudWatch Logs
              </button>
            </div>
          </div>
          {ingestLogsOpen && (
            <div className="border-t border-red-200 bg-gray-900 rounded-b-lg p-4 max-h-72 overflow-y-auto font-mono text-xs">
              {ingestLogsLoading ? (
                <p className="text-gray-400 animate-pulse">Fetching logs from CloudWatch…</p>
              ) : ingestLogs.length === 0 ? (
                <p className="text-gray-400">No log events found for this run. Logs may take up to 60 s to appear in CloudWatch.</p>
              ) : (
                ingestLogs.map((e, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-gray-500 mr-2">{new Date(e.timestamp).toISOString().slice(11, 23)}</span>
                    <span className={`${e.message.toLowerCase().includes('error') || e.message.toLowerCase().includes('exception') ? 'text-red-400' : 'text-green-300'}`}>
                      {e.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {ingestQuality && !ingestQuality.bypassed && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Data Quality Report</h3>
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${ingestQuality.quality_score >= 80 ? 'text-green-600' : ingestQuality.quality_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {ingestQuality.quality_score}%
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${ingestQuality.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {ingestQuality.passed ? '✓ PASSED' : '✗ FAILED'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Rows',    value: (ingestQuality.total_rows ?? 0).toLocaleString(), icon: '📊' },
              { label: 'Total Columns', value: String(ingestQuality.total_columns ?? 0),          icon: '📋' },
              { label: 'Parquet Files', value: String(ingestQuality.parquet_files ?? 1),           icon: '📦' },
              { label: 'Issues Found',  value: String((ingestQuality.issues||[]).length),          icon: (ingestQuality.issues||[]).length > 0 ? '⚠️' : '✅' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          {(ingestQuality.issues||[]).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quality Issues</p>
              <div className="space-y-2">
                {ingestQuality.issues.map((issue, i) => (
                  <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm ${issue.severity === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${issue.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <div><span className="font-semibold">{issue.column}</span><span className="text-gray-600 ml-2">{issue.message}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ingestQuality.column_stats && Object.keys(ingestQuality.column_stats).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Column Statistics</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Column</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Nulls</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Null %</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Sample Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(ingestQuality.column_stats).map(([col, stats]) => (
                      <tr key={col} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-gray-900">{col}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{stats.dtype}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{stats.null_count}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[60px]">
                              <div className={`h-1.5 rounded-full ${stats.null_pct > 50 ? 'bg-red-500' : stats.null_pct > 10 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(stats.null_pct,100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-600">{stats.null_pct}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 font-mono truncate max-w-[200px]">{(stats.sample_values||[]).slice(0,3).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        {ingestSample && ingestSample.rows?.length > 0 && (
          <div className="mt-5">
            <h4 className="font-semibold text-gray-800 text-sm mb-2">Data Preview <span className="text-gray-400 font-normal">— first {ingestSample.rows.length} rows of transformed output</span></h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {ingestSample.columns.map(col => (
                      <th key={col} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ingestSample.rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {ingestSample.columns.map(col => (
                        <td key={col} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-32 truncate" title={row[col] ?? ''}>
                          {row[col] === null || row[col] === 'None' ? <span className="text-gray-300 italic">null</span> : row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* ── Metadata review & registration ── */}
        {!ingestMetaRegistered && (
          <div className="mt-5 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-800 text-sm">Column Metadata Review</h4>
                <p className="text-xs text-gray-500 mt-0.5">AI-generated descriptions auto-load after quality profiling — edit then register to the catalog</p>
              </div>
              <div className="flex gap-2">
                {!ingestMeta && ingestMetaLoading && (
                  <span className="px-3 py-1.5 text-xs text-gray-500 flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />Loading metadata…
                  </span>
                )}
                {!ingestMeta && !ingestMetaLoading && ingestRun?.runId && (
                  <button onClick={() => fetchMetadata(ingestRun.runId)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5" />Reload Metadata
                  </button>
                )}
                {ingestMeta && (
                  <button onClick={handleEnrichMeta}
                    disabled={ingestMetaEnriching || ingestMetaLoading}
                    className="px-3 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-medium text-teal-700 hover:bg-teal-50 transition disabled:opacity-50 flex items-center gap-1.5">
                    {ingestMetaEnriching ? <><RotateCw className="w-3.5 h-3.5 animate-spin" />Enriching…</> : <><Brain className="w-3.5 h-3.5" />Re-run AI Descriptions</>}
                  </button>
                )}
              </div>
            </div>

            {ingestMetaLoading && !ingestMeta && (
              <div className="p-6 text-center text-sm text-gray-500 animate-pulse">Loading column metadata…</div>
            )}
            {!ingestMeta && !ingestMetaLoading && !ingestRun && (
              <div className="p-6 text-center text-sm text-gray-400">Run the pipeline to auto-generate column metadata.</div>
            )}
            {!ingestMeta && !ingestMetaLoading && ingestRun && ingestRunning && (
              <div className="p-6 text-center text-sm text-gray-400 animate-pulse">Metadata will appear automatically once the pipeline completes…</div>
            )}

            {ingestQuality?.bypassed && (
              <div className="px-4 py-2.5 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2 text-xs text-yellow-800">
                <span className="text-base">⚠️</span>
                <span><strong>Quality check was bypassed</strong> — {ingestQuality.warning || 'Pipeline continued to metadata generation.'} Descriptions are AI-generated from column names and data types.</span>
              </div>
            )}
            {ingestMeta && (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {(ingestMeta.columns || []).map(col => (
                  <div key={col.name} className="px-4 py-3 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800 text-sm">{col.name}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{col.data_type}</span>
                          {col.semantic_type && col.semantic_type !== 'other' && (
                            <span className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">{col.semantic_type}</span>
                          )}
                          {ingestMetaEdits[col.name]?.pii_flag && (
                            <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">PII</span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">{col.null_pct ?? 0}% null</span>
                        </div>
                        <input
                          type="text"
                          value={ingestMetaEdits[col.name]?.description ?? ''}
                          onChange={e => setIngestMetaEdits(prev => ({ ...prev, [col.name]: { ...prev[col.name], description: e.target.value } }))}
                          placeholder="Add a description for this column…"
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white"
                        />
                        <div className="flex items-center gap-3 mt-1.5">
                          <input
                            type="text"
                            value={ingestMetaEdits[col.name]?.tags ?? ''}
                            onChange={e => setIngestMetaEdits(prev => ({ ...prev, [col.name]: { ...prev[col.name], tags: e.target.value } }))}
                            placeholder="Tags (comma-separated)"
                            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white"
                          />
                          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
                            <input type="checkbox"
                              checked={ingestMetaEdits[col.name]?.pii_flag ?? false}
                              onChange={e => setIngestMetaEdits(prev => ({ ...prev, [col.name]: { ...prev[col.name], pii_flag: e.target.checked } }))}
                              className="rounded" />
                            PII
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ingestMeta && (
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-gray-500">{(ingestMeta.columns || []).length} columns · review descriptions and PII flags before registering</p>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveNav('analyst')}
                    className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />Discuss in Chat
                  </button>
                  <button onClick={handleRegisterMetadata}
                    disabled={ingestMetaRegistering || !ingestMeta}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2">
                    {ingestMetaRegistering
                      ? <><RotateCw className="w-4 h-4 animate-spin" />Registering…</>
                      : <><Database className="w-4 h-4" />Register to Catalog</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {ingestMetaRegistered && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900 text-sm">Registered to Catalog</p>
              <p className="text-xs text-green-700 mt-1">
                Catalog ID: <code className="bg-green-100 px-1 rounded">{ingestMetaRegistered.catalog_id}</code>
                {' · '}Registered at {new Date(ingestMetaRegistered.registered_at).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setIngestRun(null); setIngestSteps([]); setIngestQuality(null); setIngestError(null); setIngestFile(null); setIngestSample(null); setIngestLogs([]); setIngestLogsOpen(false); setIngestMeta(null); setIngestMetaEdits({}); setIngestMetaRegistered(null); }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            Run Another File
          </button>
        </div>
        </div>
      )}
    </div>
  );

  // ── Pipeline helpers ─────────────────────────────────────────────────────────
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  const fetchPipelines = async () => {
    setPipelinesLoading(true);
    setPipelinesError(null);
    try {
      const r = await fetch(`${BACKEND}/api/pipelines`);
      if (!r.ok) {
        const e = await r.json();
        setPipelinesError(e.hint || e.error || 'Failed to load pipelines');
        setAwsPipelines(null);
      } else {
        const data = await r.json();
        setAwsPipelines(data);
        // auto-select first pipeline
        const all = [...(data.gluePipelines || []), ...(data.sfPipelines || [])];
        if (all.length && !selectedPipeline) setSelectedPipeline(all[0].id);
      }
    } catch (e) {
      setPipelinesError(`Cannot reach backend at ${BACKEND}. Is it running?`);
    } finally {
      setPipelinesLoading(false);
    }
  };

  const fetchDag = async (pipeline) => {
    setDagLoading(true);
    setSelectedDag(null);
    try {
      const r = await fetch(`${BACKEND}/api/pipelines/${pipeline.type}/${encodeURIComponent(pipeline.id)}/dag`);
      if (r.ok) setSelectedDag(await r.json());
    } catch { /* ignore */ } finally {
      setDagLoading(false);
    }
  };

  const triggerRun = async (pipeline) => {
    setRunningPipeline(pipeline.id);
    try {
      if (pipeline.type === 'glue') {
        await fetch(`${BACKEND}/api/pipelines/glue/${encodeURIComponent(pipeline.name)}/run`, { method: 'POST' });
      } else if (pipeline.type === 'stepfunction') {
        await fetch(`${BACKEND}/api/pipelines/sf/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stateMachineArn: pipeline.arn }),
        });
      }
      setTimeout(fetchPipelines, 2000);
    } catch { /* ignore */ } finally {
      setTimeout(() => setRunningPipeline(null), 2000);
    }
  };

  const triggerHealing = async () => {
    setIsHealing(true);
    setHealingDone(false);
    setHealingLog([{ ts: new Date().toISOString(), msg: '🔗 Connecting to Self-Healing Agent...' }]);
    try {
      const r = await fetch(`${BACKEND}/api/pipelines/heal`, { method: 'POST' });
      const data = await r.json();
      if (data.logs) {
        setHealingLog(data.logs);
      } else {
        setHealingLog([{ ts: new Date().toISOString(), msg: `❌ ${data.error || 'Unknown error'}` }]);
      }
      setHealingDone(true);
      setTimeout(fetchPipelines, 1500);
    } catch (e) {
      setHealingLog(prev => [...prev, { ts: new Date().toISOString(), msg: `❌ Network error: ${e.message}` }]);
      setHealingDone(true);
    } finally {
      setIsHealing(false);
    }
  };

  // ── Status colour helpers ─────────────────────────────────────────────────
  const statusBadge = (status = '') => {
    const s = status.toUpperCase();
    if (['RUNNING', 'ACTIVE', 'ENABLED'].includes(s)) return 'bg-blue-100 text-blue-800';
    if (['SUCCEEDED', 'COMPLETED', 'SUCCESS'].includes(s)) return 'bg-green-100 text-green-800';
    if (['FAILED', 'ERROR'].includes(s)) return 'bg-red-100 text-red-800';
    if (['STOPPED', 'DISABLED'].includes(s)) return 'bg-gray-100 text-gray-600';
    return 'bg-yellow-100 text-yellow-800';
  };

  const dagNodeColors = (type = 'Task', idx = 0) => {
    const palette = [
      { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-900' },
      { bg: 'bg-blue-100',  border: 'border-blue-500',  text: 'text-blue-900' },
      { bg: 'bg-purple-100',border: 'border-purple-500',text: 'text-purple-900' },
      { bg: 'bg-teal-100',  border: 'border-teal-500',  text: 'text-teal-900' },
      { bg: 'bg-orange-100',border: 'border-orange-500',text: 'text-orange-900' },
      { bg: 'bg-pink-100',  border: 'border-pink-500',  text: 'text-pink-900' },
    ];
    if (type === 'Choice')  return { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-900' };
    if (type === 'Succeed') return { bg: 'bg-green-200',  border: 'border-green-600',  text: 'text-green-900' };
    if (type === 'Fail')    return { bg: 'bg-red-100',    border: 'border-red-500',    text: 'text-red-900' };
    return palette[idx % palette.length];
  };

  const allPipelines = awsPipelines
    ? [...(awsPipelines.gluePipelines || []), ...(awsPipelines.sfPipelines || []), ...(awsPipelines.ebPipelines || [])]
    : [];
  const activePipeline = allPipelines.find(p => p.id === selectedPipeline);

  // ── Pipelines View ────────────────────────────────────────────────────────
  const PipelinesView = () => {
    // No hooks here — all effects/refs are hoisted to the parent component
    // to prevent React from unmounting/remounting on every parent re-render.
    const typeIcon = (type) => {
      if (type === 'glue')         return '⚙️';
      if (type === 'stepfunction') return '🔀';
      if (type === 'eventbridge')  return '⏱️';
      return '📋';
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pipelines</h2>
            <p className="text-gray-600 mt-1">Live AWS Glue · Step Functions · EventBridge — with Agentic Self-Healing</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchPipelines}
              disabled={pipelinesLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${pipelinesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={triggerHealing}
              disabled={isHealing || !awsPipelines}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-semibold"
            >
              {isHealing
                ? <><RotateCw className="w-4 h-4 animate-spin" /> Healing…</>
                : <><Zap className="w-4 h-4" /> Trigger Self-Healing Agent</>}
            </button>
          </div>
        </div>

        {/* AWS Not Configured */}
        {pipelinesError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">AWS Not Connected</p>
                <p className="text-sm text-amber-800 mt-1">{pipelinesError}</p>
                <div className="mt-3 bg-amber-100 rounded p-3 font-mono text-xs text-amber-900 space-y-1">
                  <p># Add to backend/.env:</p>
                  <p>AWS_ACCESS_KEY_ID=AKIA…</p>
                  <p>AWS_SECRET_ACCESS_KEY=…</p>
                  <p>AWS_REGION=us-east-1</p>
                </div>
                <button
                  onClick={fetchPipelines}
                  className="mt-3 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {pipelinesLoading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-48" />
                    <div className="h-3 bg-gray-100 rounded w-32" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pipeline list */}
        {!pipelinesLoading && awsPipelines && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={GitBranch} label="Glue Jobs"        value={String(awsPipelines.gluePipelines?.length ?? 0)}  change="discovered" color="teal" />
              <StatCard icon={Workflow}  label="State Machines"   value={String(awsPipelines.sfPipelines?.length ?? 0)}    change="discovered" color="teal" />
              <StatCard icon={Clock}     label="EB Schedules"     value={String(awsPipelines.ebPipelines?.length ?? 0)}    change="active rules" color="teal" />
              <StatCard icon={CheckCircle} label="Healed (session)" value={String(healingLog.filter(l => l.msg.includes('✅ Restart')).length)} change="auto-fixed" color="teal" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: pipeline list */}
              <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 text-sm">AWS Pipelines</h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
                  {allPipelines.length === 0 && (
                    <p className="p-6 text-sm text-gray-500 text-center">No pipelines found in this region</p>
                  )}
                  {allPipelines.map(pipeline => (
                    <div
                      key={pipeline.id}
                      onClick={() => setSelectedPipeline(pipeline.id)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition ${selectedPipeline === pipeline.id ? 'bg-teal-50 border-l-4 border-teal-600' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base flex-shrink-0">{typeIcon(pipeline.type)}</span>
                          <p className="font-medium text-gray-900 text-sm truncate">{pipeline.name}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusBadge(pipeline.status)}`}>
                          {pipeline.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">
                        {pipeline.type === 'glue' ? 'AWS Glue' : pipeline.type === 'stepfunction' ? 'Step Functions' : 'EventBridge'}
                        {pipeline.lastRun ? ` · ${new Date(pipeline.lastRun).toLocaleDateString()}` : ''}
                      </p>
                      {pipeline.duration && (
                        <p className="text-xs text-gray-400 ml-6">{pipeline.duration}</p>
                      )}
                      {/* Run button */}
                      {(pipeline.type === 'glue' || pipeline.type === 'stepfunction') && (
                        <button
                          onClick={e => { e.stopPropagation(); triggerRun(pipeline); }}
                          disabled={runningPipeline === pipeline.id}
                          className="mt-2 ml-6 text-xs px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-1"
                        >
                          {runningPipeline === pipeline.id
                            ? <><RotateCw className="w-3 h-3 animate-spin" /> Starting…</>
                            : <><Play className="w-3 h-3" /> Run Now</>}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: DAG + runs */}
              <div className="lg:col-span-2 space-y-4">
                {/* DAG visualization */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                  {!activePipeline && (
                    <p className="text-gray-400 text-sm text-center py-8">Select a pipeline on the left to view its workflow</p>
                  )}
                  {activePipeline && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">{activePipeline.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(activePipeline.status)}`}>
                            {activePipeline.status}
                          </span>
                          {activePipeline.type === 'glue' && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">AWS Glue</span>}
                          {activePipeline.type === 'stepfunction' && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Step Functions</span>}
                        </div>
                      </div>

                      {dagLoading && (
                        <div className="flex items-center justify-center py-10 text-gray-400">
                          <RotateCw className="w-5 h-5 animate-spin mr-2" /> Loading workflow…
                        </div>
                      )}

                      {!dagLoading && selectedDag && selectedDag.nodes.length > 0 && (
                        <div className="overflow-x-auto">
                          <div className="flex items-center gap-0 min-w-max pb-2">
                            {selectedDag.nodes.map((node, idx) => {
                              const c = dagNodeColors(node.type, idx);
                              return (
                                <React.Fragment key={node.name}>
                                  <div className="text-center flex-shrink-0">
                                    <div className={`${c.bg} border-2 ${c.border} rounded-lg px-4 py-3 inline-block min-w-[100px]`}>
                                      <div className={`text-xs font-bold ${c.text} uppercase tracking-wide`}>{node.type}</div>
                                      <div className={`text-sm font-medium ${c.text} mt-1`}>{node.name}</div>
                                      {node.isEnd && <div className="text-xs text-gray-400 mt-1">END</div>}
                                    </div>
                                  </div>
                                  {!node.isEnd && idx < selectedDag.nodes.length - 1 && (
                                    <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 mx-1" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!dagLoading && (!selectedDag || selectedDag.nodes.length === 0) && activePipeline.type !== 'eventbridge' && (
                        <div className="text-sm text-gray-400 text-center py-6">No workflow definition available</div>
                      )}

                      {activePipeline.type === 'eventbridge' && (
                        <div className="bg-gray-50 rounded p-4 text-sm text-gray-600">
                          <p><span className="font-medium">Schedule:</span> {activePipeline.schedule}</p>
                          <p><span className="font-medium">State:</span> {activePipeline.status}</p>
                        </div>
                      )}

                      {/* Recent executions */}
                      {!dagLoading && selectedDag?.recentExecutions?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Executions</p>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {selectedDag.recentExecutions.slice(0, 8).map((ex, i) => (
                              <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-2">
                                <span className="font-mono text-gray-700 truncate max-w-[200px]">{ex.name}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {ex.startDate && <span className="text-gray-400">{new Date(ex.startDate).toLocaleString()}</span>}
                                  <span className={`px-2 py-0.5 rounded-full font-medium ${statusBadge(ex.status)}`}>{ex.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Self-Healing Console */}
                {healingLog.length > 0 && (
                  <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isHealing ? 'bg-green-400 animate-pulse' : healingDone ? 'bg-green-400' : 'bg-gray-500'}`} />
                        <span className="text-xs font-mono text-gray-300">self-healing-agent · CloudWatch /agenticdt/healing</span>
                      </div>
                      <button onClick={() => { setHealingLog([]); setHealingDone(false); }} className="text-gray-500 hover:text-gray-300 text-xs">✕ clear</button>
                    </div>
                    <div
                      ref={healLogRef}
                      className="p-4 font-mono text-xs text-green-300 space-y-1 max-h-72 overflow-y-auto"
                    >
                      {healingLog.map((entry, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-gray-500 flex-shrink-0">
                            {new Date(entry.ts).toLocaleTimeString()}
                          </span>
                          <span className={
                            entry.msg.includes('❌') ? 'text-red-400' :
                            entry.msg.includes('⚠️') || entry.msg.includes('🚨') ? 'text-yellow-400' :
                            entry.msg.includes('✅') ? 'text-green-400' :
                            entry.msg.includes('🔄') ? 'text-blue-400' :
                            entry.msg.includes('🤖') || entry.msg.includes('📡') ? 'text-teal-400' :
                            'text-gray-300'
                          }>{entry.msg}</span>
                        </div>
                      ))}
                      {isHealing && (
                        <div className="flex gap-3">
                          <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                          <span className="text-teal-400 animate-pulse">▌</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Storage & Warehouse View
  const StorageView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Storage & Warehouse</h2>
        <p className="text-gray-600 mb-6">Data Lake, DW, Feature Store, and Graph Database Management</p>
      </div>

      {/* Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Cloud}
          label="Total Storage"
          value="3.0PB"
          change="+212GB"
          color="teal"
        />
        <StatCard
          icon={Database}
          label="Total Tables"
          value="61.6K"
          change="+2.3K"
          color="teal"
        />
        <StatCard
          icon={TrendingUp}
          label="Daily Growth"
          value="212GB"
          change="+8GB"
          color="teal"
        />
        <StatCard
          icon={Gauge}
          label="Query Speed"
          value="2.3s"
          change="avg latency"
          color="teal"
        />
      </div>

      {/* Storage Systems */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {storageMetrics.map((system) => (
          <div key={system.name} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-teal-600" />
              {system.name}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Capacity:</span>
                <span className="font-semibold text-gray-900">{system.size}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Daily Growth:</span>
                <span className="font-semibold text-gray-900">{system.growth}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{system.tables ? 'Tables' : system.features ? 'Features' : 'Entities'}:</span>
                <span className="font-semibold text-gray-900">{system.tables ? system.tables.toLocaleString() : system.features ? system.features.toLocaleString() : (system.entities || '1.2B')}</span>
              </div>
              {system.compute && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Compute:</span>
                  <span className="font-semibold text-gray-900">{system.compute}</span>
                </div>
              )}
              {system.online && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Online Availability:</span>
                  <span className="font-semibold text-green-600">{system.online}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Storage Distribution Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-6">Storage Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[
                { name: 'S3 Data Lake', value: 2300 },
                { name: 'Snowflake DW', value: 450 },
                { name: 'Feature Store', value: 125 },
                { name: 'Graph DB', value: 89 }
              ]}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}TB`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#0891B2" />
              <Cell fill="#06B6D4" />
              <Cell fill="#8B5CF6" />
              <Cell fill="#EC4899" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Semantic Engine View
  const SemanticView = () => {
    const [searchQuery, setSearchQuery]     = useState('');
    const [showResults, setShowResults]     = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [entityFilter, setEntityFilter]   = useState('');

    const GW = 600, GH = 310;

    const graphEntities = [
      { id: 'customer', name: 'Customer',   type: 'Entity',  domain: 'CRM',       owner: 'data-platform', updated: '2m ago',  color: '#0E7490', attrs: ['customer_id','name','email','segment_id','ltv','churn_score'], sources: ['Snowflake DW','CRM API'],    attrCount: 12, relCount: 5 },
      { id: 'order',    name: 'Order',      type: 'Entity',  domain: 'Commerce',  owner: 'commerce-team', updated: '5m ago',  color: '#7C3AED', attrs: ['order_id','customer_id','total','status','created_at'],       sources: ['PostgreSQL'],                attrCount:  8, relCount: 3 },
      { id: 'product',  name: 'Product',    type: 'Entity',  domain: 'Catalog',   owner: 'product-team',  updated: '1h ago',  color: '#059669', attrs: ['product_id','name','category_id','price','sku'],              sources: ['PostgreSQL','S3'],            attrCount: 15, relCount: 4 },
      { id: 'payment',  name: 'Payment',    type: 'Entity',  domain: 'Finance',   owner: 'finance-team',  updated: '15m ago', color: '#D97706', attrs: ['payment_id','order_id','amount','method','status'],           sources: ['Payment Gateway'],            attrCount:  7, relCount: 2 },
      { id: 'revenue',  name: 'Revenue',    type: 'Metric',  domain: 'Finance',   owner: 'analytics',     updated: '1d ago',  color: '#DC2626', attrs: ['revenue_id','source','amount','period','channel'],            sources: ['DW Aggregation'],             attrCount:  5, relCount: 2 },
      { id: 'event',    name: 'Event',      type: 'Entity',  domain: 'Behavioral',owner: 'platform-team', updated: 'Live',    color: '#0D5FAA', attrs: ['event_id','customer_id','type','timestamp','properties'],     sources: ['Kafka/MSK'],                 attrCount:  9, relCount: 2 },
      { id: 'segment',  name: 'Segment',    type: 'Concept', domain: 'Marketing', owner: 'growth-team',   updated: '6h ago',  color: '#0E7490', attrs: ['segment_id','name','criteria','size','last_computed'],       sources: ['ML Pipeline'],                attrCount:  5, relCount: 3 },
      { id: 'crm',      name: 'CRM',        type: 'Source',  domain: 'CRM',       owner: 'sales-team',    updated: '30m ago', color: '#7C3AED', attrs: ['crm_id','sf_account_id','stage','arr','csm'],                sources: ['Salesforce API'],             attrCount:  6, relCount: 1 },
    ];

    const nodeLayout = [
      { id: 'customer', x: 0.38, y: 0.44 }, { id: 'order',   x: 0.60, y: 0.20 },
      { id: 'product',  x: 0.60, y: 0.68 }, { id: 'payment', x: 0.82, y: 0.20 },
      { id: 'revenue',  x: 0.82, y: 0.68 }, { id: 'event',   x: 0.16, y: 0.20 },
      { id: 'segment',  x: 0.16, y: 0.68 }, { id: 'crm',     x: 0.38, y: 0.84 },
    ];
    const edges = [['customer','order'],['customer','product'],['customer','event'],['customer','segment'],['customer','crm'],['order','payment'],['product','revenue'],['payment','revenue']];
    const getPos = id => { const l = nodeLayout.find(n => n.id === id); return l ? { x: l.x * GW, y: l.y * GH } : { x: 0, y: 0 }; };

    const searchResults = [
      { name: 'customer.ltv', type: 'Metric' },
      { name: 'revenue_attribution.channel_revenue', type: 'Dataset' },
      { name: 'orders_fact.total_revenue', type: 'Metric' },
    ].filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const dataAssets = [
      { name: 'customer_master', owner: 'Data Eng',  quality: 98, governance: 'Strict',   lineage: 'Full'    },
      { name: 'orders_fact',     owner: 'Commerce',  quality: 94, governance: 'Standard', lineage: 'Full'    },
      { name: 'product_catalog', owner: 'Catalog',   quality: 91, governance: 'Standard', lineage: 'Partial' },
      { name: 'revenue_daily',   owner: 'Finance',   quality: 99, governance: 'Strict',   lineage: 'Full'    },
      { name: 'events_stream',   owner: 'Analytics', quality: 87, governance: 'Basic',    lineage: 'Partial' },
    ];

    const coverageData = [
      { category: 'Tables', coverage: 95 }, { category: 'Columns', coverage: 92 },
      { category: 'Relationships', coverage: 87 }, { category: 'Business Terms', coverage: 78 },
      { category: 'Data Quality', coverage: 84 },
    ];

    const filteredEntities = graphEntities.filter(e =>
      !entityFilter || e.name.toLowerCase().includes(entityFilter.toLowerCase()) || e.domain.toLowerCase().includes(entityFilter.toLowerCase())
    );

    const statCards = [
      { label: 'Cataloged Assets',   value: '8.2K',  change: '+320', icon: Database,  bg: 'bg-teal-50',   fg: 'text-teal-600'   },
      { label: 'Knowledge Entities', value: '1,842', change: '+121', icon: Network,   bg: 'bg-purple-50', fg: 'text-purple-600' },
      { label: 'Relations',          value: '8,431', change: '+342', icon: GitBranch, bg: 'bg-blue-50',   fg: 'text-blue-600'   },
      { label: 'Glossary Terms',     value: '3,450', change: '+125', icon: Eye,       bg: 'bg-orange-50', fg: 'text-orange-500' },
      { label: 'Marketplace',        value: '547',   change: '+28',  icon: Cloud,     bg: 'bg-green-50',  fg: 'text-green-600'  },
      { label: 'Discovery Time',     value: '<2s',   change: '–18%', icon: Zap,       bg: 'bg-teal-50',   fg: 'text-teal-600'   },
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Semantic Engine</h2>
          <p className="text-gray-500 mt-1">Unified metadata registry · Knowledge graph · Semantic search · Data marketplace</p>
        </div>

        {/* 6 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ label, value, change, icon: Icon, bg, fg }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${bg}`}>
                <Icon className={`w-4 h-4 ${fg}`} />
              </div>
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-lg font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{change}</p>
            </div>
          ))}
        </div>

        {/* Semantic Search */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative z-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Semantic Search</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Semantic search — e.g. 'customer lifetime value'"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowResults(e.target.value.length > 0); }}
              onFocus={() => searchQuery && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 150)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none"
            />
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20">
                {searchResults.length > 0 ? searchResults.map((r, i) => (
                  <button key={i} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 text-left border-b border-gray-100 last:border-0 first:rounded-t-xl last:rounded-b-xl transition">
                    <Network className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 font-mono">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.type}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                )) : <p className="px-4 py-3 text-sm text-gray-400">No results for "{searchQuery}"</p>}
              </div>
            )}
          </div>
        </div>

        {/* Knowledge Graph + Entity Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Knowledge Graph</h3>
              <span className="text-xs text-gray-400">Click a node to explore</span>
            </div>
            <svg viewBox={`0 0 ${GW} ${GH}`} className="w-full" style={{ height: 260 }}>
              {edges.map(([from, to], i) => {
                const f = getPos(from); const t = getPos(to);
                return <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#CBD5E1" strokeWidth="1.5" />;
              })}
              {graphEntities.map(entity => {
                const pos = getPos(entity.id);
                const isSel = selectedEntity?.id === entity.id;
                const r = entity.id === 'customer' ? 27 : 20;
                return (
                  <g key={entity.id} onClick={() => setSelectedEntity(isSel ? null : entity)} style={{ cursor: 'pointer' }}>
                    <circle cx={pos.x} cy={pos.y} r={isSel ? r + 5 : r}
                      fill={isSel ? entity.color : entity.color + '22'}
                      stroke={entity.color} strokeWidth="2"
                      style={{ transition: 'all 0.2s ease' }} />
                    <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
                      fill={isSel ? '#fff' : entity.color}
                      fontSize={entity.id === 'customer' ? '9.5' : '8.5'} fontWeight="700"
                      style={{ pointerEvents: 'none', transition: 'fill 0.2s ease' }}>
                      {entity.name.slice(0, 4)}
                    </text>
                    <text x={pos.x} y={pos.y + (isSel ? r + 5 : r) + 10} textAnchor="middle"
                      fill="#94A3B8" fontSize="7.5" fontWeight="500" style={{ pointerEvents: 'none' }}>
                      {entity.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Entity Detail Panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Entity Detail</h3>
            {selectedEntity ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: selectedEntity.color + '20' }}>
                    <Network className="w-5 h-5" style={{ color: selectedEntity.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedEntity.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{selectedEntity.type}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Domain', selectedEntity.domain], ['Owner', selectedEntity.owner], ['Updated', selectedEntity.updated]].map(([l, v]) => (
                    <div key={l}><p className="text-xs text-gray-400 mb-0.5">{l}</p><p className="text-xs font-semibold text-gray-700 truncate">{v}</p></div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Attributes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntity.attrs.map(attr => (
                      <span key={attr} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-mono">{attr}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sources</p>
                  <div className="space-y-1.5">
                    {selectedEntity.sources.map(src => (
                      <div key={src} className="flex items-center gap-2 px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-lg">
                        <Database className="w-3 h-3 flex-shrink-0" /><span className="text-xs font-medium">{src}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-52 text-center">
                <Network className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-xs text-gray-400">Select a node in the graph<br />to explore entity details</p>
              </div>
            )}
          </div>
        </div>

        {/* Entity Registry */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Entity Registry</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Filter entities…" value={entityFilter}
                onChange={e => setEntityFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-300 focus:border-transparent outline-none" />
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredEntities.map(entity => (
              <button key={entity.id}
                onClick={() => setSelectedEntity(selectedEntity?.id === entity.id ? null : entity)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition text-left ${selectedEntity?.id === entity.id ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: entity.color }}>
                  {entity.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{entity.name}</p>
                  <p className="text-xs text-gray-400">{entity.domain} · {entity.attrCount} attrs · {entity.relCount} relations</p>
                </div>
                <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${selectedEntity?.id === entity.id ? 'rotate-90 text-teal-500' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Data Assets & Lineage */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Data Assets & Lineage</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Asset', 'Owner', 'Quality', 'Governance', 'Lineage'].map(h => (
                    <th key={h} className="text-left pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dataAssets.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="py-3 font-mono text-xs text-gray-700">{a.name}</td>
                    <td className="py-3 text-xs text-gray-600">{a.owner}</td>
                    <td className="py-3"><span className="text-sm font-semibold text-green-600">{a.quality}%</span></td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.governance === 'Strict' ? 'bg-red-50 text-red-600' : a.governance === 'Standard' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{a.governance}</span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.lineage === 'Full' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>{a.lineage}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metadata Coverage Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Metadata Catalog Coverage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={coverageData} layout="vertical" margin={{ left: 100, right: 30, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={95} />
              <Tooltip formatter={v => [`${v}%`, 'Coverage']} />
              <Bar dataKey="coverage" fill="#0E7490" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Data Quality View
  const DataQualityView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Quality</h2>
        <p className="text-gray-600 mb-6">Agentic Quality Checks with Auto-Remediation and Trend Analysis</p>
      </div>

      {/* Quality Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Gauge}
          label="Overall Quality"
          value={`${qualityScore}%`}
          change="+3%"
          color="teal"
        />
        <StatCard
          icon={CheckCircle}
          label="Passing Tables"
          value="3,120"
          change="+45"
          color="teal"
        />
        <StatCard
          icon={AlertTriangle}
          label="Issues Detected"
          value="23"
          change="-8"
          color="teal"
        />
        <StatCard
          icon={RotateCw}
          label="Auto-Fixed"
          value="156"
          change="this week"
          color="teal"
        />
      </div>

      {/* Quality Issues */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Quality Issues</h3>
          <button
            onClick={handleAutoRemediateQuality}
            disabled={agentRunning}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium text-sm flex items-center gap-2"
          >
            {agentRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Auto-Remediate
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {qualityIssues.map((issue) => (
            <div key={issue.id} className="p-6 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{issue.table}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {issue.severity}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{issue.issue}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{issue.timestamp}</span>
                {issue.autoFixed && <span className="text-green-600 font-medium">Auto-fixed by agent</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Trend */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-6">Quality Score Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={[
            { day: 'Mon', score: 82 },
            { day: 'Tue', score: 83 },
            { day: 'Wed', score: 84 },
            { day: 'Thu', score: 85 },
            { day: 'Fri', score: 86 },
            { day: 'Sat', score: 87 },
            { day: 'Sun', score: qualityScore }
          ]}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#0891B2" strokeWidth={2} dot={{ fill: '#0891B2' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Governance & Mesh View
  const GovernanceView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Governance & Mesh</h2>
        <p className="text-gray-600 mb-6">Data Mesh Control Plane with Policies, Access Control, and Entitlements</p>
      </div>

      {/* Governance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Shield}
          label="Data Publishers"
          value="47"
          change="+5"
          color="teal"
        />
        <StatCard
          icon={Users}
          label="Data Consumers"
          value="234"
          change="+18"
          color="teal"
        />
        <StatCard
          icon={Lock}
          label="Access Policies"
          value="1,250"
          change="+72"
          color="teal"
        />
        <StatCard
          icon={CheckCircle}
          label="Compliance Rate"
          value="99.8%"
          change="+0.2%"
          color="teal"
        />
      </div>

      {/* Governance Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Network className="w-5 h-5 text-teal-600" />
            Data Mesh Domains
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Customer Domain', owner: 'Customer Team', assets: 234, consumers: 45 },
              { name: 'Finance Domain', owner: 'Finance Team', assets: 156, consumers: 32 },
              { name: 'Product Domain', owner: 'Product Team', assets: 189, consumers: 28 }
            ].map((domain) => (
              <div key={domain.name} className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="font-medium text-gray-900">{domain.name}</div>
                <div className="text-xs text-gray-600 mt-1">Owner: {domain.owner} • {domain.assets} assets • {domain.consumers} consumers</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-teal-600" />
            Access Control (Immuta)
          </h3>
          <div className="space-y-3">
            {[
              { policy: 'PII Tags', status: 'Active', protection: 'Encryption + Masking' },
              { policy: 'GDPR Compliance', status: 'Active', protection: 'Audit Logging' },
              { policy: 'Finance Data', status: 'Active', protection: 'Role-Based' }
            ].map((policy) => (
              <div key={policy.policy} className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="font-medium text-gray-900">{policy.policy}</div>
                <div className="text-xs text-gray-600 mt-1">{policy.protection}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Credential Vending & Entitlements */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-teal-600" />
          Credential Vending & Entitlements
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">User</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Role</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Entitlements</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Credential Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Last Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { user: 'alice@company.com', role: 'Data Engineer', entitlements: 'Customer, Product, Finance', status: 'Active', access: '5m ago' },
                { user: 'bob@company.com', role: 'Analyst', entitlements: 'Customer, Product', status: 'Active', access: '1h ago' },
                { user: 'carol@company.com', role: 'Data Scientist', entitlements: 'All (with PII mask)', status: 'Active', access: '2h ago' }
              ].map((entry) => (
                <tr key={entry.user} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{entry.user}</td>
                  <td className="px-6 py-4 text-gray-600">{entry.role}</td>
                  <td className="px-6 py-4 text-gray-600 text-xs">{entry.entitlements}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">{entry.status}</span></td>
                  <td className="px-6 py-4 text-gray-600">{entry.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ML Platform View
  const MLPlatformView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">ML Platform</h2>
        <p className="text-gray-600 mb-6">Infinite AI Model Lifecycle: Develop → Train → Serve → Monitor</p>
      </div>

      {/* ML Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Brain}
          label="Models in Prod"
          value={mlModelsDeployed}
          change="+2 this month"
          color="teal"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Accuracy"
          value="94.4%"
          change="+1.2%"
          color="teal"
        />
        <StatCard
          icon={Clock}
          label="Inference Latency"
          value="45ms"
          change="-8ms"
          color="teal"
        />
        <StatCard
          icon={AlertTriangle}
          label="Models w/ Drift"
          value="2"
          change="needs retraining"
          color="teal"
        />
      </div>

      {/* Model Registry */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Model Registry (Arthur.ai / LUMA)</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {mlModels.map((model) => (
            <div key={model.id} className="p-6 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{model.name}</h4>
                  <p className="text-sm text-gray-600">Framework: {model.framework} • Last trained: {model.lastTrain}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  model.status === 'serving' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {model.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Accuracy: </span>
                  <span className="font-semibold text-green-600">{model.accuracy}</span>
                </div>
                <div>
                  <span className="text-gray-600">Monitors: </span>
                  <span className="font-medium text-gray-900">{model.monitors.join(', ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Lifecycle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-6">Model Lifecycle Stages</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { stage: 'Develop', status: 'In Progress', count: 12 },
            { stage: 'Train', status: 'Active', count: 5 },
            { stage: 'Validate', status: 'Queue', count: 3 },
            { stage: 'Serve', status: 'Production', count: mlModelsDeployed }
          ].map((item) => (
            <div key={item.stage} className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-4 text-center">
              <div className="font-semibold text-gray-900 mb-2">{item.stage}</div>
              <div className="text-2xl font-bold text-teal-600 mb-2">{item.count}</div>
              <div className="text-xs text-gray-600">{item.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Train New Model Button */}
      <button
        onClick={handleTrainModel}
        disabled={agentRunning}
        className={`w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition flex items-center justify-center gap-2 ${agentRunning ? 'opacity-60' : ''}`}
      >
        {agentRunning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
        Train & Deploy New Model
      </button>
    </div>
  );

  // Analyst Workspace View
  const AIAssistantView = () => {
    const PLATFORM_SYSTEM_PROMPT = `You are AgenticDT Assistant, the AI interface for the AgenticDT Agentic Driven Data Platform. You help data engineers, platform teams, and analysts automate data operations.

Platform context:
- 247 active pipelines (221 healthy, 19 warning, 7 failed)
- 284 connected data sources (Snowflake, S3, Kafka/MSK, PostgreSQL, BigQuery, REST APIs)
- Overall data quality score: 94.2%
- 1,842 schemas registered in the semantic catalog
- 38 AI agents currently active
- 2.8 PB total data under management

You can help with:
1. Creating automated data ingestion pipelines
2. Registering dataset metadata in the semantic catalog
3. Triggering self-healing on failed pipelines
4. Data quality checks and remediation
5. ML model deployment and monitoring
6. Analytics queries and dashboard creation

IMPORTANT: When a user requests an action that requires system changes (create pipeline, register metadata, trigger healing, deploy model, fix quality), respond helpfully explaining what you will do, then end your message with an action block in this exact format on its own line:
[ACTION:{"type":"CREATE_PIPELINE","title":"Short title","description":"What will happen","details":{"source":"value","target":"value","schedule":"value"}}]

Valid types: CREATE_PIPELINE, REGISTER_METADATA, TRIGGER_HEALING, QUALITY_FIX, DEPLOY_MODEL, INGEST_PIPELINE

INGEST_PIPELINE — use ONLY when the user explicitly wants to upload a CSV/data file and run the ingestion pipeline. Format: [ACTION:{"type":"INGEST_PIPELINE","title":"Run Ingestion Pipeline","description":"Upload CSV to S3, parse with Glue, transform column, quality check with Lambda","details":{}}]

Be concise and professional. Use specific technology names: Confluent/MSK, Flink, Spark, Airflow, Control-M, Snowflake, S3, Immuta, Arthur.ai, Infinite AI.`;

    // Show dataset-specific prompts when a pipeline run has completed
    const QUICK_PROMPTS = ingestQuality ? [
      "Summarise the data quality results for this dataset",
      "Which columns have PII or sensitive data?",
      "What quality issues were found — how do I fix them?",
      "Register this dataset to the catalog",
      "Show me the column metadata and descriptions",
      "What does the schema look like?",
    ] : [
      "I have a CSV file I want to ingest — help me run the pipeline",
      "Create an automated pipeline ingesting from S3 to Snowflake",
      "Register metadata for a new customer analytics dataset",
      "Kick off self-healing on the 7 failed pipelines",
      "Show me current data quality issues and fix them",
      "Deploy the revenue forecasting ML model to production",
      "What's the status of all active pipelines?",
    ];

    const ACTION_ICONS = { CREATE_PIPELINE: GitBranch, REGISTER_METADATA: Database, TRIGGER_HEALING: RotateCw, QUALITY_FIX: CheckCircle, DEPLOY_MODEL: Zap, INGEST_PIPELINE: Upload };

    const ACTION_RESULTS = {
      INGEST_PIPELINE: null, // handled specially — navigates to Ingestion tab
      CREATE_PIPELINE: (a) => `✅ Pipeline created and active!\n\n**${a.title}**\nStatus: Running · First execution in 5 min\nSchema Agent is scanning the source now and auto-registering metadata.`,
      REGISTER_METADATA: (a) => `✅ Metadata registered in semantic catalog!\n\n**${a.title}**\nDataset catalogued · Lineage graph updated · 4 tags auto-applied · Quality baseline set.`,
      TRIGGER_HEALING: (a) => `✅ Self-healing initiated on 7 failed pipelines!\n\n**${a.title}**\nHeal Agent analysed root causes · 5/7 patches applied · ETA full recovery: ~3 min.`,
      QUALITY_FIX: (a) => `✅ Data quality remediation complete!\n\n**${a.title}**\n3,240 records fixed · Quality score: 94.2% → 97.1% · Issue queue cleared.`,
      DEPLOY_MODEL: (a) => `✅ Model deployed to production!\n\n**${a.title}**\nEndpoint live · P99 latency: 38ms · Arthur.ai monitoring active · Auto-rollback enabled.`,
    };

    const [messages, setMessages] = useState([{
      id: 1, role: 'assistant', timestamp: new Date(),
      content: "👋 Hello! I'm the **AgenticDT AI Assistant**.\n\nI can help you:\n• **Create** automated ingestion pipelines\n• **Register** dataset metadata in the catalog\n• **Trigger** self-healing on failed pipelines\n• **Deploy** ML models to production\n• **Fix** data quality issues\n\nType a question below or use the 🎙️ microphone — I'll guide you through any action with human-in-the-loop approval before anything executes.",
    }]);
    const [inputText, setInputText]           = useState('');
    const [isLoading, setIsLoading]           = useState(false);
    const [isListening, setIsListening]       = useState(false);
    const [interimText, setInterimText]       = useState('');
    const [showSettings, setShowSettings]     = useState(false);
    const [apiKey, setApiKey]                 = useState('');  // UI-only note field; actual key lives in backend/.env
    const [pendingAction, setPendingAction]   = useState(null);
    const [executingAction, setExecutingAction] = useState(false);
    const [doneCount, setDoneCount]           = useState(0);
    const [voiceOk]                           = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    const bottomRef   = useRef(null);
    const recogRef    = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, pendingAction, executingAction]);

    // Auto-post pipeline completion summary to chat (fires for both normal and quality-bypassed runs)
    useEffect(() => {
      if (!ingestQuality || !ingestRun) return;
      const runId = ingestRun.runId;
      let summary;

      if (ingestQuality.bypassed) {
        // Quality check was skipped — still notify and prompt metadata review
        summary =
          `⚠️ **Ingestion pipeline complete** — Run \`${runId}\`\n\n` +
          `**Quality check was bypassed** — the profiler encountered an issue but the pipeline continued.\n\n` +
          `AI-generated column metadata is ready for review in the **Ingestion** tab.\n` +
          `You can ask me anything about the dataset — e.g. _"Describe the columns"_, ` +
          `_"Which columns might contain PII?"_, or _"Register this dataset to the catalog"_.`;
      } else {
        const score  = ingestQuality.quality_score ?? 0;
        const passed = ingestQuality.passed;
        const rows   = (ingestQuality.total_rows ?? 0).toLocaleString();
        const cols   = ingestQuality.total_columns ?? 0;
        const issues = (ingestQuality.issues || []).length;
        const emoji  = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
        summary =
          `${emoji} **Ingestion pipeline complete** — Run \`${runId}\`\n\n` +
          `**Quality score: ${score}%** ${passed ? '(PASSED ✓)' : '(FAILED ✗)'} · ${rows} rows · ${cols} columns` +
          (issues > 0 ? ` · **${issues} issue${issues > 1 ? 's' : ''} found**` : '') +
          `\n\nAI-generated column metadata is ready for review in the **Ingestion** tab. ` +
          `You can ask me anything about the dataset — e.g. _"Which columns have PII?"_, ` +
          `_"Summarise the quality issues"_, or _"Register this dataset to the catalog"_.`;
      }

      setMessages(prev => {
        if (prev.some(m => m.ingestRunId === runId)) return prev;
        return [...prev, { id: Date.now(), role: 'assistant', content: summary, timestamp: new Date(), ingestRunId: runId }];
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ingestQuality]);

    // Build a system prompt that includes live dataset context when available
    const buildSystemPrompt = () => {
      let prompt = PLATFORM_SYSTEM_PROMPT;
      if (ingestQuality && ingestRun) {
        const cols = (ingestMeta?.columns || []);
        const piiCols   = cols.filter(c => c.pii_flag).map(c => c.name);
        const nullyCols = cols.filter(c => c.null_pct > 10).map(c => `${c.name} (${c.null_pct}% null)`);
        prompt += `\n\n--- ACTIVE DATASET (run: ${ingestRun.runId}) ---` +
          `\nQuality score: ${ingestQuality.quality_score}% | Rows: ${(ingestQuality.total_rows||0).toLocaleString()} | Columns: ${ingestQuality.total_columns||0}` +
          (piiCols.length   ? `\nPII columns: ${piiCols.join(', ')}` : '') +
          (nullyCols.length ? `\nHigh-null columns: ${nullyCols.join(', ')}` : '') +
          (cols.length      ? `\nColumn names: ${cols.map(c => c.name).join(', ')}` : '') +
          (ingestMetaRegistered ? `\nCatalog status: REGISTERED (ID: ${ingestMetaRegistered.catalog_id})` : '\nCatalog status: Not yet registered') +
          `\n--- END DATASET CONTEXT ---`;
      }
      return prompt;
    };

    const callOpenAI = async (history) => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.map(m => ({ role: m.role, content: m.content })),
            systemPrompt: buildSystemPrompt(),
          }),
        });
        if (!res.ok) { const e = await res.json(); return `❌ Error: ${e.error || res.statusText}`; }
        const d = await res.json();
        return d.reply;
      } catch (e) { return `❌ Network error: ${e.message}`; }
    };

    const parseAction = (text) => {
      const m = text.match(/\[ACTION:(\{[\s\S]*?\})\]/);
      if (!m) return null;
      try { return JSON.parse(m[1]); } catch { return null; }
    };
    const stripAction = (text) => text.replace(/\[ACTION:[\s\S]*?\]/, '').trim();

    const sendMessage = async (text = inputText) => {
      const t = text.trim();
      if (!t || isLoading) return;
      const userMsg = { id: Date.now(), role: 'user', content: t, timestamp: new Date() };
      const next = [...messages, userMsg];
      setMessages(next);
      setInputText('');
      if (textareaRef.current) { textareaRef.current.style.height = '46px'; }
      setIsLoading(true);
      const raw = await callOpenAI(next);
      const action = parseAction(raw);
      const clean  = stripAction(raw);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: clean, timestamp: new Date() }]);
      if (action) setPendingAction(action);
      setIsLoading(false);
    };

    const approveAction = async () => {
      const saved = pendingAction;
      setPendingAction(null);
      if (saved.type === 'INGEST_PIPELINE') {
        // Transfer any chat-attached file to the Ingestion tab and navigate
        if (chatAttachFile) {
          setIngestFile(chatAttachFile);
          setChatAttachFile(null);
        }
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: '✅ Navigating to the Ingestion Hub — your file is pre-loaded and ready to run.', timestamp: new Date(), isSuccess: true }]);
        setDoneCount(c => c + 1);
        setActiveNav('ingestion');
        return;
      }
      setExecutingAction(true);
      await new Promise(r => setTimeout(r, 2400));
      const resultFn = ACTION_RESULTS[saved.type] || (() => `✅ Action completed successfully!\n\n**${saved.title}**`);
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: resultFn(saved), timestamp: new Date(), isSuccess: true }]);
      setDoneCount(c => c + 1);
      setExecutingAction(false);
    };

    const rejectAction = () => {
      setPendingAction(null);
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: "Understood — action cancelled. Let me know if you'd like to adjust the parameters or try something else.", timestamp: new Date() }]);
    };

    const startVoice = () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      const r = new SR();
      recogRef.current = r;
      r.continuous = false; r.interimResults = true; r.lang = 'en-US';
      r.onstart  = () => setIsListening(true);
      r.onresult = (e) => {
        const t = Array.from(e.results).map(x => x[0].transcript).join('');
        setInterimText(t);
        if (e.results[e.results.length - 1].isFinal) { setInputText(t); setInterimText(''); }
      };
      r.onend    = () => { setIsListening(false); setInterimText(''); };
      r.onerror  = () => { setIsListening(false); setInterimText(''); };
      r.start();
    };
    const stopVoice = () => { recogRef.current?.stop(); setIsListening(false); };

    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-teal-600" />
              AI Data Assistant
              <span className="text-xs font-normal bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200 ml-1">GPT-4o</span>
            </h2>
            <p className="text-xs text-gray-500">Chat · Voice · Human-in-the-Loop approvals for every platform action</p>
          </div>
          <div className="flex items-center gap-2">
            {doneCount > 0 && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium border border-green-200">
                ✓ {doneCount} action{doneCount > 1 ? 's' : ''} executed
              </span>
            )}
            <button onClick={() => setShowSettings(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${showSettings ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>

        {/* ── Settings panel ── */}
        {showSettings && (
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex-shrink-0">
            <div className="flex items-start gap-6 flex-wrap text-xs text-gray-600">
              <div>
                <p className="font-semibold text-gray-700 mb-1">🔗 Backend</p>
                <code className="bg-white border border-gray-200 px-2 py-1 rounded text-gray-800">{import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}</code>
                <p className="text-gray-400 mt-1">Set <code className="bg-gray-100 px-1 rounded">VITE_BACKEND_URL</code> in your .env to change</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">🤖 AI Model</p>
                <span className="bg-white border border-gray-200 px-2 py-1 rounded text-gray-800">GPT-4o via backend</span>
                <p className="text-gray-400 mt-1">Set <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> in <code className="bg-gray-100 px-1 rounded">backend/.env</code></p>
              </div>
              <div className="ml-auto">
                <button onClick={() => setShowSettings(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Quick prompts ── */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex gap-2 overflow-x-auto flex-shrink-0 items-center">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Try:</span>
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => sendMessage(p)} disabled={isLoading}
              className="whitespace-nowrap text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition disabled:opacity-50 flex-shrink-0">
              {p}
            </button>
          ))}
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl w-full ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">AgenticDT Assistant</span>
                    <span className="text-xs text-gray-400">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-sm max-w-lg'
                    : msg.isSuccess
                      ? 'bg-green-50 border border-green-200 text-gray-900 rounded-tl-sm'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <span className="text-xs text-gray-400 mt-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-600">AgenticDT Assistant</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Human-in-the-Loop approval card ── */}
          {pendingAction && !executingAction && (
            <div className="flex justify-start">
              <div className="max-w-2xl w-full">
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      {React.createElement(ACTION_ICONS[pendingAction.type] || Zap, { className: 'w-4 h-4 text-amber-600' })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">⚡ Human Approval Required</span>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{pendingAction.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{pendingAction.description}</p>
                      {pendingAction.details && Object.keys(pendingAction.details).length > 0 && (
                        <div className="mt-2 bg-white rounded-lg p-2.5 border border-amber-200 space-y-1">
                          {Object.entries(pendingAction.details).map(([k, v]) => (
                            <div key={k} className="text-xs font-mono">
                              <span className="text-amber-600 font-semibold">{k}:</span>{' '}
                              <span className="text-gray-700">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={approveAction}
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Approve & Execute
                    </button>
                    <button onClick={rejectAction}
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Executing spinner */}
          {executingAction && (
            <div className="flex justify-start">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-700 font-medium">Executing — AI agents are working…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input area ── */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
          {interimText && (
            <div className="mb-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 italic flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {interimText}…
            </div>
          )}
          {isListening && !interimText && (
            <div className="mb-2 flex items-center gap-2 text-xs text-red-600 font-medium">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Listening… speak now
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              {chatAttachFile && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800 mb-1">
                  <Paperclip className="w-3 h-3" />
                  <span className="font-medium truncate max-w-48">{chatAttachFile.name}</span>
                  <button onClick={() => setChatAttachFile(null)} className="ml-auto text-teal-500 hover:text-teal-700">×</button>
                </div>
              )}
              <textarea ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                placeholder="Ask anything — create a pipeline, register metadata, trigger self-healing, deploy a model…"
                rows={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                style={{ minHeight: '46px', maxHeight: '120px' }} />
            </div>
            {/* File attachment */}
            <input ref={chatFileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setChatAttachFile(f); e.target.value = ''; }} />
            <button onClick={() => chatFileInputRef.current?.click()}
              title="Attach a CSV file for ingestion"
              className={`p-2 rounded-lg transition flex-shrink-0 ${chatAttachFile ? 'bg-teal-100 text-teal-700' : 'text-gray-400 hover:text-teal-600 hover:bg-gray-100'}`}>
              <Paperclip className="w-5 h-5" />
            </button>
            {voiceOk && (
              <button onClick={isListening ? stopVoice : startVoice} disabled={isLoading}
                className={`p-3 rounded-xl transition flex-shrink-0 ${isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={isListening ? 'Stop recording' : 'Start voice input'}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {isListening
                    ? <path d="M6 6h12v12H6z" />
                    : <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V22H9v2h6v-2h-2v-1.06A9 9 0 0 0 21 12v-2z"/></>}
                </svg>
              </button>
            )}
            <button onClick={() => sendMessage()} disabled={isLoading || !inputText.trim()}
              className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              title="Send (Enter)">
              <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-xs">Enter</kbd> to send ·{' '}
            <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-xs">Shift+Enter</kbd> for new line ·{' '}
            {voiceOk ? '🎙️ mic button for voice input' : ''}
          </p>
        </div>
      </div>
    );
  };

  // Operations View
  const OperationsView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Operations</h2>
        <p className="text-gray-600 mb-6">E2E Data Flow Monitoring, Observability, and Alert Management</p>
      </div>

      {/* Operations Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="System Health"
          value="99.97%"
          change="target: 99.95%"
          color="teal"
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Alerts"
          value="8"
          change="-3 from baseline"
          color="teal"
        />
        <StatCard
          icon={Clock}
          label="Incident MTTR"
          value="12m"
          change="-4m"
          color="teal"
        />
        <StatCard
          icon={TrendingUp}
          label="Observability"
          value="98.2%"
          change="metrics coverage"
          color="teal"
        />
      </div>

      {/* System Monitoring */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-6">System Monitoring Dashboard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">CPU Usage</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ingestion" stroke="#0891B2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Memory Usage</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="processing" fill="#06B6D4" stroke="#0891B2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Active Alerts
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {[
            { severity: 'critical', title: 'Snowflake DW - High Query Latency', time: '5m ago', status: 'open' },
            { severity: 'warning', title: 'Kafka Broker - Disk Usage 85%', time: '12m ago', status: 'open' },
            { severity: 'warning', title: 'ETL Pipeline - Delayed 15 minutes', time: '18m ago', status: 'open' },
            { severity: 'info', title: 'Data Lake - New partition registered', time: '32m ago', status: 'resolved' },
            { severity: 'critical', title: 'Feature Store - Stale features detected', time: '1h ago', status: 'open' },
            { severity: 'warning', title: 'Model Drift - XGBoost v3.2 detected', time: '2h ago', status: 'acknowledged' }
          ].map((alert, i) => (
            <div key={i} className="p-6 hover:bg-gray-50 transition flex items-start gap-4">
              <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                alert.severity === 'critical' ? 'bg-red-600' :
                alert.severity === 'warning' ? 'bg-yellow-600' :
                'bg-blue-600'
              }`}></div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                <p className="text-sm text-gray-600">{alert.time}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                alert.status === 'open' ? 'bg-red-100 text-red-800' :
                alert.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {alert.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* E2E Data Flow */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-6">End-to-End Data Flow Health</h3>
        <div className="space-y-4">
          {[
            { flow: 'Salesforce → MSK → Snowflake', latency: '2.3s', status: 'healthy' },
            { flow: 'SAP → Kafka → S3 → Athena', latency: '5.1s', status: 'healthy' },
            { flow: 'APIs → Confluent → Flink → DW', latency: '1.8s', status: 'healthy' },
            { flow: 'Mainframe → File Drop → Informatica', latency: '18.2s', status: 'warning' }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded border border-gray-200">
              <div>
                <div className="font-medium text-gray-900">{item.flow}</div>
                <div className="text-sm text-gray-600">Latency: {item.latency}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                item.status === 'healthy' ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render active view
  const renderActiveView = () => {
    switch (activeNav) {
      case 'dashboard':
        return <DashboardView />;
      case 'ingestion':
        // Called as a plain function (not JSX component) so React never
        // unmounts/remounts it on parent re-renders — keeps input focus stable.
        return IngestionHubView();
      case 'pipelines':
        // Called as a plain function (not JSX component) so React never
        // unmounts/remounts it on parent re-renders — eliminates flicker.
        return PipelinesView();
      case 'storage':
        return <StorageView />;
      case 'semantic':
        return <SemanticView />;
      case 'quality':
        return <DataQualityView />;
      case 'governance':
        return <GovernanceView />;
      case 'ml':
        return <MLPlatformView />;
      case 'analyst':
        return <AIAssistantView />;
      case 'operations':
        return <OperationsView />;
      default:
        return <DashboardView />;
    }
  };

  // Navigation sections
  const navSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home }
      ]
    },
    {
      title: 'Data Flow',
      items: [
        { id: 'ingestion', label: 'Ingestion Hub', icon: Zap },
        { id: 'pipelines', label: 'Pipelines', icon: GitBranch },
        { id: 'storage', label: 'Storage & Warehouse', icon: Database }
      ]
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'semantic', label: 'Semantic Engine', icon: Network },
        { id: 'quality', label: 'Data Quality', icon: CheckCircle }
      ]
    },
    {
      title: 'Governance',
      items: [
        { id: 'governance', label: 'Governance & Mesh', icon: Shield }
      ]
    },
    {
      title: 'AI & Analytics',
      items: [
        { id: 'ml', label: 'ML Platform', icon: Brain },
        { id: 'analyst', label: 'AI Assistant', icon: MessageSquare }
      ]
    },
    {
      title: 'Operations',
      items: [
        { id: 'operations', label: 'Operations', icon: Settings }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 shadow-sm transition-all duration-300 overflow-y-auto`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h1 className="text-sm font-bold text-gray-900">AgenticDT</h1>
              <p className="text-xs text-gray-600">Agentic Data Platform</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-gray-100 rounded transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              {sidebarOpen && (
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{section.title}</h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                        activeNav === item.id
                          ? 'bg-teal-100 text-teal-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && <span className="text-sm">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-3 bg-white">
          {sidebarOpen && (
            <p className="text-xs text-gray-400 text-center">AgenticDT Platform</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <AgenticDataPlatform />;
}
