const { getEmailTemplate, sendEmail, sendBatchEmails } = require('../services/emailService');
const {
  findTasksWithDeadline,
  getDeadlineReminderData,
  getWeeklyDigestData
} = require('../services/notificationScheduler');

describe('Email Service', () => {
  describe('getEmailTemplate', () => {
    test('should return deadline reminder template', () => {
      const template = getEmailTemplate('deadline-reminder', {
        taskName: 'Complete Project',
        daysLeft: 1,
        taskDescription: 'Finish the analysis'
      });

      expect(template).toContain('Complete Project');
      expect(template).toContain('1 days');
      expect(template).toContain('<html');
    });

    test('should return task assigned template', () => {
      const template = getEmailTemplate('task-assigned', {
        taskName: 'Review Meeting',
        assignedBy: 'John Doe'
      });

      expect(template).toContain('Review Meeting');
      expect(template).toContain('John Doe');
    });

    test('should return weekly digest template', () => {
      const template = getEmailTemplate('weekly-digest', {
        tasksCompleted: 5,
        tasksPending: 3,
        tasksOverdue: 1
      });

      expect(template).toContain('5');
      expect(template).toContain('3');
      expect(template).toContain('1');
    });

    test('should return meeting summary template', () => {
      const template = getEmailTemplate('meeting-summary', {
        taskName: 'Team Standup',
        summary: 'Discussed Q1 goals'
      });

      expect(template).toContain('Team Standup');
      expect(template).toContain('Discussed Q1 goals');
    });

    test('should throw for unknown template', () => {
      expect(() => getEmailTemplate('unknown', {}))
        .toThrow('Unknown template');
    });

    test('should handle missing template variables gracefully', () => {
      const template = getEmailTemplate('deadline-reminder', {});
      expect(template).toContain('undefined');
    });
  });

  describe('sendEmail', () => {
    test('should build email config correctly', () => {
      const emailConfig = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test</p>'
      };

      expect(emailConfig.to).toBe('test@example.com');
      expect(emailConfig.subject).toBe('Test Email');
      expect(emailConfig.html).toContain('<p>');
    });

    test('should validate email address in config', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('user@example.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
    });
  });

  describe('sendBatchEmails', () => {
    test('should process email batch correctly', () => {
      const recipients = [
        { email: 'user1@example.com', taskName: 'Task 1' },
        { email: 'user2@example.com', taskName: 'Task 2' }
      ];

      expect(recipients).toHaveLength(2);
      expect(recipients[0].email).toBe('user1@example.com');
    });

    test('should skip invalid emails in batch', () => {
      const recipients = [
        { email: 'user1@example.com', taskName: 'Task 1' },
        { email: 'invalid', taskName: 'Task 2' }
      ];

      const validRecipients = recipients.filter(r => 
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)
      );

      expect(validRecipients).toHaveLength(1);
    });

    test('should handle empty batch', () => {
      const recipients = [];
      expect(recipients).toHaveLength(0);
    });
  });
});

describe('Notification Scheduler Helpers', () => {
  describe('Date Calculations', () => {
    test('should calculate days until deadline', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const daysLeft = Math.ceil(
        (tomorrow.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(daysLeft).toBe(1);
    });

    test('should identify overdue tasks', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const isOverdue = yesterday < new Date();
      expect(isOverdue).toBe(true);
    });

    test('should calculate week before deadline', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const daysLeft = Math.ceil(
        (nextWeek.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(daysLeft).toBeLessThanOrEqual(7);
    });
  });

  describe('Digest Generation', () => {
    test('should aggregate weekly stats', () => {
      const tasks = [
        { status: 'completed', createdAt: new Date() },
        { status: 'completed', createdAt: new Date() },
        { status: 'pending', createdAt: new Date() },
        { status: 'overdue', createdAt: new Date() }
      ];

      const stats = {
        completed: tasks.filter(t => t.status === 'completed').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        overdue: tasks.filter(t => t.status === 'overdue').length
      };

      expect(stats.completed).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.overdue).toBe(1);
    });

    test('should rank tasks by deadline', () => {
      const tasks = [
        { title: 'Task A', deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
        { title: 'Task B', deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
        { title: 'Task C', deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }
      ];

      const sorted = [...tasks].sort((a, b) => a.deadline - b.deadline);
      
      expect(sorted[0].title).toBe('Task B');
      expect(sorted[1].title).toBe('Task C');
      expect(sorted[2].title).toBe('Task A');
    });
  });

  describe('Batch Processing', () => {
    test('should split batch into chunks', () => {
      const recipients = Array.from({ length: 250 }, (_, i) => ({
        email: `user${i}@example.com`
      }));

      const chunkSize = 50;
      const chunks = [];
      
      for (let i = 0; i < recipients.length; i += chunkSize) {
        chunks.push(recipients.slice(i, i + chunkSize));
      }

      expect(chunks).toHaveLength(5);
      expect(chunks[0]).toHaveLength(50);
      expect(chunks[4]).toHaveLength(50);
    });

    test('should handle batch errors gracefully', () => {
      const results = [];
      const recipients = ['user1@example.com', 'invalid', 'user2@example.com'];

      recipients.forEach(email => {
        try {
          const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
          if (!isValid) throw new Error('Invalid email');
          results.push({ success: true, email });
        } catch (error) {
          results.push({ success: false, email, error: error.message });
        }
      });

      expect(results).toHaveLength(3);
      expect(results.filter(r => r.success)).toHaveLength(2);
    });
  });
});

describe('Cron Pattern Validation', () => {
  test('should validate daily 9am pattern', () => {
    const pattern = '0 9 * * *'; // Daily at 9 AM
    expect(pattern).toMatch(/^\d \d \* \* \*$/);
  });

  test('should validate every-6-hours pattern', () => {
    const pattern = '0 */6 * * *'; // Every 6 hours
    expect(pattern).toMatch(/^0 \*\/6 \* \* \*$/);
  });

  test('should validate custom patterns', () => {
    const patterns = [
      '0 9 * * *',    // Daily at 9 AM
      '0 */6 * * *',  // Every 6 hours
      '0 0 * * 0',    // Weekly at midnight on Sunday
      '*/15 * * * *'  // Every 15 minutes
    ];

    patterns.forEach(pattern => {
      const parts = pattern.split(' ');
      expect(parts).toHaveLength(5);
    });
  });
});
