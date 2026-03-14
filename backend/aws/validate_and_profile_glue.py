"""
AgenticDT — Quality Validator & Column Profiler (Glue Python Shell)
====================================================================
Runs as a Glue Python Shell job (NOT Spark).  Uses awswrangler which
is pre-installed in Glue Python Shell >= 3.0 — no extra layers needed.

Job arguments:
  --run_id           Pipeline run ID (e.g. run-20240115-143022)
  --output_s3_path   s3://bucket/transformed/run-id/
  --results_s3_path  s3://bucket/quality-results/run-id/
  --source_file      Original filename (e.g. sample_data.csv)  [optional]
  --quality_threshold  Minimum quality score to pass (default 70)  [optional]

Outputs written to results_s3_path/:
  stats.json     Quality report (score, issues, row/col counts)
  metadata.json  Per-column catalog metadata (types, stats, descriptions)
  sample.json    First 20 rows for UI preview

The job FAILS (non-zero exit) if quality_score < quality_threshold.
Step Functions catches this via the Catch block.
"""

import sys
import json
import boto3
from datetime import datetime, timezone

# ── Parse job arguments ───────────────────────────────────────────────────────
try:
    from awsglue.utils import getResolvedOptions
    args = getResolvedOptions(sys.argv, ['run_id', 'output_s3_path', 'results_s3_path'])
    # Optional args with defaults
    def _get_opt(name, default=''):
        try:
            return getResolvedOptions(sys.argv, [name])[name]
        except Exception:
            return default
    source_file       = _get_opt('source_file', 'unknown')
    quality_threshold = float(_get_opt('quality_threshold', '70'))
except Exception as e:
    print(f"[Profiler] Could not parse args: {e}")
    sys.exit(1)

run_id           = args['run_id']
output_s3_path   = args['output_s3_path'].rstrip('/')
results_s3_path  = args['results_s3_path'].rstrip('/')

print(f"[Profiler] Starting  run_id={run_id}")
print(f"[Profiler] Input:    {output_s3_path}")
print(f"[Profiler] Results:  {results_s3_path}")

# ── S3 helper ─────────────────────────────────────────────────────────────────
def parse_s3(path):
    p = path.replace('s3://', '')
    parts = p.split('/', 1)
    return parts[0], (parts[1] if len(parts) > 1 else '')

out_bucket, out_prefix   = parse_s3(output_s3_path)
res_bucket, res_prefix   = parse_s3(results_s3_path)

s3 = boto3.client('s3')

def save_json(key, data):
    s3.put_object(
        Bucket=res_bucket, Key=key,
        Body=json.dumps(data, default=str, indent=2),
        ContentType='application/json',
    )
    print(f"[Profiler]  ✓ s3://{res_bucket}/{key}")

# ── Read Parquet with awswrangler (pre-installed in Glue Python Shell) ────────
try:
    import awswrangler as wr
    print(f"[Profiler] Reading Parquet via awswrangler from {output_s3_path}/")
    df = wr.s3.read_parquet(path=f"{output_s3_path}/", dataset=True)
    print(f"[Profiler] Loaded {len(df):,} rows × {len(df.columns)} columns")
except ImportError:
    # awswrangler not available — try pyarrow directly
    print("[Profiler] awswrangler not found, trying pyarrow …")
    try:
        import pyarrow.parquet as pq
        import pyarrow as pa
        import io
        paginator = s3.get_paginator('list_objects_v2')
        keys = [o['Key'] for page in paginator.paginate(Bucket=out_bucket, Prefix=out_prefix + '/')
                for o in page.get('Contents', []) if o['Key'].endswith('.parquet')]
        if not keys:
            raise RuntimeError("No parquet files found")
        tables = []
        for k in keys:
            obj = s3.get_object(Bucket=out_bucket, Key=k)
            tables.append(pq.read_table(io.BytesIO(obj['Body'].read())))
        table = pa.concat_tables(tables)
        import pandas as pd
        df = table.to_pandas()
    except Exception as e2:
        print(f"[Profiler] FATAL: Cannot read Parquet — {e2}")
        save_json(f"{res_prefix}/stats.json", {
            'run_id': run_id, 'error': str(e2), 'passed': False,
            'quality_score': 0, 'total_rows': 0, 'total_columns': 0,
        })
        sys.exit(1)
except Exception as e:
    print(f"[Profiler] FATAL: Cannot read Parquet — {e}")
    save_json(f"{res_prefix}/stats.json", {
        'run_id': run_id, 'error': str(e), 'passed': False,
        'quality_score': 0, 'total_rows': 0, 'total_columns': 0,
    })
    sys.exit(1)

total_rows = len(df)
total_cols = len(df.columns)

# ── Profile every column ──────────────────────────────────────────────────────
def infer_semantic_type(name, dtype, samples):
    n = name.lower()
    if any(k in n for k in ('email', 'mail')):               return 'email'
    if any(k in n for k in ('phone', 'mobile', 'tel')):      return 'phone'
    if any(k in n for k in ('ssn', 'social_sec')):           return 'ssn'
    if any(k in n for k in ('zip', 'postal', 'postcode')):   return 'postal_code'
    if any(k in n for k in ('lat', 'latitude')):             return 'latitude'
    if any(k in n for k in ('lon', 'lng', 'longitude')):     return 'longitude'
    if any(k in n for k in ('date', '_at', '_on', 'time')):  return 'datetime'
    if any(k in n for k in ('id', '_key', '_code')):         return 'identifier'
    if any(k in n for k in ('name', 'first', 'last', 'customer')): return 'name'
    if any(k in n for k in ('price', 'amount', 'revenue', 'cost', 'fee')): return 'currency'
    if any(k in n for k in ('score', 'rate', 'pct', 'percent', 'ratio')): return 'metric'
    if 'int' in str(dtype) or 'float' in str(dtype):         return 'numeric'
    return 'categorical'

def is_pii(name):
    n = name.lower()
    return any(k in n for k in ('name','email','phone','address','zip','postal','ssn',
                                 'dob','birth','passport','national_id','tax_id','ip_address'))

def auto_tags(name, semantic_type):
    tags = []
    if semantic_type in ('email','phone','ssn','name'): tags.append('PII')
    if semantic_type == 'currency':   tags.append('financial')
    if semantic_type in ('latitude','longitude'): tags.append('geo')
    if semantic_type == 'datetime':   tags.append('temporal')
    if semantic_type == 'identifier': tags.append('key')
    if semantic_type == 'metric':     tags.append('kpi')
    return tags

def auto_description(name, semantic_type, unique_count):
    t, n = semantic_type, name.replace('_', ' ')
    descs = {
        'email': f'Email address',
        'phone': f'Phone number',
        'name': f'Name field',
        'currency': f'Monetary value',
        'metric': f'Numeric metric or score',
        'datetime': f'Timestamp or date value',
        'identifier': f'Unique identifier or key',
        'latitude': f'Geographic latitude',
        'longitude': f'Geographic longitude',
        'postal_code': f'Postal or ZIP code',
        'numeric': f'Numeric measurement',
        'categorical': f'Categorical dimension — {unique_count} distinct values',
    }
    return descs.get(t, f'Column: {n}')

columns_profile = []
issues = []
quality_score = 100.0

for col in df.columns:
    series = df[col]
    dtype_str    = str(series.dtype)
    null_count   = int(series.isna().sum())
    null_pct     = round(null_count / total_rows * 100, 2) if total_rows > 0 else 0.0
    non_null     = series.dropna()
    unique_count = int(non_null.nunique())
    sample_vals  = [str(v) for v in non_null.unique()[:8].tolist()]

    # Numeric stats
    num_stats = {}
    if str(series.dtype) in ('int64','int32','float64','float32') or 'int' in dtype_str or 'float' in dtype_str:
        try:
            desc = non_null.astype(float).describe()
            num_stats = {
                'min':    round(float(desc['min']), 4),
                'max':    round(float(desc['max']), 4),
                'mean':   round(float(desc['mean']), 4),
                'stddev': round(float(desc['std']), 4) if 'std' in desc else 0.0,
            }
        except Exception:
            pass

    # Top values for string columns
    top_values = []
    if dtype_str == 'object':
        try:
            vc = non_null.value_counts().head(5)
            top_values = [{'value': str(v), 'count': int(c)} for v, c in vc.items()]
        except Exception:
            pass

    semantic_type = infer_semantic_type(col, dtype_str, sample_vals)
    pii_flag = is_pii(col)
    tags = auto_tags(col, semantic_type)

    col_profile = {
        'name':          col,
        'data_type':     dtype_str,
        'semantic_type': semantic_type,
        'nullable':      null_count > 0,
        'null_count':    null_count,
        'null_pct':      null_pct,
        'unique_count':  unique_count,
        'total_count':   total_rows,
        'sample_values': sample_vals,
        'top_values':    top_values,
        'description':   auto_description(col, semantic_type, unique_count),
        'tags':          tags,
        'pii_flag':      pii_flag,
        **num_stats,
    }
    columns_profile.append(col_profile)

    # Quality scoring
    if null_pct > 50:
        quality_score -= 10
        issues.append({'column': col, 'severity': 'critical',
                       'message': f'{null_pct}% null — data completeness risk'})
    elif null_pct > 10:
        quality_score -= 3
        issues.append({'column': col, 'severity': 'warning',
                       'message': f'{null_pct}% null — review upstream source'})

quality_score = max(0.0, round(quality_score, 1))
passed = quality_score >= quality_threshold
print(f"[Profiler] Quality score: {quality_score}  |  Passed: {passed}  |  Issues: {len(issues)}")

# ── Save stats.json ────────────────────────────────────────────────────────────
stats = {
    'run_id':        run_id,
    'total_rows':    total_rows,
    'total_columns': total_cols,
    'columns':       list(df.columns),
    'column_stats':  {c['name']: c for c in columns_profile},
    'quality_score': quality_score,
    'issues':        issues,
    'passed':        passed,
    'parquet_files': 1,
    'output_path':   output_s3_path,
    'profiled_at':   datetime.now(timezone.utc).isoformat(),
}
save_json(f"{res_prefix}/stats.json", stats)

# ── Save metadata.json ────────────────────────────────────────────────────────
metadata = {
    'run_id':        run_id,
    'dataset_name':  source_file.replace('.csv', '').replace('.tsv', '').replace('.txt', ''),
    'source_file':   source_file,
    's3_path':       output_s3_path,
    'total_rows':    total_rows,
    'total_columns': total_cols,
    'quality_score': quality_score,
    'ingested_at':   datetime.now(timezone.utc).isoformat(),
    'columns':       columns_profile,
    'registered':    False,
}
save_json(f"{res_prefix}/metadata.json", metadata)

# ── Save sample.json (first 20 rows) ──────────────────────────────────────────
sample_df = df.head(20)
save_json(f"{res_prefix}/sample.json", {
    'columns': list(sample_df.columns),
    'rows':    [{c: (str(v) if v is not None and str(v) != 'nan' else None)
                 for c, v in row.items()}
                for row in sample_df.to_dict('records')],
    'total_rows': total_rows,
})

# ── Fail the Glue job if quality below threshold ──────────────────────────────
# Step Functions catches this via the Catch block → QualityGateFailed state
if not passed:
    msg = f"Quality score {quality_score}% is below threshold {quality_threshold}% — {len(issues)} issue(s) found"
    print(f"[Profiler] QUALITY GATE FAILED: {msg}")
    raise Exception(msg)

print(f"[Profiler] ✓ Complete — results at s3://{res_bucket}/{res_prefix}/")
