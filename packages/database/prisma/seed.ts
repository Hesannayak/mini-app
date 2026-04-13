import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPhone(phone: string): string {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // Create test users
  const user1 = await prisma.user.create({
    data: {
      phone_encrypted: 'encrypted_9876543210', // Placeholder — use KMS in prod
      phone_hash: hashPhone('9876543210'),
      name: 'Rahul Sharma',
      language: 'hi',
      permission_level: 2,
      mini_score: 65,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      phone_encrypted: 'encrypted_9876543211',
      phone_hash: hashPhone('9876543211'),
      name: 'Priya Kumar',
      language: 'ta',
      permission_level: 1,
      mini_score: 42,
    },
  });

  // Create transactions for user1
  const now = new Date();
  const categories = ['food', 'transport', 'groceries', 'bills', 'entertainment', 'shopping'];
  const merchants = ['Swiggy', 'Uber', 'BigBasket', 'Jio', 'Netflix', 'Amazon'];

  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const catIdx = i % categories.length;

    await prisma.transaction.create({
      data: {
        user_id: user1.id,
        amount: Math.floor(Math.random() * 2000) + 50,
        type: Math.random() > 0.8 ? 'credit' : 'debit',
        category: categories[catIdx],
        merchant: merchants[catIdx],
        source: 'upi',
        upi_ref_id: `UPI${Date.now()}${i}`,
        timestamp: date,
      },
    });
  }

  // Create bills for user1
  await prisma.bill.create({
    data: {
      user_id: user1.id,
      biller_id: 'BBPS_ELEC_001',
      biller_name: 'Tata Power',
      bill_type: 'electricity',
      amount: 1850,
      due_date: new Date(now.getFullYear(), now.getMonth(), 25),
      status: 'pending',
      is_recurring: true,
    },
  });

  await prisma.bill.create({
    data: {
      user_id: user1.id,
      biller_id: 'BBPS_MOB_001',
      biller_name: 'Jio Prepaid',
      bill_type: 'mobile',
      amount: 399,
      due_date: new Date(now.getFullYear(), now.getMonth() + 1, 5),
      status: 'pending',
      is_recurring: true,
    },
  });

  // Create Mini Score history
  for (let week = 0; week < 8; week++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - week * 7);
    weekStart.setDay(0); // Sunday

    await prisma.miniScoreHistory.create({
      data: {
        user_id: user1.id,
        score: 60 + Math.floor(Math.random() * 10),
        bill_discipline: 70 + Math.floor(Math.random() * 15),
        spending_control: 55 + Math.floor(Math.random() * 15),
        savings_rate: 50 + Math.floor(Math.random() * 20),
        income_stability: 65 + Math.floor(Math.random() * 10),
        week_start: weekStart,
      },
    });
  }

  // Create contacts for user1
  await prisma.userContact.create({
    data: {
      user_id: user1.id,
      name: 'Sunita Sharma',
      alias: 'Maa',
      upi_id_encrypted: 'encrypted_maa@upi',
      is_trusted: true,
    },
  });

  await prisma.userContact.create({
    data: {
      user_id: user1.id,
      name: 'Vikram Sharma',
      alias: 'Papa',
      upi_id_encrypted: 'encrypted_papa@upi',
      is_trusted: true,
    },
  });

  // Create a savings goal
  await prisma.savingsGoal.create({
    data: {
      user_id: user1.id,
      name: 'Emergency Fund',
      target_amount: 50000,
      saved_amount: 12000,
      target_date: new Date(2026, 11, 31),
    },
  });

  // Create a budget
  await prisma.budget.create({
    data: {
      user_id: user1.id,
      category: 'food',
      amount: 5000,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      spent: 2300,
    },
  });

  console.log('Seed complete!');
  console.log(`Created users: ${user1.name}, ${user2.name}`);
  console.log('Created 30 transactions, 2 bills, 8 score records, 2 contacts, 1 goal, 1 budget');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
