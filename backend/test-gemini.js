require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('API Key starts with:', process.env.GEMINI_API_KEY?.substring(0, 15));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log('Gemini client created successfully');

async function listModels() {
  try {
    console.log('\nListing available models...');
    const models = await genAI.listModels();
    console.log('Available models:');
    for await (const model of models) {
      console.log(' -', model.name);
    }
  } catch (err) {
    console.error('Error listing models:', err.message);
  }
}

async function testAPI() {
  try {
    console.log('\nTesting with gemini-1.5-pro...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent('Say hello in one word');
    const response = await result.response;
    const text = response.text();
    
    console.log('Success!');
    console.log('Response:', text);
    return true;
  } catch (err) {
    console.error('Failed with gemini-1.5-pro:', err.message);
    
    try {
      console.log('\nTrying gemini-1.0-pro...');
      const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
      const result = await model.generateContent('Say hello in one word');
      const response = await result.response;
      const text = response.text();
      
      console.log('Success with gemini-1.0-pro!');
      console.log('Response:', text);
      return true;
    } catch (err2) {
      console.error('Failed with gemini-1.0-pro:', err2.message);
    }
  }
  return false;
}

async function run() {
  await listModels();
  await testAPI();
}

run();
