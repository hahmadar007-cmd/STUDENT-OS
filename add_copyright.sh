#!/bin/bash

# Copyright Header Injector for STUDENT-OS
# Author: hahmadar007-cmd
# Run this once to protect all source files

HEADER_TS="// Copyright (c) 2025 hahmadar007-cmd. All Rights Reserved.
// STUDENT-OS — Proprietary Software. Unauthorized use is strictly prohibited.
// See LICENSE file for full terms and legal penalties.
"

HEADER_CSS="/* Copyright (c) 2025 hahmadar007-cmd. All Rights Reserved.
 * STUDENT-OS — Proprietary Software. Unauthorized use is strictly prohibited.
 * See LICENSE file for full terms and legal penalties.
 */
"

add_header() {
  local file="$1"
  local header="$2"
  # Only add if header not already present
  if ! grep -q "Copyright (c) 2025 hahmadar007-cmd" "$file"; then
    echo "$header" | cat - "$file" > /tmp/tmpfile && mv /tmp/tmpfile "$file"
    echo "✅ Protected: $file"
  else
    echo "⏭️  Already protected: $file"
  fi
}

# Find and protect all TS/TSX files
while IFS= read -r -d '' file; do
  add_header "$file" "$HEADER_TS"
done < <(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v ".git" | tr '\n' '\0')

# Find and protect all CSS files
while IFS= read -r -d '' file; do
  add_header "$file" "$HEADER_CSS"
done < <(find . -name "*.css" | grep -v node_modules | grep -v ".git" | tr '\n' '\0')

echo ""
echo "🔒 STUDENT-OS is now protected with copyright headers!"
echo "📄 See LICENSE and NOTICE files for full legal terms."
