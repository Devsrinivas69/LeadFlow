import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env.local');
  process.exit(1);
}

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'agent';
  mobileNumber: string;
  isActive: boolean;
}

async function seed() {
  console.log('🌱 Starting seed...\n');

  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  const usersCollection = db!.collection('users');

  // Check if already seeded
  const existingAdmin = await usersCollection.findOne({ email: 'admin@leadflow.com' });
  if (existingAdmin) {
    console.log('⚠️  Database already seeded. Skipping.\n');
    console.log('   Admin: admin@leadflow.com / Admin@123');
    await mongoose.disconnect();
    process.exit(0);
  }

  const users: SeedUser[] = [
    {
      name: 'Admin',
      email: 'admin@leadflow.com',
      password: 'Admin@123',
      role: 'admin',
      mobileNumber: '+919876543210',
      isActive: true,
    },
    {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@leadflow.com',
      password: 'Agent@123',
      role: 'agent',
      mobileNumber: '+919876543211',
      isActive: true,
    },
    {
      name: 'Priya Patel',
      email: 'priya.patel@leadflow.com',
      password: 'Agent@123',
      role: 'agent',
      mobileNumber: '+919876543212',
      isActive: true,
    },
    {
      name: 'Rohan Gupta',
      email: 'rohan.gupta@leadflow.com',
      password: 'Agent@123',
      role: 'agent',
      mobileNumber: '+919876543213',
      isActive: true,
    },
    {
      name: 'Sneha Reddy',
      email: 'sneha.reddy@leadflow.com',
      password: 'Agent@123',
      role: 'agent',
      mobileNumber: '+919876543214',
      isActive: true,
    },
    {
      name: 'Vikram Singh',
      email: 'vikram.singh@leadflow.com',
      password: 'Agent@123',
      role: 'agent',
      mobileNumber: '+919876543215',
      isActive: true,
    },
  ];

  console.log('Creating users:\n');

  let adminId: unknown = null;

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 12);
    const now = new Date();

    const doc: Record<string, unknown> = {
      name: user.name,
      email: user.email,
      password: hashedPassword,
      role: user.role,
      mobileNumber: user.mobileNumber,
      isActive: user.isActive,
      createdAt: now,
      updatedAt: now,
    };

    // Link agents to the admin via createdBy
    if (user.role === 'agent' && adminId) {
      doc.createdBy = adminId;
    }

    const result = await usersCollection.insertOne(doc);

    // Capture the admin's generated _id
    if (user.role === 'admin') {
      adminId = result.insertedId;
    }

    console.log(
      `   ✅ ${user.role.toUpperCase().padEnd(6)} ${user.name.padEnd(20)} ${user.email.padEnd(35)} ID: ${result.insertedId}`
    );
  }

  // Create indexes
  console.log('\n📇 Creating indexes...');
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await usersCollection.createIndex({ role: 1, isActive: 1 });
  console.log('   ✅ Indexes created\n');

  console.log('─'.repeat(60));
  console.log('\n🎉 Seed complete!\n');
  console.log('   Login credentials:');
  console.log('   Admin: admin@leadflow.com / Admin@123');
  console.log('   Agent: aarav.sharma@leadflow.com / Agent@123\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
