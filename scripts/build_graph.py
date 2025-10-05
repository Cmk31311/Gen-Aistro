#!/usr/bin/env python3
"""
Knowledge Graph Builder for NASA Space Biology Publications

Extracts entities and relationships from paper chunks to build a knowledge graph
for visualization and filtering in the RAG dashboard.
"""

import sys
import json
import re
import argparse
from pathlib import Path
from typing import List, Dict, Set, Tuple
from collections import defaultdict, Counter

import pandas as pd
import numpy as np
from tqdm import tqdm

# Try to import spaCy and SciSpaCy, fall back to simple keyword extraction if not available
try:
    import spacy
    from spacy import displacy
    
    # Try to load the scientific model
    try:
        nlp = spacy.load("en_core_sci_sm")
        USE_SPACY = True
        print("✅ Using SciSpaCy model: en_core_sci_sm")
    except OSError:
        try:
            nlp = spacy.load("en_core_sci_lg")
            USE_SPACY = True
            print("✅ Using SciSpaCy model: en_core_sci_lg")
        except OSError:
            try:
                nlp = spacy.load("en_core_web_sm")
                USE_SPACY = True
                print("✅ Using spaCy model: en_core_web_sm")
            except OSError:
                USE_SPACY = False
                print("⚠️  No spaCy models found. Using keyword-based extraction.")
except ImportError:
    USE_SPACY = False
    print("⚠️  spaCy not installed. Using keyword-based extraction.")

# Entity keywords for NASA Space Biology domain
ORGANISM_KEYWORDS = {
    'arabidopsis', 'mouse', 'mice', 'rat', 'rats', 'zebrafish', 'drosophila', 'fruit fly', 
    'c. elegans', 'caenorhabditis', 'yeast', 'bacteria', 'e. coli', 'salmonella',
    'daphnia', 'tardigrade', 'c. elegans', 'arabidopsis thaliana', 'mus musculus',
    'danio rerio', 'drosophila melanogaster', 'saccharomyces cerevisiae',
    'escherichia coli', 'bacillus subtilis', 'lactobacillus', 'enterococcus',
    'staphylococcus', 'streptococcus', 'pseudomonas', 'mycobacterium'
}

CONDITION_KEYWORDS = {
    'microgravity', 'hypergravity', 'space flight', 'spaceflight', 'radiation',
    'cosmic radiation', 'ionizing radiation', 'uv radiation', 'temperature',
    'hypoxia', 'hyperoxia', 'pressure', 'vibration', 'isolation',
    'confinement', 'stress', 'oxidative stress', 'heat stress', 'cold stress',
    'osmotic stress', 'mechanical stress', 'simulated microgravity',
    'clinostat', 'random positioning machine', 'rotating wall vessel',
    'hindlimb suspension', 'bed rest', 'simulated space conditions'
}

OUTCOME_KEYWORDS = {
    'growth', 'development', 'morphology', 'gene expression', 'protein expression',
    'metabolism', 'immune response', 'bone loss', 'muscle atrophy',
    'cognitive function', 'behavior', 'reproduction', 'fertility',
    'oxidative damage', 'dna damage', 'apoptosis', 'autophagy',
    'inflammation', 'stress response', 'adaptation', 'resistance',
    'sensitivity', 'tolerance', 'survival', 'viability', 'proliferation',
    'differentiation', 'senescence', 'aging', 'longevity'
}

def extract_entities_keyword(text: str) -> Dict[str, Set[str]]:
    """Extract entities using keyword matching."""
    text_lower = text.lower()
    entities = {
        'organisms': set(),
        'conditions': set(),
        'outcomes': set()
    }
    
    # Extract organisms
    for keyword in ORGANISM_KEYWORDS:
        if keyword in text_lower:
            entities['organisms'].add(keyword.title())
    
    # Extract conditions
    for keyword in CONDITION_KEYWORDS:
        if keyword in text_lower:
            entities['conditions'].add(keyword.title())
    
    # Extract outcomes
    for keyword in OUTCOME_KEYWORDS:
        if keyword in text_lower:
            entities['outcomes'].add(keyword.title())
    
    return entities

def extract_entities_spacy(text: str) -> Dict[str, Set[str]]:
    """Extract entities using spaCy NER."""
    doc = nlp(text)
    entities = {
        'organisms': set(),
        'conditions': set(),
        'outcomes': set()
    }
    
    # Extract named entities
    for ent in doc.ents:
        entity_text = ent.text.lower()
        
        # Classify entities based on labels and keywords
        if ent.label_ in ['GPE', 'ORG', 'PERSON'] or any(org in entity_text for org in ORGANISM_KEYWORDS):
            entities['organisms'].add(ent.text)
        elif any(cond in entity_text for cond in CONDITION_KEYWORDS):
            entities['conditions'].add(ent.text)
        elif any(out in entity_text for out in OUTCOME_KEYWORDS):
            entities['outcomes'].add(ent.text)
    
    return entities

def extract_entities(text: str) -> Dict[str, Set[str]]:
    """Extract entities using the best available method."""
    if USE_SPACY:
        return extract_entities_spacy(text)
    else:
        return extract_entities_keyword(text)

def build_cooccurrence_matrix(chunks: List[Dict]) -> Tuple[Dict, Dict]:
    """Build entity co-occurrence matrix and entity counts."""
    entity_counts = defaultdict(int)
    cooccurrence = defaultdict(lambda: defaultdict(int))
    
    print("🔍 Extracting entities from chunks...")
    for chunk in tqdm(chunks, desc="Processing chunks"):
        entities = extract_entities(chunk['text'])
        
        # Count entities
        for entity_type, entity_set in entities.items():
            for entity in entity_set:
                entity_counts[entity] += 1
        
        # Count co-occurrences within chunks
        all_entities = []
        for entity_set in entities.values():
            all_entities.extend(list(entity_set))
        
        # Count co-occurrences
        for i, entity1 in enumerate(all_entities):
            for entity2 in all_entities[i+1:]:
                if entity1 != entity2:
                    cooccurrence[entity1][entity2] += 1
                    cooccurrence[entity2][entity1] += 1
    
    return dict(entity_counts), dict(cooccurrence)

def build_graph(papers_file: Path, min_count: int = 3, min_cooccurrence: int = 2) -> Dict:
    """Build knowledge graph from papers data."""
    print(f"📊 Loading papers from {papers_file}...")
    
    with open(papers_file, 'r', encoding='utf-8') as f:
        papers = json.load(f)
    
    print(f"✅ Loaded {len(papers)} chunks")
    
    # Extract entities and co-occurrences
    entity_counts, cooccurrence = build_cooccurrence_matrix(papers)
    
    # Filter entities by minimum count
    filtered_entities = {entity: count for entity, count in entity_counts.items() 
                        if count >= min_count}
    
    print(f"📈 Found {len(filtered_entities)} entities (min count: {min_count})")
    
    # Build nodes
    nodes = []
    for entity, count in filtered_entities.items():
        # Determine entity type
        entity_lower = entity.lower()
        if any(org in entity_lower for org in ORGANISM_KEYWORDS):
            entity_type = 'organism'
        elif any(cond in entity_lower for cond in CONDITION_KEYWORDS):
            entity_type = 'condition'
        elif any(out in entity_lower for out in OUTCOME_KEYWORDS):
            entity_type = 'outcome'
        else:
            entity_type = 'other'
        
        nodes.append({
            'id': entity,
            'type': entity_type,
            'count': count,
            'size': min(50, max(10, int(np.log(count) * 8)))  # Size based on log(count)
        })
    
    # Build links
    links = []
    for entity1, neighbors in cooccurrence.items():
        if entity1 not in filtered_entities:
            continue
            
        for entity2, weight in neighbors.items():
            if (entity2 not in filtered_entities or 
                entity1 >= entity2 or  # Avoid duplicate links
                weight < min_cooccurrence):
                continue
            
            links.append({
                'source': entity1,
                'target': entity2,
                'weight': weight,
                'strength': min(10, weight)  # Normalize for visualization
            })
    
    print(f"🔗 Generated {len(links)} relationships (min co-occurrence: {min_cooccurrence})")
    
    # Build graph structure
    graph = {
        'nodes': nodes,
        'links': links,
        'metadata': {
            'total_chunks': len(papers),
            'total_entities': len(entity_counts),
            'filtered_entities': len(filtered_entities),
            'total_relationships': len(links),
            'min_count': min_count,
            'min_cooccurrence': min_cooccurrence,
            'extraction_method': 'spacy' if USE_SPACY else 'keyword'
        }
    }
    
    return graph

def main():
    parser = argparse.ArgumentParser(description="Build knowledge graph from NASA Space Biology papers")
    parser.add_argument("papers_file", help="Path to papers.json file")
    parser.add_argument("--min-count", type=int, default=3, 
                       help="Minimum entity count to include in graph")
    parser.add_argument("--min-cooccurrence", type=int, default=2,
                       help="Minimum co-occurrence count for relationships")
    parser.add_argument("--output", default="public/data/graph.json",
                       help="Output file path")
    
    args = parser.parse_args()
    
    papers_file = Path(args.papers_file)
    if not papers_file.exists():
        print(f"Error: Papers file not found: {papers_file}")
        sys.exit(1)
    
    # Ensure output directory exists
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Build the graph
    graph = build_graph(papers_file, args.min_count, args.min_cooccurrence)
    
    # Save the graph
    print(f"💾 Saving graph to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)
    
    print(f"""
🎉 Knowledge graph built successfully!

📊 Summary:
   • Nodes: {len(graph['nodes'])}
   • Links: {len(graph['links'])}
   • Entities by type:
     - Organisms: {len([n for n in graph['nodes'] if n['type'] == 'organism'])}
     - Conditions: {len([n for n in graph['nodes'] if n['type'] == 'condition'])}
     - Outcomes: {len([n for n in graph['nodes'] if n['type'] == 'outcome'])}
     - Other: {len([n for n in graph['nodes'] if n['type'] == 'other'])}
   • File size: {output_path.stat().st_size / 1024:.1f} KB

📁 Output: {output_path}

🚀 Ready for visualization!
""")

if __name__ == "__main__":
    main()
