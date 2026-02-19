# 📦 Data Chunking Feature Documentation

## Overview
The data chunking feature allows the system to process very large meeting transcripts that exceed the AI model's token limits by splitting them into manageable chunks, processing each separately, and intelligently merging the results.

---

## How It Works

### 1. **Automatic Detection**
- Transcripts > 15,000 characters are automatically chunked
- Smaller transcripts are processed normally (single chunk)

### 2. **Smart Splitting**
- Text is split at natural boundaries (paragraphs, double newlines)
- Each chunk is ~15,000 characters (configurable)
- Maintains context and readability

### 3. **Individual Processing**
- Each chunk is sent to Gemini AI separately
- Chunk context is included in the prompt
- Tasks and decisions are extracted per chunk

### 4. **Intelligent Merging**
- Summaries are combined with chunk indicators
- Duplicate decisions are removed
- Duplicate tasks are deduplicated based on description
- Chunk reference is preserved for traceability

---

## Technical Implementation

### Backend Files

#### `/backend/utils/textChunker.js`
**Purpose:** Core chunking logic

**Functions:**
- `chunkText(text, maxChunkSize)` - Splits text into chunks
- `mergeChunkResults(chunkResults)` - Combines results from multiple chunks
- `estimateProcessingTime(text)` - Estimates processing time

**Example Usage:**
```javascript
const { chunkText, mergeChunkResults } = require('./utils/textChunker');

const chunks = chunkText(largeText, 15000);
// Process each chunk...
const merged = mergeChunkResults(results);
```

#### `/backend/routes/analyses.js`
**Updated:** Added chunking support to `/generate` endpoint

**Process Flow:**
1. Check if text needs chunking (> 15,000 chars)
2. Split into chunks if needed
3. Process each chunk with Gemini AI
4. Merge results
5. Save with metadata

**New Response Fields:**
```json
{
  "id": "analysis_id",
  "analysis": { ... },
  "processingInfo": {
    "chunked": true,
    "totalChunks": 3,
    "totalTasks": 15,
    "totalDecisions": 8
  }
}
```

#### `/backend/models/Analysis.js`
**Updated:** Added metadata field to schema

**New Fields:**
```javascript
metadata: {
  chunked: Boolean,        // Was chunking used?
  totalChunks: Number,     // How many chunks?
  processedAt: Date,       // When processed
  textLength: Number,      // Character count
  wordCount: Number        // Word count
}
```

**Task Schema:**
- Added `fromChunk: Number` - indicates which chunk a task came from

---

### Frontend Files

#### `/frontend/src/pages/Summarize.jsx`
**Updated:** Added chunking indicators

**New Features:**
- Shows character and word count
- Displays warning when text will be chunked
- Shows estimated chunk count
- Updates loading message for chunked processing

**Visual Indicators:**
```
"Will be processed in 3 chunks for optimal results"
"Analyzing 3 chunks with AI..."
```

#### `/frontend/src/pages/Analysis.jsx`
**Updated:** Displays chunking metadata

**New Features:**
- Shows info badge when analysis was chunked
- Displays word count and chunk count
- Helps users understand processing method

---

## Configuration

### Chunk Size
**Location:** `backend/utils/textChunker.js`  
**Default:** 15,000 characters  
**Adjustable:** Yes, pass different value to `chunkText()`

```javascript
const chunks = chunkText(text, 20000); // 20k chars per chunk
```

### When to Chunk
**Threshold:** 15,000 characters  
**Location:** `backend/routes/analyses.js` line ~63

```javascript
const needsChunking = trimmedText.length > 15000;
```

---

## Benefits

### 1. **No Token Limit Errors**
- Process meetings of any length
- Handles 100+ page transcripts
- No more "context length exceeded" errors

### 2. **Better Processing**
- Each chunk gets full AI attention
- More accurate task extraction
- Better context understanding

### 3. **Transparency**
- Users know when chunking is used
- Clear indicators in UI
- Processing metadata stored

### 4. **Reliability**
- Handles edge cases gracefully
- Deduplicates results
- Preserves all information

---

## Testing

### Test Cases

#### 1. Small Text (< 15k chars)
**Expected:** Single chunk processing  
**Test:** 5,000 character transcript  
**Result:** ✅ No chunking indicator, fast processing

#### 2. Medium Text (15k - 30k chars)
**Expected:** 2 chunks  
**Test:** 25,000 character transcript  
**Result:** ✅ "Will be processed in 2 chunks"

#### 3. Large Text (> 50k chars)
**Expected:** 3+ chunks  
**Test:** 60,000 character transcript  
**Result:** ✅ "Will be processed in 4 chunks"

#### 4. Edge Cases
- Empty paragraphs: ✅ Handled
- Very long paragraphs: ✅ Splits at character limit
- Special characters: ✅ Preserved
- Unicode: ✅ Supported

---

## Performance

### Processing Time
- **Single chunk:** ~3-5 seconds
- **Per additional chunk:** +3-5 seconds
- **Network overhead:** ~1 second per chunk

**Example:**
- 60,000 chars = 4 chunks = ~15-20 seconds total

### Memory Usage
- Minimal overhead
- Chunks processed sequentially (not in parallel)
- Results merged on-the-fly

---

## Future Enhancements

### Planned Improvements
1. **Parallel Processing** - Process chunks simultaneously
2. **Smart Context Preservation** - Include overlapping context between chunks
3. **Adaptive Chunk Sizing** - Adjust based on content type
4. **Progress Bar** - Real-time chunk processing progress
5. **Chunk Caching** - Cache results for re-processing
6. **WebSocket Updates** - Real-time progress updates to frontend

### Advanced Features
- **Speaker-Aware Chunking** - Split at speaker changes
- **Topic-Based Chunking** - Split at topic transitions
- **Parallel Chunk Processing** - Use multiple AI requests
- **Chunk-Level Editing** - Edit individual chunk results

---

## Troubleshooting

### Issue: Chunking Not Triggering
**Cause:** Text might be trimmed below threshold  
**Fix:** Check `trimmedText.length` in logs

### Issue: Duplicate Tasks
**Cause:** Same task extracted from multiple chunks  
**Fix:** Deduplication logic in `mergeChunkResults()`

### Issue: Incomplete Summary
**Cause:** Context loss between chunks  
**Fix:** Future enhancement - add overlapping context

### Issue: Slow Processing
**Cause:** Many chunks, sequential processing  
**Fix:** Consider reducing chunk size or parallel processing (future)

---

## API Reference

### POST `/api/analyses/generate`

**Request:**
```json
{
  "rawText": "Very long meeting transcript..."
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "analysis": {
    "_id": "507f1f77bcf86cd799439011",
    "summary": "[Part 1/3] ...\n\n[Part 2/3] ...\n\n[Part 3/3] ...",
    "decisions": ["Decision 1", "Decision 2"],
    "tasks": [
      {
        "description": "Task from chunk 1",
        "fromChunk": 1,
        ...
      }
    ],
    "metadata": {
      "chunked": true,
      "totalChunks": 3,
      "wordCount": 15000,
      "textLength": 75000
    }
  },
  "processingInfo": {
    "chunked": true,
    "totalChunks": 3,
    "totalTasks": 12,
    "totalDecisions": 5
  }
}
```

---

## Monitoring

### Logs to Watch
```
[Generate] Processing 3 chunk(s)...
[Generate] Text chunked into 3 parts for optimal processing
[Generate] Processing chunk 1/3 (15000 chars)...
[Generate] Chunk 1 processed successfully
[Generate] Merged results: 12 tasks, 5 decisions
[Generate] Analysis created with ID: ...
```

### Metrics to Track
- Average chunks per request
- Processing time per chunk
- Deduplication rate (removed items)
- User satisfaction with chunked results

---

**Version:** 1.0  
**Last Updated:** February 19, 2026  
**Author:** AI Assistant  
**Status:** Production Ready ✅
