# OpenSearch Dashboards Setup Guide

## Overview

Your application uses OpenSearch to index flights for fast search. The index name is **`flights`**.

## Index Information

- **Index Name**: `flights`
- **Indexed Fields**:
  - `id` (keyword)
  - `flightNumber` (text + keyword)
  - `source` (text + keyword) - Origin city
  - `destination` (text + keyword) - Destination city
  - `departureTime` (date)
  - `providerName` (text + keyword) - Airline name
  - `providerId` (keyword)
  - `status` (keyword) - SCHEDULED, IN_AIR, COMPLETED, CANCELLED
  - `availableSeats` (integer)
  - `price` (float)

## Step 1: Access OpenSearch Dashboards

1. Open browser: http://localhost:5601
2. No login required (security disabled)

## Step 2: Create Index Pattern

1. Click on **"Discover"** in the left sidebar (or go to http://localhost:5601/app/discover)
2. If prompted, click **"Create index pattern"**
3. Enter index pattern: `flights`
4. Click **"Next step"**
5. Select **"@timestamp"** as the time field (or select `departureTime` if available)
6. Click **"Create index pattern"**

## Step 3: View Your Flight Data

1. Go to **"Discover"** in the left sidebar
2. Select the `flights` index pattern from the dropdown
3. You should see all indexed flights
4. Use the search bar to query flights
5. Click on documents to see full details

## Step 4: Create Visualizations (Optional)

### Example: Flights by Status

1. Go to **"Visualize"** → **"Create visualization"**
2. Choose visualization type (e.g., **"Pie Chart"**)
3. Select `flights` index pattern
4. Add aggregation: **"Count"**
5. Add bucket: **"Terms"** on field `status.keyword`
6. Click **"Update"** to see the chart

### Example: Flights by Provider

1. Create new visualization
2. Choose **"Vertical Bar Chart"**
3. Select `flights` index pattern
4. Y-axis: **"Count"**
5. X-axis: **"Terms"** on field `providerName.keyword`
6. Click **"Update"**

### Example: Price Distribution

1. Create new visualization
2. Choose **"Histogram"**
3. Select `flights` index pattern
4. Y-axis: **"Count"**
5. X-axis: **"Histogram"** on field `price`
6. Set interval (e.g., 50)
7. Click **"Update"**

## Step 5: Create Dashboard

1. Go to **"Dashboard"** → **"Create dashboard"**
2. Click **"Add"** → **"Add an existing"**
3. Select your visualizations
4. Arrange and save the dashboard

## Verify Data is Indexed

### Check via API:

```bash
# Get all flights in index
curl http://localhost:9200/flights/_search?pretty

# Count documents
curl http://localhost:9200/flights/_count?pretty

# Get index mapping
curl http://localhost:9200/flights/_mapping?pretty
```

### Check in Dashboards:

1. Go to **"Dev Tools"** (or **"Console"**)
2. Run:
```json
GET /flights/_search
{
  "size": 10
}
```

## Re-index Existing Flights

If you have existing flights in the database that aren't indexed, run:

```bash
# This will be available via API endpoint (see below)
curl -X POST http://localhost:3000/flights/reindex
```

Or use the script: `node reindex-flights.js`

## Troubleshooting

### No Data Visible

1. Check if index exists:
   ```bash
   curl http://localhost:9200/_cat/indices/flights?v
   ```

2. Check if flights are being indexed:
   - Create a new flight via API
   - Check if it appears in Dashboards

3. Re-index existing flights (see above)

### Index Pattern Not Found

1. Make sure the index exists:
   ```bash
   curl http://localhost:9200/flights/_search?size=1
   ```

2. If empty, create some flights via your API first

### Time Field Issues

- If `@timestamp` is not available, use `departureTime` as the time field
- Or select "I don't want to use the time filter"

## Useful Queries in Dev Tools

### Search flights by source:
```json
GET /flights/_search
{
  "query": {
    "match": {
      "source": "New York"
    }
  }
}
```

### Filter by status:
```json
GET /flights/_search
{
  "query": {
    "term": {
      "status": "SCHEDULED"
    }
  }
}
```

### Search with price range:
```json
GET /flights/_search
{
  "query": {
    "range": {
      "price": {
        "gte": 100,
        "lte": 500
      }
    }
  }
}
```

## Next Steps

1. ✅ Create index pattern in Dashboards
2. ✅ View your flight data
3. ✅ Create visualizations
4. ✅ Build dashboards for monitoring
5. ✅ Set up alerts (optional)

Your flights are automatically indexed when:
- A new flight is created
- An existing flight is updated
- A flight is cancelled (status updated)

