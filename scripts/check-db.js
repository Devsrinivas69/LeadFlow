const { MongoClient } = require('mongodb');
const url = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadflow';
async function run() {
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db();
  const agents = await db.collection('users').find({ role: 'agent' }).toArray();
  console.log('Agents count:', agents.length);
  if (agents.length > 0) {
    console.log('Sample agent createdBy:', typeof agents[0].createdBy, agents[0].createdBy);
    console.log('Sample agent full doc:', JSON.stringify(agents[0], null, 2));
  }
  const admins = await db.collection('users').find({ role: 'admin' }).toArray();
  console.log('Admins count:', admins.length);
  if (admins.length > 0) {
    console.log('Admin ID:', admins[0]._id, typeof admins[0]._id);
  }
  await client.close();
}
run().catch(console.error);
