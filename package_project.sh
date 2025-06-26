#!/bin/bash
# A self-extracting script to recreate the entire project.
# USAGE: bash package_project.sh

echo "--- Generating a text bundle of the project... ---"
echo "# This is a self-extracting bash script."
echo "# To unpack, run: bash <filename>"
echo "set -e"
echo "echo 'Unpacking project...'"
echo "mkdir -p extracted_project && cd extracted_project || exit"
echo

# Find directories and create them
find . -type d -not -path './.git*' -not -path '*__pycache__*' | while read -r dir; do
    if [ "$dir" != "." ]; then
        echo "mkdir -p \"${dir#./}\""
    fi
done

echo

# Find text files, check for binaries, and embed them using a 'heredoc'
find . -type f -not -path './.git/*' -not -path '*.pyc' -not -path './venv/*' -not -path './.venv/*' -not -path './.env' -not -path './node_modules/*' -not -path './dist/*' -not -path './build/*' | while read -r file; do
    # Simple binary check: if grep finds a null byte, consider it binary
    if ! grep -q -I . "$file"; then
        echo "# --- SKIPPING BINARY FILE: $file ---"
    else
        echo "echo 'Creating ${file#./}...'"
        echo "cat <<'EOF' > \"${file#./}\""
        cat "$file"
        echo "EOF"
        echo
    fi
done

echo "echo 'Project successfully unpacked into the extracted_project/ directory!'"
