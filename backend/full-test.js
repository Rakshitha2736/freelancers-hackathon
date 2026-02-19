const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function fullTest() {
  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'testpass123'
    }).catch(async () => {
      // If login fails, try signup
      console.log('Login failed, trying signup...');
      return await axios.post(`${BASE_URL}/auth/signup`, {
        email: 'test@example.com',
        password: 'testpass123',
        name: 'Test User'
      });
    });
    
    const token = loginRes.data.token;
    console.log('✓ Authenticated, token:', token.substring(0, 20) + '...');
    
    // Step 2: Test summarize
    console.log('\nStep 2: Testing summarize endpoint...');
    const rawText = `Team meeting on Project Alpha - Feb 19, 2026

Attendees: John (PM), Sarah (Designer), Mike (Developer)

Discussion:
- John emphasized the importance of meeting the Friday deadline for backend API completion
- Sarah committed to delivering UI mockups by Wednesday end of day
- Mike raised concerns about mobile responsiveness and suggested prioritizing it
- The team discussed technology stack options extensively

Decisions Made:
1. React will be used for the frontend framework
2. Node.js with Express for the backend
3. Mobile-first approach for all designs

Action Items:
- John: Complete backend API endpoints by Friday 5 PM
- Sarah: Design and present UI mockups by Wednesday
- Mike: Set up development environment by tomorrow
- Team: Deploy to staging environment next Monday
- John: Schedule follow-up meeting for next week

Notes:
The client is expecting a demo next month, so timeline is critical.`;

    const summarizeRes = await axios.post(
      `${BASE_URL}/analyses/generate`,
      { rawText },
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✓✓✓ SUCCESS!');
    console.log('\nSummary:', summarizeRes.data.analysis.summary);
    console.log('\nDecisions:', summarizeRes.data.analysis.decisions);
    console.log('\nTasks found:', summarizeRes.data.analysis.tasks.length);
    console.log('\nFirst 3 tasks:');
    summarizeRes.data.analysis.tasks.slice(0, 3).forEach((task, i) => {
      console.log(`  ${i+1}. ${task.description} (${task.priority}) - ${task.owner || 'Unassigned'}`);
    });
    
    console.log('\n✓✓✓ ALL TESTS PASSED - Summarize feature is working!');
    return true;
    
  } catch (err) {
    console.error('\n✗✗✗ ERROR:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Response:', err.response.data);
    }
    console.error('\nFull error:', err);
    return false;
  }
}

fullTest();
