const cron = require('node-cron');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { sendEmail, sendBatchEmails } = require('./emailService');

// Check for task deadline reminders daily at 9 AM
const taskReminderJob = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('[Scheduler] Running task reminder check...');
    
    const allAnalyses = await Analysis.find({ isConfirmed: true });
    const remindersSent = new Set();

    // Check each task
    allAnalyses.forEach(analysis => {
      analysis.tasks.forEach(task => {
        if (!task.deadline || task.status === 'Completed') return;

        const deadline = new Date(task.deadline);
        const today = new Date();
        const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

        // Send reminders 7, 3, and 1 day before deadline
        if ([7, 3, 1].includes(daysUntil)) {
          const user = analysis.userId;
          if (remindersSent.has(`${user}-${task._id}`)) return;

          sendEmail(user.email, 'taskDeadlineReminder', {
            name: user.name,
            task,
            daysUntil
          });

          remindersSent.add(`${user}-${task._id}`);
        }
      });
    });

    console.log(`[Scheduler] Sent ${remindersSent.size} reminders`);
  } catch (err) {
    console.error('[Scheduler] Task reminder error:', err);
  }
});

// Weekly digest every Monday at 9 AM
const weeklyDigestJob = cron.schedule('0 9 * * 1', async () => {
  try {
    console.log('[Scheduler] Running weekly digest...');

    const users = await User.find();
    let digestsSent = 0;

    for (const user of users) {
      const analyses = await Analysis.find({
        userId: user._id,
        isConfirmed: true,
        confirmedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      if (analyses.length === 0) continue;

      const stats = {
        totalTasks: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        completionRate: 0
      };

      const now = new Date();
      analyses.forEach(a => {
        a.tasks.forEach(t => {
          stats.totalTasks++;
          if (t.status === 'Completed') stats.completed++;
          if (t.status === 'In Progress') stats.inProgress++;
          if (t.deadline && new Date(t.deadline) < now && t.status !== 'Completed') {
            stats.overdue++;
          }
        });
      });

      stats.completionRate = stats.totalTasks > 0 
        ? Math.round((stats.completed / stats.totalTasks) * 100)
        : 0;

      await sendEmail(user.email, 'weeklyDigest', {
        name: user.name,
        stats
      });

      digestsSent++;
    }

    console.log(`[Scheduler] Sent ${digestsSent} weekly digests`);
  } catch (err) {
    console.error('[Scheduler] Weekly digest error:', err);
  }
});

// Stop all jobs
const stopScheduler = () => {
  taskReminderJob.stop();
  weeklyDigestJob.stop();
  console.log('[Scheduler] All jobs stopped');
};

module.exports = {
  taskReminderJob,
  weeklyDigestJob,
  stopScheduler
};
