#!/usr/bin/env node

/**
 * Cleanup Orphaned OpenSearch Documents
 * 
 * This script removes documents from OpenSearch that no longer exist in the database.
 * 
 * Use cases:
 * - After manually deleting flights from the database
 * - After database migrations or cleanup operations
 * - To sync OpenSearch with database state
 * - Regular maintenance to keep indices clean
 * 
 * Usage:
 *   node cleanup-opensearch.js
 */

const { Client } = require('@opensearch-project/opensearch');
const { Sequelize } = require('sequelize');

// Configuration
const OPENSEARCH_INDEX = 'flights';
const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://localhost:9200';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'airway_db',
  username: process.env.DB_USER || 'airway_user',
  password: process.env.DB_PASSWORD || 'airway_password',
  dialect: 'postgres',
};

// Initialize OpenSearch client
const opensearchClient = new Client({
  node: OPENSEARCH_URL,
  ssl: {
    rejectUnauthorized: false, // For self-signed certificates
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
    dialect: DB_CONFIG.dialect,
    logging: false,
  },
);

/**
 * Get all document IDs from OpenSearch index
 */
async function getAllOpenSearchDocumentIds() {
  const ids = [];
  let scrollId;
  const scrollSize = 1000;

  try {
    console.log('📥 Fetching document IDs from OpenSearch...');

    // Initial search with scroll
    const initialResponse = await opensearchClient.search({
      index: OPENSEARCH_INDEX,
      body: {
        size: scrollSize,
        _source: false, // Don't return document content, just IDs
      },
      scroll: '1m',
    });

    const body = initialResponse.body || initialResponse;
    scrollId = body._scroll_id;
    let hits = body.hits?.hits || [];

    // Process initial batch
    hits.forEach((hit) => {
      const id = hit._id || hit._source?.id;
      if (id) {
        ids.push(id);
      }
    });

    // Continue scrolling until no more results
    while (hits.length > 0) {
      const scrollResponse = await opensearchClient.scroll({
        scroll_id: scrollId,
        scroll: '1m',
      });

      const scrollBody = scrollResponse.body || scrollResponse;
      hits = scrollBody.hits?.hits || [];

      hits.forEach((hit) => {
        const id = hit._id || hit._source?.id;
        if (id) {
          ids.push(id);
        }
      });
    }

    // Clear scroll context
    if (scrollId) {
      try {
        await opensearchClient.clearScroll({ scroll_id: scrollId });
      } catch (error) {
        // Ignore errors when clearing scroll
      }
    }

    console.log(`   Found ${ids.length} documents in OpenSearch\n`);
    return ids;
  } catch (error) {
    if (error.statusCode === 404) {
      console.log('   Index does not exist or is empty\n');
      return [];
    }
    throw error;
  }
}

/**
 * Get all flight IDs from database
 */
async function getAllDatabaseFlightIds() {
  try {
    console.log('📥 Fetching flight IDs from database...');

    const [results] = await sequelize.query(
      'SELECT id FROM flights',
      { type: sequelize.QueryTypes.SELECT },
    );

    // Handle both single result and array of results
    const flights = Array.isArray(results) ? results : [results];
    const ids = flights.map((f) => f.id).filter(Boolean);

    console.log(`   Found ${ids.length} flights in database\n`);
    return ids;
  } catch (error) {
    throw new Error(`Failed to fetch flights from database: ${error.message}`);
  }
}

/**
 * Delete orphaned documents from OpenSearch
 */
async function cleanupOrphanedDocuments() {
  try {
    console.log('🧹 Starting cleanup of orphaned OpenSearch documents...\n');
    console.log('='.repeat(80));

    // Test connections
    console.log('🔌 Testing connections...');
    
    // Test OpenSearch
    try {
      const health = await opensearchClient.cluster.health();
      console.log('✅ OpenSearch connection established');
      console.log(`   Cluster status: ${health.body.status}`);
    } catch (error) {
      throw new Error(`Failed to connect to OpenSearch: ${error.message}`);
    }

    // Test database
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established\n');
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }

    // Get all IDs
    const openSearchIds = await getAllOpenSearchDocumentIds();
    const dbFlightIds = await getAllDatabaseFlightIds();

    // Convert database IDs to Set for fast lookup
    const dbFlightIdSet = new Set(dbFlightIds);

    // Find orphaned documents
    const orphanedIds = openSearchIds.filter((id) => !dbFlightIdSet.has(id));

    console.log('='.repeat(80));
    console.log('📊 Analysis:');
    console.log(`   Documents in OpenSearch: ${openSearchIds.length}`);
    console.log(`   Flights in database: ${dbFlightIds.length}`);
    console.log(`   Orphaned documents: ${orphanedIds.length}`);
    console.log('='.repeat(80));
    console.log();

    if (orphanedIds.length === 0) {
      console.log('✅ No orphaned documents found. OpenSearch is in sync with database!');
      return;
    }

    // Show orphaned IDs
    console.log('📋 Orphaned document IDs:');
    orphanedIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    console.log();

    // Delete orphaned documents
    console.log('🗑️  Deleting orphaned documents...');
    let deletedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const id of orphanedIds) {
      try {
        await opensearchClient.delete({
          index: OPENSEARCH_INDEX,
          id,
        });
        deletedCount++;
        process.stdout.write(`   Deleted ${deletedCount}/${orphanedIds.length} documents...\r`);
      } catch (error) {
        // If document doesn't exist (404), that's fine
        if (error.statusCode !== 404) {
          errorCount++;
          errors.push(`Failed to delete ${id}: ${error.message}`);
          console.error(`\n   ❌ Error deleting ${id}: ${error.message}`);
        } else {
          deletedCount++;
        }
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Deleted: ${deletedCount} documents`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} documents`);
      console.log('\n⚠️  Errors:');
      errors.forEach((error) => console.log(`   - ${error}`));
    }

    // Refresh index
    console.log('\n🔄 Refreshing index...');
    await opensearchClient.indices.refresh({ index: OPENSEARCH_INDEX });
    console.log('✅ Index refreshed');

    // Verify final count
    const count = await opensearchClient.count({ index: OPENSEARCH_INDEX });
    console.log(`\n📊 Final count: ${count.body.count} documents in OpenSearch`);

    console.log('\n✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run cleanup
if (require.main === module) {
  cleanupOrphanedDocuments()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = { cleanupOrphanedDocuments };

