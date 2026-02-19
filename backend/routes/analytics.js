const express = require('express');
const auth = require('../middleware/auth');
const Analysis = require('../models/Analysis');

const router = express.Router();

// ─── GET /api/analytics/overview ────────────────────────────────────────────
router.get('/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all confirmed analyses with tasks
    const analyses = await Analysis.find({ userId, isConfirmed: true });

    // Calculate metrics
    const allTasks = analyses.flatMap(a => a.tasks || []);
    
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'In Progress').length;
    const pendingTasks = allTasks.filter(t => t.status === 'Pending').length;
    
    const highPriority = allTasks.filter(t => t.priority === 'High').length;
    const mediumPriority = allTasks.filter(t => t.priority === 'Medium').length;
    const lowPriority = allTasks.filter(t => t.priority === 'Low').length;

    // Overdue tasks
    const now = new Date();
    const overdueTasks = allTasks.filter(t => 
      t.status !== 'Completed' && t.deadline && new Date(t.deadline) < now
    ).length;

    // Completion rate
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    res.json({
      overview: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        completionRate,
        overdueTasks,
        totalMeetings: analyses.length
      },
      priorityDistribution: {
        high: highPriority,
        medium: mediumPriority,
        low: lowPriority
      },
      statusDistribution: {
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks
      }
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ message: 'Failed to load analytics.' });
  }
});

// ─── GET /api/analytics/trends ──────────────────────────────────────────────
router.get('/trends', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const analyses = await Analysis.find({
      userId,
      isConfirmed: true,
      confirmedAt: { $gte: startDate }
    }).sort({ confirmedAt: 1 });

    // Group by date
    const dateMap = new Map();
    
    analyses.forEach(analysis => {
      const date = new Date(analysis.confirmedAt).toISOString().split('T')[0];
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          meetings: 0,
          tasksCreated: 0,
          tasksCompleted: 0,
          decisions: 0
        });
      }
      
      const dayData = dateMap.get(date);
      dayData.meetings += 1;
      dayData.tasksCreated += analysis.tasks.length;
      dayData.tasksCompleted += analysis.tasks.filter(t => t.status === 'Completed').length;
      dayData.decisions += analysis.decisions.length;
    });

    const trends = Array.from(dateMap.values());

    res.json({ trends });
  } catch (err) {
    console.error('Analytics trends error:', err);
    res.status(500).json({ message: 'Failed to load trends.' });
  }
});

// ─── GET /api/analytics/team-performance ────────────────────────────────────
router.get('/team-performance', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const analyses = await Analysis.find({ userId, isConfirmed: true });
    const allTasks = analyses.flatMap(a => a.tasks || []);

    // Group by owner
    const ownerMap = new Map();

    allTasks.forEach(task => {
      const owner = task.owner || 'Unassigned';
      
      if (!ownerMap.has(owner)) {
        ownerMap.set(owner, {
          owner,
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          completionRate: 0
        });
      }
      
      const ownerData = ownerMap.get(owner);
      ownerData.total += 1;
      
      if (task.status === 'Completed') ownerData.completed += 1;
      if (task.status === 'In Progress') ownerData.inProgress += 1;
      if (task.status === 'Pending') ownerData.pending += 1;
    });

    // Calculate completion rates
    const teamPerformance = Array.from(ownerMap.values()).map(data => ({
      ...data,
      completionRate: data.total > 0 
        ? Math.round((data.completed / data.total) * 100) 
        : 0
    })).sort((a, b) => b.total - a.total);

    res.json({ teamPerformance });
  } catch (err) {
    console.error('Team performance error:', err);
    res.status(500).json({ message: 'Failed to load team performance.' });
  }
});

module.exports = router;
