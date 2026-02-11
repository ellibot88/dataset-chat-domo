# Dataset Configuration Guide

## Important: Dataset Identifiers

The app uses three different identifiers for datasets:

1. **Alias** - Manifest mapping name used for ALL APIs (e.g., "sales", "finance")
   - Used for `/data/v1/{alias}` 
   - Used for `/sql/v1/{alias}`
   - Used in generated SQL queries
2. **Dataset ID** - Actual Domo UUID (e.g., `c03a12f6-493a-4f17-9cfb-2536a191ddb9`)
   - Required in manifest.json but not used directly in API calls
3. **Name** - Friendly display name shown to users (e.g., "Sales Data")

## Configuration Steps

### 1. Find Your Dataset IDs

In Domo, navigate to your dataset and look at the URL:
```
https://your-instance.domo.com/datasources/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/details/overview
                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                         This is your dataset ID
```

### 2. Update `services/datasetService.ts`

Replace the hardcoded dataset IDs with your actual IDs:

```typescript
export const getAvailableDatasets = async (): Promise<Dataset[]> => {
  return [
    {
      alias: 'sales',                                    // From manifest.json
      datasetId: 'YOUR-ACTUAL-SALES-DATASET-ID-HERE',   // UUID from manifest.json
      name: 'Sales Data',                               // Friendly display name
      columns: []
    },
    {
      alias: 'customers',
      datasetId: 'YOUR-ACTUAL-CUSTOMER-DATASET-ID-HERE',
      name: 'Customer Data',
      columns: []
    }
  ];
};
```

### 3. Update `public/manifest.json`

Add the same dataset IDs to your manifest:

```json
{
  "datasetsMapping": [
    {
      "alias": "sales",
      "dataSetId": "YOUR-ACTUAL-SALES-DATASET-ID-HERE",
      "fields": []
    },
    {
      "alias": "customers",
      "dataSetId": "YOUR-ACTUAL-CUSTOMER-DATASET-ID-HERE",
      "fields": []
    }
  ]
}
```

## How It Works

### Query Flow

1. User asks: "What were total sales last month?"
2. `selectDataset()` matches "sales" keyword → finds dataset with alias "sales"
3. `getDatasetSchema()` is called with **alias**
   - Uses `/data/v1/sales` endpoint
4. Text-to-SQL generates query using **alias** as dataSourceName
   - Generated SQL: `SELECT ... FROM sales WHERE ...`
5. SQL is executed against `/sql/v1/sales` (uses alias)

### Why Three Identifiers?

- **Alias**: Used for ALL API calls and keyword matching
  - `/data/v1/{alias}` - Fetch data and schema
  - `/sql/v1/{alias}` - Execute SQL queries
  - User says "sales" → Routes to dataset with alias "sales"
  - Generated SQL references the alias: `FROM sales`

- **Dataset ID**: Required in manifest.json
  - Maps the alias to the actual dataset in Domo
  - Not used directly in API calls from the app

- **Name**: User-friendly display
  - Shown in UI and responses
  - "Sales Data" is easier to read than "sales"

## Common Mistakes

### ✅ Correct: Using Alias for ALL APIs

```typescript
// Data API - uses alias
await domo.get(`/data/v1/${targetDataset.alias}`);

// SQL API - uses alias with plain text SQL
await domo.post(`/sql/v1/${targetDataset.alias}`, sql, {
  contentType: 'text/plain'
});
```

### ❌ Wrong: Using Dataset ID in API Calls

```typescript
// This will fail!
await domo.get(`/data/v1/c03a12f6-493a-4f17-9cfb-2536a191ddb9`);
await domo.post(`/sql/v1/c03a12f6-493a-4f17-9cfb-2536a191ddb9`, { sql });
```

### ❌ Wrong: Mixing Up the Fields

```typescript
{
  alias: 'c03a12f6-493a-4f17-9cfb-2536a191ddb9', // ❌ UUID in alias field
  datasetId: 'sales',                            // ❌ Alias in datasetId field
  name: 'sales',                                 // ❌ Alias in name field
  columns: []
}
```

### ✅ Correct: Each Field Has Its Purpose

```typescript
{
  alias: 'sales',                                    // ✅ Short identifier for manifest
  datasetId: 'c03a12f6-493a-4f17-9cfb-2536a191ddb9', // ✅ Actual UUID
  name: 'Sales Data',                                // ✅ Friendly display name
  columns: []
}
```

## Testing Your Configuration

1. **Check Dataset Alias Format**
   - Should be a simple identifier: `sales`, `customers`, etc.
   - Should match exactly what's in manifest.json
   - No spaces or special characters (use underscores if needed)

2. **Test Data API Access**
   ```javascript
   const alias = 'sales'; // Your dataset alias
   const data = await domo.get(`/data/v1/${alias}?limit=1`);
   console.log(data); // Should return data, not a 404
   ```

3. **Test SQL Execution**
   ```javascript
   const alias = 'sales'; // Your dataset alias
   const sql = 'SELECT * FROM ' + alias + ' LIMIT 1';
   const result = await domo.post(`/sql/v1/${alias}`, sql, {
     contentType: 'text/plain'
   });
   console.log(result); // Should return query results
   ```

## Troubleshooting

### Error: "Dataset not found" or 404

**Cause**: Alias doesn't match what's in manifest.json, or dataset isn't mapped

**Fix**: 
1. Check that the alias in `datasetService.ts` matches manifest.json exactly
2. Verify the dataset is properly mapped in manifest.json:
```json
{
  "datasetsMapping": [
    {
      "alias": "sales",
      "dataSetId": "c03a12f6-493a-4f17-9cfb-2536a191ddb9",
      "fields": []
    }
  ]
}
```

### Error: "Could not fetch schema"

**Cause**: Dataset ID is wrong or doesn't exist

**Fix**: 
1. Verify the dataset ID in Domo
2. Check that you have access to the dataset
3. Ensure the ID in `getAvailableDatasets()` matches exactly

### Error: SQL execution fails

**Cause**: Dataset ID in SQL query doesn't match endpoint

**Fix**: Ensure your generated SQL uses backticks around the dataset ID:
```sql
SELECT * FROM `c03a12f6-493a-4f17-9cfb-2536a191ddb9` WHERE ...
```

## Dynamic Configuration (Future Enhancement)

Currently, dataset IDs are hardcoded. For production, you could:

1. **Read from manifest at runtime**
   ```typescript
   const manifest = await domo.get('/domo/environment/v1/manifest');
   const datasets = manifest.datasetsMapping.map(ds => ({
     alias: ds.alias,
     name: ds.dataSetId,
     columns: []
   }));
   ```

2. **Use environment variables or config endpoint**
3. **Let users configure datasets in the UI**

But for now, hardcoding the IDs in `datasetService.ts` is the simplest approach.
