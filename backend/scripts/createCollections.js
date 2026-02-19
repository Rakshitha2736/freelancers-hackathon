require('dotenv').config();
const mongoose = require('mongoose');

const REQUIRED_COLLECTIONS = ['users', 'analyses'];

const connectAndCreate = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const existing = await db.listCollections().toArray();
    const existingNames = new Set(existing.map((c) => c.name));

    for (const name of REQUIRED_COLLECTIONS) {
      if (!existingNames.has(name)) {
        await db.createCollection(name);
        console.log(`Created collection: ${name}`);
      } else {
        console.log(`Collection already exists: ${name}`);
      }
    }

    console.log('Collection setup complete.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Failed to create collections:', err.message);
    process.exit(1);
  }
};

connectAndCreate();
