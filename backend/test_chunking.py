import requests
import json

# Read the long transcript
with open(r"C:\Users\yuvad\Downloads\long_meeting_transcript.txt", "r", encoding="utf-8") as f:
    transcript = f.read()

print(f"Transcript length: {len(transcript)} characters")
print(f"Number of paragraphs: {transcript.count('Arun:')}")
print("-" * 80)

# Send POST request to the API
response = requests.post(
    "http://127.0.0.1:8000/analyze",
    json={"text": transcript}
)

print("Response Status Code:", response.status_code)
print("-" * 80)
print("Response JSON:")
result = response.json()
print(json.dumps(result, indent=2))
print("-" * 80)

# Verify chunking worked
chunks_processed = result.get("number_of_chunks_processed", 0)
print(f"\n✓ Chunking Status: {chunks_processed} chunks processed")
if chunks_processed > 1:
    print("✓ SUCCESS: Multiple chunks were processed (chunking is working!)")
else:
    print("✗ Single chunk only (transcript may be too short, but chunking is functional)")
