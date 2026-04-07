# 🚀 Gen-Aistro — The Advanced AI Knowledge & BYOD Engine

**🌐 Live Demo**: [https://gen-aistro.vercel.app/](https://gen-aistro.vercel.app/)

Gen-Aistro is a state-of-the-art **Retrieval-Augmented Generation (RAG)** dashboard and **Bring Your Own Dataset (BYOD)** platform. It enables researchers, students, and businesses to dynamically upload tabular datasets, seamlessly chunk and embed the data, and query it in natural language using Groq's high-speed `llama-3.3-70b-versatile` model.

---

## ✨ System Overhauls & Key Features

### 📡 Bring Your Own Dataset (BYOD) Pipeline
- **Dynamic Uploads**: Upload massive CSV datasets effortlessly through the client-side `UploadWizard`.
- **Live Parsing & Vectorization**: Extracted text is instantly chunked and sent to the **HuggingFace Inference API** to compute `all-MiniLM-L6-v2` 384-dimensional embeddings.
- **PgVector Storage**: Processed chunks and embeddings are securely streamed into Supabase's Postgres database and indexed natively for instantaneous vector-cosine similarity searches.
- **Massive Context Bounds**: Unlike simple RAG engines limited to 5-10 chunks, Gen-Aistro fetches and injects up to 60 chunks simultaneously (bypassing context fragmentation) allowing robust aggregation and analytical responses.
- **General Knowledge Integration**: The Llama 3 AI is unlocked! If a question exceeds the provided dataset, the AI flawlessly switches gear to leverage its 70-Billion Parameter world knowledge to compute the answer.

### 🎭 Premium Glassmorphism UI/UX
- **Framer Motion Engine**: Replaced static effects with fluid, spring-based animations for all major components, page transitions, modal entries, and staggered list loading.
- **High-End Dark Mode Aesthetic**: Locked into a deeply immersive, polished '#050505' palette complemented by metallic '#E5A93D' accents and complex shadow depths.
- **Motion Cards**: Staggered entry animations and glassmorphic hover mechanics embedded across the dashboard ecosystem.

### 🔐 Next.js 14 & Supabase Security
- **Isolated Component Architecture**: Zero webpack bleeding. The database logic is strictly decoupled between `lib/supabase.js` (Client-side) and `lib/supabase-server.js` (Server-side utilizing deep `next/headers` context interceptions). 
- **Dynamic JWT Auth Binding**: Totally bypasses stale/rotated Service Role keys. Instead, the backend cleanly mounts standard HTTP `Authorization: Bearer` JWT tokens onto the Anon Client, maintaining perfect Row-Level Security (RLS) tracking natively.
- **Advanced Sign-up Flow**: Integrated custom metadata passing (First/Last names directly attached to Supabase Users) and strict Regex password policing.

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE (Next.js)                    │
├─────────────────────────────────────────────────────────────────┤
│  🚀 Upload Wizard     🔍 Search Interface  📈 Insights & Viz   │
│  • CSV Parser         • Fluid Framer UI    • Dynamic ChartJs    │
│  • Column Mapping     • Staggered Vectors  • Animated Loaders   │
│  • Real-Time Loading  • Direct Query Box   • Glassmorphism      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL SERVERLESS API                        │
├─────────────────────────────────────────────────────────────────┤
│  /api/datasets/process  /api/datasets/ask  /api/search          │
│  • HF Embedding Gen     • MMR Diversify    • JWT Token Parser   │
│  • Batched Upserts      • 60x Context Scan • Isolated Webpack   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│  🤖 Groq API           🧠 Hugging Face      🛢️ Supabase PgVector│
│  • Llama-3.3-70B      • all-MiniLM-L6-v2  • RLS Security       │
│  • Fast Inference      • Feature Extract   • hybrid_search RPC  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ and npm
- Groq API key ([Get one here](https://console.groq.com/keys))
- Hugging Face API key ([Get one here](https://huggingface.co/settings/tokens))
- A Supabase Project Link 

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file inside the root folder containing your database keys and logic keys:
```env
GROQ_API_KEY=your_groq_api_key_here
HUGGINGFACE_API_KEY=your_hf_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUz...
```

### 4. 🔥 CRITICAL: Install The Postgres Vector Pipeline
Because Gen-Aistro requires an advanced mathematical vector engine to compute similarity chunks, you must build the databases and deploy the Custom Functions inside your Supabase instance:
1. Open your **Supabase Dashboard** online.
2. Select the **SQL Editor** on the left menu. 
3. Open `supabase-schema.sql` found locally in this repository. 
4. **Copy Line 48 to the Bottom** (Starting from `-- pgvector similarity search function` to avoid overwriting existing default tables) and paste it into the Supabase SQL Editor.
5. Hit **RUN**. 

*This fully equips your database with `hybrid_search_chunks` capable of handling mathematical vector search.*

### 5. Run Locally
```bash
npm run dev
```

### 6. Deploying to Vercel
Deployment to Vercel is seamless since the repo is constructed utilizing Next.js 14 App Routers. 
Simply push to GitHub, link the repository repository to your Vercel Dashboard, and automatically upload the corresponding `.env` items there.

---
## 📄 License
MIT License - see LICENSE file for details.
