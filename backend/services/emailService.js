const nodemailer = require('nodemailer');

// Initialize email transporter
const transporter = nodemailer.createTransporter({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Email templates
const templates = {
  taskDeadlineReminder: (user, task, daysUntil) => ({
    subject: `Task Reminder: ${task.description} - Due in ${daysUntil} days`,
    html: `
      <h2>Task Reminder</h2>
      <p>Hello ${user.name},</p>
      <p>Your task <strong>${task.description}</strong> is due in <strong>${daysUntil} days</strong>.</p>
      <p><strong>Owner:</strong> ${task.owner || 'Unassigned'}</p>
      <p><strong>Priority:</strong> ${task.priority}</p>
      <p><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()}</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">View in Dashboard</a></p>
    `
  }),

  taskAssigned: (user, task, assignedBy) => ({
    subject: `New Task Assigned: ${task.description}`,
    html: `
      <h2>New Task Assignment</h2>
      <p>Hello ${user.name},</p>
      <p><strong>${assignedBy}</strong> assigned you a new task:</p>
      <p><strong>${task.description}</strong></p>
      <p><strong>Priority:</strong> ${task.priority}</p>
      <p><strong>Deadline:</strong> ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">View Task</a></p>
    `
  }),

  weeklyDigest: (user, stats) => ({
    subject: 'Your Weekly Task Summary',
    html: `
      <h2>Weekly Summary</h2>
      <p>Hello ${user.name},</p>
      <p>Here's your task summary for this week:</p>
      <ul>
        <li><strong>Total Tasks:</strong> ${stats.totalTasks}</li>
        <li><strong>Completed:</strong> ${stats.completed}</li>
        <li><strong>In Progress:</strong> ${stats.inProgress}</li>
        <li><strong>Overdue:</strong> ${stats.overdue}</li>
        <li><strong>Completion Rate:</strong> ${stats.completionRate}%</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">View Dashboard</a></p>
    `
  }),

  analysisConfirmed: (user, analysis) => ({
    subject: `Meeting Analysis Confirmed: ${analysis.summary.substring(0, 50)}...`,
    html: `
      <h2>Meeting Analysis Confirmed</h2>
      <p>Hello ${user.name},</p>
      <p>Your meeting analysis has been confirmed with <strong>${analysis.tasks.length} tasks</strong> extracted.</p>
      <p><strong>${analysis.decisions.length} key decisions</strong> were documented.</p>
      <p><a href="${process.env.FRONTEND_URL}/analysis/${analysis._id}">View Analysis</a></p>
    `
  })
};

// Send email function
const sendEmail = async (to, template, data) => {
  try {
    const emailConfig = templates[template];
    if (!emailConfig) throw new Error('Template not found');
    
    const { subject, html } = emailConfig(emailConfig.constructor === Function ? emailConfig(data) : emailConfig(data));
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    
    console.log(`[Email] Sent ${template} to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send ${template}:`, err);
    return false;
  }
};

// Batch email sender
const sendBatchEmails = async (recipients, template, data) => {
  const results = await Promise.all(
    recipients.map(email => sendEmail(email, template, data))
  );
  return results.filter(r => r).length;
};

// Test email function
const testEmail = async (to) => {
  return sendEmail(to, 'taskAssigned', {
    name: 'Test User',
    task: {
      description: 'Test Task',
      priority: 'High',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    assignedBy: 'Test Assigner'
  });
};

module.exports = {
  sendEmail,
  sendBatchEmails,
  testEmail,
  templates
};
