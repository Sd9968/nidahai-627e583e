"""Check voice-agent Python syntax without importing services or writing caches."""
import ast
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "clinic"
files = sorted((root / "bot").glob("*.py")) + sorted((root / "scripts").glob("*.py"))
for path in files:
    ast.parse(path.read_text(), filename=str(path))
print(f"Python syntax OK: {len(files)} files")
