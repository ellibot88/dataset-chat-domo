# Dataset Chat - Intelligent Domo Assistant

A dual-mode chat application for Domo that intelligently routes natural language queries between datasets (via text-to-SQL) and document filesets (via RAG). Ask questions about your data or your documents and get conversational answers.

## Features

- **Intelligent Query Routing** - Automatically detects whether you're asking about data or documents
- **Dataset Queries** - Ask questions about your data in natural language; AI generates and executes SQL
- **RAG-Powered Document Search** - Get answers from AI-enabled Domo Filesets
- **Natural Language Results** - All responses are conversational and easy to understand
- **Query Transparency** - View the generated SQL and source datasets/documents used
- **Markdown Rendering** - Rich text formatting for AI responses (tables, lists, code blocks)
- **Dynamic Configuration** - Reads dataset mappings from `manifest.json` at runtime; no hardcoded IDs

## Prerequisites

Before deploying this app you need the following in your Domo instance:

| Requirement | Why | Where to check |
|---|---|---|
| **At least one dataset** | The app queries datasets via text-to-SQL | Data Warehouse > Datasets |
| **Domo AI enabled** | Powers text-to-SQL and text generation | Admin > Features > AI Services |
| **AI model access** | The app uses `domo.domo_ai.domogpt-medium-v2.1:anthropic` by default | Admin > Features > AI Services > Models |
| **(Optional) AI-enabled Fileset** | Required only if you want RAG document search | Files > Filesets, toggle "AI Search" |

## Domo Instance Setup

### Step 1: Identify your datasets

Find the dataset ID for each dataset you want to chat with. Navigate to the dataset in Domo and grab the UUID from the URL:

```
https://<instance>.domo.com/datasources/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/details/overview
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       Copy this UUID
```

### Step 2: Create a new custom app design

1. Go to **Asset Library > Custom Apps > New App** (or use Dev Studio).
2. Upload the contents of the `dist/` folder (see [Build](#build) below).
3. After the design is created, Domo assigns it an app ID. The `manifest.json` in this repo already has an `id` — replace it with yours or remove it to let Domo assign one.

### Step 3: Wire datasets to the app card

1. Create a **new card** from your custom app design.
2. In the card editor, go to the **Data** tab.
3. For each dataset, click **Add Dataset** and map it to an alias (e.g. `sales`, `finance`).
4. The alias you pick here **must** match the `alias` value in `manifest.json`.

> The app reads `manifest.json` at runtime to discover available datasets, so whatever you wire in the card editor is what the app will query — no code changes needed.

### Step 4: (Optional) Enable AI filesets for RAG

If you want document-based Q&A:

1. Go to **Files > Filesets** in your Domo instance.
2. Upload documents (PDF, DOCX, TXT, etc.) to a fileset.
3. Toggle **AI Search** on the fileset to enable vector indexing.
4. The app auto-discovers AI-enabled filesets at runtime — no manifest wiring needed.

### Step 5: Verify AI model availability

The app calls two AI endpoints:

| Endpoint | Purpose |
|---|---|
| `/domo/ai/v1/text/sql` | Converts natural language to SQL |
| `/domo/ai/v1/text/generation` | Generates natural language summaries and RAG answers |

Both require Domo AI to be enabled in your instance. If you get errors, confirm the model `domo.domo_ai.domogpt-medium-v2.1:anthropic` is available under **Admin > Features > AI Services**. You can change the model in `services/domoService.ts` if your instance uses a different one.

## Build

```bash
npm install
npm run build
```

The production output goes to `dist/`. Upload the contents of that folder to your Domo custom app design.

### Local development

```bash
npm run dev
```

Runs on `http://localhost:3000`. For local dev to work against live Domo data you need:

1. A published card of the app in your Domo instance.
2. A `proxyId` set in `manifest.json` matching that card's ID (find it in the card URL: `https://<instance>.domo.com/page/.../kpis/<proxyId>/...`).

Without `proxyId`, API calls to datasets and AI services will fail locally.

## Configuration

### manifest.json

The only file you **must** edit before deploying:

```json
{
  "name": "dataset-chat",
  "version": "1.0.0",
  "size": { "width": 1, "height": 1 },
  "fullpage": true,
  "datasetsMapping": [
    {
      "alias": "sales",
      "dataSetId": "YOUR-DATASET-UUID-HERE",
      "fields": []
    },
    {
      "alias": "finance",
      "dataSetId": "YOUR-DATASET-UUID-HERE",
      "fields": []
    }
  ]
}
```

| Field | Description |
|---|---|
| `alias` | Short identifier used in all API calls (`/data/v1/{alias}`, `/sql/v1/{alias}`). Must be alphanumeric, no spaces or special characters. |
| `dataSetId` | The UUID of your Domo dataset. Required for manifest wiring; not used directly in API calls. |
| `fields` | Column alias overrides. Leave as `[]` unless you need to rename columns. **Must be present** — omitting it causes a runtime error. |

### Customizing the logo

Place your logo PNG in the `public/` directory and update `App.tsx`:

```typescript
const LOGO_PATH = '/your-logo.png';
const LOGO_ALT_TEXT = 'Your Company';
```

## How It Works

```
User Query
    |
    v
Auto-Detection (isDataQuery)
    |
    +-- Data query -----> Select dataset -> Fetch schema -> Generate SQL -> Execute -> Summarize
    |
    +-- Document query -> RAG search filesets -> Extract context -> Generate answer
    |
    v
Natural Language Response (with source badges, SQL preview, file references)
```

### Dataset queries (text-to-SQL)

1. **Dataset selection** — keyword matching picks the best dataset from the manifest
2. **Schema fetch** — column names and types are retrieved from the Data API
3. **SQL generation** — Domo AI converts the question + schema into SQL
4. **Execution** — SQL is run against `/sql/v1/{alias}`
5. **Summarization** — AI generates a plain-English answer from the results

### Document queries (RAG)

1. **Fileset search** — queries AI-enabled filesets for relevant chunks
2. **Context assembly** — matching document content is combined
3. **Answer generation** — AI produces an answer grounded in the retrieved context

## Example Queries

**Dataset (data analysis):**
- "What were total sales last month?"
- "How many customers by region?"
- "Top 10 products by revenue"

**Document (knowledge base):**
- "How do I configure the API integration?"
- "What is the authentication process?"
- "Explain the data pipeline architecture"

## Tech Stack

| Tool | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 6 | Build tool |
| TypeScript 5 | Type safety |
| ryuu.js 5 | Domo Platform SDK (data, AI, files) |
| Tailwind CSS | Styling (CDN) |
| react-markdown | Rendering AI responses |
| lucide-react | Icons |

## Project Structure

```
dataset-chat-domo/
├── App.tsx                        # Main chat UI
├── index.tsx                      # React entry point
├── index.html                     # HTML shell (Tailwind CDN, importmap)
├── types.ts                       # TypeScript interfaces
├── components/
│   ├── ChatBubble.tsx             # Message bubble with SQL preview & source badges
│   └── TypingIndicator.tsx        # Loading indicator
├── services/
│   ├── domoService.ts             # Query routing, RAG flow, AI calls
│   └── datasetService.ts          # Dynamic dataset discovery & schema fetch
├── public/
│   ├── manifest.json              # Domo app config — edit this
│   └── thumbnail.png              # App thumbnail shown in Domo
├── vite.config.ts
├── package.json
└── tsconfig.json
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed error resolution. Quick checks:

| Symptom | Likely cause | Fix |
|---|---|---|
| 404 on data fetch | Alias mismatch between manifest and card wiring | Ensure `alias` in `manifest.json` matches exactly what you wired in the card editor |
| "Could not fetch schema" | Dataset not accessible or wrong UUID | Verify dataset permissions and that `dataSetId` is correct |
| AI endpoint returns error | AI services not enabled or model unavailable | Check Admin > Features > AI Services |
| Empty RAG results | Fileset not AI-enabled | Toggle AI Search on the fileset in Files > Filesets |
| Local dev returns 401/403 | Missing `proxyId` | Add your card's `proxyId` to `manifest.json` |

## Additional Documentation

- [DATASET_CONFIGURATION.md](DATASET_CONFIGURATION.md) — deep dive on dataset identifiers and wiring
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — error-by-error debugging guide
- [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) — implementation details and design decisions
