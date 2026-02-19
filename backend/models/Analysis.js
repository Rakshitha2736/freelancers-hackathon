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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Analysis', analysisSchema);
