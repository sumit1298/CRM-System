from __future__ import annotations

from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    ownerId: Optional[str] = None
    sessionId: Optional[str] = None
    topK: int = Field(default=5, ge=1, le=10)
    context: Optional[List[str]] = None
    history: Optional[List[ConversationMessage]] = None


class RetrievedChunk(BaseModel):
    source: str
    score: float
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatSession(BaseModel):
    sessionId: str
    ownerId: Optional[str] = None
    messages: List[ConversationMessage] = Field(default_factory=list)


class RAGResponse(BaseModel):
    answer: str
    sessionId: Optional[str] = None
    context: List[RetrievedChunk] = Field(default_factory=list)
    status: str = "ok"
