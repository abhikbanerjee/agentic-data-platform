'use strict';
/**
 * AgenticDT Ingestion Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates the 4-step ingestion pipeline:
 *   1. UPLOAD    — multipart CSV → S3 raw/
 *   2. PARSE     — Glue job reads CSV, infers schema, writes Parquet
 *   3. TRANSFORM — Glue job derives a new column, writes final Parquet
 *   4. QUALITY   — Lambda counts rows/cols, checks nulls, scores data
 *
 * Steps 2-4 are orchestrated by a Step Functions state machine.
 * This module handles S3 upload, execution start, and status polling.
 */

const { Upload }                    = require('@aws-sdk/lib-storage');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const {
  SFNClient,
  StartExecutionCommand,
  DescribeExecutionCommand,
} = require('@aws-sdk/client-sfn');
const {
  GlueClient,
  GetJobRunsCommand,
} = require('@aws-sdk/client-glue');

// Build credential config (same pattern as awsClient.js)
const { fromIni } = require('@aws-sdk/credential-providers');
function buildCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
    };
  }
  try { return fromIni({ profile: process.env.AWS_PROFILE || 'default' }); }
  catch { return undefined; }
}

/**
 * Extract region from an ARN (format: arn:aws:service:REGION:account:resource).
 * Falls back to AWS_REGION env var, then 'us-east-1'.
 */
function regionFromArn(arn) {
  if (arn) {
    const parts = arn.split(':');
    if (parts.length >= 4 && parts[3]) return parts[3];
  }
  return process.env.AWS_REGION || 'us-east-1';
}

// Clients are lazily initialised so they pick up the region from the SFN ARN
// (which is written into .env by setup.sh and available after process start).
let _s3Client   = null;
let _sfnClient  = null;
let _glueClient = null;

function getS3Client() {
  if (!_s3Client) {
    const region = regionFromArn(process.env.PIPELINE_SFN_ARN);
    _s3Client = new S3Client({
      region,
      credentials: buildCredentials(),
      // Automatically follow redirects to the bucket's actual regional
      // endpoint — prevents "addressed using the specified endpoint" errors
      // when the bucket region differs from the default client region.
      followRegionRedirects: true,
    });
  }
  return _s3Client;
}
function getSfnClient() {
  if (!_sfnClient) {
    const region = regionFromArn(process.env.PIPELINE_SFN_ARN);
    _sfnClient = new SFNClient({ region, credentials: buildCredentials() });
  }
  return _sfnClient;
}
function getGlueClient() {
  if (!_glueClient) {
    const region = regionFromArn(process.env.PIPELINE_SFN_ARN);
    _glueClient = new GlueClient({ region, credentials: buildCredentials() });
  }
  return _glueClient;
}

// ── Config (all from .env, written by setup.sh) ────────────────────────────
const BUCKET           = () => process.env.PIPELINE_S3_BUCKET;
const SFN_ARN          = () => process.env.PIPELINE_SFN_ARN;
const GLUE_JOB         = () => process.env.PIPELINE_GLUE_JOB         || 'agenticdt-etl-pipeline';
const PROFILER_LAMBDA  = () => process.env.PIPELINE_PROFILER_LAMBDA  || 'agenticdt-quality-profiler';
const LAMBDA_FN        = () => process.env.PIPELINE_LAMBDA_FN        || 'agenticdt-quality-check';

function isPipelineConfigured() {
  return !!(BUCKET() && SFN_ARN());
}

// ── Unique run ID ─────────────────────────────────────────────────────────
function makeRunId() {
  const now = new Date();
  const ts  = now.toISOString().replace(/[:\-T]/g, '').slice(0, 14);
  return `run-${ts}`;
}

// ── Step 1: Upload file buffer to S3 raw/ ────────────────────────────────
async function uploadToS3(buffer, originalFilename, runId) {
  const ext = originalFilename.split('.').pop() || 'csv';
  const key = `raw/${runId}/${originalFilename}`;

  const upload = new Upload({
    client: getS3Client(),
    params: {
      Bucket:      BUCKET(),
      Key:         key,
      Body:        buffer,
      ContentType: ext === 'csv' ? 'text/csv' : 'application/octet-stream',
    },
  });

  await upload.done();
  return { s3Key: key, s3Path: `s3://${BUCKET()}/${key}` };
}

// ── Steps 2-4: Start the Step Functions execution ──────────────────────────
async function startIngestionPipeline({ runId, inputS3Path, transformColumn, newColumnName, sourceFile }) {
  const bucket = BUCKET();

  const executionInput = {
    run_id:           runId,
    skip_etl:         false,              // ← required by CheckMode Choice state
    input_s3_path:    inputS3Path,
    parsed_s3_path:   `s3://${bucket}/parsed/${runId}/`,
    output_s3_path:   `s3://${bucket}/transformed/${runId}/`,
    results_s3_path:  `s3://${bucket}/quality-results/${runId}/`,
    transform_column: transformColumn,
    new_column_name:  newColumnName,
    source_file:      sourceFile || 'unknown',
  };

  const cmd = new StartExecutionCommand({
    stateMachineArn: SFN_ARN(),
    name:            runId,
    input:           JSON.stringify(executionInput),
  });

  const resp = await getSfnClient().send(cmd);
  return { executionArn: resp.executionArn, runId };
}

// ── Poll execution status and map to UI step model ─────────────────────────
async function getIngestionStatus(executionArn, runId) {
  const exec = await getSfnClient().send(
    new DescribeExecutionCommand({ executionArn })
  );

  const sfnStatus = exec.status; // RUNNING | SUCCEEDED | FAILED | TIMED_OUT | ABORTED

  // Get ETL Glue job status (parse + transform)
  // The profiler is now a Lambda — its status is inferred from SFN state + ETL state
  let etlStatus = null;
  try {
    const etlRuns  = await getGlueClient().send(new GetJobRunsCommand({ JobName: GLUE_JOB(), MaxResults: 10 }));
    const matchEtl = (etlRuns.JobRuns || []).find(r => r.Arguments?.['--run_id'] === runId);
    if (matchEtl) etlStatus = matchEtl.JobRunState;
  } catch { /* best effort */ }

  // Map to 4 UI steps
  const steps = buildSteps(sfnStatus, etlStatus, exec);

  // Detect quality bypass: SFN succeeded but $.quality_warning was set in output
  // (happens when quality profiler failed/scored low and was caught → PipelineSucceeded)
  let qualityBypassed = false;
  let qualityWarningMsg = null;
  if (sfnStatus === 'SUCCEEDED' && exec.output) {
    try {
      const out = JSON.parse(exec.output);
      if (out.quality_warning) {
        qualityBypassed   = true;
        qualityWarningMsg = out.quality_warning?.Cause || out.quality_warning?.Error || 'Quality check bypassed';
      }
    } catch { /* ignore parse errors */ }
  }

  // On success (including quality-bypassed): read quality stats + metadata + auto-enrich with AI
  let qualityStats    = null;
  let enrichedMeta    = null;
  if (sfnStatus === 'SUCCEEDED') {
    qualityStats = await readQualityStats(runId);  // returns null gracefully if stats.json missing
    try {
      const { getMetadata, enrichWithAI } = require('./metadataAgent');
      let rawMeta = await getMetadata(runId);

      // ── Fallback: Lambda profiler failed before writing metadata.json ──────
      // Parse the SFN execution input to build a minimal schema so enrichWithAI
      // always gets real column names rather than nothing at all.
      if (!rawMeta && qualityBypassed && exec.input) {
        try {
          const inp = JSON.parse(exec.input);
          const sourceFile      = inp.source_file || 'unknown';
          const transformColumn = inp.transform_column || '';
          const newColumnName   = inp.new_column_name   || '';
          // Build column stubs from what we know about the ETL job output.
          // At minimum we know the transform column and the derived column it produced.
          const knownCols = [];
          if (transformColumn) knownCols.push({
            name: transformColumn, data_type: 'string', semantic_type: 'other',
            nullable: false, null_pct: 0, unique_count: -1, sample_values: [],
            description: '', tags: [], pii_flag: false,
          });
          if (newColumnName && newColumnName !== transformColumn) knownCols.push({
            name: newColumnName, data_type: 'string', semantic_type: 'other',
            nullable: false, null_pct: 0, unique_count: -1, sample_values: [],
            description: '', tags: [], pii_flag: false,
          });
          if (knownCols.length > 0) {
            rawMeta = {
              run_id:        runId,
              dataset_name:  sourceFile.replace(/\.(csv|tsv)$/i, ''),
              source_file:   sourceFile,
              s3_path:       inp.output_s3_path || '',
              total_rows:    0,
              total_columns: knownCols.length,
              quality_score: null,
              ingested_at:   new Date().toISOString(),
              columns:       knownCols,
              registered:    false,
              profiler_failed: true,
            };
            console.log(`[ingestAgent] Using fallback metadata (${knownCols.length} cols) for run ${runId}`);
          }
        } catch (parseErr) {
          console.warn('[ingestAgent] Could not parse SFN input for fallback metadata:', parseErr.message);
        }
      }

      if (rawMeta) enrichedMeta = await enrichWithAI(rawMeta);
    } catch (e) {
      console.warn('[ingestAgent] Metadata enrichment failed (non-fatal):', e.message);
    }
  }

  // Parse error detail
  let errorDetail = null;
  if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(sfnStatus)) {
    errorDetail = exec.cause || exec.error || 'Pipeline failed — check CloudWatch logs';
  }

  return {
    executionArn,
    runId,
    sfnStatus,
    steps,
    qualityStats,
    enrichedMeta,     // auto-loaded + AI-enriched metadata for immediate UI display
    qualityBypassed,  // true when quality check failed but pipeline continued
    qualityWarningMsg,
    errorDetail,
    startDate:  exec.startDate?.toISOString(),
    stopDate:   exec.stopDate?.toISOString(),
  };
}

// ── Derive the 4 step statuses from SFN status + ETL Glue job state ──────────
// The profiler (step 4) is now a Lambda — its status is inferred:
//   - SFN RUNNING + ETL SUCCEEDED → Lambda profiler is running
//   - SFN FAILED  + error is QualityGateFailed → Lambda profiler failed the gate
//   - SFN FAILED  + error is GlueETLFailed     → ETL failed before profiler ran
function buildSteps(sfnStatus, etlStatus, sfnExec) {
  const upload = { id: 1, name: 'Load to S3', icon: '☁️', status: 'done' };

  const glueRunning = s => s === 'STARTING' || s === 'RUNNING';
  const glueDone    = s => s === 'SUCCEEDED';
  const glueFailed  = s => s === 'FAILED' || s === 'STOPPED';

  // Detect quality bypass: SFN succeeded but output contains quality_warning
  let qualityBypassed = false;
  if (sfnStatus === 'SUCCEEDED' && sfnExec?.output) {
    try {
      const out = JSON.parse(sfnExec.output);
      if (out.quality_warning) qualityBypassed = true;
    } catch { /* ignore */ }
  }

  // Detect ETL hard failure from SFN error
  const sfnError  = sfnExec?.error || '';
  const sfnCause  = sfnExec?.cause || '';
  const etlFailed = sfnError === 'GlueETLFailed' || sfnCause.includes('GlueETLFailed');

  let parseStatus     = 'waiting';
  let transformStatus = 'waiting';
  let qualityStatus   = 'waiting';

  if (sfnStatus === 'SUCCEEDED') {
    parseStatus     = 'done';
    transformStatus = 'done';
    // 'warning' = quality ran but was bypassed; 'done' = quality passed cleanly
    qualityStatus   = qualityBypassed ? 'warning' : 'done';
  } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(sfnStatus)) {
    if (etlFailed || glueFailed(etlStatus)) {
      parseStatus     = 'error';
      transformStatus = 'error';
      qualityStatus   = 'waiting';
    } else {
      // Unknown failure — mark all in-progress steps as error
      parseStatus     = glueDone(etlStatus) ? 'done'  : 'error';
      transformStatus = glueDone(etlStatus) ? 'done'  : 'error';
      qualityStatus   = glueDone(etlStatus) ? 'error' : 'waiting';
    }
  } else if (sfnStatus === 'RUNNING') {
    if (glueDone(etlStatus)) {
      // ETL done → Lambda profiler is now running
      parseStatus     = 'done';
      transformStatus = 'done';
      qualityStatus   = 'running';
    } else if (glueFailed(etlStatus)) {
      parseStatus     = 'error';
      transformStatus = 'error';
    } else {
      // ETL still running (or not yet started)
      parseStatus     = 'running';
      transformStatus = 'running';
    }
  }

  return [
    upload,
    { id: 2, name: 'Parse with Glue',   icon: '⚙️', status: parseStatus },
    { id: 3, name: 'Transform Column',   icon: '🔄', status: transformStatus },
    { id: 4, name: 'Quality & Profile',  icon: '🔬', status: qualityStatus },
  ];
}

// ── Read quality results JSON from S3 ─────────────────────────────────────
async function readQualityStats(runId) {
  try {
    const key = `quality-results/${runId}/stats.json`;
    const cmd = new GetObjectCommand({ Bucket: BUCKET(), Key: key });
    const res = await getS3Client().send(cmd);

    const chunks = [];
    for await (const chunk of res.Body) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    return null;
  }
}

// ── Read sample rows JSON from S3 (saved by lambda_quality.py) ────────────
async function readSampleRows(runId) {
  try {
    const key = `quality-results/${runId}/sample.json`;
    const cmd = new GetObjectCommand({ Bucket: BUCKET(), Key: key });
    const res = await getS3Client().send(cmd);
    const chunks = [];
    for await (const chunk of res.Body) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    return null;
  }
}

// ── Fetch CloudWatch logs for a pipeline run ──────────────────────────────
// Checks Lambda log group first, then Glue error logs, returns merged events.
async function getRunLogs(runId, sinceMs) {
  const {
    FilterLogEventsCommand,
    DescribeLogGroupsCommand,
  } = require('@aws-sdk/client-cloudwatch-logs');

  const region = regionFromArn(process.env.PIPELINE_SFN_ARN);
  const { fromIni: _fromIni } = require('@aws-sdk/credential-providers');
  const { CloudWatchLogsClient } = require('@aws-sdk/client-cloudwatch-logs');

  const cwLogs = new CloudWatchLogsClient({ region, credentials: buildCredentials() });

  const startTime = sinceMs || (Date.now() - 60 * 60 * 1000); // last 1 hour
  const logGroups = [
    `/aws/lambda/${process.env.PIPELINE_PROFILER_LAMBDA || 'agenticdt-quality-profiler'}`,
    `/aws/lambda/${process.env.PIPELINE_LAMBDA_FN       || 'agenticdt-quality-check'}`,
    `/aws-glue/jobs/error`,
  ];

  const allEvents = [];

  for (const logGroup of logGroups) {
    try {
      const cmd = new FilterLogEventsCommand({
        logGroupName:  logGroup,
        filterPattern: runId,   // only events mentioning this run_id
        startTime,
        limit: 100,
      });
      const resp = await cwLogs.send(cmd);
      for (const e of (resp.events || [])) {
        allEvents.push({
          timestamp: e.timestamp,
          logGroup,
          message: e.message.trim(),
        });
      }
    } catch (err) {
      // Log group may not exist yet — skip silently
      if (!err.message?.includes('ResourceNotFoundException')) {
        allEvents.push({
          timestamp: Date.now(),
          logGroup,
          message: `[Could not fetch logs from ${logGroup}: ${err.message}]`,
        });
      }
    }
  }

  // Sort chronologically
  allEvents.sort((a, b) => a.timestamp - b.timestamp);
  return allEvents;
}

// ── Find the last successful Glue ETL run + its S3 output paths ───────────────
async function getLastEtlRun() {
  try {
    const runs = await getGlueClient().send(
      new GetJobRunsCommand({ JobName: GLUE_JOB(), MaxResults: 20 })
    );
    const succeeded = (runs.JobRuns || []).find(r => r.JobRunState === 'SUCCEEDED');
    if (!succeeded) return null;

    const args = succeeded.Arguments || {};
    return {
      runId:           args['--run_id']          || null,
      inputS3Path:     args['--input_s3_path']   || null,
      outputS3Path:    args['--output_s3_path']  || null,
      parsedS3Path:    args['--parsed_s3_path']  || null,
      transformColumn: args['--transform_column']|| null,
      newColumnName:   args['--new_column_name'] || null,
      completedAt:     succeeded.CompletedOn?.toISOString() || null,
      glueRunId:       succeeded.Id || null,
    };
  } catch (e) {
    console.warn('[ingestAgent] getLastEtlRun failed:', e.message);
    return null;
  }
}

// ── Start a quality-only pipeline run (skips Glue ETL, reuses last output) ────
async function startQualityOnlyPipeline(lastRun) {
  const bucket   = BUCKET();
  // Use the last ETL run's output as input to the profiler, but give it a fresh run ID
  const runId    = makeRunId();
  const outputS3 = lastRun.outputS3Path || `s3://${bucket}/transformed/${lastRun.runId}/`;

  const executionInput = {
    run_id:           runId,
    // ETL fields are present but won't be used (CheckMode skips RunGlueETL)
    input_s3_path:    lastRun.inputS3Path    || '',
    parsed_s3_path:   lastRun.parsedS3Path   || `s3://${bucket}/parsed/${lastRun.runId}/`,
    output_s3_path:   outputS3,
    results_s3_path:  `s3://${bucket}/quality-results/${runId}/`,
    transform_column: lastRun.transformColumn || '',
    new_column_name:  lastRun.newColumnName   || '',
    source_file:      lastRun.inputS3Path ? lastRun.inputS3Path.split('/').pop() : 'rerun',
    skip_etl:         true,               // ← CheckMode routes directly to RunQualityProfiler
    reused_etl_run_id: lastRun.runId,     // informational — carried through SFN output
  };

  const cmd = new StartExecutionCommand({
    stateMachineArn: SFN_ARN(),
    name:            runId,
    input:           JSON.stringify(executionInput),
  });

  const resp = await getSfnClient().send(cmd);
  return { executionArn: resp.executionArn, runId, reusedEtlRunId: lastRun.runId };
}

module.exports = {
  isPipelineConfigured,
  makeRunId,
  uploadToS3,
  startIngestionPipeline,
  startQualityOnlyPipeline,
  getLastEtlRun,
  getIngestionStatus,
  readSampleRows,
  getRunLogs,
};
