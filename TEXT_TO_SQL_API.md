# Domo Text-to-SQL API Reference

## Endpoint
```
POST /domo/ai/v1/text/sql
```

## Request Payload Structure

```typescript
{
  input: string,                    // The user's natural language question
  system: string,                   // System prompt with SQL generation rules
  promptTemplate: {
    template: string                // Template with variables for SQL generation
  },
  model: string,                    // AI model to use
  dataSourceSchemas: Array<{
    dataSourceName: string,         // Name of the dataset
    description: string,            // Optional description
    columns: Array<{
      name: string,                 // Column name
      type: string                  // Column type: DATETIME, STRING, DOUBLE, LONG
    }>
  }>
}
```

## Example Request

```javascript
const payload = {
  input: "What are my current year sales?",
  
  system: `You are a SQL database expert that generates SQL queries for data visualization purposes. Your goal is to provide the most accurate and efficient solution to the question provided.

Please adhere to the following guidelines and restrictions:

1. Always use column aliases for aggregations, calculations, and functions, but not unnecessarily.
2. Include only the columns and filters necessary to clearly answer the question.
3. Do not add any labels, comments, or brackets to the SQL query.
4. Output the answer in <SQL></SQL> XML tags. Skip any preamble.`,
  
  promptTemplate: {
    template: `<current_date>Today's date is: \${today}</current_date>
Use today's date for calculating relative time frames such as "the past thirty days" or "last year," if specified.

<dialect>\${dialect}</dialect>
<schemas>
  \${dataSourceSchemas}
</schemas>

Generate a query to answer the following question:
<question>
  \${input}
</question>`
  },
  
  model: "domo.domo_ai.domogpt-medium-v2.1:anthropic",
  
  dataSourceSchemas: [{
    dataSourceName: "Sales Data",
    description: "",
    columns: [
      { name: "date_ymd", type: "DATETIME" },
      { name: "department", type: "STRING" },
      { name: "revenue", type: "DOUBLE" },
      { name: "visits", type: "LONG" }
    ]
  }]
};

const response = await domo.post('/domo/ai/v1/text/sql', payload);
```

## Response Format

The response contains the generated SQL wrapped in XML tags:

```xml
<SQL>
SELECT 
  YEAR(date_ymd) AS Year,
  SUM(revenue) AS `Total Revenue`
FROM dataset_id
WHERE YEAR(date_ymd) = YEAR(CURRENT_DATE())
GROUP BY Year
</SQL>
```

## Extracting SQL from Response

```javascript
const sqlResponse = await domo.post('/domo/ai/v1/text/sql', payload);

// Response has output field
let sql = sqlResponse.output || sqlResponse.choices?.[0]?.output || '';

// Extract from XML tags
const sqlMatch = sql.match(/<SQL>([\s\S]*?)<\/SQL>/i);
if (sqlMatch) {
  sql = sqlMatch[1].trim();
}
```

## Executing the SQL Query

Once you have the generated SQL, execute it using the SQL API:

```javascript
// IMPORTANT: SQL API expects plain text body, not JSON
const results = await domo.post(`/sql/v1/${datasetAlias}`, sql, {
  contentType: 'text/plain'
});

// NOT this (will fail):
// await domo.post(`/sql/v1/${alias}`, { sql: sql })
```

## Column Type Mapping

When fetching dataset schemas, map Domo column types to SQL API types:

| Domo Type | SQL API Type |
|-----------|-------------|
| DATE, DATETIME, TIMESTAMP | DATETIME |
| LONG, INT, INTEGER | LONG |
| DOUBLE, DECIMAL, FLOAT | DOUBLE |
| STRING, TEXT, VARCHAR | STRING |

## Implementation Notes

1. **System Prompt**: Contains rules and guidelines for SQL generation
2. **Prompt Template**: Uses template variables that get filled in:
   - `${today}` - Current date
   - `${dialect}` - SQL dialect (auto-filled)
   - `${dataSourceSchemas}` - Schema information (auto-filled)
   - `${input}` - User's question
3. **Model**: Use `domo.domo_ai.domogpt-medium-v2.1:anthropic` for best results
4. **XML Tags**: Response is wrapped in `<SQL></SQL>` tags - extract content
5. **Column Aliases**: AI will use backticks for aliases with spaces

## Best Practices

1. Always include current date context for time-based queries
2. Use descriptive dataset names that match the actual data
3. Ensure column names exactly match the dataset schema
4. Use proper SQL types (DATETIME, STRING, DOUBLE, LONG)
5. Extract SQL from XML tags before execution
6. Handle errors gracefully when SQL generation fails

## Common Issues

1. **Wrong column types**: Ensure types are UPPERCASE (DATETIME, not datetime)
2. **Missing XML extraction**: Response is wrapped in `<SQL></SQL>` tags
3. **Column name mismatches**: Column names must exactly match dataset
4. **Model specification**: Include the full model name with version
