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
