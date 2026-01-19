# OpenSearch Mappings - Complete Guide

## What are Mappings?

**Mappings** are like a **schema** or **blueprint** for your OpenSearch index. They define:
- **What fields** exist in your documents
- **What data type** each field is (text, number, date, etc.)
- **How each field should be indexed** (searchable, sortable, etc.)
- **How text fields should be analyzed** (tokenized, lowercased, etc.)

Think of mappings as the **database schema** - they tell OpenSearch how to interpret and store your data.

---

## Why Are Mappings Needed?

### 1. **Type Safety & Data Validation**

Without mappings, OpenSearch uses **dynamic mapping** - it guesses field types from the first document. This can cause problems:

**Example Problem:**
```json
// First document
{ "price": "299.99" }  // String - OpenSearch creates text field

// Second document  
{ "price": 299.99 }    // Number - Type mismatch! Error or wrong indexing
```

**With Explicit Mapping:**
```json
{
  "price": { "type": "float" }  // Always expects number
}
```
✅ All documents must have `price` as a number
✅ Prevents type mismatches
✅ Ensures data consistency

### 2. **Search Performance**

Different field types enable different search capabilities:

**Text Field:**
- ✅ Full-text search (finds "New York" when searching "york")
- ✅ Fuzzy matching (handles typos)
- ❌ Cannot sort efficiently
- ❌ Cannot do exact matches

**Keyword Field:**
- ✅ Exact matches
- ✅ Sorting
- ✅ Aggregations (grouping, counting)
- ❌ No full-text search

**Your Code Example:**
```typescript
source: { 
  type: 'text',           // For full-text search
  analyzer: 'standard',    // Tokenizes "New York" → ["new", "york"]
  fields: {
    keyword: { type: 'keyword' }  // For exact match: "New York"
  }
}
```

This allows:
- **Search**: `source: "york"` → finds "New York" ✅
- **Filter**: `source.keyword: "New York"` → exact match ✅
- **Sort**: `sort: source.keyword` → alphabetical sorting ✅

### 3. **Storage Optimization**

Proper mappings optimize storage:
- **Numbers** stored as numbers (4-8 bytes) vs strings (variable length)
- **Dates** stored as timestamps (8 bytes) vs strings
- **Keywords** stored without analysis overhead

### 4. **Query Capabilities**

Field types determine what queries you can run:

```typescript
// ✅ Works with date field
{
  "range": {
    "departureTime": {
      "gte": "2024-01-01",
      "lte": "2024-12-31"
    }
  }
}

// ❌ Won't work if departureTime is text
// Can't do date range queries on text fields
```

---

## Your Application's Mapping Structure

Let's break down your flight mappings:

```typescript
// From flights.service.ts lines 56-92
{
  properties: {
    // 1. ID Field - Keyword (exact match only)
    id: { type: 'keyword' },
    // Why keyword? IDs need exact matching, no search needed
    
    // 2. Flight Number - Text + Keyword (both searchable and exact match)
    flightNumber: { 
      type: 'text',              // For searching "AI-101" when typing "101"
      fields: {
        keyword: { type: 'keyword' }  // For exact match "AI-101"
      }
    },
    
    // 3. Source City - Text + Keyword (fuzzy search + exact match)
    source: { 
      type: 'text',              // Full-text search with analyzer
      analyzer: 'standard',       // Tokenizes: "New York" → ["new", "york"]
      fields: {
        keyword: { type: 'keyword' }  // Exact: "New York"
      }
    },
    
    // 4. Destination - Same as source
    destination: { 
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    
    // 5. Departure Time - Date (for range queries)
    departureTime: { type: 'date' },
    // Why date? Enables:
    // - Range queries (before/after dates)
    // - Sorting by time
    // - Date aggregations
    
    // 6. Provider Name - Text + Keyword
    providerName: { 
      type: 'text',              // Search: "air" finds "Air India"
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }  // Exact: "Air India"
      }
    },
    
    // 7. Provider ID - Keyword (exact match)
    providerId: { type: 'keyword' },
    // Why keyword? UUIDs need exact matching
    
    // 8. Status - Keyword (exact match)
    status: { type: 'keyword' },
    // Why keyword? Status values are exact: "SCHEDULED", "CANCELLED"
    // Enables filtering: status = "SCHEDULED"
    
    // 9. Available Seats - Integer (for numeric operations)
    availableSeats: { type: 'integer' },
    // Why integer? Enables:
    // - Range queries: availableSeats > 0
    // - Sorting: order by availableSeats
    // - Aggregations: sum, avg, min, max
    
    // 10. Price - Float (for decimal numbers)
    price: { type: 'float' },
    // Why float? Prices have decimals: 299.99
    // Enables:
    // - Range queries: price BETWEEN 100 AND 500
    // - Sorting by price
    // - Price aggregations
  }
}
```

---

## What Happens Without Mappings?

### Scenario 1: Dynamic Mapping (Auto-detection)

If you don't provide mappings, OpenSearch creates them automatically from the first document:

```json
// First document indexed
{
  "flightNumber": "AI-101",
  "price": 299.99,
  "departureTime": "2024-12-25T10:00:00Z"
}

// OpenSearch creates mappings:
{
  "flightNumber": { "type": "text" },      // Guessed as text
  "price": { "type": "float" },             // Guessed as float ✅
  "departureTime": { "type": "date" }      // Guessed as date ✅
}
```

**Problems:**
1. **Inconsistent types**: If second document has `"price": "299.99"` (string), it fails
2. **No multi-field**: Can't search `source` as both text and keyword
3. **Wrong analyzers**: Might use wrong tokenizer for your use case
4. **No control**: Can't optimize for your specific queries

### Scenario 2: Type Conflicts

```json
// Document 1
{ "availableSeats": 100 }  // Creates integer mapping

// Document 2
{ "availableSeats": "100" }  // ❌ Type conflict! Error or wrong indexing
```

With explicit mapping, Document 2 would be rejected or converted correctly.

---

## How Mappings Work in Your Code

### Step 1: Create Index with Mappings

```typescript
// flights.service.ts line 56
await this.openSearchService.createIndex(this.OPENSEARCH_INDEX, {
  properties: {
    // ... mappings defined here
  }
});
```

**What happens:**
1. Checks if index exists
2. If not, creates index with your mappings
3. OpenSearch now knows the structure

### Step 2: Index Documents

```typescript
// flights.service.ts line 101-112
const document = {
  id: flight.id,                    // Must be string (keyword)
  flightNumber: flight.flightNumber, // String (text + keyword)
  source: flight.source,            // String (text + keyword)
  destination: flight.destination,   // String (text + keyword)
  departureTime: flight.departureTime.toISOString(), // ISO date string
  providerName: provider?.name || 'Unknown', // String (text + keyword)
  providerId: flight.providerId,     // UUID string (keyword)
  status: flight.status,             // String enum (keyword)
  availableSeats: flight.availableSeats, // Number (integer)
  price: flight.price,               // Number (float)
};

await this.openSearchService.indexDocument(
  this.OPENSEARCH_INDEX,
  flight.id,
  document,
);
```

**What happens:**
1. OpenSearch validates document against mappings
2. Each field is indexed according to its mapping
3. Text fields are analyzed (tokenized)
4. Numbers stored as numbers
5. Dates stored as timestamps

### Step 3: Search Using Mappings

```typescript
// Example search query
{
  query: {
    bool: {
      must: [
        {
          match: { 
            source: "york"  // Uses 'text' field - finds "New York"
          }
        }
      ],
      filter: [
        {
          term: { 
            "status.keyword": "SCHEDULED"  // Uses 'keyword' field - exact match
          }
        },
        {
          range: {
            departureTime: {  // Uses 'date' field - date range
              gte: "2024-12-25"
            }
          }
        },
        {
          range: {
            price: {  // Uses 'float' field - numeric range
              lte: 500
            }
          }
        }
      ]
    }
  }
}
```

---

## Field Types Explained

### 1. **Keyword** (`type: 'keyword'`)

**Use for:**
- IDs, UUIDs
- Status values (SCHEDULED, CANCELLED)
- Exact match fields
- Sorting
- Aggregations

**Characteristics:**
- ✅ Exact matching
- ✅ Sorting
- ✅ Aggregations
- ❌ No full-text search
- ❌ No fuzzy matching

**Example:**
```json
{ "status": "SCHEDULED" }  // Stored as-is, no analysis
```

**Query:**
```json
{ "term": { "status": "SCHEDULED" } }  // Exact match only
```

### 2. **Text** (`type: 'text'`)

**Use for:**
- Searchable content (city names, descriptions)
- Full-text search
- Fuzzy matching

**Characteristics:**
- ✅ Full-text search
- ✅ Fuzzy matching (handles typos)
- ✅ Analyzed (tokenized, lowercased)
- ❌ Not sortable (use `.keyword` sub-field)
- ❌ Slower exact matches

**Example:**
```json
{ "source": "New York" }  
// Analyzed to: ["new", "york"]
// Search "york" → finds "New York" ✅
```

**Query:**
```json
{ "match": { "source": "york" } }  // Finds "New York"
```

### 3. **Multi-Field** (Text + Keyword)

**Best of both worlds:**

```typescript
source: { 
  type: 'text',              // Main field for search
  fields: {
    keyword: { type: 'keyword' }  // Sub-field for exact match
  }
}
```

**Usage:**
```json
// Search (uses 'text' field)
{ "match": { "source": "york" } }  // Finds "New York"

// Exact match (uses 'keyword' field)
{ "term": { "source.keyword": "New York" } }  // Exact only

// Sort (uses 'keyword' field)
{ "sort": [{ "source.keyword": "asc" }] }
```

### 4. **Date** (`type: 'date'`)

**Use for:**
- Timestamps
- Date ranges
- Time-based queries

**Characteristics:**
- ✅ Date range queries
- ✅ Sorting by time
- ✅ Date aggregations
- ✅ Accepts ISO 8601 format

**Example:**
```json
{ "departureTime": "2024-12-25T10:00:00Z" }
```

**Query:**
```json
{
  "range": {
    "departureTime": {
      "gte": "2024-12-25T00:00:00Z",
      "lte": "2024-12-25T23:59:59Z"
    }
  }
}
```

### 5. **Integer** (`type: 'integer'`)

**Use for:**
- Whole numbers
- Counts, quantities

**Example:**
```json
{ "availableSeats": 100 }
```

**Query:**
```json
{
  "range": {
    "availableSeats": {
      "gt": 0  // Greater than 0
    }
  }
}
```

### 6. **Float** (`type: 'float'`)

**Use for:**
- Decimal numbers
- Prices, amounts

**Example:**
```json
{ "price": 299.99 }
```

**Query:**
```json
{
  "range": {
    "price": {
      "gte": 100.0,
      "lte": 500.0
    }
  }
}
```

---

## Analyzers Explained

### Standard Analyzer

```typescript
source: { 
  type: 'text',
  analyzer: 'standard',  // Tokenizes text
}
```

**What it does:**
```
Input: "New York"
  ↓
Tokenization: ["New", "York"]
  ↓
Lowercasing: ["new", "york"]
  ↓
Indexed: Both "new" and "york" are searchable
```

**Result:**
- Search "york" → finds "New York" ✅
- Search "new" → finds "New York" ✅
- Search "new york" → finds "New York" ✅
- Search "york new" → finds "New York" ✅ (word order doesn't matter)

---

## Why Mappings Are Required Before Indexing

### 1. **Index Creation Time**

Mappings are defined when the index is created. Once set, they're difficult to change:

```typescript
// ✅ Correct: Create index with mappings first
await createIndex('flights', { mappings: {...} });
await indexDocument('flights', 'id1', { price: 299.99 });

// ❌ Wrong: Index document without mappings
await indexDocument('flights', 'id1', { price: 299.99 });
// OpenSearch creates dynamic mappings (might be wrong)
```

### 2. **Mapping Updates Are Limited**

Once an index has data, you **cannot** change existing field types:

```typescript
// Initial mapping
{ "price": { "type": "text" } }  // Wrong type!

// Try to change later
{ "price": { "type": "float" } }  // ❌ Error! Field already exists as text
```

**Solution:** Create new index with correct mappings and re-index data.

### 3. **Performance Optimization**

OpenSearch optimizes storage and indexing based on mappings:
- Text fields: Analyzers, tokenizers pre-configured
- Numeric fields: Optimized storage format
- Date fields: Timestamp conversion optimized

---

## Real-World Example: Your Flight Search

### Without Proper Mappings:

```json
// Document indexed
{
  "source": "New York",
  "price": "299.99",  // String instead of number
  "departureTime": "2024-12-25"  // String instead of date
}

// Problems:
// ❌ Can't do: price < 500 (price is text, not number)
// ❌ Can't do: departureTime range queries (not date type)
// ❌ Can't do: Sort by price (text sorting: "100" > "99" ❌)
```

### With Proper Mappings:

```json
// Document indexed
{
  "source": "New York",           // text + keyword
  "price": 299.99,                // float
  "departureTime": "2024-12-25T10:00:00Z"  // date
}

// Works perfectly:
// ✅ Search: source: "york" → finds "New York"
// ✅ Filter: price < 500 → numeric comparison
// ✅ Range: departureTime between dates → date range
// ✅ Sort: price ASC → numeric sorting (99 < 100 ✅)
```

---

## Your Code Flow

### 1. Application Starts

```typescript
// flights.service.ts constructor
constructor(...) {
  this.initializeOpenSearchIndex();  // Creates index with mappings
}
```

### 2. Index Created

```typescript
await this.openSearchService.createIndex(this.OPENSEARCH_INDEX, {
  properties: {
    // All your field definitions
  }
});
```

**Result:** OpenSearch knows the structure before any documents are indexed.

### 3. Flight Created/Updated

```typescript
// When flight is created
await this.indexFlightWithProvider(flight);

// Document is validated against mappings
// Each field is indexed according to its type
```

### 4. Search Queries

```typescript
// Your search uses the mappings
{
  match: { source: "york" }  // Uses 'text' field - finds "New York"
}
```

---

## Key Takeaways

1. **Mappings = Schema**: Define structure before indexing
2. **Type Safety**: Prevents type mismatches and errors
3. **Performance**: Optimizes storage and query speed
4. **Search Capabilities**: Enables different query types
5. **Multi-Field**: Text + Keyword gives you both search and exact match
6. **Cannot Change**: Set mappings correctly from the start

---

## Best Practices

1. ✅ **Define mappings before indexing** - Your code does this correctly
2. ✅ **Use multi-field for searchable text** - Text + Keyword pattern
3. ✅ **Use appropriate types** - Numbers as numbers, dates as dates
4. ✅ **Use analyzers for text** - Standard analyzer for city names
5. ✅ **Test mappings** - Verify queries work as expected

Your application follows these best practices! 🎯

