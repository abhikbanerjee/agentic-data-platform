'use strict';
/**
 * AgenticDT Metadata Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads column profiles produced by validate_and_profile.py, enriches them
 * with AI-generated descriptions (optional), and registers approved datasets
 * to the S3 catalog + optional external catalog API.
 *
 * S3 layout:
 *   quality-results/{runId}/metadata.json   ← column profile (source of truth)
 *   catalog/datasets/{runId}.json           ← registered catalog entry
 *   catalog/index.json                      ← list of all registered datasets
 */

const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { fromIni } = require('@aws-sdk/credential-providers');

// ── Credentials (same pattern as ingestAgent) ─────────────────────────────
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

function regionFromArn(arn) {
  if (arn) { const p = arn.split(':'); if (p.length >= 4 && p[3]) return p[3]; }
  return process.env.AWS_REGION || 'us-east-1';
}

let _s3 = null;
function getS3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: regionFromArn(process.env.PIPELINE_SFN_ARN),
      credentials: buildCredentials(),
      followRegionRedirects: true,
    });
  }
  return _s3;
}

const BUCKET = () => process.env.PIPELINE_S3_BUCKET;

// ── S3 helpers ────────────────────────────────────────────────────────────────
async function s3Get(key) {
  const res = await getS3().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

async function s3Put(key, data) {
  await getS3().send(new PutObjectCommand({
    Bucket:      BUCKET(),
    Key:         key,
    Body:        JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }));
}

// ── Read metadata produced by validate_and_profile.py ────────────────────────
async function getMetadata(runId) {
  try {
    return await s3Get(`quality-results/${runId}/metadata.json`);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

// ── Enrich column descriptions with OpenAI ────────────────────────────────────
async function enrichWithAI(metadata) {
  const OpenAI = (() => { try { return require('openai'); } catch { return null; } })();
  if (!OpenAI || !process.env.OPENAI_API_KEY) {
    // Return metadata with auto-generated placeholder descriptions
    return {
      ...metadata,
      columns: metadata.columns.map(col => ({
        ...col,
        description: col.description || _autoDescription(col),
      })),
      ai_enriched: false,
    };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const colSummaries = metadata.columns.map(c =>
    `${c.name} (${c.data_type}, ${c.null_pct}% null, semantic: ${c.semantic_type}, samples: ${(c.sample_values || []).slice(0, 3).join(', ')})`
  ).join('\n');

  const prompt = `You are a data catalog assistant. For the dataset "${metadata.dataset_name}" with ${metadata.total_rows} rows, generate a concise one-sentence description for each column listed below. Return a JSON object mapping column_name → description only.

Columns:
${colSummaries}`;

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    const descriptions = JSON.parse(resp.choices[0].message.content);
    return {
      ...metadata,
      columns: metadata.columns.map(col => ({
        ...col,
        description: descriptions[col.name] || col.description || _autoDescription(col),
      })),
      ai_enriched: true,
    };
  } catch (err) {
    console.error('[MetadataAgent] OpenAI enrichment failed:', err.message);
    return {
      ...metadata,
      columns: metadata.columns.map(col => ({
        ...col,
        description: col.description || _autoDescription(col),
      })),
      ai_enriched: false,
    };
  }
}

function _autoDescription(col) {
  const t = col.semantic_type;
  const n = col.name.replace(/_/g, ' ');
  if (t === 'email')      return `Email address of the ${n.replace('email', '').trim() || 'record'}`;
  if (t === 'phone')      return `Phone number for contact purposes`;
  if (t === 'name')       return `Full or partial name field`;
  if (t === 'currency')   return `Monetary value in the dataset's base currency`;
  if (t === 'metric')     return `Numeric metric or score — higher values typically indicate better performance`;
  if (t === 'datetime')   return `Timestamp or date value`;
  if (t === 'identifier') return `Unique identifier or foreign key`;
  if (t === 'latitude')   return `Geographic latitude coordinate`;
  if (t === 'longitude')  return `Geographic longitude coordinate`;
  if (t === 'postal_code') return `Postal or ZIP code`;
  if (t === 'numeric')    return `Numeric measurement column`;
  if (t === 'categorical') return `Categorical dimension — ${col.unique_count > 0 ? `${col.unique_count} distinct values` : 'low cardinality'}`;
  return `Column: ${n}`;
}

// ── Register approved metadata to S3 catalog ──────────────────────────────────
async function registerMetadata(runId, approvedMetadata) {
  const now = new Date().toISOString();
  const entry = {
    ...approvedMetadata,
    registered:    true,
    registered_at: now,
    catalog_id:    `dataset-${runId}`,
  };

  // Save the full registered entry
  await s3Put(`catalog/datasets/${runId}.json`, entry);

  // Update the catalog index (list of all datasets)
  let index = { datasets: [] };
  try { index = await s3Get('catalog/index.json'); } catch { /* first entry */ }

  const existing = index.datasets.findIndex(d => d.run_id === runId);
  const summary = {
    run_id:       runId,
    dataset_name: entry.dataset_name,
    source_file:  entry.source_file,
    total_rows:   entry.total_rows,
    total_columns: entry.total_columns,
    quality_score: entry.quality_score,
    registered_at: now,
    catalog_id:   entry.catalog_id,
    s3_path:      entry.s3_path,
  };

  if (existing >= 0) index.datasets[existing] = summary;
  else               index.datasets.unshift(summary);

  await s3Put('catalog/index.json', index);

  // Optionally call external catalog API
  if (process.env.CATALOG_API_URL) {
    try {
      const fetch = require('node-fetch');
      const resp = await fetch(process.env.CATALOG_API_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(process.env.CATALOG_API_KEY ? { Authorization: `Bearer ${process.env.CATALOG_API_KEY}` } : {}),
        },
        body: JSON.stringify(entry),
      });
      if (!resp.ok) throw new Error(`Catalog API responded ${resp.status}`);
      console.log('[MetadataAgent] Registered to external catalog API');
    } catch (err) {
      console.warn('[MetadataAgent] External catalog API call failed (non-fatal):', err.message);
    }
  }

  console.log(`[MetadataAgent] Registered dataset ${runId} → s3://${BUCKET()}/catalog/datasets/${runId}.json`);
  return entry;
}

// ── List all registered datasets ──────────────────────────────────────────────
async function getCatalogIndex() {
  try { return await s3Get('catalog/index.json'); }
  catch { return { datasets: [] }; }
}

module.exports = { getMetadata, enrichWithAI, registerMetadata, getCatalogIndex };
