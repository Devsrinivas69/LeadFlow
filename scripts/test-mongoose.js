const mongoose = require('mongoose');
const url = process.env.MONGODB_URI || 'mongodb://reddykph_db_user:5DbUP2hg9VVgRnny@ac-whetgu2-shard-00-00.bcej5s6.mongodb.net:27017,ac-whetgu2-shard-00-01.bcej5s6.mongodb.net:27017,ac-whetgu2-shard-00-02.bcej5s6.mongodb.net:27017/leadflow?ssl=true&replicaSet=atlas-rwh75m-shard-0&authSource=admin&appName=leadflow';

const userSchema = new mongoose.Schema({
  role: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function run() {
  await mongoose.connect(url);
  const users = await mongoose.connection.db.collection('users').find({ role: 'agent' }).toArray();
  console.log('Agents count:', users.length);
  for (const u of users) {
    console.log(`Agent: ${u.name}, email: ${u.email}, createdBy: ${u.createdBy}`);
  }
  process.exit(0);
}
run().catch(console.error);
