const mongoose = require('mongoose');

// Permission Schema
const permissionSchema = new mongoose.Schema({
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    required: true
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['Viewer', 'Editor', 'Owner'],
    default: 'Viewer'
  },
  sharedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null = no expiration
  }
});

// Comment Schema
const commentSchema = new mongoose.Schema({
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null // null = comment on analysis, otherwise on specific task
  },
  mentions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
});

// Activity Log Schema
const activitySchema = new mongoose.Schema({
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'edited', 'confirmed', 'shared', 'commented', 'viewed'],
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Notification Schema (In-app notifications)
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Share', 'Comment', 'Mention', 'Task', 'Confirmation'],
    required: true
  },
  title: String,
  message: String,
  link: String,
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60 // Auto-delete after 30 days
  }
});

module.exports = {
  permissionSchema,
  commentSchema,
  activitySchema,
  notificationSchema
};
