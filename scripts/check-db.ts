import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadflow');
  
  const users = await mongoose.connection.db.collection('users').find({ role: 'agent' }).toArray();
  console.log('Agents count:', users.length);
  if (users.length > 0) {
    console.log('Sample agent createdBy:', typeof users[0].createdBy, users[0].createdBy);
    console.log('Is createdBy an ObjectId instance?', users[0].createdBy instanceof mongoose.Types.ObjectId);
    console.log('Full agent:', JSON.stringify(users[0], null, 2));
  }
  
  const admins = await mongoose.connection.db.collection('users').find({ role: 'admin' }).toArray();
  console.log('Admins count:', admins.length);
  if (admins.length > 0) {
    console.log('Admin ID:', admins[0]._id, typeof admins[0]._id);
  }

  process.exit(0);
}

run().catch(console.error);
