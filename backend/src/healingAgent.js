/**
 * AgenticDT Self-Healing Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Agent Tools:
 *   listGlueJobs()           – discover all Glue jobs in the account/region
 *   getGlueJobRuns()         – fetch N most recent runs for a job
 *   getJobLogs()             – pull CloudWatch log events for a failed run
 *   startGlueJobRun()        – restart a Glue job with its default args
 *   listStateMachines()      – discover all Step Functions state machines
 *   describeStateMachine()   – fetch ASL definition + metadata
 *   listExecutions()         – recent executions filtered by status
 *   startExecution()         – kick off a new state machine execution
 *   listEventBridgeRules()   – list scheduled EventBridge rules
 *   logHealingAction()       – write structured event to CloudWatch Logs
 *
 * Agent Loop (runHealingCycle):
 *   1. Discover all Glue jobs → find FAILED runs
 *   2. Pull CloudWatch logs → classify error (transient vs permanent)
 *   3. Restart transient failures; flag permanent ones for human review
 *   4. Discover Step Functions → find FAILED executions → restart
 *   5. Log every action to /agenticdt/healing CloudWatch log group
 *   6. Return structured report { logs, healed, failed }
 */

'use strict';

const {
  GetJobsCommand,
  GetJobRunsCommand,
  StartJobRunCommand,
} = require('@aws-sdk/client-glue');

const {
  ListStateMachinesCommand,
  DescribeStateMachineCommand,
  ListExecutionsCommand,
  StartExecutionCommand,
  DescribeExecutionCommand,
} = require('@aws-sdk/client-sfn');

const {
  DescribeLogGroupsCommand,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  FilterLogEventsCommand,
} = require('@aws-sdk/client-cloudwatch-logs');

const {
  ListRulesCommand,
} = require('@aws-sdk/client-eventbridge');

const { glueClient, sfnClient, logsClient, ebClient } = require('./awsClient');

// ── Constants ─────────────────────────────────────────────────────────────────
const HEALING_LOG_GROUP  = '/agenticdt/healing';
const HEALING_LOG_STREAM = 'self-healing-agent';
const MAX_RUNS_TO_CHECK  = 5;   // how many recent runs to inspect per job
const TRANSIENT_PATTERNS = [
  /connection timed out/i,
  /throttling/i,
  /rate exceeded/i,
  /temporarily unavailable/i,
  /socket hang up/i,
  /ECONNRESET/i,
  /retryable/i,
  /out of memory/i,
  /capacity exceeded/i,
];

// ── Tool: List Glue Jobs ──────────────────────────────────────────────────────
async function listGlueJobs() {
  const jobs = [];
  let nextToken;
  do {
    const cmd = new GetJobsCommand({ NextToken: nextToken, MaxResults: 100 });
    const resp = await glueClient.send(cmd);
    jobs.push(...(resp.Jobs || []));
    nextToken = resp.NextToken;
  } while (nextToken);
  return jobs;
}

// ── Tool: Get recent runs for a Glue job ─────────────────────────────────────
async function getGlueJobRuns(jobName, maxRuns = MAX_RUNS_TO_CHECK) {
  const cmd = new GetJobRunsCommand({ JobName: jobName, MaxResults: maxRuns });
  const resp = await glueClient.send(cmd);
  return resp.JobRuns || [];
}

// ── Tool: Get CloudWatch logs for a Glue job run ─────────────────────────────
async function getJobLogs(jobName, runId) {
  try {
    // Glue writes logs to /aws-glue/jobs/error and /aws-glue/jobs/output
    const logGroupName = `/aws-glue/jobs/error`;
    const cmd = new FilterLogEventsCommand({
      logGroupName,
      logStreamNamePrefix: `${jobName}_${runId}`,
      limit: 50,
    });
    const resp = await logsClient.send(cmd);
    return (resp.events || []).map(e => e.message).join('\n');
  } catch {
    return null; // log group may not exist
  }
}

// ── Tool: Restart a Glue job ──────────────────────────────────────────────────
async function startGlueJobRun(jobName, args = {}) {
  const cmd = new StartJobRunCommand({
    JobName: jobName,
    ...(Object.keys(args).length > 0 ? { Arguments: args } : {}),
  });
  const resp = await glueClient.send(cmd);
  return resp.JobRunId;
}

// ── Tool: List Step Functions state machines ──────────────────────────────────
async function listStateMachines() {
  const machines = [];
  let nextToken;
  do {
    const cmd = new ListStateMachinesCommand({ maxResults: 100, nextToken });
    const resp = await sfnClient.send(cmd);
    machines.push(...(resp.stateMachines || []));
    nextToken = resp.nextToken;
  } while (nextToken);
  return machines;
}

// ── Tool: Describe a state machine (get ASL definition) ──────────────────────
async function describeStateMachine(stateMachineArn) {
  const cmd = new DescribeStateMachineCommand({ stateMachineArn });
  return sfnClient.send(cmd);
}

// ── Tool: List executions of a state machine filtered by status ───────────────
async function listExecutions(stateMachineArn, statusFilter = 'FAILED', maxResults = 10) {
  const cmd = new ListExecutionsCommand({ stateMachineArn, statusFilter, maxResults });
  const resp = await sfnClient.send(cmd);
  return resp.executions || [];
}

// ── Tool: Get details of a single execution ───────────────────────────────────
async function describeExecution(executionArn) {
  const cmd = new DescribeExecutionCommand({ executionArn });
  return sfnClient.send(cmd);
}

// ── Tool: Start a new Step Functions execution ────────────────────────────────
async function startExecution(stateMachineArn, input = '{}', name = undefined) {
  const execName = name || `healing-restart-${Date.now()}`;
  const cmd = new StartExecutionCommand({ stateMachineArn, input, name: execName });
  const resp = await sfnClient.send(cmd);
  return resp.executionArn;
}

// ── Tool: List EventBridge scheduled rules ────────────────────────────────────
async function listEventBridgeRules(eventBusName = 'default') {
  const rules = [];
  let nextToken;
  do {
    const cmd = new ListRulesCommand({ EventBusName: eventBusName, NextToken: nextToken, Limit: 100 });
    const resp = await ebClient.send(cmd);
    rules.push(...(resp.Rules || []).filter(r => r.ScheduleExpression));
    nextToken = resp.NextToken;
  } while (nextToken);
  return rules;
}

// ── Tool: Write a healing event to CloudWatch Logs ───────────────────────────
async function logHealingAction(message) {
  try {
    // Ensure log group exists
    try {
      await logsClient.send(new CreateLogGroupCommand({ logGroupName: HEALING_LOG_GROUP }));
    } catch (e) { /* already exists */ }
    try {
      await logsClient.send(new CreateLogStreamCommand({
        logGroupName: HEALING_LOG_GROUP,
        logStreamName: HEALING_LOG_STREAM,
      }));
    } catch (e) { /* already exists */ }

    await logsClient.send(new PutLogEventsCommand({
      logGroupName: HEALING_LOG_GROUP,
      logStreamName: HEALING_LOG_STREAM,
      logEvents: [{ timestamp: Date.now(), message }],
    }));
  } catch {
    // CloudWatch logging is best-effort; never break the agent
  }
}

// ── Helper: Classify error as transient or permanent ─────────────────────────
function isTransientError(errorMessage = '') {
  return TRANSIENT_PATTERNS.some(p => p.test(errorMessage));
}

// ── Helper: Parse ASL into an ordered list of nodes ──────────────────────────
function parseAslToNodes(definition) {
  try {
    const asl = typeof definition === 'string' ? JSON.parse(definition) : definition;
    const states = asl.States || {};
    const startAt = asl.StartAt;
    const nodes = [];
    const visited = new Set();

    let current = startAt;
    while (current && !visited.has(current)) {
      visited.add(current);
      const state = states[current];
      if (!state) break;
      nodes.push({
        name: current,
        type: state.Type || 'Task',
        resource: state.Resource,
        next: state.Next || null,
        isEnd: !!state.End,
        choices: state.Choices || null,
        error: state.Error || null,
      });
      current = state.Next;
    }
    return nodes;
  } catch {
    return [];
  }
}

// ── Main Agent Loop ───────────────────────────────────────────────────────────
async function runHealingCycle() {
  const logs = [];
  let healedCount = 0;
  let failedCount = 0;
  const issues = [];

  const log = async (msg) => {
    const ts = new Date().toISOString();
    logs.push({ ts, msg });
    await logHealingAction(`[AgenticDT] ${msg}`);
  };

  await log('🤖 Self-Healing Agent starting full diagnostic cycle...');

  // ── Phase 1: Glue Jobs ──────────────────────────────────────────────────────
  await log('📡 Phase 1: Scanning AWS Glue jobs...');
  let glueJobs = [];
  try {
    glueJobs = await listGlueJobs();
    await log(`  Found ${glueJobs.length} Glue job(s) in region ${process.env.AWS_REGION || 'us-east-1'}`);
  } catch (e) {
    await log(`  ⚠️ Could not list Glue jobs: ${e.message}`);
  }

  for (const job of glueJobs) {
    try {
      const runs = await getGlueJobRuns(job.Name);
      if (!runs.length) continue;
      const latest = runs[0];

      if (latest.JobRunState === 'FAILED') {
        await log(`  ⚠️ FAILED job detected: ${job.Name}`);
        await log(`     Run ID   : ${latest.Id}`);
        await log(`     Error    : ${latest.ErrorMessage || 'No error message'}`);
        await log(`     Started  : ${latest.StartedOn?.toISOString() || 'unknown'}`);

        // Try to pull CloudWatch logs for more detail
        const logOutput = await getJobLogs(job.Name, latest.Id);
        if (logOutput) {
          const snippet = logOutput.slice(0, 300).replace(/\n/g, ' ');
          await log(`     Log snippet: ${snippet}...`);
        }

        const transient = isTransientError(latest.ErrorMessage || '');
        issues.push({
          type: 'glue',
          name: job.Name,
          runId: latest.Id,
          error: latest.ErrorMessage,
          classification: transient ? 'transient' : 'permanent',
        });

        if (transient) {
          await log(`  🔄 Transient error pattern detected — restarting ${job.Name}...`);
          try {
            const newRunId = await startGlueJobRun(job.Name);
            await log(`  ✅ Restart successful — new Run ID: ${newRunId}`);
            healedCount++;
          } catch (err) {
            await log(`  ❌ Restart failed: ${err.message}`);
            failedCount++;
          }
        } else {
          await log(`  🚨 Permanent error — ${job.Name} requires manual intervention`);
          await log(`     Flagging for human review...`);
          failedCount++;
        }
      } else if (latest.JobRunState === 'RUNNING') {
        await log(`  ✅ ${job.Name}: RUNNING (run ${latest.Id})`);
      } else if (latest.JobRunState === 'SUCCEEDED') {
        await log(`  ✅ ${job.Name}: SUCCEEDED — healthy`);
      }
    } catch (e) {
      await log(`  ⚠️ Could not check job ${job.Name}: ${e.message}`);
    }
  }

  // ── Phase 2: Step Functions ─────────────────────────────────────────────────
  await log('');
  await log('📡 Phase 2: Scanning Step Functions state machines...');
  let stateMachines = [];
  try {
    stateMachines = await listStateMachines();
    await log(`  Found ${stateMachines.length} state machine(s)`);
  } catch (e) {
    await log(`  ⚠️ Could not list state machines: ${e.message}`);
  }

  for (const sm of stateMachines) {
    try {
      const failedExecs = await listExecutions(sm.stateMachineArn, 'FAILED', 3);
      if (!failedExecs.length) {
        await log(`  ✅ ${sm.name}: no recent failures`);
        continue;
      }

      await log(`  ⚠️ ${sm.name}: ${failedExecs.length} failed execution(s) detected`);

      for (const exec of failedExecs.slice(0, 1)) { // heal most recent failure only
        try {
          const details = await describeExecution(exec.executionArn);
          await log(`     Execution : ${exec.name}`);
          await log(`     Started   : ${exec.startDate?.toISOString() || 'unknown'}`);
          await log(`     Cause     : ${details.cause || 'no cause captured'}`);

          const transient = isTransientError(details.cause || '');
          issues.push({
            type: 'stepfunction',
            name: sm.name,
            arn: sm.stateMachineArn,
            executionArn: exec.executionArn,
            cause: details.cause,
            classification: transient ? 'transient' : 'permanent',
          });

          if (transient) {
            await log(`  🔄 Restarting state machine ${sm.name} with same input...`);
            const newExecArn = await startExecution(
              sm.stateMachineArn,
              details.input || '{}',
            );
            await log(`  ✅ New execution started: ${newExecArn.split(':').pop()}`);
            healedCount++;
          } else {
            await log(`  🚨 Non-transient failure in ${sm.name} — escalating to ops team`);
            failedCount++;
          }
        } catch (err) {
          await log(`  ❌ Could not heal execution ${exec.executionArn}: ${err.message}`);
          failedCount++;
        }
      }
    } catch (e) {
      await log(`  ⚠️ Could not check state machine ${sm.name}: ${e.message}`);
    }
  }

  // ── Phase 3: EventBridge Schedules ─────────────────────────────────────────
  await log('');
  await log('📡 Phase 3: Auditing EventBridge scheduled rules...');
  try {
    const rules = await listEventBridgeRules();
    if (rules.length === 0) {
      await log('  No scheduled EventBridge rules found');
    } else {
      for (const rule of rules) {
        const state = rule.State === 'ENABLED' ? '✅ ENABLED' : '⚠️ DISABLED';
        await log(`  ${state}  ${rule.Name} — ${rule.ScheduleExpression}`);
      }
    }
  } catch (e) {
    await log(`  ⚠️ Could not list EventBridge rules: ${e.message}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  await log('');
  await log('─────────────────────────────────────────────');
  await log(`🏁 Healing cycle complete`);
  await log(`   Pipelines healed   : ${healedCount}`);
  await log(`   Require attention  : ${failedCount}`);
  await log(`   Total jobs scanned : ${glueJobs.length}`);
  await log(`   Total SFs scanned  : ${stateMachines.length}`);
  await log(`   Healing logs saved : CloudWatch ${HEALING_LOG_GROUP}`);

  return { logs, healedCount, failedCount, issues };
}

// ── Discovery: build unified pipeline list for the UI ─────────────────────────
async function discoverPipelines() {
  const [glueJobs, stateMachines, ebRules] = await Promise.allSettled([
    listGlueJobs(),
    listStateMachines(),
    listEventBridgeRules(),
  ]);

  // Map Glue jobs → pipeline objects
  const gluePipelines = await Promise.all(
    (glueJobs.value || []).map(async (job) => {
      let lastRun = null;
      let status = 'UNKNOWN';
      let duration = null;
      let runId = null;
      try {
        const runs = await getGlueJobRuns(job.Name, 1);
        if (runs[0]) {
          lastRun = runs[0].StartedOn?.toISOString() || null;
          status = runs[0].JobRunState;
          runId = runs[0].Id;
          if (runs[0].StartedOn && runs[0].CompletedOn) {
            const ms = new Date(runs[0].CompletedOn) - new Date(runs[0].StartedOn);
            duration = `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
          }
        }
      } catch { /* best effort */ }

      return {
        id: `glue-${job.Name}`,
        name: job.Name,
        type: 'glue',
        status,
        lastRun,
        duration,
        runId,
        description: job.Description || 'AWS Glue ETL Job',
        owner: job.CreatedBy || 'AWS Glue',
      };
    })
  );

  // Map Step Functions → pipeline objects
  const sfPipelines = (stateMachines.value || []).map((sm) => ({
    id: `sf-${encodeURIComponent(sm.stateMachineArn)}`,
    name: sm.name,
    type: 'stepfunction',
    status: sm.status || 'ACTIVE',
    arn: sm.stateMachineArn,
    lastRun: sm.creationDate?.toISOString() || null,
    description: 'AWS Step Functions Workflow',
    owner: 'Step Functions',
  }));

  // Map EventBridge rules
  const ebPipelines = (ebRules.value || []).map((rule) => ({
    id: `eb-${rule.Name}`,
    name: rule.Name,
    type: 'eventbridge',
    status: rule.State,
    schedule: rule.ScheduleExpression,
    description: rule.Description || 'EventBridge Scheduled Rule',
    owner: 'EventBridge',
  }));

  return { gluePipelines, sfPipelines, ebPipelines };
}

// ── Get DAG structure for a specific pipeline ─────────────────────────────────
async function getPipelineDag(type, id) {
  if (type === 'stepfunction') {
    const arn = decodeURIComponent(id.replace(/^sf-/, ''));
    const sm = await describeStateMachine(arn);
    const nodes = parseAslToNodes(sm.definition);

    // Get latest executions
    let recentExecutions = [];
    try {
      const [running, succeeded, failed] = await Promise.all([
        listExecutions(arn, 'RUNNING', 5),
        listExecutions(arn, 'SUCCEEDED', 5),
        listExecutions(arn, 'FAILED', 5),
      ]);
      recentExecutions = [...running, ...succeeded, ...failed]
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .slice(0, 10);
    } catch { /* best effort */ }

    return {
      name: sm.name,
      arn,
      type: sm.type,
      status: sm.status,
      nodes,
      recentExecutions: recentExecutions.map(e => ({
        name: e.name,
        status: e.status,
        startDate: e.startDate?.toISOString(),
        stopDate: e.stopDate?.toISOString(),
        executionArn: e.executionArn,
      })),
    };
  }

  if (type === 'glue') {
    const jobName = id.replace(/^glue-/, '');
    const runs = await getGlueJobRuns(jobName, 10);
    // Glue jobs have a simple linear DAG: Extract → Transform → Load
    const nodes = [
      { name: 'Extract', type: 'Task', next: 'Transform', isEnd: false },
      { name: 'Transform', type: 'Task', next: 'Load', isEnd: false },
      { name: 'Load', type: 'Task', next: null, isEnd: true },
    ];
    return {
      name: jobName,
      type: 'glue',
      nodes,
      recentExecutions: runs.map(r => ({
        name: r.Id,
        status: r.JobRunState,
        startDate: r.StartedOn?.toISOString(),
        stopDate: r.CompletedOn?.toISOString(),
        error: r.ErrorMessage,
      })),
    };
  }

  return { name: id, nodes: [], recentExecutions: [] };
}

module.exports = {
  runHealingCycle,
  discoverPipelines,
  getPipelineDag,
  listGlueJobs,
  getGlueJobRuns,
  startGlueJobRun,
  listStateMachines,
  describeStateMachine,
  listExecutions,
  startExecution,
  listEventBridgeRules,
};
