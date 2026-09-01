from __future__ import annotations

import os
from typing import Any, List

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover - optional dependency for MongoDB backed store
    MongoClient = None


class SimpleVectorStore:
    """Lightweight in-memory vector store for local MVP development."""

    def __init__(self):
        self.documents: List[dict[str, Any]] = []

    def add_document(self, *, text: str, metadata: dict[str, Any], embedding: list[float]):
        if not isinstance(embedding, list) or not embedding:
            raise ValueError('embedding must be a non-empty list of floats')

        self.documents.append(
            {
                "text": text,
                "metadata": metadata,
                "embedding": embedding,
            }
        )

    def similarity_search(self, query_embedding: list[float], k: int = 5):
        results = []
        for item in self.documents:
            score = self._cosine_similarity(query_embedding, item["embedding"])
            results.append({
                "score": score,
                "text": item["text"],
                "metadata": item["metadata"],
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:k]

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        if len(a) != len(b):
            return 0.0

        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot / (norm_a * norm_b)


class MongoVectorStore(SimpleVectorStore):
    """MongoDB-backed vector store that can run in two modes:

    1. Local Python cosine similarity search over stored embeddings
    2. Atlas Vector Search via the MongoDB aggregation pipeline when enabled
    """

    def __init__(self, uri: str | None = None, db_name: str = 'crm_ai', collection_name: str = 'crm_documents', index_name: str | None = None):
        if MongoClient is None:
            raise RuntimeError('pymongo is required for MongoVectorStore; install it in the AI service environment')

        self.uri = uri or os.getenv('MONGODB_URI') or os.getenv('MONGODB_ATLAS_URI')
        if not self.uri:
            raise ValueError('MONGODB_URI or MONGODB_ATLAS_URI must be set to use MongoVectorStore')

        self.index_name = index_name or os.getenv('MONGODB_VECTOR_INDEX', 'crm_vector_index')
        self.use_atlas_vector_search = os.getenv('USE_ATLAS_VECTOR_SEARCH', 'false').lower() == 'true'
        self.client = MongoClient(self.uri)
        self.collection = self.client[db_name][collection_name]
        self.documents: List[dict[str, Any]] = []

    def add_document(self, *, text: str, metadata: dict[str, Any], embedding: list[float]):
        if not isinstance(embedding, list) or not embedding:
            raise ValueError('embedding must be a non-empty list of floats')

        self.collection.insert_one({
            'text': text,
            'metadata': metadata,
            'embedding': embedding,
        })
        self.documents = list(self.collection.find({}, {'_id': 0}))

    def similarity_search(self, query_embedding: list[float], k: int = 5):
        if self.use_atlas_vector_search:
            try:
                pipeline = [{
                    '$vectorSearch': {
                        'index': self.index_name,
                        'path': 'embedding',
                        'queryVector': query_embedding,
                        'numCandidates': max(k * 10, 20),
                        'limit': k,
                    }
                }, {
                    '$project': {
                        '_id': 0,
                        'text': 1,
                        'metadata': 1,
                        'score': { '$meta': 'vectorSearchScore' },
                    }
                }]
                results = list(self.collection.aggregate(pipeline))
                if results:
                    return [{
                        'score': float(item.get('score', 0.0)),
                        'text': item.get('text', ''),
                        'metadata': item.get('metadata', {}),
                    } for item in results]
            except Exception:
                pass

        items = list(self.collection.find({}, {'_id': 0}))
        if not items:
            return []

        results = []
        for item in items:
            score = self._cosine_similarity(query_embedding, item.get('embedding', []))
            results.append({
                'score': score,
                'text': item.get('text', ''),
                'metadata': item.get('metadata', {}),
            })

        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:k]


def build_vector_store():
    uri = os.getenv('MONGODB_URI') or os.getenv('MONGODB_ATLAS_URI')
    if uri:
        try:
            return MongoVectorStore(
                uri=uri,
                index_name=os.getenv('MONGODB_VECTOR_INDEX', 'crm_vector_index'),
            )
        except Exception:
            pass
    return SimpleVectorStore()
