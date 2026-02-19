const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { chunkText, mergeChunkResults, estimateProcessingTime } = require('../utils/textChunker');
const { emitAnalysisUpdate } = require('../socket');

const router = express.Router();

// Initialize Gemini client with validation
if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set. AI features will not work.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ─── Owner Mapping Helper ───────────────────────────────────────────────────
async function mapOwner(ownerName) {
  if (!ownerName || ownerName.trim() === '' || ownerName.toLowerCase() === 'unassigned') {
    return { ownerUserId: null, isUnassigned: true };
  }

  const user = await User.findOne({
    name: { $regex: new RegExp(`^${ownerName.trim()}$`, 'i') },
  });

  if (user) {
    return { ownerUserId: user._id, isUnassigned: false };
  }

  return { ownerUserId: null, isUnassigned: true };
}

async function mapTasksOwners(tasks) {
  return Promise.all(
    tasks.map(async (t) => {
      const { ownerUserId, isUnassigned } = await mapOwner(t.owner);
      return { ...t, ownerUserId, isUnassigned };
    })
  );
}

// ─── Helper: Process a single chunk with Gemini ─────────────────────────────
async function processChunk(chunkText, chunkIndex, totalChunks) {
  const chunkContext = totalChunks > 1 
    ? `\n\nNote: This is part ${chunkIndex + 1} of ${totalChunks} from a longer meeting transcript.`
    : '';

  const prompt = `Analyze the following meeting transcript and return a JSON object with exactly this structure (no markdown, no code fences, only valid JSON):

{
  "summary": "A concise 2-4 sentence executive summary of the meeting${chunkContext}",
  "decisions": ["decision 1", "decision 2"],
  "tasks": [
    {
      "description": "Clear task description",
      "owner": "Person responsible (use exact name from transcript, or empty string if not mentioned)",
      "deadline": "ISO date string (estimate reasonable deadline if not mentioned, use dates within next 2 weeks)",
      "priority": "High or Medium or Low",
      "confidence": 0.85
    }
  ]
}

Rules:
- Extract ALL actionable tasks mentioned
- confidence is 0.0-1.0 indicating how confident you are this is a real task
- If no owner is mentioned, set owner to empty string
- Priority should reflect urgency from context
- decisions should capture actual decisions made in the meeting${chunkContext}

Meeting Transcript:
"""
${chunkText.trim()}
"""`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const responseText = response.text().trim();

  const cleaned = responseText.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── POST /api/analyses/generate ────────────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const { rawText } = req.body;
    console.log('[Generate] Request received, rawText length:', rawText?.length);

    if (!rawText || rawText.trim().length < 50) {
      return res.status(400).json({ message: 'Meeting text must be at least 50 characters.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[Generate] GEMINI_API_KEY is not set');
      return res.status(500).json({ message: 'AI service is not configured. Please contact administrator.' });
    }

    const trimmedText = rawText.trim();
    
    // Determine if chunking is needed (for texts > 15,000 characters)
    const needsChunking = trimmedText.length > 15000;
    const chunks = needsChunking ? chunkText(trimmedText, 15000) : [{ chunk: trimmedText, index: 0, totalChunks: 1 }];
    
    console.log(`[Generate] Processing ${chunks.length} chunk(s)...`);
    if (needsChunking) {
      console.log(`[Generate] Text chunked into ${chunks.length} parts for optimal processing`);
    }

    // Process each chunk
    const chunkResults = [];
    for (let i = 0; i < chunks.length; i++) {
      const { chunk, index } = chunks[i];
      console.log(`[Generate] Processing chunk ${index + 1}/${chunks.length} (${chunk.length} chars)...`);
      
      try {
        const parsed = await processChunk(chunk, index, chunks.length);
        chunkResults.push(parsed);
        console.log(`[Generate] Chunk ${index + 1} processed successfully`);
      } catch (parseErr) {
        console.error(`[Generate] Failed to parse chunk ${index + 1}:`, parseErr.message);
        throw new Error(`Failed to process chunk ${index + 1}. Please try again.`);
      }
    }

    // Merge results from all chunks
    const mergedResult = chunks.length > 1 
      ? mergeChunkResults(chunkResults)
      : chunkResults[0];

    console.log(`[Generate] Merged results: ${mergedResult.tasks?.length || 0} tasks, ${mergedResult.decisions?.length || 0} decisions`);

    // Build tasks with defaults
    const rawTasks = (mergedResult.tasks || []).map((t, i) => ({
      description: t.description || '',
      owner: t.owner || '',
      deadline: t.deadline || new Date(Date.now() + (i + 1) * 7 * 86400000).toISOString(),
      priority: ['High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
      status: 'Pending',
      confidence: typeof t.confidence === 'number' ? t.confidence : 0.7,
      fromChunk: t.fromChunk || undefined, // Preserve chunk reference if present
    }));

    // Map owners to real users
    const tasksWithOwners = await mapTasksOwners(rawTasks);

    // Create analysis with chunking metadata
    const analysis = await Analysis.create({
      userId: req.user._id,
      rawText: trimmedText,
      summary: mergedResult.summary || '',
      decisions: mergedResult.decisions || [],
      tasks: tasksWithOwners,
      isConfirmed: false,
      metadata: {
        chunked: chunks.length > 1,
        totalChunks: chunks.length,
        processedAt: new Date(),
        textLength: trimmedText.length,
        wordCount: trimmedText.split(/\s+/).length,
      }
    });

    console.log(`[Generate] Analysis created with ID: ${analysis._id}`);

    res.status(201).json({ 
      id: analysis._id, 
      analysis,
      processingInfo: {
        chunked: chunks.length > 1,
        totalChunks: chunks.length,
        totalTasks: tasksWithOwners.length,
        totalDecisions: mergedResult.decisions?.length || 0
      }
    });
  } catch (err) {
    console.error('[Generate] Error occurred:', err.message);
    console.error('[Generate] Error stack:', err.stack);
    console.error('[Generate] Error status:', err.status);
    console.error('[Generate] Error type:', err.type);
    console.error('[Generate] Full error:', JSON.stringify(err, null, 2));
    
    if (err.status === 401 || err.message?.includes('authentication')) {
      return res.status(500).json({ message: 'AI API authentication failed. Please check API key configuration.' });
    }
    
    if (err.status === 429) {
      return res.status(429).json({ message: 'Rate limit exceeded. Please try again in a moment.' });
    }
    
    res.status(500).json({ message: 'Failed to generate summary. Please try again.' });
  }
});

// ─── GET /api/analyses/:id ──────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    res.json({ analysis });
  } catch (err) {
    console.error('Get analysis error:', err);
    res.status(500).json({ message: 'Failed to load analysis.' });
  }
});

// ─── PATCH /api/analyses/:id ────────────────────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    if (analysis.isConfirmed) {
      return res.status(400).json({ message: 'Cannot edit a confirmed analysis.' });
    }

    const { summary, decisions, tasks } = req.body;

    if (summary !== undefined) analysis.summary = summary;
    if (decisions !== undefined) analysis.decisions = decisions;

    if (tasks && Array.isArray(tasks)) {
      const mapped = await mapTasksOwners(
        tasks.map((t) => ({
          description: t.description || '',
          owner: t.owner || '',
          deadline: t.deadline,
          priority: ['High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
          status: ['Pending', 'In Progress', 'Completed'].includes(t.status) ? t.status : 'Pending',
          confidence: t.confidence,
        }))
      );
      analysis.tasks = mapped;
    }

    await analysis.save();
    
    // Emit analysis update via WebSocket
    emitAnalysisUpdate(req.user._id.toString(), {
      _id: analysis._id,
      summary: analysis.summary,
      decisions: analysis.decisions,
      tasks: analysis.tasks,
      metadata: analysis.metadata
    });

    res.json({ message: 'Analysis updated.', analysis });
  } catch (err) {
    console.error('Edit analysis error:', err);
    res.status(500).json({ message: 'Failed to update analysis.' });
  }
});

// ─── POST /api/analyses/:id/confirm ─────────────────────────────────────────
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    if (analysis.isConfirmed) {
      return res.status(400).json({ message: 'Analysis already confirmed.' });
    }

    // Allow final edits on confirm
    const { summary, decisions, tasks } = req.body;

    if (summary !== undefined) analysis.summary = summary;
    if (decisions !== undefined) analysis.decisions = decisions;

    if (tasks && Array.isArray(tasks)) {
      const mapped = await mapTasksOwners(
        tasks.map((t) => ({
          description: t.description || '',
          owner: t.owner || '',
          deadline: t.deadline,
          priority: ['High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
          status: ['Pending', 'In Progress', 'Completed'].includes(t.status) ? t.status : 'Pending',
          confidence: t.confidence,
        }))
      );
      analysis.tasks = mapped;
    }

    analysis.isConfirmed = true;
    analysis.confirmedAt = new Date();
    await analysis.save();

    // Emit analysis update via WebSocket
    emitAnalysisUpdate(req.user._id.toString(), {
      _id: analysis._id,
      summary: analysis.summary,
      decisions: analysis.decisions,
      tasks: analysis.tasks,
      metadata: analysis.metadata,
      isConfirmed: analysis.isConfirmed,
      confirmedAt: analysis.confirmedAt
    });

    res.json({ message: 'Summary confirmed successfully.', analysis });
  } catch (err) {
    console.error('Confirm error:', err);
    res.status(500).json({ message: 'Failed to confirm summary.' });
  }
});

// ─── GET /api/analyses/search ───────────────────────────────────────────────
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters.' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    // Search in summary, decisions, task descriptions, and raw text
    const analyses = await Analysis.find({
      userId: req.user._id,
      isConfirmed: true,
      $or: [
        { summary: searchRegex },
        { decisions: searchRegex },
        { 'tasks.description': searchRegex },
        { 'tasks.owner': searchRegex },
        { rawText: searchRegex }
      ]
    }).sort({ confirmedAt: -1 }).limit(20);

    // Highlight search results
    const results = analyses.map(analysis => ({
      _id: analysis._id,
      summary: analysis.summary.substring(0, 200) + '...',
      confirmedAt: analysis.confirmedAt,
      matchedTasks: analysis.tasks.filter(t => 
        searchRegex.test(t.description) || searchRegex.test(t.owner)
      ).length,
      matchedDecisions: analysis.decisions.filter(d => searchRegex.test(d)).length,
      totalTasks: analysis.tasks.length,
      totalDecisions: analysis.decisions.length
    }));

    res.json({ results, total: results.length, query: q });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Search failed.' });
  }
});

module.exports = router;
