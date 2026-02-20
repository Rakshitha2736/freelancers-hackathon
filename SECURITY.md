# Security Implementation Guide

This document describes all security hardening features implemented in the MeetingAI application.

## Table of Contents
1. [Authentication Security](#authentication-security)
2. [Account Lockout & Brute Force Protection](#account-lockout--brute-force-protection)
3. [Audit Logging](#audit-logging)
4. [Data Protection](#data-protection)
5. [Transport Security](#transport-security)
6. [Input Validation & Sanitization](#input-validation--sanitization)
7. [Deployment Checklist](#deployment-checklist)
8. [Monitoring & Response](#monitoring--response)

---

## Authentication Security

### HttpOnly Cookie-Based Authentication
- **Access Token**: 15-minute TTL, stored in HttpOnly cookie
- **Refresh Token**: 7-day TTL, stored in HttpOnly cookie with server-side hash validation
- **Token Rotation**: New refresh token issued on every refresh endpoint call
- **Server-Side Validation**: Refresh token hash validated against stored SHA256 hash

### Cookie Security Features
```
✅ httpOnly: true          - Prevents JavaScript access (XSS protection)
✅ secure: true           - Only transmitted over HTTPS in production
✅ sameSite: 'strict'     - Prevents CSRF token leakage to cross-origin
```

### Password Security
- Bcrypt hashing with salt rounds: 12
- Minimum 6 characters (enforce in frontend for UX)
- No plaintext storage

---

## Account Lockout & Brute Force Protection

### Account Lockout Policy
- **Max Failed Attempts**: 5 failed login attempts
- **Lockout Duration**: 30 minutes
- **Reset Condition**: Successful login resets counter to 0

### Implementation
```javascript
// User model tracks:
- failedLoginAttempts (number, hidden in responses)
- accountLockedUntil (timestamp, hidden in responses)

// Methods:
- user.isLocked() - checks if currently locked
- user.recordFailedLogin() - increments counter, locks if > 5
- user.resetLogin() - clears counters on success
```

### Additional Brute Force Protection
- Rate limiting: 5 auth requests per 15 minutes per IP
- Generic error messages: "Invalid email or password" (no user enumeration)
- Audit logging: All failed attempts logged with IP/user agent

---

## Audit Logging

### Events Tracked
| Event Type | Trigger | Status |
|-----------|---------|--------|
| LOGIN_SUCCESS | Successful authentication | success |
| LOGIN_FAILED | Invalid credentials | failure |
| SIGNUP | New user registration | success/failure |
| LOGOUT | User logs out | success |
| ACCOUNT_LOCKED | 5 failed attempts reached | warning |
| TOKEN_REFRESH | Auto-refresh of access token | success |
| PASSWORD_CHANGE | Password updated (future) | success/failure |

### Log Retention
- **Duration**: 90 days (auto-delete via MongoDB TTL index)
- **Index**: Efficient querying by userId, eventType, createdAt
- **PII**: Stores userEmail (hashed in future), strips userAgent from API responses

### Accessing Audit Logs
```javascript
// In API route (future endpoint):
GET /api/audit/logs?userId=...&eventType=LOGIN_FAILED&limit=50
GET /api/audit/summary - recent auth events
```

---

## Data Protection

### Sensitive Field Filtering

#### At Schema Level
```javascript
// User model fields marked select: false
- password
- refreshTokenHash
- refreshTokenIssuedAt
- failedLoginAttempts
- accountLockedUntil
```

#### In Serialization
```javascript
// User.toJSON() removes:
- password
- refreshTokenHash
- refreshTokenIssuedAt
- createdAt, updatedAt
- failedLoginAttempts
- accountLockedUntil
```

#### In Middleware
```javascript
// Auth middleware selects only: _id, name, email
User.findById(req.user.id).select('_id name email')
```

#### API Response Contracts
All auth endpoints return **only**:
```json
{
  "user": {
    "_id": "...",
    "name": "...",
    "email": "..."
  }
}
```

### No Token Leakage
✅ Access token stored only in HttpOnly cookie  
✅ Refresh token stored only in HttpOnly cookie  
✅ Tokens never in response body  
✅ Tokens never in localStorage  
✅ Token hashes validated server-side only  

---

## Transport Security

### CORS (Cross-Origin Resource Sharing)
```
Allowed Origins:
- Production: process.env.CLIENT_URL
- Development: http://localhost:3000, http://localhost:3002

Features:
✅ Whitelist-based (not wildcard)
✅ credentials: true enforced
✅ Preflight requests validated
```

### HTTPS Enforcement
**CRITICAL**: Must enable in production
```javascript
// Helmet.js sets automatically:
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
```

### Content Security Policy (CSP)
```
Frame Ancestors: 'none'           - Clickjacking protection
Script Sources: 'self'            - No inline scripts
Style Sources: 'self'             - No inline styles
```

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/signup | 5 | 15 min |
| /auth/login | 5 | 15 min |
| /api/* | 100 | 15 min |
| /analyses/* | 60 | 15 min |
| /upload | 30 | 15 min |

### Socket.io Security
✅ Cookie-based authentication via `withCredentials: true`  
✅ Validates access_token from cookies  
✅ CORS configuration with credentials  
✅ Real-time events properly scoped to user ID  

---

## Input Validation & Sanitization

### Validation Schemas
Implemented for:
- Email: `validator.isEmail()`
- Date: `validator.isISO8601()`
- Text: Min/max length, character limits
- Enum: Whitelist validation (Priority, Status, etc.)

### Sanitization
```javascript
// Used for all user input:
- validator.trim() - remove whitespace
- validator.normalizeEmail() - lowercase + trim
- String.substring() - enforce max length
- validator.escape() - prevent HTML injection
```

### Backend Input Validation
```javascript
// All routes validate:
const formattedTask = {
  description: validator.trim(data.description).substring(0, 500),
  owner: validator.normalizeEmail(data.owner),
  deadline: validator.isISO8601(data.deadline) ? data.deadline : null,
  priority: ['High', 'Medium', 'Low'].includes(data.priority) ? data.priority : 'Medium'
}
```

---

## Environment Variables

### Required (Security-Critical)
```bash
JWT_SECRET=<32-random-bytes>          # Access token signing
JWT_REFRESH_SECRET=<32-random-bytes>  # Refresh token signing
COOKIE_SECRET=<32-random-bytes>       # Cookie encryption
MONGO_URI=<production-database>       # Production MongoDB
```

### Required (Configuration)
```bash
NODE_ENV=production
PORT=3001
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Generate Secure Values
```bash
# In Node.js terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET set to random 32-byte values
- [ ] NODE_ENV=production
- [ ] MONGO_URI pointing to production database
- [ ] CLIENT_URL set to production domain only

### Infrastructure
- [ ] HTTPS/TLS certificate installed
- [ ] Secure cookie flags enabled (`secure: true`)
- [ ] CORS origins whitelist verified
- [ ] Rate limiting tuned for expected load

### Database
- [ ] MongoDB encryption at rest enabled
- [ ] Database backups configured
- [ ] Access control properly configured
- [ ] Audit logs TTL index active

### Monitoring
- [ ] Error logging configured
- [ ] Audit log monitoring active
- [ ] Failed login alerts configured
- [ ] Rate limit breach alerts configured

### Documentation
- [ ] Security documentation reviewed
- [ ] Team trained on security procedures
- [ ] Incident response plan documented
- [ ] Password rotation policy defined

---

## Monitoring & Response

### Key Security Metrics
```
Monitor:
- Failed login attempts (alert if > 10 in 5 min)
- Account lockouts (alert if > 5 per hour)
- Rate limit violations
- Password change frequency
- Admin/sensitive operation access
```

### Alert Thresholds
```
WARNING: 10+ failed logins in 5 minutes
CRITICAL: 20+ failed logins in 1 hour
WARNING: 5+ account lockouts per hour
CRITICAL: API rate limited > 100 times in 15 min
```

### Incident Response
1. **Detection**: Monitor audit logs and alerts
2. **Analysis**: Review IP addresses, user agents, patterns
3. **Response**: Lock accounts if compromised, reset passwords
4. **Prevention**: Ban IPs if needed, adjust rate limits
5. **Notification**: Inform affected users

---

## Known Limitations & Future Enhancements

### Current Implementation
✅ HttpOnly cookie-based auth  
✅ Account lockout policy  
✅ Audit logging  
✅ Input validation  
✅ Rate limiting  
✅ CORS security  
✅ Password hashing (bcrypt)  

### Recommended Future Enhancements
⬜ CSRF token implementation (double-submit pattern)  
⬜ Two-Factor Authentication (TOTP)  
⬜ IP Whitelisting for sensitive operations  
⬜ Advanced threat detection (SIEM integration)  
⬜ Dependency scanning in CI/CD  
⬜ Penetration testing program  
⬜ Bug bounty program  

### npm Audit Vulnerabilities
- **Backend**: 29 high-severity (transitive in dev dependencies)
- **Frontend**: 65 high-severity (transitive in build tools)
- **Impact**: Low for production code, affects dev tooling
- **Remediation**: Post-launch maintenance (breaking changes)

---

## Security Testing

### Manual Testing
```bash
# Test account lockout:
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' \
  # Repeat 5 times → account locked

# Test audit logging:
# Check MongoDB:
db.auditlogs.find({userId: "...", eventType: "LOGIN_FAILED"}).pretty()

# Test input sanitization:
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"test@test.com","password":"secure123"}'
  # Response should sanitize the name field
```

### Automated Testing
```bash
# Run security checks:
npm audit
npm run lint

# Test auth flows:
npm test -- auth.test.js

# Integration tests:
npm run test:integration
```

---

## References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Helmet.js Security](https://helmetjs.github.io/)
- [HTTP-Only Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [rate-limit](https://github.com/nfriedly/express-rate-limit)
