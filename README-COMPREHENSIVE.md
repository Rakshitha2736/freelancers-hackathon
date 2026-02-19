# Freelancers Hackathon - AI Task Management Platform

A comprehensive task management and analysis platform with AI-powered summarization, real-time collaboration, and production-ready infrastructure.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6.0+
- npm or yarn

### Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/freelancers-hackathon.git
   cd freelancers-hackathon
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Setup environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   
   # Frontend
   cd ../frontend
   cp .env.example .env.local
   ```

4. **Start services**
   ```bash
   # Terminal 1 - Backend Server
   cd backend
   npm start
   
   # Terminal 2 - Frontend Development Server
   cd frontend
   npm start
   ```

5. **Access application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

---

## 📋 Project Structure

```
freelancers-hackathon/
├── backend/
│   ├── config/              # Database and configuration
│   ├── middleware/          # Express middleware (auth, security)
│   ├── models/              # MongoDB schemas
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic (email, notifications)
│   ├── utils/               # Utilities (cache, performance)
│   ├── scripts/             # Setup and seeding scripts
│   ├── tests/               # Unit and integration tests
│   ├── server.js            # Express server entry point
│   └── package.json
│
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # State management
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   ├── utils/           # Utility functions
│   │   ├── __tests__/       # Component tests
│   │   ├── App.js           # Main app component
│   │   └── index.js         # React entry point
│   ├── e2e/                 # End-to-end tests
│   └── package.json
│
├── docs/                    # Documentation
│   ├── DEPLOYMENT.md        # Production deployment guide
│   ├── TESTING.md          # Testing guide
│   ├── SETUP.md            # Initial setup
│   └── EMAIL_CONFIG.md     # Email service configuration
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # GitHub Actions pipeline
│
├── playwright.config.js     # E2E test configuration
└── README.md               # This file
```

---

## 🎯 Features

### Core Features
- ✅ **AI-Powered Summarization** - Extract key insights from meeting transcripts
- ✅ **Task Management** - Create, organize, and track tasks with priorities
- ✅ **Analytics Dashboard** - Visual insights with charts and metrics
- ✅ **Kanban Board** - Drag-and-drop task management
- ✅ **Full-Text Search** - Search across all analyses and tasks

### Real-Time Features
- ✅ **WebSocket Integration** - Live updates across browsers
- ✅ **Collaboration** - Share analyses with team members
- ✅ **Comments & Discussion** - Thread-based comments
- ✅ **Activity Tracking** - Audit trail of all changes

### Productivity
- ✅ **Dark Mode** - Theme toggle with persistence
- ✅ **Auto-Save Drafts** - Never lose your work
- ✅ **Keyboard Shortcuts** - Speed up workflows
- ✅ **Export Options** - JSON, CSV, Markdown formats
- ✅ **Task Templates** - Pre-built task templates

### Administrative
- ✅ **Email Notifications** - Deadline reminders and digests
- ✅ **Scheduled Jobs** - Cron-based task scheduling
- ✅ **Rate Limiting** - API protection against abuse
- ✅ **Input Validation** - Security & data validation
- ✅ **Caching** - Performance optimization (Redis-ready)

---

## 🔧 Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Database**: MongoDB 6.0+
- **Authentication**: JWT + bcrypt
- **Real-Time**: Socket.io
- **AI**: Google Gemini API
- **Email**: Nodemailer (Gmail/SendGrid)
- **Testing**: Jest + Supertest
- **Security**: Helmet, express-rate-limit, validator

### Frontend
- **Framework**: React 19
- **Routing**: React Router 7
- **State**: Context API
- **Styling**: CSS3 + Responsive Design
- **Charts**: Recharts
- **Real-Time**: Socket.io Client
- **Testing**: Jest + React Testing Library + Playwright

### DevOps
- **CI/CD**: GitHub Actions
- **Environment**: Docker-ready
- **Deployment**: Heroku/AWS/Digital Ocean ready
- **Monitoring**: Sentry-integrated

---

## 📚 Documentation

### Setup & Configuration
- [Initial Setup Guide](docs/SETUP.md) - First-time setup instructions
- [Email Configuration](docs/EMAIL_CONFIG.md) - Configure email services
- [Environment Variables](docs/SETUP.md#environment-variables) - All env vars explained

### Deployment & Operations
- [Production Deployment Guide](docs/DEPLOYMENT.md) - Deploy to production
- [Database Configuration](docs/DEPLOYMENT.md#database-configuration) - MongoDB setup
- [Security Checklist](docs/DEPLOYMENT.md#security-checklist) - Pre-deployment checks
- [Performance Tuning](docs/DEPLOYMENT.md#performance-tuning) - Optimize performance
- [Monitoring & Logging](docs/DEPLOYMENT.md#monitoring--logging) - Track metrics

### Testing
- [Testing Guide](docs/TESTING.md) - Comprehensive testing documentation
  - Unit tests for utilities
  - Integration tests for APIs
  - E2E tests for user workflows
  - Test coverage targets

---

## 🧪 Testing

### Run All Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npx playwright test
```

### Test Coverage
```bash
# Backend coverage report
cd backend
npm run test:coverage

# Frontend coverage report
cd frontend
npm run test:coverage
```

### Watch Mode (Development)
```bash
# Backend
cd backend
npm run test:watch

# Frontend
cd frontend
npm test -- --watch
```

### Specific Tests
```bash
# Backend unit tests
npm run test:unit

# Backend integration tests
npm run test:integration

# Frontend E2E tests
npx playwright test --headed --grep "Authentication"
```

### CI/CD Pipeline
Tests automatically run on:
- Push to `main` or `develop` branches
- All pull requests

View pipeline: `.github/workflows/ci-cd.yml`

---

## 🔐 Security

### Authentication
- JWT tokens with 7-day expiration
- Bcrypt password hashing (10 rounds)
- Secure session management

### Authorization
- Role-based access control (Owner, Editor, Viewer)
- Permission-based sharing system
- Activity audit trail

### Input Validation
- Email format validation
- XSS prevention
- SQL injection protection
- Request size limits

### Rate Limiting
- General API: 100 req/15min
- Login endpoint: 5 attempts/15min
- Sensitive operations: 10 req/5min

### Environment Security
- Secrets in `.env` (never in code)
- `.env` in `.gitignore`
- Different keys for dev/staging/prod

---

## 📊 API Endpoints

### Authentication
```
POST   /api/auth/signup       - Register new user
POST   /api/auth/login        - Login user
POST   /api/auth/logout       - Logout (clear token)
GET    /api/auth/me           - Current user info
```

### Analyses
```
POST   /api/analyses          - Create analysis
GET    /api/analyses          - List user's analyses
GET    /api/analyses/:id      - Get analysis details
PUT    /api/analyses/:id      - Update analysis
DELETE /api/analyses/:id      - Delete analysis
GET    /api/analyses/search   - Full-text search
```

### Tasks
```
GET    /api/tasks             - List tasks
POST   /api/tasks             - Create task
PUT    /api/tasks/:id         - Update task
DELETE /api/tasks/:id         - Delete task
PATCH  /api/tasks/bulk        - Bulk operations
```

### Collaboration
```
POST   /api/collaboration/share              - Share analysis
GET    /api/collaboration/shared-with-me     - Shared analyses
POST   /api/collaboration/:id/comments       - Add comment
GET    /api/collaboration/:id/comments       - Get comments
DELETE /api/collaboration/permissions/:id    - Revoke access
```

### Analytics
```
GET    /api/analytics/overview  - Dashboard metrics
GET    /api/analytics/chart-data - Chart data
```

---

## 🚀 Deployment

### Heroku (Recommended for beginners)
```bash
heroku login
heroku create your-app-name
heroku addons:create mongolab:sandbox
heroku config:set NODE_ENV=production JWT_SECRET=your-secret
git push heroku main
```

### AWS EC2
See [Production Deployment Guide](docs/DEPLOYMENT.md#option-2-deploy-to-aws-ec2)

### Docker
```bash
docker build -t freelancers-app .
docker run -d -p 5000:5000 --env-file .env freelancers-app
```

### Digital Ocean / Other VPS
See [Production Deployment Guide](docs/DEPLOYMENT.md)

---

## 📈 Performance

### Key Metrics
- **API Response Time**: Target <200ms
- **Page Load Time**: Target <3s
- **WebSocket Connection**: <100ms
- **Database Query**: Target <100ms

### Optimization Strategies
1. **Caching** - In-memory cache (Redis-ready)
2. **Indexing** - Database indexes on frequent queries
3. **Compression** - Gzip response compression
4. **CDN** - Static asset delivery
5. **Code Splitting** - React lazy loading

See [Performance Optimization](docs/DEPLOYMENT.md#performance-tuning) for details.

---

## 🛠️ Development

### Scripts

#### Backend
```bash
npm start              # Start server
npm run dev           # Development with auto-reload
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run lint          # Check code style
npm run lint:fix      # Fix code style issues
npm run seed          # Seed database
```

#### Frontend
```bash
npm start              # Development server
npm run build          # Production build
npm test              # Run tests
npm run test:coverage # Coverage report
npm run lint          # Check code style
```

#### Root
```bash
npm install           # Install all dependencies
npm test              # Run all tests
npx playwright test   # Run E2E tests
```

---

## 🐛 Troubleshooting

### Backend Issues
- **Cannot connect to MongoDB**: Check `MONGODB_URI` in `.env`
- **Port 5000 already in use**: `lsof -i :5000 && kill -9 <PID>`
- **Cannot send emails**: Verify email config in `.env`
- **WebSocket not connecting**: Check CORS settings

### Frontend Issues
- **API 404 errors**: Ensure backend is running on port 5000
- **Blank page**: Check browser console for JavaScript errors
- **Socket.io not connecting**: Check `REACT_APP_SOCKET_URL` in `.env.local`

### Database Issues
- **Indexes missing**: Run `npm run create:collections`
- **Test database errors**: Clear database: `mongo mongodb://localhost:27017/test --eval "db.dropDatabase()"`

### Help & Support
1. Check [`docs/`](docs/) folder
2. Search existing GitHub issues
3. Create new issue with reproduction steps

---

## 📝 Environment Variables

### Backend (`.env`)
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/freelancers-hackathon
JWT_SECRET=your-secret-key-32-chars
GOOGLE_API_KEY=your-gemini-api-key
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Frontend (`.env.local`)
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_DEBUG=true
```

See [Environment Variables](docs/DEPLOYMENT.md#environment-setup) for complete list.

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Add tests for new features
- Update documentation

---

## 👥 Team

- **AI Integration**: Google Gemini for summarization
- **Real-Time**: Socket.io for live updates
- **Security**: JWT + bcrypt + rate limiting

---

## 📞 Contact & Support

- **Report Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@example.com

---

## 🎓 Learning Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Socket.io Guide](https://socket.io/docs/)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Version**: 1.0.0  
**Last Updated**: 2025-03-01  
**Status**: ✅ Production Ready

