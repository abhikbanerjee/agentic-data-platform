#!/usr/bin/env python3
"""
AgenticDT — Validate & Profile
================================
Standalone data validation + column profiling script.

Runs anywhere:
  • Local:   python validate_and_profile.py --run-id RUN123 --bucket my-bucket --region us-west-2
  • EC2:     same, add to cron or run via SSM Run Command
  • Lambda:  deploy as ZIP with pyarrow + pandas bundled (no layer needed)

Reads transformed Parquet files from S3, produces:
  stats.json    — quality scores, null analysis, row/col counts
  metadata.json — per-column catalog metadata (types, stats, descriptions)
  sample.json   — first 20 rows for UI preview

Install deps:
  pip install boto3 pyarrow pandas
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from io import BytesIO

import boto3

# ── S3 helpers ────────────────────────────────────────────────────────────────

def parse_s3_path(s3_path):
    stripped = s3_path.replace("s3://", "")
    parts = stripped.split("/", 1)
    return parts[0], parts[1] if len(parts) > 1 else ""


def list_parquet_files(s3, bucket, prefix):
    keys = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            if obj["Key"].endswith(".parquet"):
                keys.append(obj["Key"])
    return keys


def read_parquet(s3, bucket, key):
    import pyarrow.parquet as pq
    obj = s3.get_object(Bucket=bucket, Key=key)
    return pq.read_table(BytesIO(obj["Body"].read()))


def save_json(s3, bucket, key, data):
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps(data, default=str, indent=2),
        ContentType="application/json",
    )
    print(f"  ✓ Saved s3://{bucket}/{key}")


# ── Column profiling ──────────────────────────────────────────────────────────

def profile_column(col_arr, col_name):
    import pyarrow as pa
    import pyarrow.compute as pc

    dtype_str  = str(col_arr.type)
    total      = len(col_arr)
    null_count = col_arr.null_count
    null_pct   = round(null_count / total * 100, 2) if total > 0 else 0.0
    non_null   = col_arr.drop_null()

    # Unique count (capped at 10 000 for performance)
    try:
        unique_count = len(pc.unique(non_null)) if len(non_null) > 0 else 0
    except Exception:
        unique_count = -1

    # Sample values (up to 8 distinct, non-null)
    try:
        sample_vals = [str(v.as_py()) for v in pc.unique(non_null).slice(0, 8)]
    except Exception:
        sample_vals = []

    # Numeric stats
    num_stats = {}
    try:
        if pa.types.is_integer(col_arr.type) or pa.types.is_floating(col_arr.type):
            float_arr = non_null.cast(pa.float64())
            if len(float_arr) > 0:
                num_stats = {
                    "min":    round(float(pc.min(float_arr).as_py() or 0), 4),
                    "max":    round(float(pc.max(float_arr).as_py() or 0), 4),
                    "mean":   round(float(pc.mean(float_arr).as_py() or 0), 4),
                    "stddev": round(float(pc.stddev(float_arr).as_py() or 0), 4),
                }
    except Exception:
        pass

    # Top-value frequency for strings (up to 5)
    top_values = []
    try:
        if pa.types.is_string(col_arr.type) or pa.types.is_large_string(col_arr.type):
            vc = pc.value_counts(non_null)
            sorted_vc = sorted(
                [(str(item["values"].as_py()), int(item["counts"].as_py())) for item in vc.to_pylist()],
                key=lambda x: -x[1]
            )[:5]
            top_values = [{"value": v, "count": c} for v, c in sorted_vc]
    except Exception:
        pass

    # Infer semantic type hint
    semantic_type = _infer_semantic_type(col_name, dtype_str, sample_vals)

    return {
        "name":          col_name,
        "data_type":     dtype_str,
        "semantic_type": semantic_type,
        "nullable":      null_count > 0,
        "null_count":    null_count,
        "null_pct":      null_pct,
        "unique_count":  unique_count,
        "total_count":   total,
        "sample_values": sample_vals,
        "top_values":    top_values,
        **num_stats,
        # Editable fields — user fills these in the UI
        "description":   "",
        "tags":          _auto_tags(col_name, dtype_str, semantic_type),
        "pii_flag":      _is_likely_pii(col_name),
    }


def _infer_semantic_type(name, dtype, samples):
    n = name.lower()
    if any(k in n for k in ("email", "mail")):            return "email"
    if any(k in n for k in ("phone", "mobile", "tel")):   return "phone"
    if any(k in n for k in ("ssn", "social_sec")):        return "ssn"
    if any(k in n for k in ("zip", "postal", "postcode")): return "postal_code"
    if any(k in n for k in ("lat", "latitude")):          return "latitude"
    if any(k in n for k in ("lon", "lng", "longitude")):  return "longitude"
    if any(k in n for k in ("date", "_at", "_on", "time")): return "datetime"
    if any(k in n for k in ("id", "_key", "_code")):      return "identifier"
    if any(k in n for k in ("name", "first", "last", "customer")): return "name"
    if any(k in n for k in ("price", "amount", "revenue", "cost", "fee")): return "currency"
    if any(k in n for k in ("score", "rate", "pct", "percent", "ratio")): return "metric"
    if "int" in dtype or "float" in dtype or "double" in dtype: return "numeric"
    return "categorical" if dtype in ("string", "large_string") else "other"


def _is_likely_pii(name):
    n = name.lower()
    return any(k in n for k in (
        "name", "email", "phone", "address", "zip", "postal", "ssn",
        "dob", "birth", "passport", "national_id", "tax_id", "ip_address"
    ))


def _auto_tags(name, dtype, semantic_type):
    tags = []
    if semantic_type in ("email", "phone", "ssn", "name"): tags.append("PII")
    if semantic_type == "currency":   tags.append("financial")
    if semantic_type in ("latitude", "longitude"): tags.append("geo")
    if semantic_type == "datetime":   tags.append("temporal")
    if semantic_type == "identifier": tags.append("key")
    if semantic_type == "metric":     tags.append("kpi")
    return tags


# ── Quality scoring ───────────────────────────────────────────────────────────

def compute_quality(columns_profile, total_rows):
    score  = 100.0
    issues = []

    for col in columns_profile:
        np = col["null_pct"]
        if np > 50:
            score -= 10
            issues.append({"column": col["name"], "severity": "critical",
                            "message": f'{np}% null — data completeness risk'})
        elif np > 10:
            score -= 3
            issues.append({"column": col["name"], "severity": "warning",
                            "message": f'{np}% null — review upstream source'})

    return max(0.0, round(score, 1)), issues


# ── Main profiling logic ──────────────────────────────────────────────────────

def run(run_id, bucket, region, transform_prefix=None, results_prefix=None, source_file=None):
    print(f"\n[validate_and_profile] run_id={run_id}  bucket={bucket}  region={region}")

    s3 = boto3.client("s3", region_name=region)

    transformed_prefix = transform_prefix or f"transformed/{run_id}/"
    res_prefix         = results_prefix   or f"quality-results/{run_id}"

    # ── Discover Parquet files ─────────────────────────────────────────────────
    keys = list_parquet_files(s3, bucket, transformed_prefix)
    print(f"  Found {len(keys)} parquet file(s) under s3://{bucket}/{transformed_prefix}")

    if not keys:
        result = {"run_id": run_id, "error": "No parquet files found", "passed": False}
        save_json(s3, bucket, f"{res_prefix}/stats.json", result)
        print("  ✗ No parquet files — aborting")
        return result

    # ── Read & concat all Parquet files ───────────────────────────────────────
    try:
        import pyarrow as pa
        tables = [read_parquet(s3, bucket, k) for k in keys]
        table  = pa.concat_tables(tables)
        total_rows = table.num_rows
        total_cols = table.num_columns
        print(f"  Loaded {total_rows:,} rows × {total_cols} columns")
    except ImportError:
        print("  ✗ pyarrow not found.  Install with:  pip install pyarrow")
        sys.exit(1)

    # ── Profile every column ──────────────────────────────────────────────────
    columns_profile = []
    for col_name in table.column_names:
        print(f"    profiling {col_name} …", end="\r")
        columns_profile.append(profile_column(table.column(col_name), col_name))
    print(f"  Profiled {total_cols} columns          ")

    # ── Quality score ─────────────────────────────────────────────────────────
    quality_score, issues = compute_quality(columns_profile, total_rows)
    passed = quality_score >= 70

    # ── stats.json (quality report) ───────────────────────────────────────────
    stats = {
        "run_id":        run_id,
        "total_rows":    total_rows,
        "total_columns": total_cols,
        "columns":       table.column_names,
        "column_stats":  {c["name"]: c for c in columns_profile},
        "quality_score": quality_score,
        "issues":        issues,
        "passed":        passed,
        "parquet_files": len(keys),
        "output_path":   f"s3://{bucket}/{transformed_prefix}",
        "profiled_at":   datetime.now(timezone.utc).isoformat(),
    }
    save_json(s3, bucket, f"{res_prefix}/stats.json", stats)

    # ── metadata.json (catalog metadata) ──────────────────────────────────────
    metadata = {
        "run_id":        run_id,
        "dataset_name":  (source_file or run_id).replace(".csv", "").replace(".tsv", ""),
        "source_file":   source_file or "unknown",
        "s3_path":       f"s3://{bucket}/{transformed_prefix}",
        "total_rows":    total_rows,
        "total_columns": total_cols,
        "quality_score": quality_score,
        "ingested_at":   datetime.now(timezone.utc).isoformat(),
        "columns":       columns_profile,
        "registered":    False,
    }
    save_json(s3, bucket, f"{res_prefix}/metadata.json", metadata)

    # ── sample.json (first 20 rows for UI preview) ────────────────────────────
    sample_table = table.slice(0, 20)
    rows = []
    for i in range(sample_table.num_rows):
        row = {}
        for col in sample_table.column_names:
            val = sample_table.column(col)[i].as_py()
            row[col] = str(val) if val is not None else None
        rows.append(row)
    save_json(s3, bucket, f"{res_prefix}/sample.json",
              {"columns": sample_table.column_names, "rows": rows, "total_rows": total_rows})

    print(f"\n[validate_and_profile] Quality: {quality_score}% | Passed: {passed} | Issues: {len(issues)}")
    print(f"  Results at: s3://{bucket}/{res_prefix}/")
    return stats


# ── Lambda entry point ────────────────────────────────────────────────────────

def lambda_handler(event, context):
    """
    AWS Lambda entry point — called directly by Step Functions.

    Accepts two event formats:
      1. Step Functions format (s3:// paths):
         { "run_id": "...", "output_s3_path": "s3://bucket/transformed/run-id/",
           "results_s3_path": "s3://bucket/quality-results/run-id/",
           "source_file": "mydata.csv" }

      2. Direct invocation format:
         { "run_id": "...", "bucket": "...", "region": "us-west-2",
           "transform_prefix": "transformed/run-id/",
           "results_prefix":   "quality-results/run-id",
           "source_file":      "mydata.csv" }

    Raises an exception on quality failure so Step Functions Catch block
    routes to QualityGateFailed. Errors also propagate for the same reason.
    """
    import traceback

    run_id = event["run_id"]
    region = event.get("region") or os.environ.get("AWS_DEFAULT_REGION") or os.environ.get("AWS_REGION", "us-east-1")

    # Resolve bucket + prefixes from either format
    if "bucket" in event:
        bucket           = event["bucket"]
        transform_prefix = event.get("transform_prefix")
        results_prefix   = event.get("results_prefix")
    else:
        output_s3  = event.get("output_s3_path", "")
        results_s3 = event.get("results_s3_path", "")
        if not output_s3:
            raise ValueError(f"Event must contain 'bucket' or 'output_s3_path'. Got: {list(event.keys())}")
        bucket, transform_prefix = parse_s3_path(output_s3)
        _, results_prefix        = parse_s3_path(results_s3)
        results_prefix           = results_prefix.rstrip("/")

    source_file = event.get("source_file")

    print(f"[lambda] run_id={run_id}  bucket={bucket}  region={region}")
    print(f"[lambda] transform_prefix={transform_prefix}  results_prefix={results_prefix}")

    # Run the full profiling — let any exception propagate to Step Functions
    result = run(run_id, bucket, region, transform_prefix, results_prefix, source_file)

    # Raise on quality failure — Step Functions Catch block routes to QualityGateFailed
    if not result.get("passed"):
        score = result.get("quality_score", 0)
        raise Exception(f"QualityGateFailed: data quality score {score}% is below the 70% threshold. "
                        f"Check quality-results/{run_id}/stats.json in S3 for details.")

    return {
        "statusCode":    200,
        "run_id":        run_id,
        "passed":        True,
        "quality_score": result.get("quality_score"),
    }


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgenticDT — validate and profile transformed data")
    parser.add_argument("--run-id",           required=True,  help="Pipeline run ID (e.g. run-20240115-143022)")
    parser.add_argument("--bucket",           required=True,  help="S3 bucket name")
    parser.add_argument("--region",           default=os.environ.get("AWS_REGION", "us-east-1"))
    parser.add_argument("--transform-prefix", default=None,   help="S3 prefix of transformed Parquet (default: transformed/{run_id}/)")
    parser.add_argument("--results-prefix",   default=None,   help="S3 prefix for output JSON (default: quality-results/{run_id})")
    parser.add_argument("--source-file",      default=None,   help="Original source filename (for catalog metadata)")
    args = parser.parse_args()

    result = run(
        run_id           = args.run_id,
        bucket           = args.bucket,
        region           = args.region,
        transform_prefix = args.transform_prefix,
        results_prefix   = args.results_prefix,
        source_file      = args.source_file,
    )
    sys.exit(0 if result.get("passed") else 1)
