const AuditLog = require('../models/AuditLog');

/**
 * Middleware to log audit events
 */
const auditLog = async (userId, userEmail, eventType, status = 'success', description = '', req = null) => {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    await AuditLog.create({
      userId,
      userEmail,
      eventType,
      status,
      description,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    // Log error but don't fail the request
    console.error('Audit log error:', err);
  }
};

/**
 * Get audit logs for a user
 */
const getUserAuditLogs = async (userId, limit = 50) => {
  try {
    return await AuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-userAgent')
      .lean();
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return [];
  }
};

/**
 * Get recent auth events
 */
const getAuthEvents = async (limit = 100) => {
  try {
    return await AuditLog.find({
      eventType: {
        $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SIGNUP', 'ACCOUNT_LOCKED'],
      },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-userAgent')
      .lean();
  } catch (err) {
    console.error('Error fetching auth events:', err);
    return [];
  }
};

module.exports = {
  auditLog,
  getUserAuditLogs,
  getAuthEvents,
};
