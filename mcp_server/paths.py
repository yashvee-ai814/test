from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
STORE_DIR = ROOT / "store"
DB_PATH = STORE_DIR / "pricing_copilot.db"
CHROMA_DIR = STORE_DIR / "chroma"
