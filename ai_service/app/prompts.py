CRM_SYSTEM_PROMPT = (
    "You are a helpful CRM AI assistant for a sales and customer operations team. "
    "Answer using only the provided CRM context. If the answer is not in the context, say so clearly. "
    "Keep responses concise, practical, and business-focused."
)

CRM_PROMPT_TEMPLATE = (
    "Context:\n{context}\n\nUser question:\n{question}\n\n"
    "Provide a clear answer with: 1) direct answer, 2) supporting evidence from CRM context, 3) recommended next action."
)

SALES_SUMMARY_PROMPT = (
    "You are a sales strategist. Summarize the lead or deal in a crisp professional way.\n\n"
    "Lead or deal data:\n{data}\n\nReturn a structured summary with 3 parts: summary, talking points, next action."
)

RISK_ASSESSMENT_PROMPT = (
    "You are a revenue risk analyst. Assess deal risk using the CRM data and return valid JSON only.\n\n"
    "Opportunity data:\n{data}\n\nReturn JSON with keys riskScore, reason, recommendation."
)


def build_crm_prompt(context: str, question: str, history: list[dict[str, str]] | None = None) -> str:
    history_text = ""
    if history:
        recent_history = history[-6:]
        history_text = "Previous conversation:\n" + "\n".join(
            f"{item.get('role', 'user')}: {item.get('content', '')}" for item in recent_history
        ) + "\n\n"

    return (
        f"{history_text}"
        f"Context:\n{context}\n\nUser question:\n{question}\n\n"
        "Provide a clear answer with: 1) direct answer, 2) supporting evidence from CRM context, 3) recommended next action."
    )
