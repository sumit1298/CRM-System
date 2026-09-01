from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field


class CRMStructuredAnswer(BaseModel):
    direct_answer: str = Field(..., min_length=1, max_length=2000)
    supporting_evidence: str = Field(..., min_length=1, max_length=2000)
    recommended_next_action: str = Field(..., min_length=1, max_length=500)
    answered_from_context: bool = True
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class DealRiskAssessment(BaseModel):
    riskScore: int = Field(..., ge=0, le=100)
    reason: str = Field(..., min_length=1, max_length=1000)
    recommendation: str = Field(..., min_length=1, max_length=500)


class SalesSummary(BaseModel):
    summary: str = Field(..., min_length=1, max_length=1000)
    talking_points: str = Field(..., min_length=1, max_length=1000)
    next_action: str = Field(..., min_length=1, max_length=500)


def parse_structured_json(raw: str, fallback: str) -> dict[str, Any]:
    if not raw or not isinstance(raw, str):
        return {
            "direct_answer": fallback,
            "supporting_evidence": fallback,
            "recommended_next_action": "Review missing CRM context before making a decision.",
            "answered_from_context": False,
            "confidence": 0.0,
        }

    try:
        payload = json.loads(raw)
        if isinstance(payload, dict):
            return {
                "direct_answer": payload.get("direct_answer") or payload.get("summary") or fallback,
                "supporting_evidence": payload.get("supporting_evidence") or payload.get("reason") or fallback,
                "recommended_next_action": payload.get("recommended_next_action") or payload.get("next_action") or "Review the related CRM records before acting.",
                "answered_from_context": bool(payload.get("answered_from_context", True)),
                "confidence": float(payload.get("confidence", 0.5)),
            }
    except json.JSONDecodeError:
        pass

    return {
        "direct_answer": raw.strip()[:2000] or fallback,
        "supporting_evidence": raw.strip()[:2000] or fallback,
        "recommended_next_action": "Review the related CRM records before acting.",
        "answered_from_context": False,
        "confidence": 0.5,
    }
