import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any

from ai_agent.agent import pre_categorize
from ai_agent.llm_client import LLMClient

app = FastAPI(title="AI Triage Agent", version="0.1.0")
client = LLMClient()


class PreCategorizeRequest(BaseModel):
    answers: Dict[str, Any]


@app.get("/health")
def health():
    return {"status": "ok", "llm": client.health()}


@app.post("/pre-categorize")
def pre_categorize_endpoint(request: PreCategorizeRequest):
    try:
        result = pre_categorize(request.answers, client=client)
        return {"pre_categorization": result}
    except Exception as e:
        return {"error": str(e)}, 500


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host=host, port=port)
