// @ts-ignore - Ignore the IDE warning about mongoose types
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env.local');
  process.exit(1);
}

// Minimal schemas to bypass Next.js compilation issues in scripts
const userSchema = new mongoose.Schema({
  role: String,
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const distributedListSchema = new mongoose.Schema({
  agentId: mongoose.Schema.Types.ObjectId,
  uploadBatchId: String,
  batchLabel: String,
  firstName: String,
  phone: String,
  notes: String,
  rowIndex: Number,
  uploadedAt: Date,
});
const DistributedList = mongoose.models.DistributedList || mongoose.model('DistributedList', distributedListSchema);

async function seedLeads() {
  console.log('🌱 Starting lead generation...\n');

  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Connected to MongoDB\n');

  // Fetch all agents
  const agents = await User.find({ role: 'agent' });
  
  if (agents.length === 0) {
    console.error('❌ No agents found in the database. Run seed.ts first!');
    process.exit(1);
  }

  console.log(`Found ${agents.length} agents. Generating data...`);

  // Clear existing leads just in case
  await DistributedList.deleteMany({});
  console.log('🧹 Cleared existing leads (if any)');

  const dummyLeads = [];
  let totalLeads = 0;

  // Generate 3 past batches
  for (let batch = 1; batch <= 3; batch++) {
    const batchId = `BATCH-${Date.now() - batch * 86400000}`; // past days
    const batchLabel = `Campaign Q${batch} - Tech Startup Leads`;
    const numLeads = 25 + Math.floor(Math.random() * 20); // 25-45 leads per batch
    
    console.log(`\n📦 Batch ${batch}: ${batchLabel} (${numLeads} leads)`);

    for (let i = 0; i < numLeads; i++) {
      // Round robin assignment
      const agent = agents[i % agents.length];
      
      const firstNames = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Elijah', 'Sophia', 'James', 'Isabella', 'William', 'Mia', 'Benjamin', 'Amelia', 'Lucas', 'Harper'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
      
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      dummyLeads.push({
        agentId: agent._id,
        uploadBatchId: batchId,
        batchLabel,
        firstName: `${fName} ${lName}`,
        phone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
        notes: Math.random() > 0.5 ? 'Interested in pro tier' : 'Follow up next week',
        rowIndex: i + 1,
        uploadedAt: new Date(Date.now() - batch * 86400000 + i * 1000), 
      });
      totalLeads++;
    }
  }

  // Insert all dummy leads
  await DistributedList.insertMany(dummyLeads);
  
  console.log(`\n🎉 Successfully inserted ${totalLeads} dummy leads across ${agents.length} agents!`);

  await mongoose.disconnect();
  process.exit(0);
}

seedLeads().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
