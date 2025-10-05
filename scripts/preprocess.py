
#!/usr/bin/env python3
"""
NASA Space Biology Publication Preprocessor

Enhanced RAG corpus builder that:
1. Ingests CSV with publication metadata
2. Crawls URLs to extract full text (HTML/PDF)
3. Chunks and embeds content
4. Builds knowledge graph
5. Outputs rich corpus for RAG system
"""

import sys
import json
import re
import argparse
import time
import csv
import hashlib
import io
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

import pandas as pd
import numpy as np
import requests
from bs4 import BeautifulSoup
import PyPDF2
import pdfplumber
from readability import Document
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
from sklearn.feature_extraction.text import TfidfVectorizer
from collections import Counter
# import spacy
# from spacy.matcher import Matcher

# Configuration
DEFAULT_USER_AGENT = "NASA Space Biology Research Bot (research@nasa.gov)"
DEFAULT_FROM_EMAIL = "research@nasa.gov"
MAX_WORKERS = 4
REQUEST_DELAY = 1.0  # seconds between requests
MAX_RETRIES = 3
TIMEOUT = 30

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DocumentCrawler:
    """Handles polite web crawling and text extraction."""
    
    def __init__(self, user_agent: str = DEFAULT_USER_AGENT, 
                 from_email: str = DEFAULT_FROM_EMAIL,
                 delay: float = REQUEST_DELAY,
                 max_retries: int = MAX_RETRIES):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': user_agent,
            'From': from_email,
            'Accept': 'text/html,application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        self.delay = delay
        self.max_retries = max_retries
        self.last_request_time = 0
        
    def _rate_limit(self):
        """Enforce rate limiting."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.delay:
            time.sleep(self.delay - time_since_last)
        self.last_request_time = time.time()
    
    def _extract_html_text(self, html_content: str, url: str) -> Optional[str]:
        """Extract main text from HTML using readability."""
        try:
            # Use readability to extract main content
            doc = Document(html_content)
            clean_html = doc.summary()
            
            # Parse with BeautifulSoup and extract text
            soup = BeautifulSoup(clean_html, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text and clean up
            text = soup.get_text()
            
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            # Remove common boilerplate
            boilerplate_patterns = [
                r'References?\s*$',
                r'Acknowledgments?\s*$',
                r'Conflict of Interest\s*$',
                r'Author Contributions?\s*$',
                r'Funding\s*$',
                r'Data Availability\s*$',
            ]
            
            for pattern in boilerplate_patterns:
                text = re.sub(pattern, '', text, flags=re.IGNORECASE)
            
            return text.strip() if len(text.strip()) > 100 else None
            
        except Exception as e:
            logger.warning(f"HTML extraction failed for {url}: {e}")
            return None
    
    def _extract_pdf_text(self, pdf_content: bytes) -> Optional[str]:
        """Extract text from PDF using multiple methods."""
        try:
            # Try pdfplumber first (better for complex layouts)
            with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
                text_parts = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                
                if text_parts:
                    full_text = '\n\n'.join(text_parts)
                    if len(full_text.strip()) > 100:
                        return full_text.strip()
            
            # Fallback to PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
            text_parts = []
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            
            if text_parts:
                full_text = '\n\n'.join(text_parts)
                if len(full_text.strip()) > 100:
                    return full_text.strip()
            
            return None
            
        except Exception as e:
            logger.warning(f"PDF extraction failed: {e}")
            return None
    
    def crawl_document(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        """Crawl a document URL and extract text content."""
        self._rate_limit()
        
        for attempt in range(self.max_retries):
            try:
                response = self.session.get(url, timeout=TIMEOUT)
                response.raise_for_status()
                
                content_type = response.headers.get('content-type', '').lower()
                
                if 'text/html' in content_type:
                    text = self._extract_html_text(response.text, url)
                    return text, 'html'
                
                elif 'application/pdf' in content_type or url.lower().endswith('.pdf'):
                    text = self._extract_pdf_text(response.content)
                    return text, 'pdf'
                
                else:
                    logger.warning(f"Unsupported content type for {url}: {content_type}")
                    return None, None
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed for {url} (attempt {attempt + 1}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    return None, str(e)
            except Exception as e:
                logger.error(f"Unexpected error crawling {url}: {e}")
                return None, str(e)
        
        return None, "Max retries exceeded"

def extract_content(row: pd.Series) -> Optional[str]:
    """Extract content from various possible columns."""
    content_fields = ['full_text', 'body_text', 'abstract', 'title', 'Title']
    
    for field in content_fields:
        if field in row and pd.notna(row[field]) and str(row[field]).strip():
            content = str(row[field]).strip()
            if len(content) > 10:  # Reduced minimum for titles
                return content
    
    return None

def extract_year(row: pd.Series) -> Optional[int]:
    """Extract publication year from various metadata fields."""
    year_fields = ['year', 'pub_date', 'date', 'publication_date']
    
    for field in year_fields:
        if field in row and pd.notna(row[field]):
            try:
                date_val = str(row[field])
                # Try to extract year from various formats
                year_match = re.search(r'\b(19|20)\d{2}\b', date_val)
                if year_match:
                    year = int(year_match.group())
                    if 1950 <= year <= 2025:  # Reasonable range
                        return year
            except (ValueError, TypeError):
                continue
    
    return None

def extract_url(row: pd.Series) -> Optional[str]:
    """Extract URL from various possible fields with enhanced normalization."""
    url_fields = ['url', 'doi', 'pmc_id', 'pmid', 'link', 'Link', 'PMCID', 'DOI']
    
    for field in url_fields:
        if field in row and pd.notna(row[field]):
            url = str(row[field]).strip()
            
            # Handle PMC IDs
            if url.startswith('PMC') or re.match(r'^PMC\d+', url):
                pmc_id = re.search(r'PMC\d+', url)
                if pmc_id:
                    return f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmc_id.group()}/"
            
            # Handle DOI
            elif url.startswith('doi:') or url.startswith('10.'):
                doi = re.search(r'10\.\d+/[^\s]+', url)
                if doi:
                    return f"https://doi.org/{doi.group()}"
            
            # Handle PMID
            elif url.startswith('PMID:') or re.match(r'^\d+$', url):
                pmid = re.search(r'\d+', url)
                if pmid:
                    return f"https://pubmed.ncbi.nlm.nih.gov/{pmid.group()}/"
            
            # Handle direct URLs
            elif url.startswith(('http://', 'https://')):
                return url
    
    return None

def detect_csv_columns(df: pd.DataFrame) -> Dict[str, str]:
    """Detect which CSV columns contain title, year, URL, and ID information."""
    manifest = {
        'title_column': None,
        'year_column': None,
        'url_column': None,
        'id_column': None,
        'content_column': None,
        'detected_columns': list(df.columns),
        'total_rows': len(df)
    }
    
    # Detect title column
    title_candidates = ['title', 'Title', 'document_title', 'paper_title', 'name']
    for col in df.columns:
        if col.lower() in [c.lower() for c in title_candidates]:
            manifest['title_column'] = col
            break
    
    # Detect year column
    year_candidates = ['year', 'Year', 'pub_date', 'date', 'publication_date', 'pub_year']
    for col in df.columns:
        if col.lower() in [c.lower() for c in year_candidates]:
            manifest['year_column'] = col
            break
    
    # Detect URL column
    url_candidates = ['url', 'URL', 'link', 'Link', 'doi', 'DOI', 'pmc_id', 'PMCID', 'pmid', 'PMID']
    for col in df.columns:
        if col.lower() in [c.lower() for c in url_candidates]:
            manifest['url_column'] = col
            break
    
    # Detect ID column
    id_candidates = ['id', 'ID', 'doc_id', 'document_id', 'pmc_id', 'PMCID', 'pmid', 'PMID']
    for col in df.columns:
        if col.lower() in [c.lower() for c in id_candidates]:
            manifest['id_column'] = col
            break
    
    # Detect content column
    content_candidates = ['abstract', 'Abstract', 'full_text', 'body_text', 'content', 'text']
    for col in df.columns:
        if col.lower() in [c.lower() for c in content_candidates]:
            manifest['content_column'] = col
            break
    
    return manifest

def chunk_text(text: str, target_tokens: int = 800, target_words: int = 1000, overlap_words: int = 50) -> List[str]:
    """
    Split text into chunks while preserving logical boundaries with overlap.
    Target ~800-1200 words per chunk with small overlap to preserve context.
    """
    # For very short content (like titles), return as single chunk
    if len(text.split()) < 50:
        return [text.strip()]
    
    # Clean and normalize text
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Split into sentences for better chunking
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        return [text]
    
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for sentence in sentences:
        sentence_words = len(sentence.split())
        
        # If adding this sentence would exceed target, finalize current chunk
        if current_chunk and current_word_count + sentence_words > target_words:
            chunk_text = ' '.join(current_chunk)
            chunks.append(chunk_text)
            
            # Start new chunk with overlap
            overlap_sentences = []
            overlap_word_count = 0
            
            # Add sentences from the end for overlap
            for prev_sentence in reversed(current_chunk):
                prev_words = len(prev_sentence.split())
                if overlap_word_count + prev_words <= overlap_words:
                    overlap_sentences.insert(0, prev_sentence)
                    overlap_word_count += prev_words
                else:
                    break
            
            current_chunk = overlap_sentences + [sentence]
            current_word_count = overlap_word_count + sentence_words
        else:
            current_chunk.append(sentence)
            current_word_count += sentence_words
    
    # Add final chunk
    if current_chunk:
        chunk_text = ' '.join(current_chunk)
        chunks.append(chunk_text)
    
    # Filter out chunks that are too short
    final_chunks = [chunk for chunk in chunks if len(chunk.split()) >= 50]
    
    return final_chunks if final_chunks else [text]

class KnowledgeGraphBuilder:
    """Builds a knowledge graph from extracted text."""
    
    def __init__(self):
        self.nlp = None  # spaCy not available
        
        # Define entity patterns
        self.organism_patterns = [
            r'\b[A-Z][a-z]+ [a-z]+\b',  # Scientific names
            r'\b(mouse|mice|rat|rats|human|humans|arabidopsis|drosophila|zebrafish)\b',
            r'\b(cell|cells|tissue|tissues|organ|organs)\b'
        ]
        
        self.condition_patterns = [
            r'\b(microgravity|spaceflight|radiation|weightlessness|zero.?gravity)\b',
            r'\b(space|station|ISS|international space station)\b',
            r'\b(cosmic|solar|galactic)\b'
        ]
        
        self.outcome_patterns = [
            r'\b(growth|development|expression|regulation|metabolism)\b',
            r'\b(bone|muscle|cardiac|neural|immune)\b',
            r'\b(gene|protein|enzyme|hormone|receptor)\b',
            r'\b(apoptosis|proliferation|differentiation)\b'
        ]
    
    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract entities from text using patterns and spaCy."""
        entities = {
            'organisms': set(),
            'conditions': set(),
            'outcomes': set()
        }
        
        text_lower = text.lower()
        
        # Extract using patterns
        for pattern in self.organism_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            entities['organisms'].update(matches)
        
        for pattern in self.condition_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            entities['conditions'].update(matches)
        
        for pattern in self.outcome_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            entities['outcomes'].update(matches)
        
        # Use spaCy if available
        if self.nlp:
            doc = self.nlp(text)
            for ent in doc.ents:
                if ent.label_ in ['ORG', 'PERSON'] and len(ent.text) > 3:
                    entities['organisms'].add(ent.text.lower())
        
        # Convert sets to lists and clean
        for entity_type in entities:
            entities[entity_type] = [
                entity.strip() for entity in entities[entity_type]
                if len(entity.strip()) > 2 and entity.strip().isalpha()
            ]
        
        return entities
    
    def build_graph(self, papers: List[Dict]) -> Dict[str, Any]:
        """Build knowledge graph from papers."""
        logger.info("Building knowledge graph...")
        
        # Collect all entities
        all_entities = {'organisms': set(), 'conditions': set(), 'outcomes': set()}
        entity_cooccurrence = {}
        
        for paper in tqdm(papers, desc="Extracting entities"):
            entities = self.extract_entities(paper['text'])
            
            for entity_type, entity_list in entities.items():
                all_entities[entity_type].update(entity_list)
                
                # Track co-occurrence within this document
                for i, entity1 in enumerate(entity_list):
                    for j, entity2 in enumerate(entity_list):
                        if i != j:
                            pair = tuple(sorted([entity1, entity2]))
                            entity_cooccurrence[pair] = entity_cooccurrence.get(pair, 0) + 1
        
        # Build nodes
        nodes = []
        node_id_map = {}
        node_id = 0
        
        for entity_type, entities in all_entities.items():
            for entity in entities:
                if entity not in node_id_map:
                    node_id_map[entity] = node_id
                    nodes.append({
                        'id': entity,
                        'type': entity_type[:-1],  # Remove 's' from plural
                        'count': 1
                    })
                    node_id += 1
                else:
                    # Update count
                    for node in nodes:
                        if node['id'] == entity:
                            node['count'] += 1
                            break
        
        # Build links
        links = []
        for (entity1, entity2), weight in entity_cooccurrence.items():
            if weight > 1:  # Only include links that appear in multiple documents
                links.append({
                    'source': entity1,
                    'target': entity2,
                    'weight': weight
                })
        
        graph = {
            'nodes': nodes,
            'links': links,
            'metadata': {
                'total_entities': len(nodes),
                'total_relationships': len(links),
                'generated_at': datetime.now().isoformat()
            }
        }
        
        logger.info(f"Knowledge graph built: {len(nodes)} entities, {len(links)} relationships")
        return graph

def generate_doc_id(row: pd.Series, index: int) -> str:
    """Generate a unique document ID."""
    # Try to use existing ID fields
    id_fields = ['pmc_id', 'pmid', 'id', 'document_id']
    
    for field in id_fields:
        if field in row and pd.notna(row[field]):
            return str(row[field]).strip()
    
    # Fallback to index-based ID
    return f"DOC_{index:06d}"

def compute_stats(papers: List[Dict], titles: List[str]) -> Dict:
    """Compute statistics for the dataset."""
    stats = {
        "total_documents": len(set(p["doc_id"] for p in papers)),
        "total_chunks": len(papers),
        "year_distribution": {},
        "top_keywords": [],
        "generated_at": datetime.now().isoformat()
    }
    
    # Year distribution
    years = [p["year"] for p in papers if p["year"]]
    if years:
        year_counts = Counter(years)
        stats["year_distribution"] = dict(sorted(year_counts.items()))
    
    # Top keywords from titles using TF-IDF
    if titles:
        try:
            vectorizer = TfidfVectorizer(max_features=50, stop_words='english', ngram_range=(1, 2))
            tfidf_matrix = vectorizer.fit_transform(titles)
            feature_names = vectorizer.get_feature_names_out()
            
            # Get mean TF-IDF scores
            mean_scores = np.mean(tfidf_matrix.toarray(), axis=0)
            top_indices = np.argsort(mean_scores)[-20:][::-1]
            
            stats["top_keywords"] = [
                {"term": feature_names[i], "score": float(mean_scores[i])}
                for i in top_indices if mean_scores[i] > 0
            ]
        except Exception as e:
            print(f"Warning: Could not compute TF-IDF keywords: {e}")
            stats["top_keywords"] = []
    
    return stats

def crawl_documents_parallel(df: pd.DataFrame, max_workers: int = MAX_WORKERS, 
                           delay: float = REQUEST_DELAY) -> Tuple[List[Dict], List[Dict]]:
    """Crawl documents in parallel with rate limiting."""
    logger.info(f"Starting parallel crawling with {max_workers} workers...")
    
    crawler = DocumentCrawler(delay=delay)
    successful_docs = []
    failed_docs = []
    
    def crawl_single_document(row_data):
        """Crawl a single document."""
        idx, row = row_data
        
        # Extract metadata
        doc_id = generate_doc_id(row, idx)
        title = str(row.get('title', row.get('Title', f'Document {doc_id}'))).strip()
        url = extract_url(row)
        
        if not url:
            return None, {
                'doc_id': doc_id,
                'title': title,
                'url': None,
                'error': 'No valid URL found'
            }
        
        # Try to crawl the document
        text, error = crawler.crawl_document(url)
        
        if text:
            return {
                'doc_id': doc_id,
                'title': title,
                'url': url,
                'text': text,
                'source_type': 'crawled'
            }, None
        else:
            return None, {
                'doc_id': doc_id,
                'title': title,
                'url': url,
                'error': error or 'Unknown error'
            }
    
    # Process documents in parallel
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_row = {
            executor.submit(crawl_single_document, (idx, row)): (idx, row)
            for idx, row in df.iterrows()
        }
        
        # Collect results with progress bar
        for future in tqdm(as_completed(future_to_row), total=len(df), desc="Crawling documents"):
            try:
                success, failure = future.result()
                if success:
                    successful_docs.append(success)
                if failure:
                    failed_docs.append(failure)
            except Exception as e:
                idx, row = future_to_row[future]
                doc_id = generate_doc_id(row, idx)
                failed_docs.append({
                    'doc_id': doc_id,
                    'title': str(row.get('title', row.get('Title', f'Document {doc_id}'))).strip(),
                    'url': extract_url(row),
                    'error': str(e)
                })
    
    logger.info(f"Crawling complete: {len(successful_docs)} successful, {len(failed_docs)} failed")
    return successful_docs, failed_docs

def main():
    parser = argparse.ArgumentParser(description="Enhanced NASA Space Biology RAG corpus builder")
    parser.add_argument("csv_path", help="Path to the CSV file")
    parser.add_argument("--chunk-words", type=int, default=1000, help="Target chunk size in words")
    parser.add_argument("--overlap-words", type=int, default=50, help="Overlap between chunks in words")
    parser.add_argument("--max-workers", type=int, default=MAX_WORKERS, help="Maximum parallel workers for crawling")
    parser.add_argument("--request-delay", type=float, default=REQUEST_DELAY, help="Delay between requests in seconds")
    parser.add_argument("--skip-crawling", action="store_true", help="Skip web crawling, use CSV content only")
    parser.add_argument("--build-graph", action="store_true", help="Build knowledge graph")
    parser.add_argument("--output-dir", default="public/data", help="Output directory")
    
    args = parser.parse_args()
    
    csv_path = Path(args.csv_path)
    if not csv_path.exists():
        logger.error(f"CSV file not found: {csv_path}")
        sys.exit(1)
    
    # Setup directories
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    data_dir = output_dir / "raw_data"
    data_dir.mkdir(exist_ok=True)
    
    logger.info("🚀 Starting enhanced RAG corpus building...")
    logger.info(f"📊 Loading CSV data from {csv_path}")
    
    try:
    df = pd.read_csv(csv_path)
        logger.info(f"✅ Loaded {len(df)} rows from {csv_path}")
    except Exception as e:
        logger.error(f"Error loading CSV: {e}")
        sys.exit(1)
    
    # Detect CSV columns
    manifest = detect_csv_columns(df)
    logger.info(f"📋 Detected columns: {manifest}")
    
    # Initialize models
    logger.info("🤖 Initializing embedding model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Process documents
    all_documents = []
    failed_crawls = []
    
    if not args.skip_crawling:
        # Crawl documents for full text
        crawled_docs, failed_crawls = crawl_documents_parallel(
            df, max_workers=args.max_workers, delay=args.request_delay
        )
        all_documents.extend(crawled_docs)
        
        # Save failed crawls
        if failed_crawls:
            failed_file = output_dir / "failed_crawls.csv"
            with open(failed_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['doc_id', 'title', 'url', 'error'])
                writer.writeheader()
                writer.writerows(failed_crawls)
            logger.info(f"💾 Saved {len(failed_crawls)} failed crawls to {failed_file}")
    
    # Process CSV content as fallback
    logger.info("🔄 Processing CSV content...")
    csv_documents = []
    
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Processing CSV content"):
        # Extract content from CSV
        content = extract_content(row)
        if not content:
            continue
        
        # Extract metadata
        doc_id = generate_doc_id(row, idx)
        title = str(row.get('title', row.get('Title', f'Document {doc_id}'))).strip()
        year = extract_year(row)
        url = extract_url(row)
        
        csv_documents.append({
            'doc_id': doc_id,
            'title': title,
            'year': year,
            'url': url,
            'text': content,
            'source_type': 'csv'
        })
    
    # Combine crawled and CSV documents
    all_documents.extend(csv_documents)
    
    if not all_documents:
        logger.error("No documents found. Check your CSV format and crawling results.")
        sys.exit(1)
    
    # Chunk and embed documents
    logger.info("🔧 Chunking and embedding documents...")
    papers = []
    titles = []
    
    for doc in tqdm(all_documents, desc="Processing documents"):
        # Chunk the content
        chunks = chunk_text(
            doc['text'], 
            target_words=args.chunk_words, 
            overlap_words=args.overlap_words
        )
        
        if not chunks:
            continue
        
        titles.append(doc['title'])
        
        # Process each chunk
        for chunk_idx, chunk_content in enumerate(chunks):
            if len(chunk_content.strip()) < 50:  # Skip very short chunks
                continue
                
            chunk_id = f"{doc['doc_id']}_{chunk_idx:04d}"
            
            # Generate embedding
            embedding = model.encode(chunk_content).tolist()
            
            paper_data = {
                "doc_id": doc['doc_id'],
                "doc_title": doc['title'],
                "year": doc.get('year'),
                "url": doc.get('url'),
                "chunk_id": chunk_id,
                "text": chunk_content,
                "embedding": embedding,
                "source_type": doc.get('source_type', 'unknown')
            }
            
            papers.append(paper_data)
    
    logger.info(f"✅ Processed {len(papers)} chunks from {len(set(p['doc_id'] for p in papers))} documents")
    
    if not papers:
        logger.error("No valid papers found after processing.")
        sys.exit(1)
    
    # Save papers data
    papers_file = output_dir / "papers.json"
    logger.info(f"💾 Saving papers to {papers_file}...")
    with open(papers_file, 'w', encoding='utf-8') as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)
    
    # Compute and save statistics
    logger.info("📈 Computing statistics...")
    stats = compute_stats(papers, titles)
    stats['manifest'] = manifest
    stats['crawling_stats'] = {
        'total_attempted': len(df),
        'successful_crawls': len([d for d in all_documents if d.get('source_type') == 'crawled']),
        'csv_fallback': len([d for d in all_documents if d.get('source_type') == 'csv']),
        'failed_crawls': len(failed_crawls)
    }
    
    stats_file = output_dir / "stats.json"
    logger.info(f"💾 Saving statistics to {stats_file}...")
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    
    # Build knowledge graph if requested
    if args.build_graph:
        logger.info("🕸️ Building knowledge graph...")
        graph_builder = KnowledgeGraphBuilder()
        graph = graph_builder.build_graph(papers)
        
        graph_file = output_dir / "graph.json"
        logger.info(f"💾 Saving knowledge graph to {graph_file}...")
        with open(graph_file, 'w', encoding='utf-8') as f:
            json.dump(graph, f, ensure_ascii=False, indent=2)
    
    # Save manifest
    manifest_file = output_dir / "manifest.json"
    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    # Final summary
    logger.info(f"""
🎉 Enhanced RAG corpus building complete!

📊 Summary:
   • Documents: {stats['total_documents']}
   • Chunks: {stats['total_chunks']}
   • Years covered: {min(stats['year_distribution'].keys()) if stats['year_distribution'] else 'N/A'} - {max(stats['year_distribution'].keys()) if stats['year_distribution'] else 'N/A'}
   • Embedding dimensions: {len(papers[0]['embedding'])}
   • Output size: {papers_file.stat().st_size / 1024 / 1024:.1f} MB

📁 Files created:
   • {papers_file}
   • {stats_file}
   • {manifest_file}
   {"• " + str(output_dir / "graph.json") if args.build_graph else ""}
   {"• " + str(output_dir / "failed_crawls.csv") if failed_crawls else ""}

🚀 Ready for deployment!
""")

if __name__ == "__main__":
    main()
