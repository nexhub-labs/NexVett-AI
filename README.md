# NexVett AI - Bank Transaction Analyzer

A privacy-first AI agent for analyzing bank statements (particular to Nigerian banks for now). NexVett AI acts as your personal financial assistant, processing PDF, Excel, and CSV statements to provide intelligent insights while keeping your raw transaction data transient.

## Features

### �️ Privacy First
- **Transient Transactions**: Raw bank statement data is processed and discarded. We do not store your full transaction history.
- **Aggregated Insights**: Only anonymized, aggregated summaries (totals, categories, trends) are persisted to enable your personal Financial Assistant.
- **Data Sovereignty**: Your data is yours. We use these summaries to provide month-over-month trends and proactive budgeting advice without keeping a permanent copy of your most sensitive financial records.

### 📊 Intelligent Analysis
- **Adaptive Extraction**: Advanced multi-format support for complex financial documents.
- **Deep Insights**: Context-aware analysis tailored for diverse financial ecosystems.
- **Smart Logic**: Automated classification and pattern identification for comprehensive reporting.
- **Proactive Assistant**: Generates actionable financial strategies and personalized projections.

## Architecture

NexVett AI is structured as a **PNPM Monorepo** for optimized development and deployment.

### Core Components
1. **Shared Library** (`shared-lib/`): Common TypeScript types and interfaces used by both backend and frontend.
2. **Backend Engine** (`nexvett-ai/`): Mastra AI framework + Hono API.
3. **Frontend Client** (`nexvett-ai-client/`): Vike/React + Mantine UI + GSAP animations.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) >= 22.13.0
- [pnpm](https://pnpm.io/) >= 9.x

### Fast Setup

1. **Install Dependencies** (Run from root):
   ```bash
   pnpm install
   ```

2. **Configure Environment**:
   Create a `.env` file in the `nexvett-ai/` directory:
   ```env
   MISTRAL_API_KEY=your_api_key_here
   ```

3. **Start Development**:
   ```bash
   pnpm dev
   ```
   *This starts both the backend (4111) and frontend (3000) concurrently.*

## Scripts

Manage the entire workspace from the root directory:

| Script | Command | Description |
| :--- | :--- | :--- |
| **Install** | `pnpm install` | Installs and links all monorepo dependencies |
| **Dev** | `pnpm dev` | Starts Backend and Client in parallel |
| **Build** | `pnpm build` | Builds all packages in the correct order |
| **Clean** | `rm -rf node_modules` | Standard clean (if needed) |

## Tech Stack

- **Intelligence**: High-performance AI orchestration engines.
- **Backend**: Low-latency, scalable API framework.
- **Frontend**: Modern, responsive reactive UI.
- **Parsing**: Sophisticated proprietary extraction logic.

## Support

Built by **Nexhub Labs**. For inquiries, contact: info@nexhublabs.com

---

**Remember**: This agent analyzes your financial data using a privacy-first approach. We store only anonymized summaries to power your assistant, ensuring your most sensitive records remain transient.
