#!/usr/bin/env node

/**
 * Simulate Concurrent Bookings
 * 
 * This script simulates multiple users trying to book the same flight simultaneously.
 * 
 * Scenario:
 * - 11 users try to book the same flight
 * - Each user tries to book 10 seats
 * - Flight has limited seats (100 seats = only 10 bookings can succeed)
 * 
 * Usage:
 *   node simulate-concurrent-bookings.js
 * 
 * Configuration:
 *   Edit the CONFIG section below to set:
 *   - API_BASE_URL: Your backend URL (default: http://localhost:3000)
 *   - FLIGHT_ID: The flight ID to book (or leave null to create a test flight)
 *   - NUM_USERS: Number of users to simulate (default: 11)
 *   - SEATS_PER_USER: Seats each user tries to book (default: 10)
 *   - FLIGHT_TOTAL_SEATS: Total seats in the flight (default: 100)
 */

const axios = require('axios');
const https = require('https');

// ============================================
// CONFIGURATION - EDIT THESE VALUES
// ============================================

const CONFIG = {
  // Backend API URL
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  
  // Flight to book (leave null to create a test flight automatically)
  FLIGHT_ID: process.env.FLIGHT_ID || 'a55fbfda-7fe7-4035-b637-64a43d206b0b',
  
  // Number of users to simulate
  NUM_USERS: parseInt(process.env.NUM_USERS || '11'),
  
  // Seats each user tries to book
  SEATS_PER_USER: parseInt(process.env.SEATS_PER_USER || '10'),
  
  // Total seats in the flight (for test flight creation)
  FLIGHT_TOTAL_SEATS: parseInt(process.env.FLIGHT_TOTAL_SEATS || '100'),
  
  // Provider credentials (for creating test flight)
  PROVIDER_EMAIL: process.env.PROVIDER_EMAIL || 'indigo@test.com',
  PROVIDER_PASSWORD: process.env.PROVIDER_PASSWORD || 'indigo123',
  PROVIDER_NAME: process.env.PROVIDER_NAME || 'INDIGO',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create axios client with cookie support
 * Each client maintains its own cookie jar (session)
 */
function createAxiosClient() {
  const client = axios.create({
    baseURL: CONFIG.API_BASE_URL,
    withCredentials: true, // Enable cookie support
    httpsAgent: new https.Agent({
      rejectUnauthorized: false, // For self-signed certificates
    }),
    timeout: 30000, // 30 seconds timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Store cookies manually
  let cookies = '';

  // Intercept requests to add cookies
  client.interceptors.request.use((config) => {
    if (cookies) {
      config.headers.Cookie = cookies;
    }
    return config;
  });

  // Intercept responses to save cookies
  client.interceptors.response.use((response) => {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      cookies = setCookieHeaders
        .map(cookie => cookie.split(';')[0])
        .join('; ');
    }
    return response;
  });

  return client;
}

/**
 * Register a new user
 */
async function registerUser(client, userNumber) {
  const email = `user${userNumber}@test.com`;
  const password = `password${userNumber}`;
  const name = `Test User ${userNumber}`;

  try {
    const response = await client.post('/auth/register', {
      email,
      password,
      name,
      role: 'USER',
    });

    return {
      success: true,
      user: response.data,
      email,
      password,
    };
  } catch (error) {
    // User might already exist, try to login instead
    if (error.response?.status === 400) {
      try {
        const loginResponse = await client.post('/auth/login', {
          email,
          password,
        });
        return {
          success: true,
          user: loginResponse.data,
          email,
          password,
        };
      } catch (loginError) {
        return {
          success: false,
          error: loginError.response?.data?.message || loginError.message,
        };
      }
    }
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Login as provider and create a test flight
 */
async function createTestFlight(client) {
  try {
    // Register/Login as provider
    try {
      await client.post('/auth/register', {
        email: CONFIG.PROVIDER_EMAIL,
        password: CONFIG.PROVIDER_PASSWORD,
        name: CONFIG.PROVIDER_NAME,
        role: 'AIRWAY_PROVIDER',
      });
    } catch (error) {
      // Provider might exist, try login
      if (error.response?.status === 400) {
        await client.post('/auth/login', {
          email: CONFIG.PROVIDER_EMAIL,
          password: CONFIG.PROVIDER_PASSWORD,
        });
      } else {
        throw error;
      }
    }

    // Create a test flight
    const departureTime = new Date();
    departureTime.setDate(departureTime.getDate() + 1); // Tomorrow
    departureTime.setHours(10, 0, 0, 0);

    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(13, 0, 0, 0);

    const flightResponse = await client.post('/flights', {
      flightNumber: 'TEST-001',
      source: 'New York',
      destination: 'Los Angeles',
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      totalSeats: CONFIG.FLIGHT_TOTAL_SEATS,
      price: 299.99,
    });

    return flightResponse.data.id;
  } catch (error) {
    throw new Error(`Failed to create test flight: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Book seats for a user
 */
async function bookSeats(client, flightId, seatCount, userNumber) {
  const startTime = Date.now();
  
  try {
    const response = await client.post('/bookings', {
      flightId,
      seatCount,
    });

    const duration = Date.now() - startTime;
    
    return {
      success: true,
      userNumber,
      booking: response.data,
      duration,
      message: `✅ User ${userNumber} booked ${seatCount} seats successfully`,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error.response?.data?.message || error.message;
    
    return {
      success: false,
      userNumber,
      duration,
      error: errorMessage,
      message: `❌ User ${userNumber} failed: ${errorMessage}`,
    };
  }
}

// ============================================
// MAIN SIMULATION
// ============================================

async function simulateConcurrentBookings() {
  console.log('🚀 Starting Concurrent Booking Simulation\n');
  console.log('='.repeat(80));
  console.log('Configuration:');
  console.log(`  API URL: ${CONFIG.API_BASE_URL}`);
  console.log(`  Number of Users: ${CONFIG.NUM_USERS}`);
  console.log(`  Seats per User: ${CONFIG.SEATS_PER_USER}`);
  console.log(`  Total Seats Needed: ${CONFIG.NUM_USERS * CONFIG.SEATS_PER_USER}`);
  console.log(`  Flight Total Seats: ${CONFIG.FLIGHT_TOTAL_SEATS}`);
  console.log(`  Expected Successful Bookings: ${Math.floor(CONFIG.FLIGHT_TOTAL_SEATS / CONFIG.SEATS_PER_USER)}`);
  console.log(`  Expected Failed Bookings: ${CONFIG.NUM_USERS - Math.floor(CONFIG.FLIGHT_TOTAL_SEATS / CONFIG.SEATS_PER_USER)}`);
  console.log('='.repeat(80));
  console.log();

  let flightId = CONFIG.FLIGHT_ID;

  // Step 1: Create test flight if needed
  if (!flightId) {
    console.log('📝 Step 1: Creating test flight...');
    const providerClient = createAxiosClient();
    try {
      flightId = await createTestFlight(providerClient);
      console.log(`✅ Test flight created: ${flightId}`);
      console.log(`   Flight has ${CONFIG.FLIGHT_TOTAL_SEATS} total seats\n`);
    } catch (error) {
      console.error(`❌ Failed to create test flight: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log(`📝 Using existing flight: ${flightId}\n`);
  }

  // Step 2: Register/Login all users
  console.log(`👥 Step 2: Registering/Logging in ${CONFIG.NUM_USERS} users...`);
  const users = [];
  
  for (let i = 1; i <= CONFIG.NUM_USERS; i++) {
    const client = createAxiosClient();
    const result = await registerUser(client, i);
    
    if (result.success) {
      users.push({
        number: i,
        client,
        email: result.email,
        user: result.user,
      });
      process.stdout.write(`   ✅ User ${i} ready\r`);
    } else {
      console.error(`\n   ❌ Failed to register user ${i}: ${result.error}`);
    }
  }
  
  console.log(`\n✅ ${users.length} users ready for booking\n`);

  if (users.length === 0) {
    console.error('❌ No users available. Exiting.');
    process.exit(1);
  }

  // Step 3: Get initial flight availability
  console.log('📊 Step 3: Checking initial flight availability...');
  try {
    const availabilityClient = createAxiosClient();
    const availability = await availabilityClient.get(`/flights/${flightId}/availability`);
    console.log(`   Total Seats: ${availability.data.totalSeats}`);
    console.log(`   Available Seats: ${availability.data.availableSeats}`);
    console.log(`   Booked Seats: ${availability.data.bookedSeats}\n`);
  } catch (error) {
    console.log(`   ⚠️  Could not check availability: ${error.message}\n`);
  }

  // Step 4: Simulate concurrent bookings
  console.log(`🎫 Step 4: Simulating ${users.length} concurrent booking requests...`);
  console.log(`   Each user trying to book ${CONFIG.SEATS_PER_USER} seats\n`);
  
  const startTime = Date.now();
  
  // Launch all booking requests simultaneously
  const bookingPromises = users.map((user) =>
    bookSeats(user.client, flightId, CONFIG.SEATS_PER_USER, user.number)
  );

  // Wait for all bookings to complete
  const results = await Promise.all(bookingPromises);
  const totalDuration = Date.now() - startTime;

  // Step 5: Display results
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESULTS');
  console.log('='.repeat(80));
  console.log();

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful Bookings: ${successful.length}`);
  successful.forEach(result => {
    console.log(`   ${result.message} (${result.duration}ms)`);
  });

  console.log();
  console.log(`❌ Failed Bookings: ${failed.length}`);
  failed.forEach(result => {
    console.log(`   ${result.message} (${result.duration}ms)`);
  });

  console.log();
  console.log('='.repeat(80));
  console.log('📈 Statistics:');
  console.log(`   Total Requests: ${results.length}`);
  console.log(`   Successful: ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${failed.length} (${((failed.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`   Total Duration: ${totalDuration}ms`);
  console.log(`   Average Duration: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(0)}ms`);
  console.log(`   Fastest: ${Math.min(...results.map(r => r.duration))}ms`);
  console.log(`   Slowest: ${Math.max(...results.map(r => r.duration))}ms`);
  console.log('='.repeat(80));
  console.log();

  // Step 6: Check final availability
  console.log('📊 Step 5: Checking final flight availability...');
  try {
    const availabilityClient = createAxiosClient();
    const availability = await availabilityClient.get(`/flights/${flightId}/availability`);
    console.log(`   Total Seats: ${availability.data.totalSeats}`);
    console.log(`   Available Seats: ${availability.data.availableSeats}`);
    console.log(`   Booked Seats: ${availability.data.bookedSeats}`);
    console.log(`   Status: ${availability.data.status}`);
    console.log();

    // Verify no overbooking
    const expectedBooked = successful.length * CONFIG.SEATS_PER_USER;
    const actualBooked = availability.data.bookedSeats;
    
    if (actualBooked === expectedBooked) {
      console.log(`✅ Verification: No overbooking! Booked seats match expected (${actualBooked})`);
    } else {
      console.log(`⚠️  Verification: Booked seats (${actualBooked}) don't match expected (${expectedBooked})`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check availability: ${error.message}`);
  }

  console.log();
  console.log('✅ Simulation complete!');
}

// Run the simulation
if (require.main === module) {
  simulateConcurrentBookings()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Simulation failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { simulateConcurrentBookings };

