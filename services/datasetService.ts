import domo from 'ryuu.js';
import { Dataset, DatasetColumn } from '../types';

/**
 * Fetches available datasets dynamically from manifest.json at runtime.
 * Automatically adapts to whatever datasets are mapped in each card instance.
 */
export const getAvailableDatasets = async (): Promise<Dataset[]> => {
  const manifest = await fetch('./manifest.json').then(r => r.json());
  return (manifest.datasetsMapping || []).map((ds: any) => ({
    alias: ds.alias,
    datasetId: ds.dataSetId,
    name: ds.alias,
    columns: []
  }));
};

/**
 * Fetches the schema (columns and types) for a specific dataset.
 * @param datasetAlias - The dataset alias from manifest (used for Data API)
 */
export const getDatasetSchema = async (datasetAlias: string): Promise<DatasetColumn[]> => {
  try {
    // Use the Data API metadata endpoint with alias
    const metadata = await domo.get(`/data/v1/${datasetAlias}?limit=0&includeMetadata=true`) as any;
    
    // Extract columns from metadata
    if (metadata && metadata.metadata && metadata.metadata.columns) {
      return metadata.metadata.columns.map((col: any) => ({
        name: col.name,
        type: mapDomoTypeToSqlType(col.type)
      })) as DatasetColumn[];
    }
    
    // Fallback: fetch one row to infer schema
    const sampleData = await domo.get(`/data/v1/${datasetAlias}?limit=1`) as any;
    if (Array.isArray(sampleData) && sampleData.length > 0) {
      const row = sampleData[0];
      return Object.keys(row).map(key => ({
        name: key,
        type: inferTypeSql(row[key])
      })) as DatasetColumn[];
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching schema for dataset ${datasetAlias}:`, error);
    return [];
  }
};

/**
 * Maps Domo data types to the format expected by Domo's text-to-SQL API.
 * Uses uppercase types: DATETIME, STRING, DOUBLE, LONG
 */
function mapDomoTypeToSqlType(domoType: string): string {
  const lowerType = domoType.toLowerCase();
  
  if (lowerType.includes('date') || lowerType.includes('time')) {
    return 'DATETIME';
  }
  
  if (lowerType.includes('double') || lowerType.includes('decimal')) {
    return 'DOUBLE';
  }
  
  if (lowerType.includes('long') || lowerType.includes('int')) {
    return 'LONG';
  }
  
  if (lowerType === 'number') {
    return 'DOUBLE';
  }
  
  return 'STRING';
}

/**
 * Infers the type of a value from sample data for SQL API.
 */
function inferTypeSql(value: any): string {
  if (value === null || value === undefined) {
    return 'STRING';
  }
  
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'LONG' : 'DOUBLE';
  }
  
  // Check if it's a date string
  if (typeof value === 'string' && !isNaN(Date.parse(value))) {
    return 'DATETIME';
  }
  
  return 'STRING';
}

/**
 * Selects the most appropriate dataset based on query content.
 * Uses simple keyword matching for now.
 */
export const selectDataset = (query: string, datasets: Dataset[]): Dataset | null => {
  const lowerQuery = query.toLowerCase();
  
  // Check for explicit dataset mentions
  for (const dataset of datasets) {
    const datasetName = dataset.name.toLowerCase();
    const datasetAlias = dataset.alias.toLowerCase();
    
    if (lowerQuery.includes(datasetName) || lowerQuery.includes(datasetAlias)) {
      return dataset;
    }
  }
  
  // Default to first available dataset if only one exists
  if (datasets.length === 1) {
    return datasets[0];
  }
  
  // Keyword-based selection
  if (lowerQuery.includes('sale') || lowerQuery.includes('revenue') || 
      lowerQuery.includes('order')) {
    const salesDataset = datasets.find(d => 
      d.alias.toLowerCase().includes('sale') || d.name.toLowerCase().includes('sale')
    );
    if (salesDataset) return salesDataset;
  }
  
  if (lowerQuery.includes('customer') || lowerQuery.includes('user') || 
      lowerQuery.includes('client')) {
    const customerDataset = datasets.find(d => 
      d.alias.toLowerCase().includes('customer') || d.name.toLowerCase().includes('customer')
    );
    if (customerDataset) return customerDataset;
  }
  
  // Default to first dataset if no match
  return datasets.length > 0 ? datasets[0] : null;
};
