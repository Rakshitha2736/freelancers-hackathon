import re
import json
from typing import List, Dict, Any
from google.generativeai import GenerativeModel, configure
import os

# Configure Gemini API
configure(api_key=os.getenv("GEMINI_API_KEY"))
model = GenerativeModel("gemini-pro")

def split_text(text: str, max_chars: int = 3500) -> List[str]:
    """
    Splits text into chunks, avoiding breaking sentences if possible.
    """
    sentences = re.split(r'(?<=[.!?]) +', text)
    chunks = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= max_chars:
            current += (" " if current else "") + sentence
        else:
            if current:
                chunks.append(current.strip())
            current = sentence
    if current:
        chunks.append(current.strip())
    return chunks

def analyze_chunk(chunk: str) -> Dict[str, Any]:
    """
    Sends chunk to Gemini and parses the response as JSON.
    """
    system_prompt = (
        "You are an expert meeting assistant. Extract the following from the transcript chunk as JSON: "
        "summary (list of key points), tasks (list of {owner, task, deadline, priority}), next_meeting (string). "
        "Respond ONLY with valid JSON."
    )
    try:
        prompt = f"{system_prompt}\n\nTranscript:\n{chunk}"
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0}
        )
        text = response.text.strip()
        # Extract JSON from response (in case extra text appears)
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            text = match.group(0)
        data = json.loads(text)
        # Validate structure
        if not isinstance(data.get("summary", []), list):
            data["summary"] = [data.get("summary", "")]
        if not isinstance(data.get("tasks", []), list):
            data["tasks"] = []
        if not isinstance(data.get("next_meeting", ""), str):
            data["next_meeting"] = ""
        return data
    except Exception as e:
        return {"summary": [], "tasks": [], "next_meeting": "", "error": str(e)}

def merge_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merges chunk results using Gemini (map-reduce style).
    """
    # Prepare merge prompt
    summaries = [r.get("summary", []) for r in results]
    tasks = [r.get("tasks", []) for r in results]
    next_meetings = [r.get("next_meeting", "") for r in results]
    merge_prompt = (
        "Given these partial meeting analyses, merge into a single JSON with: "
        "summary (combine, deduplicate), tasks (deduplicate by owner/task, keep best deadline/priority), "
        "next_meeting (choose most relevant). Respond ONLY with valid JSON.\n"
        f"Summaries: {summaries}\nTasks: {tasks}\nNext meetings: {next_meetings}"
    )
    try:
        response = model.generate_content(
            merge_prompt,
            generation_config={"temperature": 0}
        )
        text = response.text.strip()
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            text = match.group(0)
        data = json.loads(text)
        # Validate structure
        if not isinstance(data.get("summary", []), list):
            data["summary"] = [data.get("summary", "")]
        if not isinstance(data.get("tasks", []), list):
            data["tasks"] = []
        if not isinstance(data.get("next_meeting", ""), str):
            data["next_meeting"] = ""
        return data
    except Exception as e:
        return {"summary": [], "tasks": [], "next_meeting": "", "error": str(e)}

def analyze_meeting(text: str) -> Dict[str, Any]:
    chunks = split_text(text)
    results = []
    for chunk in chunks:
        result = analyze_chunk(chunk)
        results.append(result)
    if len(results) == 1:
        final = results[0]
    else:
        final = merge_results(results)
    final["number_of_chunks_processed"] = len(chunks)
    # Always return required keys
    return {
        "summary": final.get("summary", []),
        "tasks": final.get("tasks", []),
        "next_meeting": final.get("next_meeting", ""),
        "number_of_chunks_processed": len(chunks)
    }
