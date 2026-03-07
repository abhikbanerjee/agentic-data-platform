import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, Zap, Database, Network, TrendingUp, AlertCircle, Shield,
  Brain, Users, Settings, ChevronRight, Play, Pause, RotateCw,
  CheckCircle, Clock, AlertTriangle, Home, Layers, Lock, GitBranch,
  BarChart3, Workflow, Filter, Search, RefreshCw, Download, Plus,
  Gauge, Eye, Cloud, MapPin, Copy, Menu, X
} from 'lucide-react';

export default function AgenticDataPlatform() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [agentRunning, setAgentRunning] = useState(false);
  const [schemaDetected, setSchemaDetected] = useState(false);
  const [lagHealed, setLagHealed] = useState(false);
  const [mlModelsDeployed, setMlModelsDeployed] = useState(3);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [qualityScore, setQualityScore] = useState(87);
  const [selectedPipeline, setSelectedPipeline] = useState('etl-main');

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

  // Ingestion Hub View
  const IngestionHubView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ingestion Hub</h2>
        <p className="text-gray-600 mb-6">Real-time & Semi-Real-Time Streaming with Agentic Schema Detection</p>
      </div>

      {/* Ingestion Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="Active Streams"
          value="284"
          change="+18"
          color="teal"
        />
        <StatCard
          icon={Activity}
          label="Avg Throughput"
          value="3.2M"
          change="msgs/sec"
          color="teal"
        />
        <StatCard
          icon={Clock}
          label="Avg Lag"
          value="198ms"
          change="-45ms"
          color="teal"
        />
        <StatCard
          icon={CheckCircle}
          label="Schema Health"
          value="97.2%"
          change="+2.1%"
          color="teal"
        />
      </div>

      {/* Streaming Topology */}
      <StreamingTopology />

      {/* Live Streams Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Network className="w-5 h-5 text-teal-600" />
            Live Confluent/MSK Streams
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Source</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Broker</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Processor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Target</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Msg/sec</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Lag (ms)</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Schema</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {streamMetrics.map((stream) => (
                <tr key={stream.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{stream.source.split(': ')[1]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{stream.broker}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{stream.processor}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{stream.target}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{stream.msgSec.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{stream.lag}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stream.schema === 'detected' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {stream.schema}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stream.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {stream.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agentic Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleAutoDetectSchema}
          disabled={agentRunning}
          className={`p-4 border-2 border-teal-200 bg-white rounded-lg hover:bg-teal-50 transition font-semibold text-teal-700 flex items-center justify-center gap-2 ${agentRunning ? 'opacity-60' : ''}`}
        >
          {agentRunning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          {schemaDetected ? 'Schema Auto-Detected ✓' : 'Auto-Detect Schema'}
        </button>
        <button
          onClick={handleHealLag}
          disabled={agentRunning}
          className={`p-4 border-2 border-cyan-200 bg-white rounded-lg hover:bg-cyan-50 transition font-semibold text-cyan-700 flex items-center justify-center gap-2 ${agentRunning ? 'opacity-60' : ''}`}
        >
          {agentRunning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
          {lagHealed ? 'Lag Healed ✓' : 'Heal Lag'}
        </button>
        <button
          onClick={() => setActiveNav('semantic')}
          className="p-4 border-2 border-purple-200 bg-white rounded-lg hover:bg-purple-50 transition font-semibold text-purple-700 flex items-center justify-center gap-2"
        >
          <Database className="w-5 h-5" />
          Register to Catalog
        </button>
      </div>
    </div>
  );

  // Pipelines View
  const PipelinesView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Pipelines</h2>
        <p className="text-gray-600 mb-6">Self-Healing DAGs with Airflow/Control-M and Agentic Remediation</p>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={GitBranch}
          label="Active DAGs"
          value="54"
          change="+3"
          color="teal"
        />
        <StatCard
          icon={CheckCircle}
          label="Success Rate"
          value="99.1%"
          change="+0.8%"
          color="teal"
        />
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value="14m 32s"
          change="-2m"
          color="teal"
        />
        <StatCard
          icon={AlertTriangle}
          label="Self-Healed"
          value="23"
          change="this week"
          color="teal"
        />
      </div>

      {/* Pipelines List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Pipeline Orchestration</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {pipelineData.map((pipeline) => (
            <div
              key={pipeline.id}
              className={`p-6 cursor-pointer hover:bg-gray-50 transition ${selectedPipeline === pipeline.id ? 'bg-teal-50 border-l-4 border-teal-600' : ''}`}
              onClick={() => setSelectedPipeline(pipeline.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{pipeline.name}</h4>
                  <p className="text-sm text-gray-600">Owner: {pipeline.owner} • {pipeline.dags} DAGs</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  pipeline.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  pipeline.status === 'success' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {pipeline.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div>Last run: <span className="font-medium text-gray-900">{pipeline.lastRun}</span></div>
                <div>Next run: <span className="font-medium text-gray-900">{pipeline.nextRun}</span></div>
                {pipeline.healableIssues > 0 && (
                  <div className="text-orange-600 font-medium">{pipeline.healableIssues} healable issues</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DAG Visualization */}
      {selectedPipeline && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">DAG Structure: {pipelineData.find(p => p.id === selectedPipeline)?.name}</h3>
          <div className="flex items-center justify-between bg-gray-50 rounded p-4 border border-gray-200 mb-4">
            <div className="text-center">
              <div className="bg-green-100 border-2 border-green-500 rounded px-4 py-3 inline-block">
                <div className="text-xs font-bold text-green-900">Extract</div>
                <div className="text-sm text-green-800 mt-1">Source Extraction</div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <div className="bg-blue-100 border-2 border-blue-500 rounded px-4 py-3 inline-block">
                <div className="text-xs font-bold text-blue-900">Transform</div>
                <div className="text-sm text-blue-800 mt-1">Data Transformation</div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <div className="bg-purple-100 border-2 border-purple-500 rounded px-4 py-3 inline-block">
                <div className="text-xs font-bold text-purple-900">Validate</div>
                <div className="text-sm text-purple-800 mt-1">Quality Checks</div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <div className="bg-teal-100 border-2 border-teal-500 rounded px-4 py-3 inline-block">
                <div className="text-xs font-bold text-teal-900">Load</div>
                <div className="text-sm text-teal-800 mt-1">Target Load</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAgentRunning(true)}
            className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Trigger Self-Healing Agent
          </button>
        </div>
      )}
    </div>
  );

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
  const SemanticView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Semantic Engine</h2>
        <p className="text-gray-600 mb-6">Knowledge Graph, Metadata Catalog, Lineage, and Data Marketplace</p>
      </div>

      {/* Semantic Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="Cataloged Assets"
          value="8.2K"
          change="+320"
          color="teal"
        />
        <StatCard
          icon={Network}
          label="Knowledge Entities"
          value="1.2M"
          change="+450K"
          color="teal"
        />
        <StatCard
          icon={TrendingUp}
          label="Data Glossary Terms"
          value="3,450"
          change="+125"
          color="teal"
        />
        <StatCard
          icon={Eye}
          label="Marketplace Datasets"
          value="547"
          change="+28"
          color="teal"
        />
      </div>

      {/* Data Assets */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Data Assets & Lineage</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {dataAssets.map((asset) => (
            <div key={asset.name} className="p-6 hover:bg-gray-50 transition">
              <h4 className="font-semibold text-gray-900 mb-2">{asset.name}</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Owner: </span>
                  <span className="font-medium text-gray-900">{asset.owner}</span>
                </div>
                <div>
                  <span className="text-gray-600">Quality: </span>
                  <span className="font-medium text-green-600">{asset.quality}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Governance: </span>
                  <span className="font-medium text-gray-900">{asset.governance}</span>
                </div>
                <div>
                  <span className="text-gray-600">Lineage: </span>
                  <span className="font-medium text-teal-600">{asset.lineage}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-6">Metadata Catalog Coverage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[
            { category: 'Tables', coverage: 95 },
            { category: 'Columns', coverage: 92 },
            { category: 'Relationships', coverage: 87 },
            { category: 'Business Terms', coverage: 78 },
            { category: 'Data Quality', coverage: 84 }
          ]}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="coverage" fill="#0891B2" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

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
  const AnalystWorkspaceView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Analyst Workspace</h2>
        <p className="text-gray-600 mb-6">Natural Language → SQL with AI Chat & Production Deployment</p>
      </div>

      {/* Analytics Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Active Analysts"
          value="34"
          change="+5"
          color="teal"
        />
        <StatCard
          icon={Zap}
          label="Queries Today"
          value="1,245"
          change="+340"
          color="teal"
        />
        <StatCard
          icon={Clock}
          label="Avg Query Time"
          value="3.2s"
          change="-0.8s"
          color="teal"
        />
        <StatCard
          icon={CheckCircle}
          label="Deployed Reports"
          value="89"
          change="+12"
          color="teal"
        />
      </div>

      {/* Query Interface */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Query Engine (Athena / Starburst / Snowflake SQL)</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask in natural language or write SQL..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium flex items-center gap-2">
              <Play className="w-4 h-4" />
              Execute
            </button>
          </div>
          <div className="text-xs text-gray-600">
            Tip: Ask "Show revenue by product category" and AI will translate to SQL
          </div>
        </div>
      </div>

      {/* Recent Queries */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Queries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Query</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Execution</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Rows</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {queries.map((query) => (
                <tr key={query.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{query.user}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono text-xs">{query.sql}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{query.execution}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{query.rows}</td>
                  <td className="px-6 py-4 text-sm text-teal-600 font-medium">{query.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Chat Assistant */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-teal-600" />
          AI Assistant Chat
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 h-40 overflow-y-auto border border-gray-200">
          <div className="space-y-3 text-sm">
            <div className="text-gray-600">
              <span className="font-medium text-gray-900">You:</span> What is our top product by revenue?
            </div>
            <div className="bg-white p-2 rounded border border-teal-200 text-gray-900">
              <span className="font-medium text-teal-700">Assistant:</span> Based on product_sales data, Product-X had $2.3M revenue last quarter, a 15% increase YoY. Would you like me to generate a SQL query for monthly trends?
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 text-sm"
          />
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">Send</button>
        </div>
      </div>
    </div>
  );

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
        return <IngestionHubView />;
      case 'pipelines':
        return <PipelinesView />;
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
        return <AnalystWorkspaceView />;
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
        { id: 'analyst', label: 'Analyst Workspace', icon: Users }
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
