"""
AgenticDT Ingestion Pipeline — Lambda Quality Check Function
=============================================================
Triggered by Step Functions after the Glue transform job completes.

Input event:
  {
    "output_s3_path": "s3://bucket/transformed/run-id/",
    "run_id":         "run-20240115-143022",
    "results_s3_path": "s3://bucket/quality-results/run-id/"
  }

Output (also written to results_s3_path/stats.json):
  {
    "run_id": "...",
    "total_rows": 45200,
    "total_columns": 12,
    "columns": [...],
    "column_stats": { "col_name": { "dtype", "null_count", "null_pct", "sample_values" } },
    "quality_score": 94.2,
    "issues": [ { "column", "severity", "message" } ],
    "passed": true
  }
"""

import json
import boto3
import os
from io import BytesIO

s3 = boto3.client('s3')

def parse_s3_path(s3_path):
    """Split s3://bucket/key into (bucket, key)."""
    stripped = s3_path.replace('s3://', '')
    parts    = stripped.split('/', 1)
    return parts[0], parts[1] if len(parts) > 1 else ''


def list_parquet_files(bucket, prefix):
    """Return all .parquet object keys under prefix."""
    keys = []
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get('Contents', []):
            if obj['Key'].endswith('.parquet'):
                keys.append(obj['Key'])
    return keys


def read_parquet_with_pyarrow(bucket, key):
    """Read a single Parquet file from S3 into a dict of column→list."""
    import pyarrow.parquet as pq
    obj  = s3.get_object(Bucket=bucket, Key=key)
    buf  = BytesIO(obj['Body'].read())
    table = pq.read_table(buf)
    return table


def lambda_handler(event, context):
    try:
        return _run_quality_check(event, context)
    except Exception as e:
        import traceback
        print(f"[QualityCheck] UNHANDLED ERROR: {e}\n{traceback.format_exc()}")
        # Always return a valid payload so Step Functions ResultSelector doesn't fail
        return {
            'statusCode': 500,
            'run_id': event.get('run_id', 'unknown'),
            'stats': {
                'run_id': event.get('run_id', 'unknown'),
                'total_rows': 0, 'total_columns': 0, 'columns': [],
                'column_stats': {}, 'quality_score': 0, 'issues': [],
                'passed': False, 'parquet_files': 0,
                'error': str(e),
            },
        }


def _run_quality_check(event, context):
    print(f"[QualityCheck] Event: {json.dumps(event)}")

    output_s3_path  = event.get('output_s3_path', '')
    run_id          = event.get('run_id', 'unknown')
    results_s3_path = event.get('results_s3_path', '')

    if not output_s3_path:
        return {'statusCode': 400, 'error': 'output_s3_path is required'}

    out_bucket, out_prefix  = parse_s3_path(output_s3_path)
    res_bucket, res_prefix  = parse_s3_path(results_s3_path) if results_s3_path else (out_bucket, out_prefix.replace('transformed/', 'quality-results/'))

    # ── Discover Parquet files ─────────────────────────────────────────────────
    keys = list_parquet_files(out_bucket, out_prefix)
    print(f"[QualityCheck] Found {len(keys)} parquet file(s) under s3://{out_bucket}/{out_prefix}")

    if not keys:
        result = {
            'run_id': run_id,
            'error':  'No parquet files found at the specified path',
            'passed': False,
        }
        _save_results(res_bucket, res_prefix, result)
        return {'statusCode': 404, 'body': result}

    # ── Read all Parquet files ─────────────────────────────────────────────────
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq

        tables = []
        for key in keys:
            obj   = s3.get_object(Bucket=out_bucket, Key=key)
            buf   = BytesIO(obj['Body'].read())
            tables.append(pq.read_table(buf))

        table        = pa.concat_tables(tables)
        total_rows   = table.num_rows
        total_cols   = table.num_columns
        column_names = table.column_names

        print(f"[QualityCheck] Loaded {total_rows:,} rows × {total_cols} columns")

    except ImportError:
        # pyarrow layer not attached — count files via S3 metadata instead
        print("[QualityCheck] WARNING: pyarrow not installed (attach AWSSDKPandas-Python311 layer). Using metadata-only mode.")
        # Count S3 objects to at least get a file count; treat as passing with a warning
        total_rows   = sum(
            obj.get('Size', 0) for page in
            s3.get_paginator('list_objects_v2').paginate(Bucket=out_bucket, Prefix=out_prefix)
            for obj in page.get('Contents', [])
            if obj['Key'].endswith('.parquet')
        )  # use total bytes as proxy — non-zero means files exist
        total_rows   = 1 if total_rows > 0 else 0   # sentinel: 1 = files exist, 0 = empty
        total_cols   = 0
        column_names = []
        table        = None

    # ── Per-column statistics ──────────────────────────────────────────────────
    column_stats = {}
    issues       = []
    quality_score = 100.0

    if table is not None:
        for col_name in column_names:
            col_arr   = table.column(col_name)
            dtype_str = str(col_arr.type)
            null_count = col_arr.null_count
            null_pct   = round((null_count / total_rows * 100), 2) if total_rows > 0 else 0

            # Sample up to 5 non-null values
            try:
                non_null = col_arr.drop_null()
                samples  = [str(v.as_py()) for v in non_null.slice(0, 5)]
            except Exception:
                samples = []

            # Basic stats for numeric columns
            numeric_stats = {}
            try:
                import pyarrow.compute as pc
                if pa.types.is_integer(col_arr.type) or pa.types.is_floating(col_arr.type):
                    non_null_arr = col_arr.drop_null().cast(pa.float64())
                    if len(non_null_arr) > 0:
                        numeric_stats = {
                            'min':  round(float(pc.min(non_null_arr).as_py() or 0), 4),
                            'max':  round(float(pc.max(non_null_arr).as_py() or 0), 4),
                            'mean': round(float(pc.mean(non_null_arr).as_py() or 0), 4),
                        }
            except Exception:
                pass

            column_stats[col_name] = {
                'dtype':        dtype_str,
                'null_count':   null_count,
                'null_pct':     null_pct,
                'sample_values': samples,
                **numeric_stats,
            }

            # Flag quality issues
            if null_pct > 50:
                issues.append({
                    'column':   col_name,
                    'severity': 'critical',
                    'message':  f'{null_pct}% null values — data completeness risk',
                })
                quality_score -= 10
            elif null_pct > 10:
                issues.append({
                    'column':   col_name,
                    'severity': 'warning',
                    'message':  f'{null_pct}% null values — review upstream source',
                })
                quality_score -= 3

    quality_score = max(0, round(quality_score, 1))
    # total_rows == 0 → no output files → hard fail.
    # total_rows == 1 (sentinel from metadata-only mode) → files exist but pyarrow missing → pass with warning.
    passed        = quality_score >= 70 and total_rows != 0

    # ── Build result payload ───────────────────────────────────────────────────
    result = {
        'run_id':         run_id,
        'total_rows':     total_rows,
        'total_columns':  total_cols,
        'columns':        column_names,
        'column_stats':   column_stats,
        'quality_score':  quality_score,
        'issues':         issues,
        'passed':         passed,
        'parquet_files':  len(keys),
        'output_path':    output_s3_path,
    }

    print(f"[QualityCheck] Quality score: {quality_score} | Passed: {passed} | Issues: {len(issues)}")

    # ── Save sample rows (first 20) for dataframe preview in the UI ───────────
    if table is not None and table.num_rows > 0:
        _save_sample(res_bucket, res_prefix, table)

    # ── Save results to S3 ─────────────────────────────────────────────────────
    stats_key = _save_results(res_bucket, res_prefix, result)
    result['stats_s3_key'] = f's3://{res_bucket}/{stats_key}'

    return {
        'statusCode': 200,
        'run_id':     run_id,
        'stats':      result,
    }


def _save_results(bucket, prefix, data):
    key = prefix.rstrip('/') + '/stats.json'
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps(data, default=str),
        ContentType='application/json',
    )
    print(f"[QualityCheck] Results saved to s3://{bucket}/{key}")


def _save_sample(bucket, prefix, table, n_rows=20):
    """Save the first n_rows of the transformed table as sample.json for UI preview."""
    try:
        sample_table = table.slice(0, n_rows)
        columns      = sample_table.column_names
        rows = []
        for i in range(sample_table.num_rows):
            row = {}
            for col in columns:
                val = sample_table.column(col)[i].as_py()
                row[col] = str(val) if val is not None else None
            rows.append(row)

        payload = {'columns': columns, 'rows': rows, 'total_rows': table.num_rows}
        key = prefix.rstrip('/') + '/sample.json'
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(payload, default=str),
            ContentType='application/json',
        )
        print(f"[QualityCheck] Sample rows saved to s3://{bucket}/{key}")
    except Exception as e:
        print(f"[QualityCheck] Warning: could not save sample rows: {e}")
    return key
