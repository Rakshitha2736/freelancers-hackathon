const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const { analysisRateLimiter } = require('../middleware/security');
const { handleValidationErrors } = require('../middleware/validation');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { chunkText, mergeChunkResults, estimateProcessingTime } = require('../utils/textChunker');
const { emitAnalysisUpdate } = require('../socket');

const router = express.Router();
router.use(auth);
router.use(analysisRateLimiter);

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

function normalizeDeadline(rawDeadline, fallbackIso) {
  if (!rawDeadline) return fallbackIso;

  let parsed = null;
  if (rawDeadline instanceof Date) {
    parsed = rawDeadline;
  } else if (typeof rawDeadline === 'number') {
    parsed = new Date(rawDeadline);
  } else if (typeof rawDeadline === 'string') {
    const trimmed = rawDeadline.trim();
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
      parsed = new Date(`${year}-${month}-${day}`);
    } else {
      parsed = new Date(trimmed);
    }
  }

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return fallbackIso;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (parsed < today || parsed > maxDate) {
    return fallbackIso;
  }

  return parsed.toISOString();
}

async function runAnalysisPipeline(trimmedText) {
  const needsChunking = trimmedText.length > 15000;
  const chunks = needsChunking
    ? chunkText(trimmedText, 15000)
    : [{ chunk: trimmedText, index: 0, totalChunks: 1 }];

  const chunkResults = [];
  for (let i = 0; i < chunks.length; i++) {
    const { chunk, index } = chunks[i];
    const parsed = await processChunk(chunk, index, chunks.length);
    chunkResults.push(parsed);
  }

  const mergedResult = chunks.length > 1
    ? mergeChunkResults(chunkResults)
    : chunkResults[0];

  const rawTasks = (mergedResult.tasks || []).map((t, i) => {
    const weekOffset = Math.min(i + 1, 2);
    const fallbackDate = new Date(Date.now() + weekOffset * 7 * 86400000).toISOString();
    return {
      description: t.description || '',
      owner: t.owner || '',
      deadline: normalizeDeadline(t.deadline, fallbackDate),
      priority: ['High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
      status: 'Pending',
      confidence: typeof t.confidence === 'number' ? t.confidence : 0.7,
      fromChunk: t.fromChunk || undefined,
    };
  });

  const tasksWithOwners = await mapTasksOwners(rawTasks);

  return {
    mergedResult,
    tasksWithOwners,
    metadata: {
      chunked: chunks.length > 1,
      totalChunks: chunks.length,
      processedAt: new Date(),
      textLength: trimmedText.length,
      wordCount: trimmedText.split(/\s+/).length,
    },
  };
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
  
  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.error('[processChunk] JSON parse error:', parseError);
    console.error('[processChunk] Response text:', responseText.substring(0, 500));
    throw new Error('Failed to parse AI response. The AI may have returned invalid JSON.');
  }
}

// ─── POST /api/analyses/generate ────────────────────────────────────────────
router.post(
  '/generate',
  [
    body('rawText').isString().trim().isLength({ min: 50 }),
    body('meetingMetadata').optional().isObject(),
    body('meetingMetadata.title').optional().isString().trim(),
    body('meetingMetadata.date').optional().isISO8601(),
    body('meetingMetadata.participants').optional().isArray(),
    body('meetingMetadata.meetingType')
      .optional()
      .isIn(['Standup', 'Planning', 'Review', 'Retrospective', '1:1', 'Other']),
    body('meetingMetadata.location').optional().isString().trim(),
    body('meetingMetadata.duration').optional().isInt({ min: 0 }),
  ],
  handleValidationErrors,
  async (req, res) => {
  try {
    const { rawText } = req.body;
    console.log('[Generate] Request received, rawText length:', rawText?.length);

    if (!rawText || rawText.trim().length < 50) {
      return res.status(400).json({ message: 'Meeting text must be at least 50 characters.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[Generate] GEMINI_API_KEY is not set');
      return res.status(503).json({ message: 'AI service is not configured. Please contact administrator.' });
    }

    const trimmedText = rawText.trim();
    
    const { mergedResult, tasksWithOwners, metadata } = await runAnalysisPipeline(trimmedText);

    // Create analysis with chunking metadata
    const meetingMetadata = req.body.meetingMetadata || {};
    const parsedMeetingMetadata = {
      title: meetingMetadata.title || '',
      date: meetingMetadata.date ? new Date(meetingMetadata.date) : new Date(),
      participants: Array.isArray(meetingMetadata.participants) ? meetingMetadata.participants : [],
      meetingType: meetingMetadata.meetingType || 'Other',
      location: meetingMetadata.location || '',
      duration: Number.isFinite(meetingMetadata.duration)
        ? meetingMetadata.duration
        : parseInt(meetingMetadata.duration, 10) || 0,
    };

    const analysis = await Analysis.create({
      userId: req.user._id,
      rawText: trimmedText,
      summary: mergedResult.summary || '',
      decisions: mergedResult.decisions || [],
      tasks: tasksWithOwners,
      isConfirmed: false,
      meetingMetadata: parsedMeetingMetadata,
      metadata
    });

    console.log(`[Generate] Analysis created with ID: ${analysis._id}`);

    res.status(201).json({ 
      id: analysis._id, 
      analysis,
      processingInfo: {
        chunked: metadata.chunked,
        totalChunks: metadata.totalChunks,
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

// ─── GET /api/analyses/search ───────────────────────────────────────────────
// IMPORTANT: Must be BEFORE /:id route to prevent "search" being treated as an ID
router.get('/search', async (req, res) => {
  try {
    const { q, meetingType, dateFrom, dateTo } = req.query;

    if ((!q || q.trim().length === 0) && !meetingType && !dateFrom && !dateTo) {
      return res.status(400).json({ message: 'Provide a search query or at least one filter.' });
    }

    if (q && q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters.' });
    }

    const baseQuery = {
      userId: req.user._id,
      isConfirmed: true,
    };

    if (meetingType) {
      baseQuery['meetingMetadata.meetingType'] = meetingType;
    }

    if (dateFrom || dateTo) {
      baseQuery['meetingMetadata.date'] = {};
      if (dateFrom) baseQuery['meetingMetadata.date'].$gte = new Date(dateFrom);
      if (dateTo) baseQuery['meetingMetadata.date'].$lte = new Date(dateTo);
    }

    let searchRegex = null;
    if (q && q.trim().length >= 2) {
      searchRegex = new RegExp(q.trim(), 'i');
      baseQuery.$or = [
        { summary: searchRegex },
        { decisions: searchRegex },
        { 'tasks.description': searchRegex },
        { 'tasks.owner': searchRegex },
        { rawText: searchRegex },
        { 'meetingMetadata.title': searchRegex },
        { 'meetingMetadata.participants': searchRegex }
      ];
    }

    const analyses = await Analysis.find(baseQuery)
      .sort({ confirmedAt: -1 })
      .limit(20);

    // Highlight search results
    const results = analyses.map(analysis => ({
      _id: analysis._id,
      summary: `${(analysis.summary || '').substring(0, 200)}...`,
      confirmedAt: analysis.confirmedAt,
      matchedTasks: searchRegex ? (analysis.tasks || []).filter(t => 
        searchRegex.test(t.description) || searchRegex.test(t.owner)
      ).length : 0,
      matchedDecisions: searchRegex ? (analysis.decisions || []).filter(d => searchRegex.test(d)).length : 0,
      totalTasks: (analysis.tasks || []).length,
      totalDecisions: (analysis.decisions || []).length
    }));

    res.json({ results, total: results.length, query: q || '' });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Search failed.' });
  }
});

// ─── GET /api/analyses/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
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

// ─── POST /api/analyses/:id/analyze ────────────────────────────────────────
const ANALYZE_COOLDOWN_MS = 60000;
const analyzeCooldowns = new Map();

router.post(
  '/:id/analyze',
  [param('id').isMongoId()],
  handleValidationErrors,
  async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const lastAt = analyzeCooldowns.get(userId);
    if (lastAt && Date.now() - lastAt < ANALYZE_COOLDOWN_MS) {
      const retryAfterMs = ANALYZE_COOLDOWN_MS - (Date.now() - lastAt);
      return res.status(429).json({
        message: 'Analysis is already running. Please wait a moment and try again.',
        retryAfterMs
      });
    }
    analyzeCooldowns.set(userId, Date.now());

    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    if (!analysis.rawText || analysis.rawText.trim().length < 50) {
      return res.status(400).json({ message: 'Meeting text must be at least 50 characters.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[Analyze] GEMINI_API_KEY is not set');
      return res.status(503).json({ message: 'AI service is not configured. Please contact administrator.' });
    }

    const trimmedText = analysis.rawText.trim();
    const { mergedResult, tasksWithOwners, metadata } = await runAnalysisPipeline(trimmedText);

    analysis.summary = mergedResult.summary || '';
    analysis.decisions = mergedResult.decisions || [];
    analysis.tasks = tasksWithOwners;
    analysis.metadata = metadata;
    analysis.isConfirmed = false;

    await analysis.save();

    emitAnalysisUpdate(req.user._id.toString(), {
      _id: analysis._id,
      summary: analysis.summary,
      decisions: analysis.decisions,
      tasks: analysis.tasks,
      metadata: analysis.metadata,
    });

    res.json({ message: 'Analysis generated.', analysis });
  } catch (err) {
    console.error('[Analyze] Error occurred:', err.message);
    console.error('[Analyze] Stack:', err.stack);

    // More specific error messages
    if (err.message?.includes('API key')) {
      return res.status(503).json({ message: 'AI service authentication failed. Please contact administrator.' });
    }

    if (err.status === 429 || err.message?.includes('rate limit')) {
      return res.status(429).json({ message: 'AI service rate limit exceeded. Please try again in a moment.' });
    }

    if (err.message?.includes('quota') || err.message?.includes('billing')) {
      return res.status(503).json({ message: 'AI service quota exceeded. Please contact administrator.' });
    }

    return res.status(500).json({ message: 'Failed to generate summary. Please try again.' });
  } finally {
    if (req.user?._id) {
      analyzeCooldowns.delete(req.user._id.toString());
    }
  }
});

// ─── PATCH /api/analyses/:id ────────────────────────────────────────────────
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('summary').optional().isString(),
    body('decisions').optional().isArray(),
    body('tasks').optional().isArray(),
    body('tasks.*.description').optional().isString(),
    body('tasks.*.owner').optional().isString(),
    body('tasks.*.deadline').optional().isISO8601(),
    body('tasks.*.priority').optional().isIn(['High', 'Medium', 'Low']),
    body('tasks.*.status').optional().isIn(['Pending', 'In Progress', 'Completed']),
  ],
  handleValidationErrors,
  async (req, res) => {
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
router.post(
  '/:id/confirm',
  [
    param('id').isMongoId(),
    body('summary').optional().isString(),
    body('decisions').optional().isArray(),
    body('tasks').optional().isArray(),
    body('tasks.*.description').optional().isString(),
    body('tasks.*.owner').optional().isString(),
    body('tasks.*.deadline').optional().isISO8601(),
    body('tasks.*.priority').optional().isIn(['High', 'Medium', 'Low']),
    body('tasks.*.status').optional().isIn(['Pending', 'In Progress', 'Completed']),
  ],
  handleValidationErrors,
  async (req, res) => {
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

module.exports = router;
