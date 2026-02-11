# Troubleshooting Guide

## Common Errors and Solutions

### Error: "Invalid column(s) referenced"

**Example Error:**
```json
{
  "status": 400,
  "message": "Invalid column(s) referenced: dateymd",
  "errorCode": "ib:4100"
}
```

**Cause:** The AI-generated SQL is using incorrect column names. The AI is removing underscores or changing the casing of column names.

**Example:**
- Actual column: `date_ymd` (with underscore)
- AI generated: `dateymd` (without underscore) ❌

**Solutions:**

#### 1. Check Your Schema is Correct

Open browser console and look for the schema log:
```javascript
Dataset sales schema: [
  { name: "date_ymd", type: "DATETIME" },
  { name: "revenue", type: "DOUBLE" }
]
```

Verify the column names match your actual dataset in Domo.

#### 2. Check the Generated SQL

Look for the "Generated SQL" log in console:
```sql
SELECT dateymd, SUM(revenue) FROM sales  -- ❌ Wrong: dateymd
```

Should be:
```sql
SELECT date_ymd, SUM(revenue) FROM sales  -- ✅ Correct: date_ymd
```

#### 3. Improved System Prompt

The latest version includes explicit instructions about column names:
- "You MUST use column names EXACTLY as they appear in the schema"
- Includes examples showing correct vs incorrect usage

#### 4. Retry the Query

After updating the code with stronger prompts:
1. Rebuild the app: `npm run build`
2. Refresh the page
3. Try your query again

#### 5. Manual SQL Fix (Temporary)

If the AI keeps generating wrong SQL, you can add a post-processing step:

```typescript
// After extracting SQL from response
sql = sql.replace(/\bdateymd\b/g, 'date_ymd');
sql = sql.replace(/\bstorerevenue\b/g, 'store_revenue');
// Add more replacements as needed
```

Add this in `services/domoService.ts` after the SQL extraction.

### Error: Dataset Schema Empty

**Error:** "Could not fetch schema for dataset"

**Cause:** The Data API can't fetch column information for the dataset.

**Solutions:**

1. **Check Dataset Alias**
   ```javascript
   // In datasetService.ts
   { alias: 'sales', ... }
   
   // Must match manifest.json
   { "alias": "sales", "dataSetId": "..." }
   ```

2. **Check Dataset Permissions**
   - Ensure you have access to the dataset in Domo
   - Check that the dataset is properly mapped in manifest.json

3. **Try Direct API Call**
   ```javascript
   // In browser console
   const data = await domo.get('/data/v1/sales?limit=1');
   console.log(Object.keys(data[0])); // See actual column names
   ```

### Error: SQL Execution Timeout

**Cause:** Query is too complex or dataset is very large.

**Solutions:**

1. **Add LIMIT Clause**
   Update the system prompt to always include LIMIT:
   ```typescript
   system: `...
   7. Always add a reasonable LIMIT clause (e.g., LIMIT 1000) unless the question explicitly asks for all records.
   ...`
   ```

2. **Optimize Query**
   - Avoid complex JOINs if possible
   - Add WHERE clauses to filter data
   - Use appropriate aggregations

### Error: "Text-to-SQL API Failed"

**Cause:** The AI API returned an error or unexpected response.

**Solutions:**

1. **Check API Response**
   Look for logs showing the raw response:
   ```javascript
   console.log('Text-to-SQL response:', sqlResponse);
   ```

2. **Verify Model Name**
   ```typescript
   model: "domo.domo_ai.domogpt-medium-v2.1:anthropic"
   ```
   Make sure this model is available in your Domo instance.

3. **Check Request Payload**
   Verify the payload structure matches the expected format:
   - `input` - user question
   - `system` - system prompt
   - `promptTemplate` - template with variables
   - `model` - AI model name
   - `dataSourceSchemas` - array with schema info

### Error: "Could not determine which dataset to query"

**Cause:** The auto-detection couldn't find a matching dataset for the query.

**Solutions:**

1. **Add More Keywords**
   Update `selectDataset()` in `datasetService.ts`:
   ```typescript
   // Add more keyword matches
   if (lowerQuery.includes('sale') || 
       lowerQuery.includes('revenue') ||
       lowerQuery.includes('order') ||
       lowerQuery.includes('purchase')) {  // Add more
     // ...
   }
   ```

2. **Use Explicit Dataset Names**
   Ask users to mention the dataset name:
   - "Show me sales data for last month" ✓
   - Instead of: "Show me data for last month" ✗

3. **Default Dataset**
   Set a default if only one dataset:
   ```typescript
   if (datasets.length === 1) {
     return datasets[0];
   }
   ```

## Debugging Tips

### 1. Enable Verbose Logging

Add more console.log statements:
```typescript
console.log('User query:', userQuery);
console.log('Selected dataset:', targetDataset);
console.log('Schema columns:', columns);
console.log('Text-to-SQL payload:', textToSqlPayload);
console.log('Generated SQL:', sql);
console.log('Query results:', queryResults);
```

### 2. Test Each Step Separately

Test in browser console:

```javascript
// 1. Test schema fetch
const schema = await domo.get('/data/v1/sales?limit=0&includeMetadata=true');
console.log(schema);

// 2. Test SQL execution
const result = await domo.post('/sql/v1/sales', 
  'SELECT * FROM sales LIMIT 10', 
  { contentType: 'text/plain' }
);
console.log(result);

// 3. Test text-to-SQL
const payload = {
  input: "Show me total revenue",
  system: "Generate SQL",
  promptTemplate: { template: "..." },
  model: "domo.domo_ai.domogpt-medium-v2.1:anthropic",
  dataSourceSchemas: [...]
};
const sqlResp = await domo.post('/domo/ai/v1/text/sql', payload);
console.log(sqlResp);
```

### 3. Check Browser Network Tab

- Look for failed API calls
- Check request/response payloads
- Verify status codes

### 4. Verify Manifest Configuration

```json
{
  "datasetsMapping": [
    {
      "alias": "sales",
      "dataSetId": "actual-uuid-here",
      "fields": []
    }
  ]
}
```

- `alias` must be simple (no spaces)
- `dataSetId` must be the actual UUID
- `fields` must be present (can be empty array)

## Getting Help

If you're still stuck:

1. Check console logs for detailed error messages
2. Verify all configuration files match
3. Test API endpoints manually in console
4. Check Domo platform status/permissions
5. Review the implementation notes in `IMPLEMENTATION_NOTES.md`

## Performance Tips

1. **Limit Result Sets**
   - Always use LIMIT in queries
   - Default to reasonable limits (100-1000 rows)

2. **Cache Schema Information**
   - Fetch schema once per session
   - Store in memory to avoid repeated API calls

3. **Optimize AI Prompts**
   - Keep system prompts concise
   - Provide clear examples
   - Include only necessary schema information

4. **Monitor Response Times**
   - Log timing for each step
   - Identify bottlenecks
   - Optimize slow queries
