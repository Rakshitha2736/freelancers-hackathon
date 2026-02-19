const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Analysis = require('../models/Analysis');

describe('Authentication API', () => {
  beforeAll(async () => {
    // Connect to test DB
    const conn = mongoose.connection;
    if (conn.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should fail with duplicate email', async () => {
      await request(app)
        .post('/auth/signup')
        .send({
          name: 'User 1',
          email: 'dup@example.com',
          password: 'Password123!'
        });

      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'User 2',
          email: 'dup@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login user with correct credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
    });
  });
});

describe('Analysis API', () => {
  let token;
  let analysisId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });
    token = res.body.token;
  });

  describe('POST /analyses/generate', () => {
    it('should generate analysis from text', async () => {
      const res = await request(app)
        .post('/analyses/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rawText: 'In our meeting, we decided to implement new features. John is responsible for the API, Sarah for the frontend, and Mike will handle testing. We need to complete this by next Friday.'
        });

      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
      expect(res.body.analysis.summary).toBeDefined();
      expect(res.body.analysis.tasks.length).toBeGreaterThan(0);
      analysisId = res.body.analysis._id;
    });

    it('should fail with short text', async () => {
      const res = await request(app)
        .post('/analyses/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rawText: 'Short text'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /analyses/:id', () => {
    it('should retrieve analysis', async () => {
      const res = await request(app)
        .get(`/analyses/${analysisId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.analysis._id.toString()).toBe(analysisId.toString());
    });

    it('should fail for non-existent analysis', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/analyses/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /analyses/:id/confirm', () => {
    it('should confirm analysis', async () => {
      const res = await request(app)
        .post(`/analyses/${analysisId}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          summary: 'Updated summary',
          decisions: ['Decision 1'],
          tasks: []
        });

      expect(res.status).toBe(200);
      expect(res.body.analysis.isConfirmed).toBe(true);
    });

    it('should fail to confirm twice', async () => {
      const res = await request(app)
        .post(`/analyses/${analysisId}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          summary: 'Another summary',
          decisions: [],
          tasks: []
        });

      expect(res.status).toBe(400);
    });
  });
});

describe('Tasks API', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });
    token = res.body.token;
  });

  describe('GET /tasks', () => {
    it('should get all tasks', async () => {
      const res = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const res = await request(app)
        .get('/tasks?priority=High')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.tasks.forEach(task => {
        expect(task.priority).toBe('High');
      });
    });
  });
});

module.exports = { request, mongoose };
