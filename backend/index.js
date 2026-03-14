require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const { isAwsConfigured } = require('./src/awsClient');
const {
  runHealingCycle,
  discoverPipelines,
  getPipelineDag,
  startGlueJobRun,
  startExecution,
} = require('./src/healingAgent');
const {
  isPipelineConfigured,
  makeRunId,
  uploadToS3,
  startIngestionPipeline,
  startQualityOnlyPipeline,
  getLastEtlRun,
  getIngestionStatus,
  readSampleRows,
  getRunLogs,
} = require('./src/ingestAgent');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB
const { getMetadata, enrichWithAI, registerMetadata, getCatalogIndex } = require('./src/metadataAgent');

// ── OpenAI (optional) ─────────────────────────────────────────────────────────
let openai = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ── Express setup ─────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-pipeline-passcode'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes
app.use(express.json({ limit: '2mb' }));

// ── Middleware: 4-digit pipeline passcode ─────────────────────────────────────
// Set PIPELINE_PASSCODE=XXXX in your environment. If not set, passcode check is
// skipped (local dev). Clients must send the code in the x-pipeline-passcode header.
function requirePasscode(req, res, next) {
  const expected = process.env.PIPELINE_PASSCODE;
  if (!expected) return next(); // not configured — open access (local dev only)
  const provided = req.headers['x-pipeline-passcode'] || req.body?.passcode;
  if (!provided) return res.status(401).json({ error: 'Passcode required', code: 'PASSCODE_REQUIRED' });
  if (String(provided).trim() !== String(expected).trim()) {
    return res.status(403).json({ error: 'Incorrect passcode', code: 'PASSCODE_INVALID' });
  }
  next();
}

// ── GET /health ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  openai: !!openai,
  aws: isAwsConfigured(),
  awsRegion: process.env.AWS_REGION || 'us-east-1',
}));

// ── GET /cors-test — debug endpoint to confirm CORS is working from a browser
app.get('/cors-test', (req, res) => res.json({
  ok: true,
  origin: req.headers.origin || 'no-origin',
  allowedOrigins,
}));

// ── POST /api/chat ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  if (!openai) return res.status(503).json({ error: 'OpenAI not configured' });
  const { messages, systemPrompt } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }
  const fullMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: fullMessages,
      max_tokens: 1024,
      temperature: 0.7,
    });
    res.json({ reply: completion.choices[0]?.message?.content ?? '', usage: completion.usage });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'OpenAI request failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AWS PIPELINE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/pipelines ────────────────────────────────────────────────────────
// Discover and return all Glue jobs, Step Functions, and EventBridge rules.
app.get('/api/pipelines', async (req, res) => {
  if (!isAwsConfigured()) {
    return res.status(503).json({
      error: 'AWS not configured',
      hint: 'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION in the backend .env file',
    });
  }
  try {
    const data = await discoverPipelines();
    res.json(data);
  } catch (err) {
    console.error('discoverPipelines error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/pipelines/:type/:id/dag ─────────────────────────────────────────
// Return the DAG structure and recent executions for a specific pipeline.
// :type = 'glue' | 'stepfunction' | 'eventbridge'
// :id   = pipeline identifier (may be URL-encoded for ARNs)
app.get('/api/pipelines/:type/:id/dag', async (req, res) => {
  if (!isAwsConfigured()) {
    return res.status(503).json({ error: 'AWS not configured' });
  }
  try {
    const dag = await getPipelineDag(req.params.type, req.params.id);
    res.json(dag);
  } catch (err) {
    console.error('getPipelineDag error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/pipelines/glue/:jobName/run ─────────────────────────────────────
// Trigger a Glue job run immediately.
app.post('/api/pipelines/glue/:jobName/run', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  try {
    const runId = await startGlueJobRun(req.params.jobName, req.body.args || {});
    res.json({ success: true, jobName: req.params.jobName, runId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/pipelines/sf/run ────────────────────────────────────────────────
// Start a Step Functions execution.
app.post('/api/pipelines/sf/run', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  const { stateMachineArn, input } = req.body;
  if (!stateMachineArn) return res.status(400).json({ error: 'stateMachineArn required' });
  try {
    const executionArn = await startExecution(stateMachineArn, input || '{}');
    res.json({ success: true, executionArn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/pipelines/heal ──────────────────────────────────────────────────
// Run the full self-healing agent cycle.
// Returns structured log of every action taken.
app.post('/api/pipelines/heal', async (req, res) => {
  if (!isAwsConfigured()) {
    return res.status(503).json({
      error: 'AWS not configured',
      hint: 'Add AWS credentials to the backend .env file first',
    });
  }
  try {
    console.log('[HealingAgent] Starting cycle at', new Date().toISOString());
    const result = await runHealingCycle();
    console.log(`[HealingAgent] Done — healed: ${result.healedCount}, failed: ${result.failedCount}`);
    res.json(result);
  } catch (err) {
    console.error('[HealingAgent] Unhandled error:', err);
    res.status(500).json({ error: err.message, logs: [] });
  }
});

// ── GET /api/aws/status ───────────────────────────────────────────────────────
// Quick check of AWS connectivity — useful for the UI setup wizard.
app.get('/api/aws/status', async (req, res) => {
  if (!isAwsConfigured()) {
    return res.json({ connected: false, reason: 'No AWS credentials found in environment' });
  }
  try {
    // Try a lightweight Glue call to verify connectivity
    const { listGlueJobs } = require('./src/healingAgent');
    await listGlueJobs();
    res.json({ connected: true, region: process.env.AWS_REGION || 'us-east-1' });
  } catch (err) {
    res.json({ connected: false, reason: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INGESTION PIPELINE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/ingest/status ────────────────────────────────────────────────────
// Returns whether the pipeline infra is configured (S3 bucket + SFN ARN set).
app.get('/api/ingest/config', (req, res) => {
  res.json({
    configured: isPipelineConfigured(),
    bucket:     process.env.PIPELINE_S3_BUCKET   || null,
    sfnArn:     process.env.PIPELINE_SFN_ARN      || null,
    glueJob:    process.env.PIPELINE_GLUE_JOB     || null,
    lambdaFn:   process.env.PIPELINE_LAMBDA_FN    || null,
    hint: isPipelineConfigured()
      ? null
      : 'Run backend/aws/setup.sh to provision the pipeline infrastructure',
  });
});

// ── POST /api/ingest/start ────────────────────────────────────────────────────
// Accepts: multipart/form-data with fields:
//   file            — CSV file to ingest
//   transformColumn — column to derive from (default: first column)
//   newColumnName   — name for the new derived column
//
// Returns: { runId, executionArn, s3Key, steps[] }
app.post('/api/ingest/start', requirePasscode, upload.single('file'), async (req, res) => {
  if (!isAwsConfigured())       return res.status(503).json({ error: 'AWS not configured' });
  if (!isPipelineConfigured())  return res.status(503).json({
    error: 'Pipeline infrastructure not provisioned',
    hint:  'Run backend/aws/setup.sh first',
  });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded — send a CSV as multipart field "file"' });

  const transformColumn = req.body.transformColumn || '';
  const newColumnName   = req.body.newColumnName   || `${transformColumn}_derived`.replace(/[^a-zA-Z0-9_]/g, '_');
  const runId           = makeRunId();

  try {
    // Step 1: Upload to S3
    console.log(`[Ingest] ${runId} — uploading ${req.file.originalname} (${req.file.size} bytes)`);
    const { s3Key, s3Path } = await uploadToS3(req.file.buffer, req.file.originalname, runId);
    console.log(`[Ingest] ${runId} — uploaded to ${s3Path}`);

    // Steps 2-4: Start Step Functions execution
    const { executionArn } = await startIngestionPipeline({
      runId,
      inputS3Path:     s3Path,
      transformColumn: transformColumn || 'id',   // fallback to 'id' if not specified
      newColumnName,
    });
    console.log(`[Ingest] ${runId} — execution started: ${executionArn}`);

    res.json({
      runId,
      executionArn,
      s3Key,
      filename:   req.file.originalname,
      fileSize:   req.file.size,
      steps: [
        { id: 1, name: 'Load to S3',           icon: '☁️',  status: 'done'    },
        { id: 2, name: 'Parse with Glue',       icon: '⚙️',  status: 'running' },
        { id: 3, name: 'Transform Column',       icon: '🔄',  status: 'waiting' },
        { id: 4, name: 'Quality Check (Lambda)', icon: '✅',  status: 'waiting' },
      ],
    });
  } catch (err) {
    console.error('[Ingest] start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ingest/last-etl-run ──────────────────────────────────────────────
// Returns metadata about the most recent successful Glue ETL job run so the UI
// can show what output the quality-only mode will re-use.
app.get('/api/ingest/last-etl-run', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  try {
    const lastRun = await getLastEtlRun();
    if (!lastRun) return res.status(404).json({ error: 'No successful ETL run found yet' });
    res.json(lastRun);
  } catch (err) {
    console.error('[Ingest] last-etl-run error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ingest/quality-only ─────────────────────────────────────────────
// Skip the Glue ETL steps entirely and run only the quality profiler + metadata
// enrichment against the last successful ETL run's transformed Parquet output.
app.post('/api/ingest/quality-only', requirePasscode, async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  try {
    const lastRun = await getLastEtlRun();
    if (!lastRun) return res.status(400).json({ error: 'No successful ETL run found to profile. Run the full pipeline first.' });

    const result = await startQualityOnlyPipeline(lastRun);

    // Return the same shape as /api/ingest/start so the frontend can reuse startIngestPoll
    res.json({
      executionArn:    result.executionArn,
      runId:           result.runId,
      reusedEtlRunId:  result.reusedEtlRunId,
      qualityOnly:     true,
      steps: [
        { id: 1, name: 'Load to S3',      icon: '☁️',  status: 'skipped' },
        { id: 2, name: 'Parse with Glue', icon: '⚙️',  status: 'skipped' },
        { id: 3, name: 'Transform Column',icon: '🔄',  status: 'skipped' },
        { id: 4, name: 'Quality & Profile',icon: '🔬', status: 'running' },
      ],
    });
  } catch (err) {
    console.error('[Ingest] quality-only error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ingest/status/:executionArn ──────────────────────────────────────
// Poll this after starting a pipeline to get real-time step progress + quality stats.
app.get('/api/ingest/status/:executionArn(*)', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  const { executionArn } = req.params;
  const { runId }        = req.query;
  try {
    const status = await getIngestionStatus(decodeURIComponent(executionArn), runId);
    res.json(status);
  } catch (err) {
    console.error('[Ingest] status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ingest/sample/:runId ─────────────────────────────────────────────
// Returns the first ~20 rows of the transformed dataframe (saved by Lambda as sample.json).
app.get('/api/ingest/sample/:runId', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  try {
    const sample = await readSampleRows(req.params.runId);
    if (!sample) return res.status(404).json({ error: 'Sample not available yet' });
    res.json(sample);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ingest/logs ───────────────────────────────────────────────────────
// Fetch CloudWatch logs for a pipeline run to debug Lambda/Glue failures.
app.get('/api/ingest/logs', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  const { runId, since } = req.query;
  if (!runId) return res.status(400).json({ error: 'runId is required' });
  try {
    const events = await getRunLogs(runId, since ? parseInt(since, 10) : undefined);
    res.json({ events });
  } catch (err) {
    console.error('[Ingest] logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/metadata/:runId ───────────────────────────────────────────────────
// Read column metadata produced by validate_and_profile.py
app.get('/api/metadata/:runId', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  try {
    const meta = await getMetadata(req.params.runId);
    if (!meta) return res.status(404).json({ error: 'Metadata not found — run validate_and_profile.py first' });
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/metadata/:runId/enrich ──────────────────────────────────────────
// Use OpenAI to auto-generate column descriptions (returns enriched metadata, does NOT save)
app.post('/api/metadata/:runId/enrich', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  try {
    let meta = await getMetadata(req.params.runId);
    if (!meta) return res.status(404).json({ error: 'Metadata not found' });
    meta = await enrichWithAI(meta);
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/metadata/:runId/register ────────────────────────────────────────
// Register user-approved metadata to S3 catalog + optional external API
// Body: full metadata object (user may have edited descriptions/tags/pii_flag)
app.post('/api/metadata/:runId/register', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  try {
    const approved = req.body;
    if (!approved || !approved.columns) return res.status(400).json({ error: 'metadata body required' });
    const entry = await registerMetadata(req.params.runId, approved);
    res.json({ success: true, catalog_id: entry.catalog_id, registered_at: entry.registered_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/catalog ───────────────────────────────────────────────────────────
// List all registered datasets
app.get('/api/catalog', async (req, res) => {
  if (!isAwsConfigured()) return res.status(503).json({ error: 'AWS not configured' });
  try {
    const index = await getCatalogIndex();
    res.json(index);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nAgenticDT backend running on port ${PORT}`);
  console.log(`  OpenAI    : ${openai ? '✅ enabled' : '⚠️  disabled (set OPENAI_API_KEY to enable)'}`);
  console.log(`  AWS       : ${isAwsConfigured() ? `✅ configured (region: ${process.env.AWS_REGION || 'us-east-1'})` : '⚠️  not configured (set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)'}`);
  console.log('');
});
