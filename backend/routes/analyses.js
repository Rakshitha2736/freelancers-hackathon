const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const auth = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const User = require('../models/User');

const router = express.Router();

const anthropic = new Anthropic.default({
  apiKey: process.env.CLAUDE_API_KEY,
});

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

// ─── POST /api/analyses/generate ────────────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const { rawText } = req.body;

    if (!rawText || rawText.trim().length < 50) {
      return res.status(400).json({ message: 'Meeting text must be at least 50 characters.' });
    }

    const prompt = `Analyze the following meeting transcript and return a JSON object with exactly this structure (no markdown, no code fences, only valid JSON):

{
  "summary": "A concise 2-4 sentence executive summary of the meeting",
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
- decisions should capture actual decisions made in the meeting

Meeting Transcript:
"""
${rawText.trim()}
"""`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text.trim();

    let parsed;
    try {
      const cleaned = responseText.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse Claude response:', responseText);
      return res.status(500).json({ message: 'Failed to parse AI response. Please try again.' });
    }

    // Build tasks with defaults
    const rawTasks = (parsed.tasks || []).map((t, i) => ({
      description: t.description || '',
      owner: t.owner || '',
      deadline: t.deadline || new Date(Date.now() + (i + 1) * 7 * 86400000).toISOString(),
      priority: ['High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
      status: 'Pending',
      confidence: typeof t.confidence === 'number' ? t.confidence : 0.7,
    }));

    // Map owners to real users
    const tasksWithOwners = await mapTasksOwners(rawTasks);

    const analysis = await Analysis.create({
      userId: req.user._id,
      rawText: rawText.trim(),
      summary: parsed.summary || '',
      decisions: parsed.decisions || [],
      tasks: tasksWithOwners,
      isConfirmed: false,
    });

    res.status(201).json({ id: analysis._id, analysis });
  } catch (err) {
    console.error('Generate error:', err);
    if (err.status === 401) {
      return res.status(500).json({ message: 'AI API authentication failed. Check API key.' });
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

    res.json({ message: 'Summary confirmed successfully.', analysis });
  } catch (err) {
    console.error('Confirm error:', err);
    res.status(500).json({ message: 'Failed to confirm summary.' });
  }
});

module.exports = router;
