#!/usr/bin/env node

/**
 * Simple script to view database data
 * Usage: node view-database.js
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

async function viewDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully!\n');

    // View Users
    console.log('📊 USERS:');
    console.log('='.repeat(80));
    const users = await sequelize.query(
      'SELECT id, name, email, role, "createdAt" FROM users ORDER BY "createdAt" DESC;',
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (users.length === 0) {
      console.log('No users found.\n');
    } else {
      console.table(users);
      console.log(`Total: ${users.length} users\n`);
    }

    // View Flights
    console.log('✈️  FLIGHTS:');
    console.log('='.repeat(80));
    const flights = await sequelize.query(
      `SELECT 
        f.id, 
        f."flightNumber", 
        f.source, 
        f.destination, 
        f."departureTime", 
        f."arrivalTime", 
        f."totalSeats", 
        f."availableSeats", 
        f.price,
        f.status,
        u.name as provider_name,
        u.email as provider_email
      FROM flights f
      LEFT JOIN users u ON f."providerId" = u.id
      ORDER BY f."departureTime" DESC;`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (flights.length === 0) {
      console.log('No flights found.\n');
    } else {
      console.table(flights);
      console.log(`Total: ${flights.length} flights\n`);
    }

    // View Bookings
    console.log('🎫 BOOKINGS:');
    console.log('='.repeat(80));
    const bookings = await sequelize.query(
      `SELECT 
        b.id, 
        u.name as user_name,
        u.email as user_email,
        f."flightNumber",
        f.source,
        f.destination,
        p.name as provider_name,
        b.seatcount as seat_count, 
        b.status, 
        b."totalPrice",
        b.bookedat as booked_at,
        b."createdAt"
      FROM bookings b
      LEFT JOIN users u ON b."userId" = u.id
      LEFT JOIN flights f ON b."flightId" = f.id
      LEFT JOIN users p ON f."providerId" = p.id
      ORDER BY b."createdAt" DESC;`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (bookings.length === 0) {
      console.log('No bookings found.\n');
    } else {
      console.table(bookings);
      console.log(`Total: ${bookings.length} bookings\n`);
    }

    // Statistics
    console.log('📈 STATISTICS:');
    console.log('='.repeat(80));
    const stats = await sequelize.query(
      `SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'USER') as customers,
        (SELECT COUNT(*) FROM users WHERE role = 'AIRWAY_PROVIDER') as providers,
        (SELECT COUNT(*) FROM flights WHERE status = 'SCHEDULED') as scheduled_flights,
        (SELECT COUNT(*) FROM flights WHERE status = 'IN_AIR') as in_air_flights,
        (SELECT COUNT(*) FROM flights WHERE status = 'COMPLETED') as completed_flights,
        (SELECT COUNT(*) FROM flights WHERE status = 'CANCELLED') as cancelled_flights,
        (SELECT COUNT(*) FROM bookings WHERE status = 'CONFIRMED') as confirmed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'BOARDED') as boarded_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'NOT_BOARDED') as not_boarded_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'CANCELLED') as cancelled_bookings,
        (SELECT SUM("totalSeats") FROM flights WHERE status = 'SCHEDULED') as total_seats,
        (SELECT SUM("availableSeats") FROM flights WHERE status = 'SCHEDULED') as available_seats,
        (SELECT SUM(seatcount) FROM bookings WHERE status = 'CONFIRMED') as booked_seats;`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    console.table(stats[0]);

    await sequelize.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

viewDatabase();
