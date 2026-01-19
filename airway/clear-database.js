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

    // Get all user-defined tables (exclude system tables)
    console.log('📋 Finding all tables...\n');
    const [tables] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `, { transaction });

    if (tables.length === 0) {
      console.log('⚠️  No tables found in the database.\n');
      await transaction.commit();
      await sequelize.close();
      return;
    }

    const tableNames = tables.map(t => t.tablename);
    console.log(`   Found ${tableNames.length} tables: ${tableNames.join(', ')}\n`);

    console.log('🗑️  Clearing all table data...\n');

    // Disable foreign key checks temporarily for safer truncation
    // Then truncate all tables with CASCADE to handle foreign keys
    // RESTART IDENTITY resets auto-increment sequences
    const tableList = tableNames.map(name => `"${name}"`).join(', ');
    
    console.log(`   Truncating ${tableNames.length} tables...`);
    await sequelize.query(
      `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`,
      { transaction }
    );

    // Commit transaction
    await transaction.commit();

    // Verify tables are empty
    console.log('\n📊 Verifying tables are empty...\n');
    
    for (const table of tableNames) {
      const [result] = await sequelize.query(
        `SELECT COUNT(*) as count FROM "${table}";`
      );
      const count = result[0].count;
      console.log(`   ${table}: ${count} rows`);
    }

    console.log('\n✅ Database cleared successfully!');
    console.log('   All tables are empty but structure is preserved.\n');
    console.log('   Tables preserved:', tableNames.join(', '), '\n');

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

