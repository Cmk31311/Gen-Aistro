#!/usr/bin/env python3
"""
Smoke test for RAG corpus validation.
Verifies that the generated corpus has the expected structure and functionality.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any
import numpy as np

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def test_corpus_structure(papers_file: Path) -> Dict[str, Any]:
    """Test that the corpus has the expected structure."""
    print(f"🔍 Testing corpus structure: {papers_file}")
    
    try:
        with open(papers_file, 'r', encoding='utf-8') as f:
            papers = json.load(f)
    except Exception as e:
        return {"error": f"Failed to load papers.json: {e}"}
    
    if not isinstance(papers, list):
        return {"error": "papers.json should contain a list"}
    
    if len(papers) == 0:
        return {"error": "papers.json is empty"}
    
    # Test first paper structure
    first_paper = papers[0]
    required_fields = ['doc_id', 'doc_title', 'chunk_id', 'text', 'embedding']
    missing_fields = [field for field in required_fields if field not in first_paper]
    
    if missing_fields:
        return {"error": f"Missing required fields: {missing_fields}"}
    
    # Test embedding dimensions
    embedding = first_paper['embedding']
    if not isinstance(embedding, list):
        return {"error": "Embedding should be a list"}
    
    if len(embedding) != 384:
        return {"error": f"Expected 384-dimensional embeddings, got {len(embedding)}"}
    
    # Test all embeddings have same dimension
    for i, paper in enumerate(papers[:10]):  # Test first 10
        if len(paper['embedding']) != 384:
            return {"error": f"Paper {i} has embedding dimension {len(paper['embedding'])}, expected 384"}
    
    return {
        "success": True,
        "total_papers": len(papers),
        "embedding_dimensions": len(embedding),
        "sample_paper": {
            "doc_id": first_paper['doc_id'],
            "doc_title": first_paper['doc_title'][:50] + "...",
            "chunk_id": first_paper['chunk_id'],
            "text_length": len(first_paper['text']),
            "has_url": bool(first_paper.get('url')),
            "has_year": bool(first_paper.get('year'))
        }
    }

def test_retrieval_functionality(papers_file: Path) -> Dict[str, Any]:
    """Test basic retrieval functionality with a synthetic query."""
    print("🔍 Testing retrieval functionality...")
    
    try:
        with open(papers_file, 'r', encoding='utf-8') as f:
            papers = json.load(f)
    except Exception as e:
        return {"error": f"Failed to load papers.json: {e}"}
    
    # Create a synthetic query embedding (all zeros for simplicity)
    query_embedding = [0.0] * 384
    
    # Compute similarities
    similarities = []
    for paper in papers:
        similarity = cosine_similarity(query_embedding, paper['embedding'])
        similarities.append({
            'doc_id': paper['doc_id'],
            'doc_title': paper['doc_title'],
            'similarity': similarity,
            'text_preview': paper['text'][:100] + "..."
        })
    
    # Sort by similarity
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    
    return {
        "success": True,
        "total_papers_tested": len(papers),
        "top_5_results": similarities[:5],
        "similarity_range": {
            "min": min(s['similarity'] for s in similarities),
            "max": max(s['similarity'] for s in similarities),
            "mean": np.mean([s['similarity'] for s in similarities])
        }
    }

def test_stats_file(stats_file: Path) -> Dict[str, Any]:
    """Test that the stats file has the expected structure."""
    print(f"🔍 Testing stats file: {stats_file}")
    
    try:
        with open(stats_file, 'r', encoding='utf-8') as f:
            stats = json.load(f)
    except Exception as e:
        return {"error": f"Failed to load stats.json: {e}"}
    
    required_fields = ['total_documents', 'total_chunks', 'generated_at']
    missing_fields = [field for field in required_fields if field not in stats]
    
    if missing_fields:
        return {"error": f"Missing required fields in stats: {missing_fields}"}
    
    return {
        "success": True,
        "stats": {
            "total_documents": stats['total_documents'],
            "total_chunks": stats['total_chunks'],
            "has_year_distribution": bool(stats.get('year_distribution')),
            "has_top_keywords": bool(stats.get('top_keywords')),
            "generated_at": stats['generated_at']
        }
    }

def test_manifest_file(manifest_file: Path) -> Dict[str, Any]:
    """Test that the manifest file exists and has expected structure."""
    print(f"🔍 Testing manifest file: {manifest_file}")
    
    try:
        with open(manifest_file, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
    except Exception as e:
        return {"error": f"Failed to load manifest.json: {e}"}
    
    return {
        "success": True,
        "manifest": manifest
    }

def main():
    """Run all smoke tests."""
    print("🚀 Running RAG corpus smoke tests...\n")
    
    # Check if we're in the right directory
    data_dir = Path("public/data")
    if not data_dir.exists():
        print("❌ Error: public/data directory not found. Run from project root.")
        sys.exit(1)
    
    papers_file = data_dir / "papers.json"
    stats_file = data_dir / "stats.json"
    manifest_file = data_dir / "manifest.json"
    
    # Run tests
    tests = [
        ("Corpus Structure", lambda: test_corpus_structure(papers_file)),
        ("Retrieval Functionality", lambda: test_retrieval_functionality(papers_file)),
        ("Stats File", lambda: test_stats_file(stats_file)),
        ("Manifest File", lambda: test_manifest_file(manifest_file))
    ]
    
    results = {}
    all_passed = True
    
    for test_name, test_func in tests:
        print(f"Running {test_name} test...")
        try:
            result = test_func()
            results[test_name] = result
            
            if "error" in result:
                print(f"❌ {test_name} failed: {result['error']}")
                all_passed = False
            else:
                print(f"✅ {test_name} passed")
                if "sample_paper" in result:
                    print(f"   Sample: {result['sample_paper']['doc_title']}")
                if "total_papers" in result:
                    print(f"   Total papers: {result['total_papers']}")
                if "stats" in result:
                    print(f"   Documents: {result['stats']['total_documents']}, Chunks: {result['stats']['total_chunks']}")
            
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results[test_name] = {"error": str(e)}
            all_passed = False
        
        print()
    
    # Summary
    if all_passed:
        print("🎉 All smoke tests passed! The RAG corpus is ready for use.")
        sys.exit(0)
    else:
        print("❌ Some smoke tests failed. Check the output above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()