# Dataset Chat - Intelligent Domo Assistant

A dual-mode chat application for Domo that intelligently routes queries between datasets (via text-to-SQL) and filesets (via RAG), providing natural language answers to both data questions and documentation queries.

## Features

*   **Intelligent Query Routing**: Automatically detects whether you're asking about data or documents
*   **Dataset Queries**: Ask questions about your data in natural language - AI generates and executes SQL
*   **RAG-Powered Document Search**: Get answers from your document knowledge bases (Domo Filesets)
*   **Natural Language Results**: All responses are conversational and easy to understand
*   **Query Transparency**: View the generated SQL and source datasets/documents used
*   **Markdown Rendering**: Rich text formatting for AI responses (tables, lists, code blocks, bold/italic text)
*   **Domo Native Integration**: Seamless authentication and API calls using `ryuu.js`
*   **Modern UI**: Clean interface with visual indicators for query types and sources

## How It Works

The application uses intelligent routing to handle two types of queries:

### Auto-Detection (`isDataQuery()`)

The app analyzes your question to determine if you're asking about:
- **Data** (numbers, trends, aggregations) → Routes to Dataset Query
- **Documents** (how-to, explanations, documentation) → Routes to RAG

### Dataset Queries (Text-to-SQL Flow)

1. **Query Analysis**: Determines which dataset to query based on keywords
2. **Schema Fetching**: Gets column names and types for the dataset
3. **SQL Generation**: Uses `AIClient.text_to_sql()` to convert your question to SQL
4. **Execution**: Runs the SQL against your Domo dataset
5. **Summarization**: AI generates a natural language answer from the results

```typescript
export const handleDatasetQuery = async (userQuery: string) => {
  const dataset = selectDataset(userQuery, datasets);
  const schema = await getDatasetSchema(dataset.alias);
  
  // Generate SQL using AI
  const sqlResponse = await domo.post('/domo/ai/v1/text/sql', {
    input: userQuery,
    system: "SQL expert prompt...",
    promptTemplate: { template: "..." },
    model: "domo.domo_ai.domogpt-medium-v2.1:anthropic",
    dataSourceSchemas: [{
      dataSourceName: dataset.name,
      description: "",
      columns: schema // Array of {name, type} where type is DATETIME, STRING, DOUBLE, LONG
    }]
  });
  
  // Execute SQL (plain text, not JSON)
  const results = await domo.post(`/sql/v1/${dataset.alias}`, sql, {
    contentType: 'text/plain'
  });
  
  // Summarize in natural language
  const summary = await generateAiResponse(`Summarize: ${results}`);
  return { text: summary, dataset, sql };
};
```

### Document Queries (RAG Flow)

1. **Semantic Search**: Queries AI-enabled Filesets for relevant content
2. **Context Retrieval**: Gets matching document chunks
3. **AI Generation**: Generates answer using retrieved context

```typescript
export const handleRagChat = async (userQuery: string, fileSetId: string) => {
  const searchResults = await searchDocuments(userQuery, fileSetId);
  const contextText = searchResults.matches.map(m => m.content.text).join('\n\n');
  const finalPrompt = `DOCUMENTATION:\n${contextText}\n\nUSER QUESTION:\n${userQuery}`;
  const response = await domo.post(`/domo/ai/v1/text/generation`, { input: finalPrompt });
  return { text: response.choices[0].output, sources: [...] };
};
```

## Configuration

### 1. Configure Datasets in `manifest.json`

Add your datasets to the `datasetsMapping` array:

```json
{
  "datasetsMapping": [
    {
      "alias": "sales",
      "dataSetId": "your-domo-dataset-id",
      "fields": []
    },
    {
      "alias": "customers",
      "dataSetId": "your-domo-dataset-id",
      "fields": []
    }
  ]
}
```

Update `services/datasetService.ts` with your dataset information:

```typescript
export const getAvailableDatasets = async (): Promise<Dataset[]> => {
  return [
    { 
      alias: 'sales',                                    // Manifest alias (for /data/v1/)
      datasetId: 'c03a12f6-493a-4f17-9cfb-2536a191ddb9', // UUID (for /sql/v1/)
      name: 'Sales Data',                                // Display name
      columns: [] 
    },
    { 
      alias: 'customers',
      datasetId: 'YOUR-CUSTOMER-DATASET-ID-HERE',
      name: 'Customer Data',
      columns: [] 
    }
  ];
};
```

**IMPORTANT**: 
- `alias` - Used for ALL APIs (`/data/v1/{alias}` and `/sql/v1/{alias}`) - must match manifest.json
- `datasetId` - Actual UUID from Domo (required in manifest.json, not used in API calls)
- `name` - Friendly display name shown to users

See `DATASET_CONFIGURATION.md` for detailed setup instructions.

### 2. Optional: Configure AI-Enabled Filesets

Filesets are automatically detected if you have AI-enabled filesets in your Domo instance. No configuration needed.

## Setup & Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Customize Logo** (Optional):
    - Place your logo PNG file in the `public/` directory
    - Update the `LOGO_PATH` constant in `App.tsx`:
      ```typescript
      const LOGO_PATH = '/your-logo.png';
      const LOGO_ALT_TEXT = 'Your Logo';
      ```

3.  **Build**:
    ```bash
    npm run build
    ```

4.  **Deploy**:
    Upload the contents of the `dist` folder to your Domo App design.

## Example Queries

### Dataset Queries (Data Analysis)
- "What were total sales last month?"
- "How many customers do we have by region?"
- "Show me the top 10 products by revenue"
- "Compare sales this quarter vs last quarter"

### Document Queries (Knowledge Base)
- "How do I configure the API integration?"
- "What is the authentication process?"
- "Explain the data pipeline architecture"
- "What are the best practices for deployment?"

## Tech Stack

*   **React 19**: UI Framework
*   **Vite**: Build tool
*   **Ryuu.js**: Domo Platform SDK (includes AI service access)
*   **Tailwind CSS**: Styling
*   **React Markdown**: Response rendering
*   **Lucide React**: Icons

## Architecture

```
User Query
    ↓
Auto-Detection (isDataQuery)
    ↓
├─ Data Query → text_to_sql → Execute SQL → Summarize
└─ Document Query → RAG Search → AI Generate
    ↓
Natural Language Response
```

## Files Structure

- `App.tsx` - Main UI component
- `services/domoService.ts` - Query routing and RAG flow
- `services/datasetService.ts` - Dataset schema and selection
- `components/ChatBubble.tsx` - Message display with query metadata
- `types.ts` - TypeScript interfaces
- `public/manifest.json` - Domo app configuration

See `IMPLEMENTATION_NOTES.md` for detailed implementation information.
