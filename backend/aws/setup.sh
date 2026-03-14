#!/usr/bin/env bash
# =============================================================================
# AgenticDT Ingestion Pipeline — One-time AWS Infrastructure Setup
# =============================================================================
# Run this ONCE from the backend/aws/ directory:
#   chmod +x setup.sh && ./setup.sh
#
# Prerequisites:
#   - AWS CLI configured (aws configure, or profile set in ~/.aws)
#   - Sufficient IAM permissions to create roles, S3, Glue, Lambda, SFN
# =============================================================================

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="agenticdt-pipeline-${ACCOUNT}"
GLUE_ROLE="agenticdt-glue-role"
LAMBDA_ROLE="agenticdt-lambda-role"
SFN_ROLE="agenticdt-sfn-role"
GLUE_JOB="agenticdt-etl-pipeline"
PROFILER_LAMBDA="agenticdt-quality-profiler"
LAMBDA_FN="agenticdt-quality-check"
SFN_NAME="agenticdt-ingestion-pipeline"

echo ""
echo "=========================================="
echo " AgenticDT Pipeline Infrastructure Setup"
echo "=========================================="
echo " Account : $ACCOUNT"
echo " Region  : $REGION"
echo " S3      : s3://$BUCKET"
echo "=========================================="
echo ""

# ── 1. S3 Bucket ──────────────────────────────────────────────────────────────
echo "▶ Step 1/7 — Creating S3 bucket: $BUCKET"

if aws s3 ls "s3://$BUCKET" 2>/dev/null; then
  echo "  ✓ Bucket already exists, skipping"
else
  aws s3 mb "s3://$BUCKET" --region "$REGION"
  aws s3api put-bucket-versioning \
    --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled
  # Block all public access
  aws s3api put-public-access-block \
    --bucket "$BUCKET" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
  echo "  ✓ Bucket created with versioning + public access blocked"
fi

# Create folder structure via empty marker objects
for prefix in raw parsed transformed quality-results scripts; do
  aws s3api put-object --bucket "$BUCKET" --key "${prefix}/.keep" --body /dev/null 2>/dev/null || true
done
echo "  ✓ S3 folder structure created (raw/ parsed/ transformed/ quality-results/ scripts/)"

# ── 2. Upload Glue script ─────────────────────────────────────────────────────
echo ""
echo "▶ Step 2/7 — Uploading Glue ETL script to S3"
aws s3 cp glue_etl.py "s3://$BUCKET/scripts/glue_etl.py"
echo "  ✓ s3://$BUCKET/scripts/glue_etl.py"

# ── 3. IAM Role for Glue ─────────────────────────────────────────────────────
echo ""
echo "▶ Step 3/7 — Creating IAM roles"

GLUE_TRUST='{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"glue.amazonaws.com"},"Action":"sts:AssumeRole"}]
}'
LAMBDA_TRUST='{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]
}'
SFN_TRUST='{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"states.amazonaws.com"},"Action":"sts:AssumeRole"}]
}'

S3_POLICY="{
  \"Version\":\"2012-10-17\",
  \"Statement\":[{
    \"Effect\":\"Allow\",
    \"Action\":[\"s3:GetObject\",\"s3:PutObject\",\"s3:DeleteObject\",\"s3:ListBucket\"],
    \"Resource\":[\"arn:aws:s3:::${BUCKET}\",\"arn:aws:s3:::${BUCKET}/*\"]
  }]
}"

SFN_POLICY="{
  \"Version\":\"2012-10-17\",
  \"Statement\":[
    {\"Effect\":\"Allow\",\"Action\":[\"glue:StartJobRun\",\"glue:GetJobRun\",\"glue:GetJobRuns\",\"glue:BatchStopJobRun\"],\"Resource\":\"*\"},
    {\"Effect\":\"Allow\",\"Action\":[\"lambda:InvokeFunction\"],\"Resource\":[\"arn:aws:lambda:${REGION}:${ACCOUNT}:function:${LAMBDA_FN}\",\"arn:aws:lambda:${REGION}:${ACCOUNT}:function:${PROFILER_LAMBDA}\"]},
    {\"Effect\":\"Allow\",\"Action\":[\"logs:CreateLogGroup\",\"logs:CreateLogDelivery\",\"logs:PutLogEvents\",\"logs:GetLogDelivery\",\"logs:UpdateLogDelivery\",\"logs:DeleteLogDelivery\",\"logs:ListLogDeliveries\",\"logs:PutResourcePolicy\",\"logs:DescribeResourcePolicies\",\"logs:DescribeLogGroups\"],\"Resource\":\"*\"},
    {\"Effect\":\"Allow\",\"Action\":[\"xray:PutTraceSegments\",\"xray:PutTelemetryRecords\",\"xray:GetSamplingRules\",\"xray:GetSamplingTargets\"],\"Resource\":\"*\"}
  ]
}"

create_role_if_missing() {
  local role=$1 trust=$2
  if aws iam get-role --role-name "$role" 2>/dev/null; then
    echo "  ✓ Role $role already exists"
  else
    aws iam create-role --role-name "$role" \
      --assume-role-policy-document "$trust" \
      --description "AgenticDT pipeline role" >/dev/null
    echo "  ✓ Created role: $role"
  fi
}

create_role_if_missing "$GLUE_ROLE"   "$GLUE_TRUST"
create_role_if_missing "$LAMBDA_ROLE" "$LAMBDA_TRUST"
create_role_if_missing "$SFN_ROLE"    "$SFN_TRUST"

# Attach managed policies
aws iam attach-role-policy --role-name "$GLUE_ROLE" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole 2>/dev/null || true
aws iam attach-role-policy --role-name "$LAMBDA_ROLE" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true

# Inline S3 access policies
aws iam put-role-policy --role-name "$GLUE_ROLE"   --policy-name "S3PipelineAccess" --policy-document "$S3_POLICY"
aws iam put-role-policy --role-name "$LAMBDA_ROLE" --policy-name "S3PipelineAccess" --policy-document "$S3_POLICY"
aws iam put-role-policy --role-name "$SFN_ROLE"    --policy-name "SFNOrchestration"  --policy-document "$SFN_POLICY"

echo "  ✓ IAM roles + policies configured"

# ── 4. Glue Job ───────────────────────────────────────────────────────────────
echo ""
echo "▶ Step 4/7 — Creating Glue job: $GLUE_JOB"
GLUE_ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${GLUE_ROLE}"

GLUE_DEFAULT_ARGS="{
  \"--job-language\":\"python\",
  \"--TempDir\":\"s3://${BUCKET}/tmp/\",
  \"--enable-metrics\":\"\",
  \"--enable-continuous-cloudwatch-log\":\"true\",
  \"--continuous-log-logGroup\":\"/aws-glue/jobs/output\",
  \"--enable-job-insights\":\"true\"
}"

if aws glue get-job --job-name "$GLUE_JOB" --region "$REGION" >/dev/null 2>&1; then
  echo "  ✓ Glue job already exists, updating role + script + default-arguments"
  # NOTE: --job-update must use JSON (not CLI shorthand) because DefaultArguments
  # keys start with "--" which the AWS CLI shorthand parser cannot handle correctly.
  GLUE_JOB_UPDATE="{
    \"Role\": \"${GLUE_ROLE_ARN}\",
    \"Command\": {
      \"Name\": \"glueetl\",
      \"ScriptLocation\": \"s3://${BUCKET}/scripts/glue_etl.py\",
      \"PythonVersion\": \"3\"
    },
    \"DefaultArguments\": {
      \"--job-language\": \"python\",
      \"--TempDir\": \"s3://${BUCKET}/tmp/\",
      \"--enable-metrics\": \"\",
      \"--enable-continuous-cloudwatch-log\": \"true\",
      \"--continuous-log-logGroup\": \"/aws-glue/jobs/output\",
      \"--enable-job-insights\": \"true\"
    },
    \"GlueVersion\": \"4.0\",
    \"NumberOfWorkers\": 2,
    \"WorkerType\": \"G.1X\",
    \"Timeout\": 60
  }"
  aws glue update-job --job-name "$GLUE_JOB" \
    --job-update "$GLUE_JOB_UPDATE" \
    --region "$REGION" >/dev/null
  echo "  ✓ Glue ETL job updated"
else
  aws glue create-job \
    --name "$GLUE_JOB" \
    --role "$GLUE_ROLE_ARN" \
    --command "Name=glueetl,ScriptLocation=s3://${BUCKET}/scripts/glue_etl.py,PythonVersion=3" \
    --default-arguments "$GLUE_DEFAULT_ARGS" \
    --glue-version "4.0" \
    --number-of-workers 2 \
    --worker-type "G.1X" \
    --timeout 60 \
    --region "$REGION" \
    --description "AgenticDT ETL: CSV parse + column transform" >/dev/null
  echo "  ✓ Glue ETL job created (2 × G.1X workers, Glue 4.0 / Spark 3.3)"
fi

# ── 5. Lambda Quality Profiler — bundled deps (no layers needed) ──────────────
echo ""
echo "▶ Step 5/7 — Deploying Lambda quality profiler: $PROFILER_LAMBDA"
LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${LAMBDA_ROLE}"

# Build a self-contained ZIP by pip-installing deps into a temp dir
PKG_DIR=$(mktemp -d)
ZIP_FILE="/tmp/profiler_lambda.zip"
echo "  Building package (pip install pyarrow pandas → $PKG_DIR)…"
# IMPORTANT: must use --platform manylinux2014_x86_64 so pip downloads the
# Linux x86_64 binary wheels rather than the developer's OS wheels (macOS/Windows).
# Lambda runs on Amazon Linux 2 — mismatched wheels cause silent ImportError.
pip install pyarrow pandas --target "$PKG_DIR" --quiet --no-cache-dir \
  --platform manylinux2014_x86_64 \
  --python-version 3.11 --only-binary=:all: 2>&1 | tail -2
cp validate_and_profile.py "$PKG_DIR/"
rm -f "$ZIP_FILE"
(cd "$PKG_DIR" && zip -r "$ZIP_FILE" . \
  --exclude "**/__pycache__/*" "*.pyc" "*.dist-info/*" "*.pth" >/dev/null)
rm -rf "$PKG_DIR"

# Upload ZIP to S3 (Lambda supports S3 source for large packages)
aws s3 cp "$ZIP_FILE" "s3://${BUCKET}/lambda/profiler_lambda.zip" \
  --region "$REGION" >/dev/null
echo "  ✓ Package uploaded to s3://${BUCKET}/lambda/profiler_lambda.zip"

EXISTING_FN=$(aws lambda get-function --function-name "$PROFILER_LAMBDA" \
  --region "$REGION" --query 'Configuration.FunctionName' --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_FN" ] && [ "$EXISTING_FN" != "None" ]; then
  echo "  ✓ Lambda exists, updating code"
  aws lambda update-function-code \
    --function-name "$PROFILER_LAMBDA" \
    --s3-bucket "$BUCKET" \
    --s3-key "lambda/profiler_lambda.zip" \
    --region "$REGION" >/dev/null
  # Wait for update to complete before updating config
  aws lambda wait function-updated \
    --function-name "$PROFILER_LAMBDA" --region "$REGION" 2>/dev/null || true
else
  aws lambda create-function \
    --function-name "$PROFILER_LAMBDA" \
    --runtime "python3.11" \
    --handler "validate_and_profile.lambda_handler" \
    --code "S3Bucket=${BUCKET},S3Key=lambda/profiler_lambda.zip" \
    --role "$LAMBDA_ROLE_ARN" \
    --timeout 300 \
    --memory-size 1024 \
    --description "AgenticDT quality profiler — pyarrow+pandas bundled, no layers needed" \
    --region "$REGION" >/dev/null
  echo "  ✓ Lambda function created (python3.11, 1GB, 5 min timeout)"
fi
rm -f "$ZIP_FILE"

# ── 6. Step Functions State Machine ──────────────────────────────────────────
echo ""
echo "▶ Step 6/7 — Creating Step Functions state machine: $SFN_NAME"
SFN_ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${SFN_ROLE}"
# Use file:// to avoid shell variable substitution breaking multi-line JSON
SFN_DEF_FILE="$(pwd)/step-functions.json"

EXISTING_SFN=$(aws stepfunctions list-state-machines --region "$REGION" --query \
  "stateMachines[?name=='${SFN_NAME}'].stateMachineArn" --output text 2>/dev/null)

if [ -n "$EXISTING_SFN" ]; then
  echo "  ✓ State machine exists, updating definition"
  aws stepfunctions update-state-machine \
    --state-machine-arn "$EXISTING_SFN" \
    --definition "file://${SFN_DEF_FILE}" \
    --region "$REGION" >/dev/null
  SFN_ARN="$EXISTING_SFN"
else
  SFN_ARN=$(aws stepfunctions create-state-machine \
    --name "$SFN_NAME" \
    --definition "file://${SFN_DEF_FILE}" \
    --role-arn "$SFN_ROLE_ARN" \
    --type STANDARD \
    --region "$REGION" \
    --query stateMachineArn --output text)
  echo "  ✓ State machine created: $SFN_ARN"
fi

# ── 7. Write environment config to backend/.env ───────────────────────────────
echo ""
echo "▶ Step 7/7 — Writing pipeline config to backend/.env"
ENV_FILE="$(dirname "$0")/../.env"

# Append only if keys don't already exist
add_env_var() {
  local key=$1 val=$2
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
    echo "  Updated $key"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
    echo "  Added   $key"
  fi
}

add_env_var "PIPELINE_S3_BUCKET"        "$BUCKET"
add_env_var "PIPELINE_SFN_ARN"          "$SFN_ARN"
add_env_var "PIPELINE_GLUE_JOB"         "$GLUE_JOB"
add_env_var "PIPELINE_PROFILER_LAMBDA"  "$PROFILER_LAMBDA"
add_env_var "PIPELINE_LAMBDA_FN"        "$LAMBDA_FN"

echo ""
echo "=========================================="
echo " ✅ Setup complete!"
echo "=========================================="
echo " S3 Bucket   : s3://$BUCKET"
echo " Glue Job    : $GLUE_JOB"
echo " Lambda      : $LAMBDA_FN"
echo " State Machine: $SFN_ARN"
echo ""
echo " Next: restart the backend and open the Ingestion Hub"
echo "   cd backend && node index.js"
echo "=========================================="
