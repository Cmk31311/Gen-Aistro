# 🚀 Gen-Aistro — NASA Space Biology Knowledge Engine

Gen-Aistro is a production-ready Retrieval-Augmented Generation (RAG) dashboard that allows users to explore NASA Space Biology research. It uses preprocessed embeddings, client-side query embeddings, serverless retrieval, and Groq's `llama-3.3-70b-versatile` model for fast, accurate question answering.

## ✨ Features

### 🔍 **Advanced Search & AI**
- **Semantic Search**: Find relevant research papers using natural language queries
- **AI-Powered Answers**: Get grounded responses with inline citations
- **Citation Generator**: Export citations in APA, MLA, and Chicago formats
- **Share Results**: Native sharing API with clipboard fallback
- **Search History**: Quick access to recent queries
- **Example Questions**: Pre-built queries to help users get started

### 📊 **Analytics Dashboard**
- **Interactive Charts**: Timeline visualization of publications over time
- **Organism Analysis**: Research organism distribution with animated charts
- **Topic Analysis**: Research topic frequency with color-coded metrics
- **Link Coverage**: Publication accessibility statistics
- **Real-time Data**: Dynamic visualizations based on actual research data

### 💡 **AI-Powered Insights**
- **Smart Insights**: AI-generated research patterns and trends
- **Confidence Scoring**: Each insight has confidence levels (80-95%)
- **Impact Assessment**: High/Medium/Low impact categorization
- **Detailed Analysis**: Click insights for comprehensive analysis with supporting data
- **Research Trends**: Discover collaboration patterns and technology adoption

### 📚 **Publication Management**
- **607 Publications**: Complete NASA Space Biology research database
- **Advanced Filtering**: Search by title, ID, year, organism, and link status
- **Multiple Views**: Grid, list, and compact viewing modes
- **Bookmark System**: Save favorite publications
- **Export Functionality**: CSV export with bookmarks and metadata
- **Direct Links**: Click to open publications in new tabs

### ⚡ **Technical Excellence**
- **Real-time Processing**: Client-side embeddings with serverless retrieval
- **Production Ready**: Rate limiting, caching, error handling, and monitoring
- **Full-Text Crawling**: Automatically extracts complete text from publication URLs
- **Enhanced Metadata**: Rich document metadata with proper citations
- **Modern UI**: Space galaxy theme with glassmorphism design
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE (Next.js)                    │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search Tab        📊 Analytics Tab    💡 Insights Tab        │
│  • Query Embedding    • Interactive Charts • AI Insights        │
│  • Citation Gen       • Timeline Viz       • Confidence Scores  │
│  • Share Results      • Organism Analysis  • Impact Assessment  │
│  • Search History     • Topic Analysis     • Detailed Reports   │
│  • Example Questions  • Link Coverage      • Research Trends    │
├─────────────────────────────────────────────────────────────────┤
│  📚 Publications Tab  │  🎨 UI Components  │  📱 Responsive      │
│  • Browse 607 Papers │  • Glassmorphism   │  • Mobile Ready     │
│  • Quick Search      │  • Space Theme     │  • Touch Friendly   │
│  • Direct Links      │  • Animations      │  • Cross Platform   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL SERVERLESS API                        │
├─────────────────────────────────────────────────────────────────┤
│  /api/search    /api/ask      /api/graph    /api/health         │
│  • Cosine Sim   • LLM Gen     • Graph Data  • System Status     │
│  • MMR Diversify• Streaming   • Node/Links  • Performance       │
│  • Filtering    • Citations   • Analytics  • Health Check       │
│  • Caching      • Web Search  • Stats      • Monitoring         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│  🤖 Groq API           🌐 Web Search API    📊 Data Sources      │
│  • Llama-3.3-70B      • DuckDuckGo        • NASA Publications   │
│  • Fast Inference      • Instant Answers   • PMC/DOI Links      │
│  • Rate Limiting       • Fallback Context  • Research Data      │
│  • Streaming Response  • Additional Info   • Metadata           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  📄 Static Files       🔄 Processing Pipeline  📊 Analytics      │
│  • papers.json (93MB)  • Python Scripts        • Real-time      │
│  • stats.json          • Web Crawling          • Interactive    │
│  • graph.json          • Text Extraction      • Dynamic         │
│  • manifest.json       • Chunking & Embedding • Responsive      │
│  • failed_crawls.csv   • Knowledge Graph      • Performance     │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- Python 3.8+ and pip
- Groq API key ([Get one here](https://console.groq.com/keys))

### 2. Install Dependencies

   ```bash
# Install Node.js dependencies
   npm install

# Install Python dependencies
pip install -r scripts/requirements.txt
```

### 3. Data Preprocessing

The enhanced preprocessing pipeline crawls publication URLs to extract full text content:

```bash
# Process NASA Space Biology publications with full crawling
python scripts/preprocess.py SB_publication_PMC.csv --build-graph

# Or skip crawling and use CSV content only
python scripts/preprocess.py SB_publication_PMC.csv --skip-crawling --build-graph
```

#### Preprocessing Options

- `--chunk-words 1000`: Target chunk size in words (default: 1000)
- `--overlap-words 50`: Overlap between chunks (default: 50)
- `--max-workers 4`: Parallel crawling workers (default: 4)
- `--request-delay 1.0`: Delay between requests in seconds (default: 1.0)
- `--skip-crawling`: Use CSV content only, don't crawl URLs
- `--build-graph`: Build knowledge graph from extracted text
- `--output-dir public/data`: Output directory (default: public/data)

### 4. Environment Setup

   ```bash
# Copy environment template
cp .env.example .env

# Add your Groq API key
echo "GROQ_API_KEY=your_groq_api_key_here" >> .env
```

### 5. Run Locally

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable
vercel env add GROQ_API_KEY
```

## 🎯 Demo Features

### Search Tab
- **Try Example Questions**: Click pre-built questions to get started
- **AI Answers**: Get comprehensive answers with citations
- **Citation Export**: Generate APA, MLA, and Chicago citations
- **Share Results**: Share findings with colleagues

### Analytics Tab
- **Timeline Charts**: See publication trends over time
- **Organism Analysis**: Discover research focus areas
- **Topic Visualization**: Explore research themes
- **Link Coverage**: Understand data accessibility

### Insights Tab
- **AI Discoveries**: Uncover hidden research patterns
- **Confidence Metrics**: Trust the insights with confidence scores
- **Impact Analysis**: Understand research significance
- **Detailed Reports**: Deep dive into supporting data

### Publications Tab
- **Browse All**: Explore all 607 NASA publications
- **Quick Search**: Find specific papers instantly
- **Direct Access**: Click to open papers in new tabs
- **Clean Interface**: Simple, focused browsing experience

## 🔧 Enhanced Data Pipeline

### CSV Ingestion and Normalization

The pipeline automatically detects CSV columns for:
- **Title**: Document titles
- **Year**: Publication years
- **URL**: Document URLs (PMC, DOI, PMID, direct links)
- **ID**: Document identifiers
- **Content**: Abstract or full text content

### Web Crawling and Text Extraction

- **Polite Crawling**: Custom User-Agent, rate limiting, exponential backoff
- **HTML Processing**: Uses readability-lxml for main content extraction
- **PDF Processing**: Supports both pdfplumber and PyPDF2 with fallback
- **Error Handling**: Graceful failure handling with detailed error reporting
- **Parallel Processing**: Configurable worker threads for efficient crawling

### Text Cleaning and Chunking

- **Boilerplate Removal**: Strips references, acknowledgments, etc.
- **Semantic Chunking**: Preserves paragraph and sentence boundaries
- **Overlap Strategy**: Maintains context between chunks
- **Quality Filtering**: Removes very short or low-quality chunks

### Knowledge Graph Construction

- **Entity Extraction**: Identifies organisms, conditions, and outcomes
- **Co-occurrence Analysis**: Builds relationships between entities
- **Graph Export**: Creates interactive graph for visualization

## 📁 Project Structure

```
Gen-Aistro/
├── app/                    # Next.js App Router
│   ├── api/               # Serverless functions
│   │   ├── search/        # Semantic search endpoint
│   │   ├── ask/           # LLM generation endpoint
│   │   ├── graph/         # Knowledge graph endpoint
│   │   └── health/        # Health check endpoint
│   ├── page.jsx           # Main dashboard UI with 4 tabs
│   ├── layout.jsx         # Root layout
│   └── globals.css        # Global styles with space theme
├── scripts/               # Data preprocessing
│   ├── preprocess.py      # Enhanced preprocessing script
│   ├── smoke_test.py      # Corpus validation
│   └── requirements.txt   # Python dependencies
├── utils/                 # Utilities
│   ├── embed.js          # Client-side embeddings
│   └── cosine.js         # Cosine similarity
├── public/data/           # Generated data files
│   ├── papers.json       # Processed publications with embeddings
│   ├── stats.json        # Dataset statistics and manifest
│   ├── graph.json        # Knowledge graph
│   ├── manifest.json     # CSV column detection results
│   └── failed_crawls.csv # Crawling failure log
└── README.md             # This file
```

## 🏆 Hackathon Features

### 🎯 **What Makes This Special**

This NASA Space Biology Knowledge Engine showcases cutting-edge AI and data visualization techniques:

- **Advanced RAG Pipeline**: Combines semantic search with LLM generation
- **Real-time Analytics**: Interactive charts and data visualizations
- **AI-Powered Insights**: Machine learning-driven research pattern discovery
- **Professional UI/UX**: Modern space-themed interface with glassmorphism design
- **Production Ready**: Scalable architecture with proper error handling

### 🚀 **Demo Highlights**

1. **Ask Complex Questions**: "What are the effects of microgravity on plant growth?"
2. **Explore Analytics**: Interactive timeline showing 20+ years of research
3. **Discover Insights**: AI reveals hidden patterns in NASA research
4. **Export Citations**: Generate proper academic citations
5. **Share Findings**: Collaborate with research teams

### 🎨 **Technical Innovation**

- **Client-side Embeddings**: Reduces server load and improves performance
- **Serverless Architecture**: Scales automatically with user demand
- **Advanced Chunking**: Preserves semantic meaning across document boundaries
- **Smart Caching**: Optimizes response times for better user experience
- **Responsive Design**: Works seamlessly across all devices

## ⚙️ Configuration

### RAG Tuning Parameters

- **Chunk Size**: 800-1200 words per chunk with 50-word overlap
- **Top-K Results**: 3-10 most relevant chunks
- **Temperature**: 0.2 (focused responses)
- **Max Tokens**: 800 (comprehensive answers)
- **MMR Diversification**: λ=0.3 for result diversity

### Search Filters

- **Year Range**: Filter by publication year
- **Keywords**: Include/exclude specific terms
- **Document IDs**: Target specific publications

### Crawling Configuration

- **Rate Limiting**: 1 second delay between requests (configurable)
- **Retry Logic**: 3 attempts with exponential backoff
- **Timeout**: 30 seconds per request
- **User Agent**: NASA Space Biology Research Bot
- **Parallel Workers**: 4 concurrent requests (configurable)

## 🧪 Testing

### Smoke Test

```bash
python scripts/smoke_test.py
```

Validates:
- Corpus structure and schema
- Embedding dimensions (384)
- Basic retrieval functionality
- Statistics file format
- Manifest completeness

### Health Check

```bash
curl http://localhost:3000/api/health
```

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the app is running on the correct port
2. **500 Errors**: Check Groq API key and rate limits
3. **Out of Memory**: Reduce chunk size or batch processing
4. **File Size Limits**: Vercel has 50MB function size limit
5. **Crawling Failures**: Check network connectivity and URL validity
6. **PDF Extraction Issues**: Install additional PDF libraries if needed

### Performance Tips

- Use appropriate chunk sizes (800-1200 words)
- Implement caching for frequently accessed data
- Monitor API rate limits and usage
- Optimize embedding dimensions if needed
- Adjust crawling workers based on target server capacity

### Crawling Troubleshooting

- **Rate Limiting**: Increase `--request-delay` if getting blocked
- **Timeout Issues**: Increase timeout for slow servers
- **PDF Errors**: Check if PDFs are password-protected or corrupted
- **HTML Parsing**: Some sites may block automated access

## 🔒 Security

- Never commit API keys to version control
- Use environment variables for sensitive data
- Implement rate limiting for production use
- Validate all user inputs
- Respect robots.txt and site terms of service
- Use polite crawling practices

## 📊 Monitoring

- Monitor API response times
- Track embedding generation performance
- Log search query patterns
- Monitor Groq API usage and costs
- Track crawling success rates
- Monitor knowledge graph quality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **NASA Space Biology Program** for providing the research data
- **Groq** for high-performance LLM infrastructure
- **Next.js and Vercel** for modern web development and deployment
- **Tailwind CSS** for beautiful, responsive UI design
- **React** for interactive user interfaces
- **Sentence Transformers** for semantic embeddings
- **BeautifulSoup and readability** for HTML processing
- **PyPDF2 and pdfplumber** for PDF extraction
- **Python** for robust data processing pipeline

## 🌟 Built for Hackathons

This project demonstrates:
- **Full-stack AI application** development
- **Modern web technologies** and best practices
- **Data science** and machine learning integration
- **User experience** design and accessibility
- **Production deployment** and scaling considerations

Perfect for showcasing technical skills and innovation in AI/ML hackathons! 🚀
