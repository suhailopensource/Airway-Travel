#!/usr/bin/env node

/**
 * Script to reset a user's password
 * Usage: node reset-password.js <email> <newPassword>
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
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

async function resetPassword(email, newPassword) {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully!\n');

    // Find user
    const users = await sequelize.query(
      `SELECT id, email, name, role FROM users WHERE email = :email`,
      {
        replacements: { email },
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    if (users.length === 0) {
      console.log(`❌ User with email ${email} not found.`);
      process.exit(1);
    }

    const user = users[0];
    console.log(`📧 Found user: ${user.name} (${user.email})`);
    console.log(`🔑 Resetting password...`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`✅ Password hashed successfully`);

    // Update password
    await sequelize.query(
      `UPDATE users SET password = :password WHERE email = :email`,
      {
        replacements: { password: hashedPassword, email },
        type: Sequelize.QueryTypes.UPDATE,
      },
    );

    console.log(`✅ Password reset successfully for ${email}`);
    console.log(`\nYou can now login with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}\n`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node reset-password.js <email> <newPassword>');
  console.log('Example: node reset-password.js suhail@test.com suhail123');
  process.exit(1);
}

resetPassword(email, password);

