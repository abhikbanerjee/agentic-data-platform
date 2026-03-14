"""
AgenticDT Ingestion Pipeline — AWS Glue PySpark ETL Job
========================================================
Steps performed by this single job:
  1. PARSE   — Read raw CSV from S3, infer schema, write Parquet to parsed/
  2. TRANSFORM — Read parsed Parquet, create a new derived column, write to transformed/

Job arguments (passed by Step Functions):
  --input_s3_path       s3://bucket/raw/run-id/file.csv
  --parsed_s3_path      s3://bucket/parsed/run-id/
  --output_s3_path      s3://bucket/transformed/run-id/
  --transform_column    name of the source column to derive from
  --new_column_name     name of the new derived column
  --run_id              unique identifier for this pipeline run
"""

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql import functions as F
from pyspark.sql.types import StringType
import json, time

# ── Bootstrap ─────────────────────────────────────────────────────────────────
args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'input_s3_path',
    'parsed_s3_path',
    'output_s3_path',
    'transform_column',
    'new_column_name',
    'run_id',
])

sc          = SparkContext()
glueContext = GlueContext(sc)
spark       = glueContext.spark_session
job         = Job(glueContext)
job.init(args['JOB_NAME'], args)

print(f"[AgenticDT] Run ID       : {args['run_id']}")
print(f"[AgenticDT] Input path   : {args['input_s3_path']}")
print(f"[AgenticDT] Parsed path  : {args['parsed_s3_path']}")
print(f"[AgenticDT] Output path  : {args['output_s3_path']}")
print(f"[AgenticDT] Transform col: {args['transform_column']}")
print(f"[AgenticDT] New col name : {args['new_column_name']}")

# ── STEP 1: PARSE ─────────────────────────────────────────────────────────────
print("\n[AgenticDT] === STEP 1: PARSE ===")
t0 = time.time()

df = (spark.read
      .option("header", "true")
      .option("inferSchema", "true")
      .option("multiLine", "true")
      .option("escape", '"')
      .csv(args['input_s3_path']))

row_count = df.count()
col_count = len(df.columns)
print(f"[AgenticDT] Parsed {row_count:,} rows × {col_count} columns")
print(f"[AgenticDT] Schema: {df.schema.simpleString()}")

# Write parsed Parquet (intermediate checkpoint)
df.write.mode("overwrite").parquet(args['parsed_s3_path'])
print(f"[AgenticDT] Parsed data written to {args['parsed_s3_path']} ({time.time()-t0:.1f}s)")

# ── STEP 2: TRANSFORM ─────────────────────────────────────────────────────────
print("\n[AgenticDT] === STEP 2: TRANSFORM ===")
t1 = time.time()

# Re-read from parsed Parquet to ensure clean types
df = spark.read.parquet(args['parsed_s3_path'])

src_col  = args['transform_column']
new_col  = args['new_column_name']

if src_col in df.columns:
    col_dtype = dict(df.dtypes).get(src_col, 'string')
    print(f"[AgenticDT] Transforming column '{src_col}' (type: {col_dtype}) → '{new_col}'")

    if col_dtype in ('string', 'varchar'):
        # String column: create UPPER + trimmed version and add char length
        df = (df
              .withColumn(new_col, F.upper(F.trim(F.col(src_col))))
              .withColumn(f"{new_col}_char_count", F.length(F.col(src_col))))

    elif col_dtype in ('int', 'bigint', 'long', 'integer'):
        # Numeric: bucket into Low / Medium / High bands
        df = df.withColumn(
            new_col,
            F.when(F.col(src_col) < 100,  F.lit("Low"))
             .when(F.col(src_col) < 1000, F.lit("Medium"))
             .otherwise(F.lit("High"))
        )

    elif col_dtype in ('double', 'float', 'decimal'):
        # Float: round to 2dp and add percentage of max
        max_val = df.agg(F.max(src_col)).collect()[0][0] or 1.0
        df = (df
              .withColumn(new_col, F.round(F.col(src_col), 2))
              .withColumn(f"{new_col}_pct_of_max",
                          F.round((F.col(src_col) / float(max_val)) * 100, 1)))

    else:
        # Fallback: cast to string and uppercase
        df = df.withColumn(new_col, F.upper(F.col(src_col).cast(StringType())))

else:
    print(f"[AgenticDT] WARNING: Column '{src_col}' not found. Available: {df.columns}")
    # Create a placeholder column so the job doesn't fail
    df = df.withColumn(new_col, F.lit("N/A — source column not found"))

print(f"[AgenticDT] Final schema after transform: {df.schema.simpleString()}")

# Write final transformed output
df.write.mode("overwrite").parquet(args['output_s3_path'])

final_rows = df.count()
print(f"[AgenticDT] Transformed {final_rows:,} rows written to {args['output_s3_path']} ({time.time()-t1:.1f}s)")
print(f"[AgenticDT] Total Glue job time: {time.time()-t0:.1f}s")

job.commit()
