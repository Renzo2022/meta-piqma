#!/usr/bin/env python3
"""
Debug de PubMed API
"""

import requests
import os

PUBMED_API_KEY = os.getenv('PUBMED_API_KEY', '')

query = "machine learning"
esearch_url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
esearch_params = {
    'db': 'pubmed',
    'term': query,
    'retmax': 100,
    'rettype': 'json',
    'tool': 'MetaPiqma',
    'email': 'search@meta-piqma.com'
}

if PUBMED_API_KEY:
    esearch_params['api_key'] = PUBMED_API_KEY
    print(f"✓ Usando API key: {PUBMED_API_KEY[:10]}...")
else:
    print(f"✗ Sin API key")

print(f"\nURL: {esearch_url}")
print(f"Params: {esearch_params}")

response = requests.get(esearch_url, params=esearch_params, timeout=10)
print(f"\nStatus: {response.status_code}")
print(f"Headers: {dict(response.headers)}")
print(f"\nRespuesta (primeros 500 caracteres):")
print(response.text[:500])

# Intentar parsear como JSON
try:
    data = response.json()
    print(f"\n✓ JSON válido")
    print(f"Keys: {data.keys()}")
except Exception as e:
    print(f"\n✗ No es JSON válido: {str(e)}")
