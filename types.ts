// Domo Global Interface
export interface Domo {
  post: (url: string, body: any) => Promise<any>;
}

// declare global {
//   interface Window {
//     domo: Domo;
//   }
//   const domo: Domo;
// }

// Dataset Types
export interface Dataset {
  alias: string;      // Manifest alias - used for /data/v1/{alias} and /sql/v1/{alias}
  datasetId: string;  // Actual dataset ID (UUID) - for reference only
  name: string;       // Friendly display name
  columns: DatasetColumn[];
}

export interface DatasetColumn {
  name: string;
  type: string; // DATETIME, STRING, DOUBLE, LONG, etc.
}

export enum QuerySource {
  Dataset = 'dataset',
  Fileset = 'fileset'
}

// RAG API Types
export interface RagMatch {
  content: {
    text: string;
    type: string;
  };
  metadata: {
    fileId: string;
    path: string;
  };
  score: number;
}

export interface RagResponse {
  matches: RagMatch[];
}

// AI API Types
export interface AiChoice {
  output: string;
}

export interface AiResponse {
  prompt: string;
  choices: AiChoice[];
  modelId: string;
  isCustomerModel: boolean;
}

// App State Types
export enum Sender {
  User = 'user',
  Bot = 'bot',
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  sources?: string[]; // List of filenames used for RAG
  querySource?: QuerySource; // Which source was used (dataset or fileset)
  datasetUsed?: string; // Dataset name if dataset query
  sqlGenerated?: string; // SQL query if dataset query
}

export interface Fileset {
  id: string;
  name: string;
}