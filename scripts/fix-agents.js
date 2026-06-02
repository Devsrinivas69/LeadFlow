const mongoose = require('mongoose');

const url = 'mongodb://reddykph_db_user:5DbUP2hg9VVgRnny@ac-whetgu2-shard-00-00.bcej5s6.mongodb.net:27017,ac-whetgu2-shard-00-01.bcej5s6.mongodb.net:27017,ac-whetgu2-shard-00-02.bcej5s6.mongodb.net:27017/leadflow?ssl=true&replicaSet=atlas-rwh75m-shard-0&authSource=admin&appName=leadflow';

async function run() {
  await mongoose.connect(url);
  const db = mongoose.connection.db;

  const admin = await db.collection('users').findOne({ role: 'admin' });
  if (!admin) {
    console.log('❌ No admin found!');
    process.exit(1);
  }
  console.log('✅ Admin found:', admin.email, '| ID:', admin._id);

  const result = await db.collection('users').updateMany(
    { role: 'agent', createdBy: { $exists: false } },
    { $set: { createdBy: admin._id } }
  );
  console.log(`✅ Updated ${result.modifiedCount} agents to be owned by admin`);

  const agents = await db.collection('users').find({ role: 'agent' }).toArray();
  console.log('\nAll agents after fix:');
  for (const a of agents) {
    console.log(`  - ${a.name} | createdBy: ${a.createdBy}`);
  }

  process.exit(0);
}
run().catch(console.error);
