from __future__ import annotations

import uuid
from typing import Any

from fastapi import FastAPI, HTTPException

from app.config import AI_SERVICE_PORT, ENABLE_LANGCHAIN
from app.embeddings import embed_text
from app.langchain_orchestrator import CRMOrchestrator
from app.llm import llm
from app.rag import RAGService
from app.schemas import QueryRequest, RAGResponse
from app.vector_store import build_vector_store

app = FastAPI(title="CRM AI Service", version="1.0.0")
vector_store = build_vector_store()
rag_service = RAGService(vector_store)
langchain_orchestrator = CRMOrchestrator(llm) if ENABLE_LANGCHAIN and llm else None
if langchain_orchestrator is not None:
    rag_service.orchestrator = langchain_orchestrator


@app.get("/health")
def health():
    return {"status": "ok", "langchain": ENABLE_LANGCHAIN}


@app.post("/api/rag/query", response_model=RAGResponse)
def rag_query(payload: QueryRequest):
    try:
        session_id = payload.sessionId or str(uuid.uuid4())
        result = rag_service.answer_question(
            question=payload.question,
            owner_id=payload.ownerId,
            top_k=payload.topK,
            context=payload.context,
            history=[message.model_dump() for message in payload.history] if payload.history else None,
        )
        return RAGResponse(
            answer=result["answer"],
            sessionId=session_id,
            context=result.get("context", []),
            status=result.get("status", "ok"),
        )
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise HTTPException(status_code=500, detail=f"AI query failed: {str(exc)}") from exc


@app.post("/api/rag/index")
def index_document(payload: dict[str, Any]):
    documents = payload.get("documents")

    if documents is None:
        text = payload.get("text")
        metadata = payload.get("metadata", {})
        embedding = payload.get("embedding")

        if not text:
            raise HTTPException(status_code=400, detail="Document text is required")

        if embedding is None:
            embedding = embed_text(text)

        if not isinstance(embedding, list):
            raise HTTPException(status_code=400, detail="Embedding must be an array")

        vector_store.add_document(text=text, metadata=metadata, embedding=embedding)
        return {"status": "ok", "indexed": True, "count": len(vector_store.documents)}

    if not isinstance(documents, list) or not documents:
        raise HTTPException(status_code=400, detail="A non-empty documents list is required")

    indexed = 0
    for document in documents:
        if not isinstance(document, dict):
            continue

        text = document.get("text")
        metadata = document.get("metadata", {})
        embedding = document.get("embedding")

        if not text:
            continue

        if embedding is None:
            embedding = embed_text(text)

        if not isinstance(embedding, list):
            continue

        vector_store.add_document(text=text, metadata=metadata, embedding=embedding)
        indexed += 1

    return {"status": "ok", "indexed": indexed, "count": len(vector_store.documents)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=AI_SERVICE_PORT, reload=True)
