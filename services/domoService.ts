import { RagResponse, AiResponse, Dataset, QuerySource } from '../types';
import domo from 'ryuu.js';
import { getAvailableDatasets, getDatasetSchema, selectDataset } from './datasetService';

/**
 * Fetches the list of available filesets (AI enabled).
 */
export const getFilesets = async (): Promise<any[]> => {
  try {
    const body = {
      // Sort by name in ascending order
      fieldSort: [
        {
          field: 'name',
          order: 'ASC',
        },
      ],
      // Filter FileSet by ai_enabled = true
      filters: [
        {
          field: 'ai_enabled',
          value: [true],
          operator: 'EQUALS',
        },
      ],
    };

    // Ryuu.js call to Filesets Search API
    const response = await domo.post('/domo/files/v1/filesets/search', body) as any;
    return response.fileSets || [];
  } catch (error) {
    console.error('Error fetching filesets:', error);
    return [];
  }
};

/**
 * Searches documents using the RAG endpoint.
 */
export const searchDocuments = async (
  query: string,
  fileSetId: string,
  topK: number = 1
): Promise<RagResponse> => {
  try {
    // New endpoint structure based on user request
    const endpoint = `/domo/files/v1/filesets/${fileSetId}/query`;
    const payload = {
      query,
      directoryPath: "",
      topK,
    };

    // Ryuu.js call to Filesets API
    const data = await domo.post(endpoint, payload);
    return data as unknown as RagResponse;
  } catch (error) {
    console.error('Error searching documents:', error);
    // Return empty matches on error to allow graceful degradation (chat without context)
    return { matches: [] };
  }
};

/**
 * Generates text using the AI endpoint.
 */
export const generateAiResponse = async (prompt: string): Promise<string> => {
  try {
    const body = {
      input: prompt,
    };

    // Ryuu.js call to AI Service
    const response = await domo.post(`/domo/ai/v1/text/generation`, body);
    const aiResponse = response as unknown as AiResponse;

    if (aiResponse.choices && aiResponse.choices.length > 0) {
      return aiResponse.choices[0].output;
    }
    return "I apologize, but I couldn't generate a response.";
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to communicate with AI service.');
  }
};

/**
 * Orchestrates the RAG flow: Search -> Construct Prompt -> Generate.
 */
export const handleRagChat = async (
  userQuery: string,
  fileSetId: string
): Promise<{ text: string; sources: string[] }> => {
  // 1. Search for context
  const searchResults = await searchDocuments(userQuery, fileSetId);

  // 2. Extract context text and unique sources
  const matches = searchResults.matches || [];
  const sources = Array.from(new Set(matches.map((m) => m.metadata.path)));

  let contextText = '';
  if (matches.length > 0) {
    contextText = matches
      .map((m) => `[Source: ${m.metadata.path}]\n${m.content.text}`)
      .join('\n\n---\n\n');
  }

  // 3. Construct the augmented prompt
  const finalPrompt = matches.length > 0
    ? `You are a helpful assistant. Use the following retrieved documentation to answer the user's question. If the answer is not in the documentation, say so, but try to be helpful based on general knowledge if possible.\n\nDOCUMENTATION:\n${contextText}\n\nUSER QUESTION:\n${userQuery}`
    : userQuery; // Fallback to raw query if no matches found

  // 4. Generate Answer
  const aiText = await generateAiResponse(finalPrompt);

  return {
    text: aiText,
    sources,
  };
};

/**
 * Determines if a query is asking about data (numbers, trends) or documents (knowledge).
 * Returns true for data queries, false for document queries.
 */
export const isDataQuery = (query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  
  // Data query keywords
  const dataKeywords = [
    'how many', 'how much', 'total', 'sum', 'average', 'mean', 'count',
    'trend', 'compare', 'comparison', 'vs', 'versus', 'sales', 'revenue',
    'profit', 'growth', 'increase', 'decrease', 'top', 'bottom', 'highest',
    'lowest', 'most', 'least', 'by region', 'by category', 'by', 'last month',
    'last year', 'this quarter', 'ytd', 'year to date', 'show me the',
    'list all', 'give me', 'calculate', 'aggregate', 'group by'
  ];
  
  // Document query keywords
  const documentKeywords = [
    'how to', 'what is', 'explain', 'documentation', 'docs', 'guide',
    'tutorial', 'help', 'describe', 'definition', 'configure', 'setup',
    'install', 'steps', 'procedure', 'process', 'best practice'
  ];
  
  // Count matches
  const dataMatches = dataKeywords.filter(kw => lowerQuery.includes(kw)).length;
  const docMatches = documentKeywords.filter(kw => lowerQuery.includes(kw)).length;
  
  // If more data keywords than document keywords, it's a data query
  if (dataMatches > docMatches) {
    return true;
  }
  
  // If equal or more doc keywords, check for numeric indicators
  if (dataMatches === docMatches && dataMatches > 0) {
    // Check for numbers or date patterns
    if (/\d+/.test(query) || /\d{4}/.test(query)) {
      return true;
    }
  }
  
  // Default to document query for safety (RAG fallback)
  return dataMatches > 0 && docMatches === 0;
};

/**
 * Handles dataset queries using text-to-SQL and AI summarization.
 */
export const handleDatasetQuery = async (
  userQuery: string
): Promise<{ text: string; dataset?: string; sql?: string; querySource: QuerySource }> => {
  try {
    // 1. Get available datasets
    const datasets = await getAvailableDatasets();
    
    if (datasets.length === 0) {
      throw new Error('No datasets configured in manifest');
    }
    
    // 2. Select the most appropriate dataset
    const targetDataset = selectDataset(userQuery, datasets);
    
    if (!targetDataset) {
      throw new Error('Could not determine which dataset to query');
    }
    
    // 3. Get dataset schema using alias (Data API requires alias)
    const columns = await getDatasetSchema(targetDataset.alias);
    
    if (columns.length === 0) {
      throw new Error(`Could not fetch schema for dataset ${targetDataset.name} (alias: ${targetDataset.alias})`);
    }
    
    // Update dataset with columns
    targetDataset.columns = columns;
    
    console.log(`Dataset ${targetDataset.alias} schema:`, columns);
    
    // 4. Generate SQL using Domo's text-to-SQL API
    const today = new Date().toISOString().split('T')[0];
    
    const textToSqlPayload = {
      input: userQuery,
      system: `You are a SQL database expert that generates SQL queries for data visualization purposes. Your goal is to provide the most accurate and efficient solution to the question provided.

Please adhere to the following guidelines and restrictions:

1. CRITICAL: Use column names EXACTLY as provided in the schema. Do not modify, simplify, or change column names in any way.
2. CRITICAL: If a column name has underscores (e.g., date_ymd), you MUST use the underscores. Do NOT remove them or change the casing.
3. Always use column aliases for aggregations, calculations, and functions, but not unnecessarily.
4. Include only the columns and filters necessary to clearly answer the question.
5. Do not add any labels, comments, or brackets to the SQL query.
6. Output the answer in <SQL></SQL> XML tags. Skip any preamble.`,
      
      promptTemplate: {
        template: `<current_date>Today's date is: \${today}</current_date>
Use today's date for calculating relative time frames such as "the past thirty days" or "last year," if specified.

<dialect>\${dialect}</dialect>
<schemas>
  \${dataSourceSchemas}
</schemas>

CRITICAL INSTRUCTIONS:
- You MUST use column names EXACTLY as they appear in the schema above
- If a column is named "date_ymd" with an underscore, use "date_ymd" - do NOT use "dateymd"
- If a column is named "store_revenue", use "store_revenue" - do NOT use "storerevenue"
- Column names are case-sensitive and must match exactly

Example of correct column usage:
If schema shows: date_ymd, store_revenue, product_name
Correct SQL: SELECT date_ymd, SUM(store_revenue) FROM tablename WHERE product_name = 'Widget'
Wrong SQL: SELECT dateymd, SUM(storerevenue) FROM tablename WHERE productname = 'Widget'

Generate a query to answer the following question:
<question>
  \${input}
</question>`
      },
      
      model: "domo.domo_ai.domogpt-medium-v2.1:anthropic",
      
      dataSourceSchemas: [{
        dataSourceName: targetDataset.alias,  // Use alias - this appears in generated SQL
        description: `Dataset with ${columns.length} columns. Column names must match exactly as provided.`,
        columns: columns
      }]
    };
    
    const sqlResponse = await domo.post('/domo/ai/v1/text/sql', textToSqlPayload) as any;
    
    // Extract SQL from XML tags or direct output
    let sql = sqlResponse.output || sqlResponse.choices?.[0]?.output || '';
    
    // Extract SQL from XML tags if present
    const sqlMatch = sql.match(/<SQL>([\s\S]*?)<\/SQL>/i);
    if (sqlMatch) {
      sql = sqlMatch[1].trim();
    }
    
    if (!sql) {
      throw new Error('AI did not generate SQL query');
    }
    
    console.log('Generated SQL:', sql);
    
    // Validate SQL references correct columns
    const columnNames = columns.map(c => c.name);
    const missingColumns = columnNames.filter(colName => {
      // Check if column is referenced in SQL (case-insensitive for validation only)
      const colPattern = new RegExp(`\\b${colName}\\b`, 'i');
      return sql.toLowerCase().includes(colName.toLowerCase().replace(/_/g, '')) && 
             !colPattern.test(sql);
    });
    
    if (missingColumns.length > 0) {
      console.warn('Potential column name mismatch in generated SQL. Expected columns:', columnNames);
      console.warn('Generated SQL may have incorrect column names.');
    }
    
    // 5. Execute SQL query using alias with plain text content type
    const queryResults = await domo.post(`/sql/v1/${targetDataset.alias}`, sql, {
      contentType: 'text/plain'
    });
    
    console.log('Query results:', queryResults);
    
    // 6. Generate natural language summary of results
    const resultText = JSON.stringify(queryResults, null, 2);
    const summaryPrompt = `You are a helpful data analyst. The user asked: "${userQuery}"

I executed a SQL query against the ${targetDataset.name} dataset and got these results:
${resultText}

Please provide a clear, natural language answer to the user's question based on these results. Be conversational and focus on insights, not just restating the raw data.`;
    
    const summary = await generateAiResponse(summaryPrompt);
    
    return {
      text: summary,
      dataset: targetDataset.name,
      sql: sql,
      querySource: QuerySource.Dataset
    };
    
  } catch (error) {
    console.error('Error in dataset query:', error);
    throw new Error(`Dataset query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Smart query handler that routes to either dataset or fileset based on query type.
 */
export const handleSmartQuery = async (
  userQuery: string,
  fileSetId?: string
): Promise<{ text: string; sources?: string[]; dataset?: string; sql?: string; querySource: QuerySource }> => {
  
  // Determine query type
  const isData = isDataQuery(userQuery);
  
  console.log(`Query type detected: ${isData ? 'DATA' : 'DOCUMENT'}`);
  
  if (isData) {
    // Route to dataset query
    const result = await handleDatasetQuery(userQuery);
    return result;
  } else {
    // Route to RAG/fileset query
    if (!fileSetId) {
      // If no fileset available, try dataset anyway
      console.log('No fileset available, attempting dataset query');
      const result = await handleDatasetQuery(userQuery);
      return result;
    }
    
    const result = await handleRagChat(userQuery, fileSetId);
    return {
      ...result,
      querySource: QuerySource.Fileset
    };
  }
};