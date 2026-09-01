from __future__ import annotations

import json
from typing import Any

from app.prompts import CRM_SYSTEM_PROMPT, build_crm_prompt
from app.structured_outputs import CRMStructuredAnswer, parse_structured_json


class CRMOrchestrator:
    def __init__(self, llm_client):
        self.llm_client = llm_client

    def generate_structured_answer(self, question: str, context: str, history: list[dict[str, str]] | None = None) -> dict[str, Any]:
        history_text = ""
        if history:
            recent_history = history[-6:]
            history_text = "Previous conversation:\n" + "\n".join(
                f"{item.get('role', 'user')}: {item.get('content', '')}" for item in recent_history
            ) + "\n\n"

        prompt = (
            f"{CRM_SYSTEM_PROMPT}\n\n"
            f"{history_text}"
            f"Context:\n{context}\n\nUser question:\n{question}\n\n"
            "Return valid JSON only with keys direct_answer, supporting_evidence, recommended_next_action, answered_from_context, confidence."
        )

        raw = self.llm_client.generate_content(prompt) if hasattr(self.llm_client, 'generate_content') else str(self.llm_client(prompt))
        text = getattr(raw, 'text', str(raw))
        payload = parse_structured_json(text, question)

        try:
            return CRMStructuredAnswer(**payload).model_dump()
        except Exception:
            return payload

    def generate_summary(self, data: str) -> dict[str, Any]:
        prompt = (
            "You are a sales strategist. Summarize the lead or deal in a crisp professional way.\n\n"
            f"Lead or deal data:\n{data}\n\n"
            "Return valid JSON only with keys summary, talking_points, next_action."
        )

        raw = self.llm_client.generate_content(prompt) if hasattr(self.llm_client, 'generate_content') else str(self.llm_client(prompt))
        text = getattr(raw, 'text', str(raw))
        try:
            payload = json.loads(text)
            return payload
        except json.JSONDecodeError:
            return {
                "summary": text[:500],
                "talking_points": text[:500],
                "next_action": "Review the data and decide the next step.",
            }

    def generate_risk(self, data: str) -> dict[str, Any]:
        prompt = (
            "You are a revenue risk analyst. Assess deal risk using the CRM data and return valid JSON only.\n\n"
            f"Opportunity data:\n{data}\n\n"
            "Return JSON with keys riskScore, reason, recommendation."
        )

        raw = self.llm_client.generate_content(prompt) if hasattr(self.llm_client, 'generate_content') else str(self.llm_client(prompt))
        text = getattr(raw, 'text', str(raw))
        try:
            payload = json.loads(text)
            return payload
        except json.JSONDecodeError:
            return {
                "riskScore": 50,
                "reason": text[:500],
                "recommendation": "Review the risk details and arrange next steps with the account owner.",
            }
