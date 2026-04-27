#!/bin/bash

PATCH_FILE=".continue/last_diff.patch"
REVIEW_FILE=".continue/last_review.txt"
COMMIT_MSG_FILE=".continue/commit_msg.txt"
MODEL="qwen2.5-coder:14b"

mkdir -p .continue

echo "📋 Reading diff from clipboard..."
pbpaste > "$PATCH_FILE"

if [ ! -s "$PATCH_FILE" ]; then
  echo "❌ Clipboard empty or invalid"
  exit 1
fi

echo "🔍 Validating diff..."
if ! grep -q "^--- " "$PATCH_FILE"; then
  echo "❌ Not a valid unified diff"
  exit 1
fi

# -------------------------
# 🤖 REVIEW STEP
# -------------------------

echo "🤖 Running Reviewer Mode..."

REVIEW_PROMPT=$(cat <<EOF
You are operating in REVIEWER MODE.

Review this diff:

$(cat "$PATCH_FILE")

Return STRICT format:

Summary: Safe | Risky | Broken

Issues:
- ...

If unsure, mark as Risky.
EOF
)

ollama run $MODEL "$REVIEW_PROMPT" > "$REVIEW_FILE"

echo ""
echo "🧠 REVIEW RESULT:"
echo "----------------------"
cat "$REVIEW_FILE"
echo "----------------------"

# Auto-reject broken
if grep -q "Summary: Broken" "$REVIEW_FILE"; then
  echo "❌ Patch marked as BROKEN. Auto-rejected."
  exit 1
fi

if grep -E "undefined|null|AsyncStorage" "$PATCH_FILE"; then
  echo "❌ Suspicious patterns detected. Auto-rejected."
  exit 1
fi

# -------------------------
# 📊 SHOW DIFF
# -------------------------

echo ""
git --no-pager diff --no-index /dev/null "$PATCH_FILE"

# -------------------------
# 🤖 COMMIT MESSAGE GENERATION
# -------------------------

echo ""
echo "✍️ Generating commit message..."

COMMIT_PROMPT=$(cat <<EOF
Generate a concise git commit message for this diff.

Rules:
- Use conventional commits style (feat:, fix:, refactor:, etc.)
- Max 1 short title line + optional 1-2 bullet points
- Be specific to SafeBuddy context
- No fluff

Diff:
$(cat "$PATCH_FILE")
EOF
)

ollama run $MODEL "$COMMIT_PROMPT" > "$COMMIT_MSG_FILE"

echo ""
echo "📝 Suggested commit message:"
echo "----------------------"
cat "$COMMIT_MSG_FILE"
echo "----------------------"

# Allow edit
echo ""
read -p "Edit commit message? (y/n): " edit_msg

if [[ "$edit_msg" == "y" ]]; then
  ${EDITOR:-nano} "$COMMIT_MSG_FILE"
fi

# -------------------------
# 🟡 CONFIRM APPLY
# -------------------------

echo ""
if grep -q "Summary: Risky" "$REVIEW_FILE"; then
  read -p "⚠️ Patch is RISKY. Apply anyway? (y/n): " confirm
else
  read -p "Apply this patch? (y/n): " confirm
fi

if [[ "$confirm" != "y" ]]; then
  echo "❌ Cancelled"
  exit 0
fi

# -------------------------
# 💾 BACKUP
# -------------------------

echo "💾 Creating backup..."
git stash push -k -m "pre-ai-patch"

# -------------------------
# ⚙️ APPLY PATCH
# -------------------------

echo "⚙️ Applying patch..."
git apply "$PATCH_FILE"

if [ $? -ne 0 ]; then
  echo "❌ Patch failed"
  exit 1
fi

# -------------------------
# ✅ COMMIT
# -------------------------

echo "📦 Creating commit..."
git add -A
git commit -F "$COMMIT_MSG_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Commit created successfully"
else
  echo "❌ Commit failed"
fi