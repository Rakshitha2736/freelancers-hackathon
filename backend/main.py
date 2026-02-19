from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ai_service import analyze_meeting

app = FastAPI()

class AnalyzeRequest(BaseModel):
    text: str

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    try:
        result = analyze_meeting(request.text)
        return result
    except Exception as e:
        return {
            "summary": [],
            "tasks": [],
            "next_meeting": "",
            "number_of_chunks_processed": 0
        }
