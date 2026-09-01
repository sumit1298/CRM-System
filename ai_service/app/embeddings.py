import hashlib
import logging
import math
from typing import List

try:
    from openai import OpenAI
except Exception:  # pragma: no cover - fallback if dependency is absent
    OpenAI = None

try:
    from google import genai
except Exception:  # pragma: no cover - fallback when dependency is absent
    genai = None

from app.config import AI_PROVIDER, EMBEDDING_MODEL_NAME, GEMINI_API_KEY, OPENAI_API_KEY, OPENAI_EMBEDDING_MODEL

logger = logging.getLogger(__name__)


def _extract_embedding_values(result) -> List[float] | None:
    if isinstance(result, dict):
        values = result.get("embedding") or result.get("values")
        if isinstance(values, list) and values and all(isinstance(v, (int, float)) for v in values):
            return [float(v) for v in values]
        if isinstance(result.get("embeddings"), list) and result["embeddings"]:
            first = result["embeddings"][0]
            if isinstance(first, dict):
                values = first.get("values") or first.get("embedding") or first.get("embedding_values")
                if isinstance(values, list) and values and all(isinstance(v, (int, float)) for v in values):
                    return [float(v) for v in values]
        return None

    if hasattr(result, "embedding"):
        values = getattr(result, "embedding")
        if isinstance(values, list) and values and all(isinstance(v, (int, float)) for v in values):
            return [float(v) for v in values]

    if hasattr(result, "embeddings") and result.embeddings:
        first = result.embeddings[0]
        values = getattr(first, "values", None)
        if values is None:
            values = getattr(first, "embedding", None)
        if isinstance(values, list) and values and all(isinstance(v, (int, float)) for v in values):
            return [float(v) for v in values]

    return None


def _simple_embedding(text: str, dim: int = 128) -> List[float]:
    normalized = (text or '').strip().lower()
    if not normalized:
        return [0.0] * dim

    values: List[float] = []
    for i in range(dim):
        token = f"{normalized}:{i}"
        digest = hashlib.sha256(token.encode('utf-8')).hexdigest()
        numeric = int(digest[:8], 16) / 0xFFFFFFFF
        values.append(float(numeric * 2.0 - 1.0))

    norm = math.sqrt(sum(v * v for v in values))
    if norm == 0:
        return [0.0] * dim

    return [v / norm for v in values]


def embed_text(text: str, dim: int = 128) -> List[float]:
    if text is None:
        return [0.0] * dim

    if AI_PROVIDER == "openai" and OpenAI is not None and OPENAI_API_KEY:
        try:
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.embeddings.create(
                model=OPENAI_EMBEDDING_MODEL,
                input=text,
            )
            values = response.data[0].embedding if hasattr(response, "data") and response.data else None
            if isinstance(values, list) and values and all(isinstance(v, (int, float)) for v in values):
                return [float(v) for v in values]
        except Exception as exc:  # pragma: no cover - real API failed, fallback to local vector
            logger.warning("OpenAI embedding call failed, falling back to local embedding: %s", exc)

    if genai is not None and GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=GEMINI_API_KEY)
            result = client.models.embed_content(model=EMBEDDING_MODEL_NAME, contents=text)
            values = _extract_embedding_values(result)
            if values:
                return values
        except Exception as exc:  # pragma: no cover - real API failed, fallback to local vector
            logger.warning("Google embedding call failed, falling back to local embedding: %s", exc)

    return _simple_embedding(text, dim=dim)
