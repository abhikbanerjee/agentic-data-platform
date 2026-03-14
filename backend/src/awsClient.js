/**
 * AWS SDK v3 client instances for AgenticDT.
 *
 * Credential resolution order (AWS SDK default chain — never expose keys to clients):
 *
 *  1. ~/.aws/credentials  +  ~/.aws/config  (profile selected by AWS_PROFILE env var)
 *  2. Explicit env vars   AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY  (CI / Docker)
 *  3. IAM Instance Profile / ECS Task Role / Lambda Execution Role   (production hosting)
 *
 * The web app and iOS app NEVER call AWS directly.
 * They call this backend only, which holds credentials server-side.
 */

'use strict';

const { GlueClient }             = require('@aws-sdk/client-glue');
const { SFNClient }              = require('@aws-sdk/client-sfn');
const { CloudWatchLogsClient }   = require('@aws-sdk/client-cloudwatch-logs');
const { EventBridgeClient }      = require('@aws-sdk/client-eventbridge');
const { CloudWatchClient }       = require('@aws-sdk/client-cloudwatch');
const { fromIni }                = require('@aws-sdk/credential-providers');

const profile = process.env.AWS_PROFILE || 'default';

// Derive region from: explicit AWS_REGION env var → region embedded in the
// SFN ARN (written by setup.sh) → fallback 'us-east-1'.
// Prevents "Expected ARN to be within region X" errors when resources
// were provisioned in a different region than the default.
function deriveRegion() {
  if (process.env.AWS_REGION) return process.env.AWS_REGION;
  const sfnArn = process.env.PIPELINE_SFN_ARN;
  if (sfnArn) {
    const parts = sfnArn.split(':');
    if (parts.length >= 4 && parts[3]) return parts[3];
  }
  return 'us-east-1';
}
const region = deriveRegion();

/**
 * Resolve credentials using this priority:
 *
 *   a) ~/.aws profile  (AWS_PROFILE env var or 'default')
 *      — safest for local dev and self-hosted servers
 *      — keys stay in ~/.aws/credentials, never in code or .env
 *
 *   b) Explicit env vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
 *      — useful in Docker / CI where ~/.aws isn't available
 *
 *   c) undefined  →  SDK falls back to instance profile / ECS task role
 *      — ideal for EC2, ECS, Lambda (no keys anywhere, role-based access)
 */
function buildCredentials() {
  // Explicit env vars take priority over profile (useful for Docker/CI)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
    };
  }

  // ~/.aws/credentials + ~/.aws/config  (profile-based, recommended)
  try {
    return fromIni({ profile });
  } catch {
    // No ~/.aws file — let SDK use instance/task role
    return undefined;
  }
}

const clientConfig = {
  region,
  credentials: buildCredentials(),
};

const glueClient  = new GlueClient(clientConfig);
const sfnClient   = new SFNClient(clientConfig);
const logsClient  = new CloudWatchLogsClient(clientConfig);
const ebClient    = new EventBridgeClient(clientConfig);
const cwClient    = new CloudWatchClient(clientConfig);

/**
 * Returns true when the backend appears to have AWS credentials available.
 * Used to show the "Connect AWS" card in the UI instead of an error.
 */
function isAwsConfigured() {
  // Explicit keys in env
  if (process.env.AWS_ACCESS_KEY_ID) return true;
  // Named profile requested
  if (process.env.AWS_PROFILE) return true;
  // ~/.aws/credentials with a default profile
  try {
    const fs   = require('fs');
    const path = require('path');
    const credsFile = path.join(process.env.HOME || process.env.USERPROFILE || '', '.aws', 'credentials');
    return fs.existsSync(credsFile);
  } catch {
    return false;
  }
}

module.exports = { glueClient, sfnClient, logsClient, ebClient, cwClient, region, isAwsConfigured };
