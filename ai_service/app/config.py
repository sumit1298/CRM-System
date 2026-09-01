import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(Path.cwd() / ".env")

AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))
AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").lower()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-2.0-flash")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "models/embedding-001")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

DEFAULT_TOP_K = int(os.getenv("AI_TOP_K", "5"))
SESSION_TTL = int(os.getenv("AI_SESSION_TTL", "120"))

ENABLE_LANGCHAIN = os.getenv("ENABLE_LANGCHAIN", "true").lower() == "true"
