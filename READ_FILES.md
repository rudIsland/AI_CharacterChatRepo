# READ_FILES

## Purpose
Keep scans focused by excluding unnecessary files while preserving essential policy files.

## Always Read
- `.gitignore`
- `.ignore`
- `READ_FILES.md`
- `AGENTS.md` (if present)

## Default Exclude Targets
- Generated outputs: `node_modules`, `.next`, `dist`, `build`, `coverage`
- Python caches/venv: `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, `.venv`, `venv`
- Runtime files: `*.log`, `*.db`, `*.sqlite3`, `tmp`, `temp`
- Secret env files: `.env`, `.env.*` (except `.env.example`)