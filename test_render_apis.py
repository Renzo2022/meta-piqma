#!/usr/bin/env python3
"""
Script para probar las APIs en Render.com
Ejecutar en Render para verificar que las API keys están configuradas correctamente
"""

import os
import requests
from xml.etree import ElementTree as ET

print("\n" + "="*70)
print("VERIFICACIÓN DE API KEYS EN RENDER.COM")
print("="*70)

# Verificar variables de entorno
pubmed_key = os.getenv('PUBMED_API_KEY', '')
semantic_key = os.getenv('SEMANTIC_SCHOLAR_API_KEY', '')

print("\n📋 VARIABLES DE ENTORNO:")
print(f"  PUBMED_API_KEY: {'✓ Configurada' if pubmed_key else '✗ NO configurada'}")
if pubmed_key:
    print(f"    Primeros 10 caracteres: {pubmed_key[:10]}...")
print(f"  SEMANTIC_SCHOLAR_API_KEY: {'✓ Configurada' if semantic_key else '✗ NO configurada'}")
if semantic_key:
    print(f"    Primeros 10 caracteres: {semantic_key[:10]}...")

# Test PubMed
print("\n" + "-"*70)
print("🔬 PROBANDO PUBMED")
print("-"*70)

try:
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
    
    if pubmed_key:
        esearch_params['api_key'] = pubmed_key
        print(f"✓ Usando API key de PubMed")
    else:
        print(f"⚠ Sin API key (3 req/s)")
    
    response = requests.get(esearch_url, params=esearch_params, timeout=10)
    
    if response.status_code == 200:
        root = ET.fromstring(response.content)
        uids = []
        for id_elem in root.findall('.//Id'):
            if id_elem.text:
                uids.append(id_elem.text)
        count_elem = root.find('.//Count')
        count = count_elem.text if count_elem is not None else 0
        
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Total encontrados: {count}")
        print(f"✓ UIDs obtenidos: {len(uids)}")
        if uids:
            print(f"  Primeros 3 UIDs: {uids[:3]}")
    else:
        print(f"✗ Error {response.status_code}: {response.text[:100]}")
except Exception as e:
    print(f"✗ Error: {str(e)}")

# Test Semantic Scholar
print("\n" + "-"*70)
print("🔬 PROBANDO SEMANTIC SCHOLAR")
print("-"*70)

if not semantic_key:
    print("✗ API key no configurada")
else:
    try:
        query = "machine learning"
        url = 'https://api.semanticscholar.org/graph/v1/paper/search'
        headers = {'x-api-key': semantic_key}
        params = {
            'query': query,
            'limit': 10,
            'fields': 'title,authors,abstract,year,venue,paperId'
        }
        
        print(f"✓ Usando API key de Semantic Scholar")
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            papers = data.get('data', [])
            print(f"✓ Status: {response.status_code}")
            print(f"✓ Papers encontrados: {len(papers)}")
            if papers:
                print(f"  Primer paper: {papers[0].get('title', 'Sin título')[:60]}")
        else:
            print(f"✗ Error {response.status_code}: {response.text[:100]}")
    except Exception as e:
        print(f"✗ Error: {str(e)}")

# Test ArXiv
print("\n" + "-"*70)
print("🔬 PROBANDO ARXIV")
print("-"*70)

try:
    query = "machine learning"
    url = 'http://export.arxiv.org/api/query'
    params = {
        'search_query': f'all:{query}',
        'start': 0,
        'max_results': 10,
        'sortBy': 'submittedDate',
        'sortOrder': 'descending'
    }
    
    response = requests.get(url, params=params, timeout=10)
    
    if response.status_code == 200:
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', ns)
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Entries encontrados: {len(entries)}")
        if entries:
            title = entries[0].find('atom:title', ns)
            if title is not None:
                print(f"  Primer entry: {title.text[:60]}")
    else:
        print(f"✗ Error {response.status_code}: {response.text[:100]}")
except Exception as e:
    print(f"✗ Error: {str(e)}")

# Test Crossref
print("\n" + "-"*70)
print("🔬 PROBANDO CROSSREF")
print("-"*70)

try:
    query = "machine learning"
    url = 'https://api.crossref.org/works'
    params = {
        'query': query,
        'rows': 10,
        'sort': 'published',
        'order': 'desc'
    }
    
    response = requests.get(url, params=params, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        items = data.get('message', {}).get('items', [])
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Items encontrados: {len(items)}")
        if items:
            title = items[0].get('title', ['Sin título'])[0]
            print(f"  Primer item: {title[:60]}")
    else:
        print(f"✗ Error {response.status_code}: {response.text[:100]}")
except Exception as e:
    print(f"✗ Error: {str(e)}")

print("\n" + "="*70)
print("✓ VERIFICACIÓN COMPLETADA")
print("="*70 + "\n")
