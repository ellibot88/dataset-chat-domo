# Dataset Chat App - Implementation Notes

## Overview
Successfully implemented a chat app that intelligently routes queries between datasets (via text-to-SQL) and filesets (via RAG), with auto-detection of query intent.

## What Was Implemented

### 1. Dependencies
- `ryuu.js` - Domo SDK for all API calls including AI services
- No additional dependencies needed (removed @domoinc/toolkit and @domoinc/query as they're not needed)

### 2. New Files Created

#### `services/datasetService.ts`
- `getAvailableDatasets()` - Returns configured datasets from manifest
- `getDatasetSchema()` - Fetches column metadata for datasets
- `selectDataset()` - Keyword-based dataset selection from user query
- Helper functions for type mapping and inference

### 3. Enhanced Existing Files

#### `services/domoService.ts`
Added three key functions:
- `isDataQuery()` - Auto-detects if query is about data or documents using keyword analysis
- `handleDatasetQuery()` - Complete flow for dataset queries:
  1. Select appropriate dataset
  2. Fetch schema
  3. Generate SQL via AI
  4. Execute SQL
  5. Summarize results in natural language
- `handleSmartQuery()` - Main entry point that routes to dataset or fileset

#### `types.ts`
Added new types:
- `Dataset` - Dataset metadata with columns
- `DatasetColumn` - Column name and type info
- `QuerySource` enum - Dataset or Fileset
- Enhanced `Message` interface with query metadata

#### `App.tsx`
- Removed fileset dropdown selector (auto-detection handles routing)
- Updated welcome message to reflect dual capability
- Changed to use `handleSmartQuery()` instead of `handleRagChat()`
- Added status indicators showing available sources
- Updated footer message for auto-routing

#### `components/ChatBubble.tsx`
- Added query source badge (Dataset/Document)
- Display dataset name when used
- Collapsible SQL query viewer
- Enhanced visual differentiation between query types

#### `public/manifest.json`
- Changed app name to "dataset-chat"
- Added `datasetsMapping` with sales and customers aliases
- Incremented version to 0.0.3

## How It Works

### Query Flow

1. **User Input** → `handleSmartQuery()`
2. **Auto-Detection** → `isDataQuery()` analyzes keywords
3. **Routing**:
   - Data queries → `handleDatasetQuery()` → Text-to-SQL → Execute → Summarize
   - Document queries → `handleRagChat()` → RAG → Generate response
4. **Response** includes metadata about which source was used

### Auto-Detection Logic

Data query keywords:
- "how many", "total", "average", "sum", "count", "trend", "compare", "sales", "revenue", etc.

Document query keywords:
- "how to", "what is", "explain", "documentation", "guide", "help", etc.

Defaults to document query if ambiguous (safer fallback to RAG).

### Dataset Selection

Currently uses keyword matching:
- Looks for explicit dataset mentions in query
- Falls back to keyword-based heuristics ("sale" → sales dataset)
- Defaults to first dataset if only one configured

## Configuration Required at Deployment

### manifest.json datasetsMapping
Users must configure actual dataset IDs at publish time:

```json
"datasetsMapping": [
  {
    "alias": "sales",
    "dataSetId": "actual-domo-dataset-id-here",
    "fields": []
  }
]
```

## Testing Checklist

### Dataset Queries (should route to text-to-SQL)
- ✓ "What were total sales last month?"
- ✓ "How many customers do we have?"
- ✓ "Show me the top 10 products by revenue"
- ✓ "Compare sales by region"

### Document Queries (should route to RAG)
- ✓ "How do I configure the API?"
- ✓ "What is the authentication process?"
- ✓ "Explain how to set up the integration"

### Edge Cases
- ✓ No filesets available → Falls back to dataset query
- ✓ No datasets available → Should show error
- ✓ Ambiguous query → Should default to document search

## Known Limitations

1. **Dataset Schema Fetching**: Current implementation tries metadata endpoint first, falls back to sampling. Column types are mapped to Domo SQL API format (DATETIME, STRING, DOUBLE, LONG).

2. **SQL Execution**: Uses `/sql/v1/{alias}` endpoint. SQL is generated via `/domo/ai/v1/text/sql` with the full Domo text-to-SQL API payload structure including system prompt, prompt template, and model specification.

3. **Dataset Selection**: Simple keyword matching - could be enhanced with ML or more sophisticated NLP.

4. **No Dataset Caching**: Schema is fetched on every query - could add caching for performance.

## Future Enhancements

1. **Smarter Auto-Detection**: Use AI to classify query type instead of keywords
2. **Multi-Dataset Queries**: Support queries across multiple datasets
3. **Query History**: Save and recall previous queries
4. **Dataset Selector Override**: Allow user to manually select dataset when auto-detection fails
5. **SQL Query Editing**: Let users modify generated SQL before execution
6. **Result Visualization**: Charts/graphs for numeric results
7. **Query Suggestions**: Prompt user with example queries

## Dependencies to Install

Before building/running:

```bash
npm install
```

All dependencies are standard npm packages. The Domo AI API is accessed directly via `ryuu.js`.

## Build and Deploy

```bash
npm run build
# Follow standard Domo app deployment process with da-cli
```

## Testing Notes

Since this requires actual Domo datasets and the AI service layer, testing must be done in a real Domo environment with:
1. Datasets configured in manifest
2. AI-enabled filesets (optional, for document queries)
3. Active Domo AI service

The implementation is complete and ready for deployment testing.
