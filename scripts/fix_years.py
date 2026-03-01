#!/usr/bin/env python3
"""
Fix NULL years in papers.json by extracting years from URLs and text content.

Usage: python scripts/fix_years.py
"""

import json
import re
from pathlib import Path
from collections import Counter
from datetime import datetime

PAPERS_PATH = Path("public/data/papers.json")
STATS_PATH = Path("public/data/stats.json")

CURRENT_YEAR = datetime.now().year

def extract_year_from_url(url):
    """Try to extract a publication year from the URL."""
    if not url:
        return None

    # Match years in URL paths like /2019/ or /2021/01/
    match = re.search(r'/((?:19|20)\d{2})/', url)
    if match:
        year = int(match.group(1))
        if 1950 <= year <= CURRENT_YEAR + 1:
            return year

    return None


def extract_year_from_text(text):
    """Try to extract a publication year from text content."""
    if not text:
        return None

    # Look for years near publication-related keywords
    keyword_patterns = [
        r'(?:published|received|accepted|copyright|©)\s*(?:in\s*)?(\b(?:19|20)\d{2}\b)',
        r'(\b(?:19|20)\d{2}\b)\s*(?:published|received|accepted)',
        r'©\s*(\b(?:19|20)\d{2}\b)',
    ]

    for pattern in keyword_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            year = int(match.group(1))
            if 1950 <= year <= CURRENT_YEAR + 1:
                return year

    # Fallback: first 4-digit year in the first 2000 chars
    first_chunk = text[:2000]
    match = re.search(r'\b((?:19|20)\d{2})\b', first_chunk)
    if match:
        year = int(match.group(1))
        if 1990 <= year <= CURRENT_YEAR + 1:
            return year

    return None


def main():
    if not PAPERS_PATH.exists():
        print(f"Error: {PAPERS_PATH} not found")
        return

    print(f"Loading {PAPERS_PATH}...")
    with open(PAPERS_PATH, 'r', encoding='utf-8') as f:
        papers = json.load(f)

    print(f"Loaded {len(papers)} chunks")

    # Group chunks by doc_id to find year once per document
    doc_chunks = {}
    for paper in papers:
        doc_id = paper['doc_id']
        if doc_id not in doc_chunks:
            doc_chunks[doc_id] = []
        doc_chunks[doc_id].append(paper)

    print(f"Found {len(doc_chunks)} unique documents")

    # Count current state
    null_before = sum(1 for p in papers if not p.get('year'))
    print(f"Papers with null year: {null_before} / {len(papers)}")

    # Extract years for each document
    fixed = 0
    for doc_id, chunks in doc_chunks.items():
        # Skip if already has a year
        if chunks[0].get('year'):
            continue

        year = None

        # Try URL first
        url = chunks[0].get('url', '')
        year = extract_year_from_url(url)

        # Try text content
        if not year:
            for chunk in chunks:
                year = extract_year_from_text(chunk.get('text', ''))
                if year:
                    break

        # Apply year to all chunks of this document
        if year:
            for chunk in chunks:
                chunk['year'] = year
            fixed += 1

    null_after = sum(1 for p in papers if not p.get('year'))
    print(f"\nFixed {fixed} documents")
    print(f"Papers with null year: {null_after} / {len(papers)} (was {null_before})")

    # Save updated papers
    print(f"\nSaving updated {PAPERS_PATH}...")
    with open(PAPERS_PATH, 'w', encoding='utf-8') as f:
        json.dump(papers, f, ensure_ascii=False)

    # Regenerate stats
    if STATS_PATH.exists():
        print(f"Updating {STATS_PATH}...")
        with open(STATS_PATH, 'r', encoding='utf-8') as f:
            stats = json.load(f)

        years = [p['year'] for p in papers if p.get('year')]
        if years:
            year_counts = Counter(years)
            stats['year_distribution'] = {str(k): v for k, v in sorted(year_counts.items())}
        else:
            stats['year_distribution'] = {}

        with open(STATS_PATH, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)

        print(f"Year distribution: {stats['year_distribution']}")

    print("\nDone!")


if __name__ == '__main__':
    main()
