require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Analysis = require('../models/Analysis');

const connect = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
};

const seed = async () => {
  try {
    await connect();

    await Analysis.deleteMany({});
    await User.deleteMany({});

    const users = await User.create([
      { name: 'Subash P', email: 'subash@example.com', password: 'Password123!' },
      { name: 'Priya S', email: 'priya@example.com', password: 'Password123!' },
      { name: 'Ravi K', email: 'ravi@example.com', password: 'Password123!' },
    ]);

    const ownerMap = {
      subash: users[0],
      priya: users[1],
      ravi: users[2],
    };

    const now = Date.now();
    const analysisDocs = [
      {
        userId: ownerMap.subash._id,
        rawText: 'Discussed Q1 roadmap, priorities, and ownership for deliverables.',
        summary: 'Team aligned on Q1 roadmap with focus on mobile features and analytics.',
        decisions: [
          'Prioritize mobile onboarding revamp',
          'Defer reporting export to Q2',
        ],
        tasks: [
          {
            description: 'Draft mobile onboarding flow',
            owner: 'Subash P',
            ownerUserId: ownerMap.subash._id,
            deadline: new Date(now + 7 * 86400000).toISOString(),
            priority: 'High',
            status: 'Pending',
            confidence: 0.9,
            isUnassigned: false,
          },
          {
            description: 'Create analytics event schema',
            owner: 'Priya S',
            ownerUserId: ownerMap.priya._id,
            deadline: new Date(now + 10 * 86400000).toISOString(),
            priority: 'Medium',
            status: 'In Progress',
            confidence: 0.8,
            isUnassigned: false,
          },
        ],
        isConfirmed: true,
        confirmedAt: new Date(now - 2 * 86400000),
      },
      {
        userId: ownerMap.priya._id,
        rawText: 'Reviewed launch checklist and open risks.',
        summary: 'Launch checklist updated with pending security review and load testing.',
        decisions: ['Lock scope for beta launch'],
        tasks: [
          {
            description: 'Schedule security review',
            owner: 'Ravi K',
            ownerUserId: ownerMap.ravi._id,
            deadline: new Date(now + 5 * 86400000).toISOString(),
            priority: 'High',
            status: 'Pending',
            confidence: 0.85,
            isUnassigned: false,
          },
          {
            description: 'Run load test for API',
            owner: '',
            ownerUserId: null,
            deadline: new Date(now + 12 * 86400000).toISOString(),
            priority: 'Medium',
            status: 'Pending',
            confidence: 0.7,
            isUnassigned: true,
          },
        ],
        isConfirmed: true,
        confirmedAt: new Date(now - 1 * 86400000),
      },
    ];

    await Analysis.create(analysisDocs);

    console.log('Seed complete.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
