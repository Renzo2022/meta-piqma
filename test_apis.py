#!/usr/bin/env python3
"""
Script de prueba para verificar que las APIs funcionan correctamente
"""

import requests
import os
import json
from xml.etree import ElementTree as ET

# Configurar variables de entorno
PUBMED_API_KEY = os.getenv('PUBMED_API_KEY', '')
SEMANTIC_SCHOLAR_API_KEY = os.getenv('SEMANTIC_SCHOLAR_API_KEY', '')

def test_pubmed():
    """Probar PubMed API"""
    print("\n" + "="*60)
    print("PROBANDO PUBMED")
    print("="*60)
    
    query = "machine learning"
    esearch_url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
    esearch_params = {
        'db': 'pubmed',
        'term': query,
        'retmax': 100,
        'rettype': 'xml',
        'tool': 'MetaPiqma',
        'email': 'search@meta-piqma.com'
    }
    
    if PUBMED_API_KEY:
        esearch_params['api_key'] = PUBMED_API_KEY
        print(f"✓ Usando API key")
    else:
        print(f"✗ Sin API key")
    
    try:
        print(f"\nBuscando: {query}")
        response = requests.get(esearch_url, params=esearch_params, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            uids = []
            for id_elem in root.findall('.//Id'):
                if id_elem.text:
                    uids.append(id_elem.text)
            count_elem = root.find('.//Count')
            count = count_elem.text if count_elem is not None else 0
            print(f"✓ Total encontrados: {count}")
            print(f"✓ UIDs obtenidos: {len(uids)}")
            if uids:
                print(f"  Primeros 5 UIDs: {uids[:5]}")
        else:
            print(f"✗ Error: {response.text[:200]}")
    except Exception as e:
        print(f"✗ Error: {str(e)}")

def test_semantic_scholar():
    """Probar Semantic Scholar API"""
    print("\n" + "="*60)
    print("PROBANDO SEMANTIC SCHOLAR")
    print("="*60)
    
    query = "machine learning"
    url = 'https://api.semanticscholar.org/graph/v1/paper/search'
    
    if not SEMANTIC_SCHOLAR_API_KEY:
        print("✗ API key no configurada")
        return
    
    headers = {'x-api-key': SEMANTIC_SCHOLAR_API_KEY}
    params = {
        'query': query,
        'limit': 10,
        'fields': 'title,authors,abstract,year,venue,paperId'
    }
    
    try:
        print(f"Buscando: {query}")
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            papers = data.get('data', [])
            print(f"✓ Papers encontrados: {len(papers)}")
            if papers:
                print(f"  Primer paper: {papers[0].get('title', 'Sin título')}")
        else:
            print(f"✗ Error {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"✗ Error: {str(e)}")

def test_arxiv():
    """Probar ArXiv API"""
    print("\n" + "="*60)
    print("PROBANDO ARXIV")
    print("="*60)
    
    query = "machine learning"
    url = 'http://export.arxiv.org/api/query'
    params = {
        'search_query': f'all:{query}',
        'start': 0,
        'max_results': 10,
        'sortBy': 'submittedDate',
        'sortOrder': 'descending'
    }
    
    try:
        print(f"Buscando: {query}")
        response = requests.get(url, params=params, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            entries = root.findall('atom:entry', ns)
            print(f"✓ Entries encontrados: {len(entries)}")
            if entries:
                title = entries[0].find('atom:title', ns)
                if title is not None:
                    print(f"  Primer entry: {title.text[:80]}")
        else:
            print(f"✗ Error: {response.text[:200]}")
    except Exception as e:
        print(f"✗ Error: {str(e)}")

def test_crossref():
    """Probar Crossref API"""
    print("\n" + "="*60)
    print("PROBANDO CROSSREF")
    print("="*60)
    
    query = "machine learning"
    url = 'https://api.crossref.org/works'
    params = {
        'query': query,
        'rows': 10,
        'sort': 'published',
        'order': 'desc'
    }
    
    try:
        print(f"Buscando: {query}")
        response = requests.get(url, params=params, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            items = data.get('message', {}).get('items', [])
            print(f"✓ Items encontrados: {len(items)}")
            if items:
                title = items[0].get('title', ['Sin título'])[0]
                print(f"  Primer item: {title[:80]}")
        else:
            print(f"✗ Error: {response.text[:200]}")
    except Exception as e:
        print(f"✗ Error: {str(e)}")

if __name__ == '__main__':
    print("\n🔍 PRUEBAS DE APIS DE BÚSQUEDA")
    print("Query: 'machine learning'")
    
    test_pubmed()
    test_semantic_scholar()
    test_arxiv()
    test_crossref()
    
    print("\n" + "="*60)
    print("✓ Pruebas completadas")
    print("="*60)
