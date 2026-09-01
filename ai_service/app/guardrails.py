from __future__ import annotations

import re


DANGEROUS_PATTERNS = [
    r"(?i)ignore previous instructions",
    r"(?i)system prompt",
    r"(?i)you are now",
    r"(?i)developer mode",
    r"(?i)jailbreak",
]


def sanitize_prompt(text: str, max_chars: int = 5000) -> str:
    if not isinstance(text, str):
        return ""

    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = cleaned[:max_chars]

    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, cleaned):
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

    return cleaned.strip()


def validate_answer(answer: str, max_chars: int = 3000) -> str:
    if not isinstance(answer, str):
        return "I could not generate a valid CRM answer from the available context."

    cleaned = re.sub(r"\s+", " ", answer).strip()
    if not cleaned:
        return "I could not generate a valid CRM answer from the available context."

    if len(cleaned) > max_chars:
        cleaned = cleaned[: max_chars - 3].rstrip() + "..."

    return cleaned


def guardrail_check(question: str, answer: str, context: str | None = None) -> dict[str, float | bool]:
    safe_question = sanitize_prompt(question)
    safe_answer = validate_answer(answer)

    has_context = bool(context and context.strip())
    question_ok = len(safe_question) > 0 and len(safe_question) <= 5000
    answer_ok = len(safe_answer) > 0 and len(safe_answer) <= 3000

    risk_score = 0.0
    if not question_ok:
        risk_score += 0.4
    if not answer_ok:
        risk_score += 0.4
    if has_context is False:
        risk_score += 0.2

    score = max(0.0, 1.0 - risk_score)

    return {
        "pass": score >= 0.6,
        "safety_score": round(score, 3),
        "has_context": has_context,
        "question_ok": question_ok,
        "answer_ok": answer_ok,
    }
