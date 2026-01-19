/**
 * Re-index all flights from database to OpenSearch
 * 
 * This script reads all flights from PostgreSQL and indexes them in OpenSearch.
 * Useful when:
 * - OpenSearch was reset/recreated
 * - Flights exist in DB but not in OpenSearch
 * - Need to sync data after OpenSearch issues
 * 
 * Usage:
 *   node reindex-flights.js
 */

const { Client } = require('@opensearch-project/opensearch');
const { Sequelize, DataTypes } = require('sequelize');

// Configuration
const OPENSEARCH_NODE = process.env.OPENSEARCH_NODE || 'http://localhost:9200';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USERNAME || 'airway_user',
  password: process.env.DB_PASSWORD || 'airway_password',
  database: process.env.DB_DATABASE || 'airway_db',
};

// Initialize OpenSearch client
const opensearchClient = new Client({
  node: OPENSEARCH_NODE,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Initialize Sequelize
const sequelize = new Sequelize(
  DB_CONFIG.database,
  DB_CONFIG.username,
  DB_CONFIG.password,
  {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    dialect: 'postgres',
    logging: false,
  }
);

// Define Flight model (simplified)
const Flight = sequelize.define('Flight', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  flightNumber: DataTypes.STRING,
  providerId: DataTypes.UUID,
  source: DataTypes.STRING,
  destination: DataTypes.STRING,
  departureTime: DataTypes.DATE,
  arrivalTime: DataTypes.DATE,
  totalSeats: DataTypes.INTEGER,
  availableSeats: DataTypes.INTEGER,
  price: DataTypes.DECIMAL(10, 2),
  status: DataTypes.STRING,
}, {
  tableName: 'flights',
  timestamps: true,
});

// Define User model (for provider name)
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: DataTypes.STRING,
  email: DataTypes.STRING,
}, {
  tableName: 'users',
  timestamps: true,
});

// Define association
Flight.belongsTo(User, { foreignKey: 'providerId', as: 'provider' });

const OPENSEARCH_INDEX = 'flights';

async function createIndexIfNotExists() {
  try {
    const exists = await opensearchClient.indices.exists({ index: OPENSEARCH_INDEX });
    
    if (!exists.body) {
      console.log('Creating OpenSearch index:', OPENSEARCH_INDEX);
      await opensearchClient.indices.create({
        index: OPENSEARCH_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              flightNumber: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              source: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              destination: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              departureTime: { type: 'date' },
              providerName: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              providerId: { type: 'keyword' },
              status: { type: 'keyword' },
              availableSeats: { type: 'integer' },
              price: { type: 'float' },
            },
          },
        },
      });
      console.log('✅ Index created successfully');
    } else {
      console.log('✅ Index already exists');
    }
  } catch (error) {
    console.error('❌ Error creating index:', error.message);
    throw error;
  }
}

async function reindexFlights() {
  try {
    console.log('🔄 Starting re-indexing process...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Test OpenSearch connection
    const health = await opensearchClient.cluster.health();
    console.log('✅ OpenSearch connection established');
    console.log(`   Cluster status: ${health.body.status}\n`);

    // Create index if not exists
    await createIndexIfNotExists();

    // Fetch all flights
    console.log('📥 Fetching flights from database...');
    const flights = await Flight.findAll({
      raw: true,
    });

    // Fetch providers separately
    const providerIds = [...new Set(flights.map(f => f.providerId).filter(Boolean))];
    const providers = await User.findAll({
      where: { id: providerIds },
      attributes: ['id', 'name', 'email'],
      raw: true,
    });
    
    const providerMap = new Map(providers.map(p => [p.id, p]));

    console.log(`   Found ${flights.length} flights\n`);

    if (flights.length === 0) {
      console.log('⚠️  No flights found in database. Create some flights first!');
      return;
    }

    // Index each flight
    console.log('📤 Indexing flights to OpenSearch...');
    let successCount = 0;
    let errorCount = 0;

    for (const flight of flights) {
      try {
        const provider = providerMap.get(flight.providerId) || {};
        
        const document = {
          id: flight.id,
          flightNumber: flight.flightNumber,
          source: flight.source,
          destination: flight.destination,
          departureTime: flight.departureTime ? new Date(flight.departureTime).toISOString() : null,
          providerName: provider.name || 'Unknown',
          providerId: flight.providerId,
          status: flight.status,
          availableSeats: flight.availableSeats,
          price: parseFloat(flight.price) || 0,
        };

        await opensearchClient.index({
          index: OPENSEARCH_INDEX,
          id: flight.id,
          body: document,
        });

        successCount++;
        if (successCount % 10 === 0) {
          process.stdout.write(`   Indexed ${successCount}/${flights.length} flights...\r`);
        }
      } catch (error) {
        errorCount++;
        console.error(`\n   ❌ Error indexing flight ${flight.id}:`, error.message);
      }
    }

    console.log(`\n✅ Re-indexing complete!`);
    console.log(`   Success: ${successCount} flights`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} flights`);
    }

    // Refresh index to make documents searchable immediately
    await opensearchClient.indices.refresh({ index: OPENSEARCH_INDEX });
    console.log('✅ Index refreshed\n');

    // Verify count
    const count = await opensearchClient.count({ index: OPENSEARCH_INDEX });
    console.log(`📊 Total documents in OpenSearch: ${count.body.count}`);
    console.log(`📊 Total flights in database: ${flights.length}`);

  } catch (error) {
    console.error('\n❌ Error during re-indexing:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  reindexFlights()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { reindexFlights };

