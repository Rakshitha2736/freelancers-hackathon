const express = require('express');
const auth = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { emitTaskUpdate } = require('../socket');

const router = express.Router();

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

// ─── GET /api/tasks ─────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { mine, myTasksOnly, owner, priority, status } = req.query;

    const analyses = await Analysis.find({
      userId: req.user._id,
      isConfirmed: true,
    });

    let tasks = [];
    analyses.forEach((a) => {
      a.tasks.forEach((t) => {
        tasks.push({
          _id: t._id,
          analysisId: a._id,
          description: t.description,
          owner: t.owner,
          ownerUserId: t.ownerUserId,
          deadline: t.deadline,
          priority: t.priority,
          status: t.status,
          confidence: t.confidence,
          isUnassigned: t.isUnassigned,
        });
      });
    });

    // Filter: mine/myTasksOnly → only tasks where ownerUserId matches logged-in user
    if (mine === 'true' || myTasksOnly === 'true') {
      const userId = req.user._id.toString();
      tasks = tasks.filter(
        (t) => t.ownerUserId && t.ownerUserId.toString() === userId
      );
    }

    if (owner) {
      const ownerRegex = new RegExp(owner, 'i');
      tasks = tasks.filter((t) => ownerRegex.test(t.owner || ''));
    }

    if (priority) {
      tasks = tasks.filter((t) => t.priority === priority);
    }
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    res.json({ tasks });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ message: 'Failed to load tasks.' });
  }
});

// ─── GET /api/tasks/metrics ─────────────────────────────────────────────────
router.get('/metrics', auth, async (req, res) => {
  try {
    const analyses = await Analysis.find({
      userId: req.user._id,
      isConfirmed: true,
    });

    let totalTasks = 0;
    let highPriority = 0;
    let overdue = 0;
    let assignedToMe = 0;
    const now = new Date();
    const userId = req.user._id.toString();

    analyses.forEach((a) => {
      a.tasks.forEach((t) => {
        totalTasks++;
        if (t.priority === 'High') highPriority++;
        if (t.deadline && new Date(t.deadline) < now && t.status !== 'Completed') overdue++;
        if (t.ownerUserId && t.ownerUserId.toString() === userId) assignedToMe++;
      });
    });

    res.json({ metrics: { totalTasks, highPriority, overdue, assignedToMe } });
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ message: 'Failed to load metrics.' });
  }
});

// ─── PATCH /api/tasks/:analysisId/:taskId ───────────────────────────────────
router.patch('/:analysisId/:taskId', auth, async (req, res) => {
  try {
    const { analysisId, taskId } = req.params;

    const analysis = await Analysis.findOne({
      _id: analysisId,
      userId: req.user._id,
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    const task = analysis.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const { owner, status, priority, deadline } = req.body;

    if (status !== undefined && ['Pending', 'In Progress', 'Completed'].includes(status)) {
      task.status = status;
    }
    if (priority !== undefined && ['High', 'Medium', 'Low'].includes(priority)) {
      task.priority = priority;
    }
    if (deadline !== undefined) {
      task.deadline = deadline;
    }

    // Re-run owner mapping when owner changes
    if (owner !== undefined) {
      task.owner = owner;
      const { ownerUserId, isUnassigned } = await mapOwner(owner);
      task.ownerUserId = ownerUserId;
      task.isUnassigned = isUnassigned;
    }

    await analysis.save();
    
    // Emit task update via WebSocket
    emitTaskUpdate(req.user._id.toString(), {
      _id: task._id,
      analysisId: analysis._id,
      description: task.description,
      owner: task.owner,
      ownerUserId: task.ownerUserId,
      deadline: task.deadline,
      priority: task.priority,
      status: task.status,
      confidence: task.confidence
    });

    res.json({ message: 'Task updated.', task });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ message: 'Failed to update task.' });
  }
});

module.exports = router;
