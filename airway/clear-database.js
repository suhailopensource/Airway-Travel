#!/usr/bin/env node

/**
 * Script to clear all data from database tables while preserving table structures
 * Usage: node clear-database.js
 * 
 * WARNING: This will delete ALL data from all tables!
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_DATABASE || 'airway_db',
  process.env.DB_USERNAME || 'airway_user',
  process.env.DB_PASSWORD || 'airway_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
);

async function clearDatabase() {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully!\n');

    console.log('🗑️  Clearing all table data...\n');

    // Truncate all tables in one command with CASCADE
    // This handles foreign key constraints automatically
    // RESTART IDENTITY resets auto-increment sequences
    console.log('  - Truncating all tables (bookings, flights, users)...');
    await sequelize.query(
      'TRUNCATE TABLE bookings, flights, users RESTART IDENTITY CASCADE;',
      { transaction }
    );

    // Commit transaction
    await transaction.commit();

    // Verify tables are empty
    console.log('\n📊 Verifying tables are empty...\n');
    
    const [users] = await sequelize.query('SELECT COUNT(*) as count FROM users;');
    const [flights] = await sequelize.query('SELECT COUNT(*) as count FROM flights;');
    const [bookings] = await sequelize.query('SELECT COUNT(*) as count FROM bookings;');

    console.log(`  Users: ${users[0].count} rows`);
    console.log(`  Flights: ${flights[0].count} rows`);
    console.log(`  Bookings: ${bookings[0].count} rows`);

    console.log('\n✅ Database cleared successfully!');
    console.log('   All tables are empty but structure is preserved.\n');

    await sequelize.close();
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error clearing database:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Confirm before clearing
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('⚠️  WARNING: This will delete ALL data from all tables!\n   Are you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    clearDatabase();
  } else {
    console.log('❌ Operation cancelled.');
    rl.close();
    process.exit(0);
  }
});

