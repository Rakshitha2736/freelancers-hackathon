const express = require('express');
const auth = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const mongoose = require('mongoose');
const { apiLimiter } = require('../middleware/security');

const router = express.Router();

// Create schemas inline since we're registering them here
const permissionSchema = new mongoose.Schema({
  analysisId: mongoose.Schema.Types.ObjectId,
  sharedBy: mongoose.Schema.Types.ObjectId,
  sharedWith: mongoose.Schema.Types.ObjectId,
  role: { type: String, enum: ['Viewer', 'Editor', 'Owner'], default: 'Viewer' },
  sharedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null }
});

const commentSchema = new mongoose.Schema({
  analysisId: mongoose.Schema.Types.ObjectId,
  author: mongoose.Schema.Types.ObjectId,
  content: { type: String, maxlength: 2000 },
  taskId: { type: mongoose.Schema.Types.ObjectId, default: null },
  mentions: [mongoose.Schema.Types.ObjectId],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  likes: [mongoose.Schema.Types.ObjectId]
});

const activitySchema = new mongoose.Schema({
  analysisId: mongoose.Schema.Types.ObjectId,
  userId: mongoose.Schema.Types.ObjectId,
  action: { type: String, enum: ['created', 'edited', 'confirmed', 'shared', 'commented', 'viewed'] },
  details: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const Permission = mongoose.model('Permission', permissionSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Activity = mongoose.model('Activity', activitySchema);

// Share analysis with user
router.post('/:analysisId/share', apiLimiter, auth, async (req, res) => {
  try {
    const { email, role } = req.body;
    const { analysisId } = req.params;

    // Verify analysis ownership
    const analysis = await Analysis.findById(analysisId);
    if (!analysis || analysis.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Find user by email
    const sharedWithUser = await User.findOne({ email });
    if (!sharedWithUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already shared
    const existing = await Permission.findOne({
      analysisId,
      sharedWith: sharedWithUser._id
    });

    if (existing) {
      // Update role
      existing.role = role || 'Viewer';
      await existing.save();
      return res.json({ message: 'Permission updated', permission: existing });
    }

    // Create new permission
    const permission = new Permission({
      analysisId,
      sharedBy: req.user._id,
      sharedWith: sharedWithUser._id,
      role: role || 'Viewer'
    });

    await permission.save();

    // Log activity
    await Activity.create({
      analysisId,
      userId: req.user._id,
      action: 'shared',
      details: `Shared with ${sharedWithUser.name} as ${role}`
    });

    res.json({ message: 'Analysis shared successfully', permission });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ message: 'Failed to share analysis' });
  }
});

// Get users this analysis is shared with
router.get('/:analysisId/shared-with', auth, async (req, res) => {
  try {
    const { analysisId } = req.params;

    const permissions = await Permission.find({ analysisId })
      .populate('sharedWith', 'name email')
      .select('-analysisId');

    res.json({ shared: permissions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch shared users' });
  }
});

// Add comment to analysis
router.post('/:analysisId/comments', apiLimiter, auth, async (req, res) => {
  try {
    const { content, taskId, mentions } = req.body;
    const { analysisId } = req.params;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment cannot be empty' });
    }

    const comment = new Comment({
      analysisId,
      author: req.user._id,
      content: content.trim().substring(0, 2000),
      taskId: taskId || null,
      mentions: mentions || []
    });

    await comment.save();

    // Log activity
    await Activity.create({
      analysisId,
      userId: req.user._id,
      action: 'commented',
      details: `Added comment: ${content.substring(0, 50)}...`
    });

    res.json({ message: 'Comment added', comment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// Get comments for analysis
router.get('/:analysisId/comments', auth, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { taskId } = req.query;

    const query = { analysisId };
    if (taskId) query.taskId = taskId;

    const comments = await Comment.find(query)
      .populate('author', 'name email')
      .populate('mentions', 'name email')
      .sort({ createdAt: -1 });

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// Get activity feed
router.get('/:analysisId/activity', auth, async (req, res) => {
  try {
    const { analysisId } = req.params;

    const activity = await Activity.find({ analysisId })
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({ activity });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
});

// Remove share permission
router.delete('/:analysisId/share/:userId', auth, async (req, res) => {
  try {
    const { analysisId, userId } = req.params;

    const analysis = await Analysis.findById(analysisId);
    if (!analysis || analysis.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Permission.deleteOne({ analysisId, sharedWith: userId });

    res.json({ message: 'Share removed' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove share' });
  }
});

module.exports = router;
