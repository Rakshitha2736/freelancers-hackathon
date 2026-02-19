from ai_service import split_text

# Read the long transcript
with open(r"C:\Users\yuvad\Downloads\long_meeting_transcript.txt", "r", encoding="utf-8") as f:
    transcript = f.read()

print(f"Transcript length: {len(transcript)} characters")
print(f"Number of paragraphs: {transcript.count('Arun:')}")
print("-" * 80)

# Test the chunking function
chunks = split_text(transcript, max_chars=3500)

print(f"\n✓ CHUNKING WORKS!")
print(f"✓ Input: {len(transcript)} characters")
print(f"✓ Output: {len(chunks)} chunks created")
print("-" * 80)

for i, chunk in enumerate(chunks, 1):
    print(f"\nChunk {i}:")
    print(f"  Length: {len(chunk)} characters")
    print(f"  Preview: {chunk[:100]}...")
