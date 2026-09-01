from __future__ import annotations

from app.embeddings import embed_text
from app.guardrails import guardrail_check, sanitize_prompt, validate_answer
from app.llm import generate_text
from app.prompts import CRM_SYSTEM_PROMPT, build_crm_prompt
from app.langchain_orchestrator import CRMOrchestrator


class RAGService:
    def __init__(self, vector_store):
        self.vector_store = vector_store

    def _safe_context(self, context_items):
        return "\n\n---\n\n".join(
            f"Source: {item.get('metadata', {}).get('source', 'crm')}\n"
            f"Text: {item.get('text', '')}"
            for item in context_items
        )

    def _history_context(self, history):
        if not history:
            return ""

        recent_history = history[-6:]
        return "Previous conversation:\n" + "\n".join(
            f"{item.get('role', 'user')}: {item.get('content', '')}" for item in recent_history
        ) + "\n\n"

    def answer_question(self, question: str, owner_id: str | None = None, top_k: int = 5, context: list[str] | None = None, history: list[dict[str, str]] | None = None):
        history_context = self._history_context(history)

        if context:
            final_context = "\n\n".join(context)
            safe_question = sanitize_prompt(question)
            prompt = f"{CRM_SYSTEM_PROMPT}\n\n{build_crm_prompt(final_context, safe_question, history)}"
            answer = validate_answer(generate_text(prompt))
            guard = guardrail_check(safe_question, answer, final_context)
            return {
                "answer": answer,
                "context": [{
                    "source": "provided_context",
                    "score": 1.0,
                    "text": final_context,
                    "metadata": {"ownerId": owner_id or "unknown"},
                }],
                "status": "ok" if guard["pass"] else "warning",
            }

        if not self.vector_store.documents:
            fallback_text = (
                "No CRM documents have been indexed yet. "
                "Use the indexing endpoint to add lead, interaction, or deal records before asking retrieval questions."
            )
            if history_context:
                fallback_text = f"{history_context}{fallback_text}"
            return {
                "answer": fallback_text,
                "context": [],
                "status": "ok",
            }

        query_embedding = embed_text(question)
        matches = self.vector_store.similarity_search(query_embedding, k=top_k)
        context_text = self._safe_context(matches)
        safe_question = sanitize_prompt(question)
        prompt = f"{CRM_SYSTEM_PROMPT}\n\n{build_crm_prompt(context_text, safe_question, history)}"

        if hasattr(self, 'orchestrator') and self.orchestrator is not None:
            structured = self.orchestrator.generate_structured_answer(safe_question, context_text, history)
            answer = validate_answer(structured.get('direct_answer') or generate_text(prompt))
            guard = guardrail_check(safe_question, answer, context_text)
            return {
                "answer": answer,
                "context": [{
                    "source": item["metadata"].get("source", "crm"),
                    "score": item["score"],
                    "text": item["text"],
                    "metadata": item["metadata"],
                } for item in matches],
                "status": "ok" if guard["pass"] else "warning",
            }

        answer = validate_answer(generate_text(prompt))
        guard = guardrail_check(safe_question, answer, context_text)
        return {
            "answer": answer,
            "context": [{
                "source": item["metadata"].get("source", "crm"),
                "score": item["score"],
                "text": item["text"],
                "metadata": item["metadata"],
            } for item in matches],
            "status": "ok" if guard["pass"] else "warning",
        }
