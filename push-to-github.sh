#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# push-to-github.sh
# Run this script from the root of the repository to create a GitHub repo
# and push all code. Requires: git, gh CLI (brew install gh)
# ─────────────────────────────────────────────────────────────────────────────

set -e

REPO_NAME="agentic-data-platform"
VISIBILITY="private"   # change to "public" if desired
DESCRIPTION="Agentic Driven Data Platform — 4 pillars: Publishing, Pipelines, Semantic Engine, Data Quality"

echo "🔐  Checking GitHub authentication..."
if ! gh auth status &>/dev/null; then
  echo "➡  Not logged in. Running: gh auth login"
  gh auth login
fi

echo "📁  Initialising git repository..."
git init
git add .
git commit -m "feat: initial commit — AgenticDT platform (web + iOS SwiftUI)"

echo "🚀  Creating GitHub repository: $REPO_NAME ($VISIBILITY)..."
gh repo create "$REPO_NAME" \
  --"$VISIBILITY" \
  --description "$DESCRIPTION" \
  --source=. \
  --remote=origin \
  --push

echo ""
echo "✅  Done! Your repository is live at:"
gh repo view --web 2>/dev/null || echo "https://github.com/$(gh api user --jq .login)/$REPO_NAME"
echo ""
echo "📌  To invite team members:"
echo "    gh api repos/\$(gh api user --jq .login)/$REPO_NAME/collaborators/TEAMMATE_USERNAME -X PUT -f permission=push"
