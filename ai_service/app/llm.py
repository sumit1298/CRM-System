import logging

try:
    from openai import OpenAI
except Exception:  # pragma: no cover - fallback if dependency is absent
    OpenAI = None

try:
    from google import genai
except Exception:  # pragma: no cover - fallback if dependency is absent
    genai = None

from app.config import AI_PROVIDER, GEMINI_API_KEY, MODEL_NAME, OPENAI_API_KEY, OPENAI_MODEL

logger = logging.getLogger(__name__)

if not OPENAI_API_KEY and not GEMINI_API_KEY:
    logger.warning("No AI API key is configured. Set OPENAI_API_KEY or GEMINI_API_KEY before using the AI service.")

llm = None
openai_client = None
if AI_PROVIDER == "openai":
    if OpenAI is not None and OPENAI_API_KEY:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        llm = openai_client
    elif genai is not None and GEMINI_API_KEY:
        try:
            llm = genai.Client(api_key=GEMINI_API_KEY)
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.warning("Gemini client initialization failed: %s", exc)
            llm = None
else:
    if genai is not None and GEMINI_API_KEY:
        try:
            llm = genai.Client(api_key=GEMINI_API_KEY)
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.warning("Gemini client initialization failed: %s", exc)
            llm = None


def generate_text(prompt: str) -> str:
    if llm is None:
        return "AI not configured. Set OPENAI_API_KEY or GEMINI_API_KEY in the AI service environment."

    try:
        if openai_client is not None:
            response = openai_client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            return response.choices[0].message.content or ""

        if hasattr(llm, "models"):
            response = llm.models.generate_content(model=MODEL_NAME, contents=prompt)
            text = getattr(response, "text", None)
            if text is not None:
                return str(text)
            if hasattr(response, "candidates") and response.candidates:
                first = response.candidates[0]
                if hasattr(first, "content") and hasattr(first.content, "parts"):
                    return "".join(part.text for part in first.content.parts if hasattr(part, "text"))
            if isinstance(response, dict):
                return str(response.get("text") or response.get("content") or "")
        return "AI generation failed."
    except Exception as exc:  # pragma: no cover - API failure path
        logger.warning("AI generation failed: %s", exc)
        return f"AI generation failed: {exc}"
