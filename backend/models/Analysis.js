const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  description: { type: String, default: '' },
  owner: { type: String, default: '' },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deadline: { type: Date },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  confidence: { type: Number, default: null },
  isUnassigned: { type: Boolean, default: true },
  fromChunk: { type: Number, default: undefined }, // Which chunk this task came from (if chunked)
});

const analysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rawText: { type: String, required: true },
    summary: { type: String, default: '' },
    decisions: [{ type: String }],
    tasks: [taskSchema],
    isConfirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date, default: null },
    // Meeting Metadata (Phase 1)
    meetingMetadata: {
      title: { type: String, default: '' },
      date: { type: Date, default: () => new Date() },
      participants: [{ type: String }],
      meetingType: { 
        type: String, 
        enum: ['Standup', 'Planning', 'Review', 'Retrospective', '1:1', 'Other'],
        default: 'Other'
      },
      location: { type: String, default: '' },
      duration: { type: Number, default: 0 }, // in minutes
    },
    // File Upload (Phase 2)
    file: {
      originalName: { type: String, default: null },
      mimeType: { type: String, default: null },
      size: { type: Number, default: null },
      uploadedAt: { type: Date, default: null },
    },
    // Notion Integration (Phase 3)
    integrations: {
      notion: {
        exported: { type: Boolean, default: false },
        pageId: { type: String, default: null },
        exportedAt: { type: Date, default: null },
        exportStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
      },
      trello: {
        exported: { type: Boolean, default: false },
        boardId: { type: String, default: null },
        cardIds: [{ type: String }],
        exportedAt: { type: Date, default: null },
        exportStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
      },
    },
    metadata: {
      chunked: { type: Boolean, default: false },
      totalChunks: { type: Number, default: 1 },
      processedAt: { type: Date, default: null },
      textLength: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Analysis', analysisSchema);
