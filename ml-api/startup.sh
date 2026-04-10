#!/usr/bin/env bash
# Use bundled antenv so App Service does not rely on /opt/python (missing deps).
set -euo pipefail
cd "$(dirname "$0")"
exec ./antenv/bin/python -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
