"""
MetaPiqma Search Server
Backend de búsqueda para MetaPiqma usando FastAPI
Simula búsquedas en PubMed, Semantic Scholar y ArXiv
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests
import json
from datetime import datetime

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

app = FastAPI(
    title="MetaPiqma Search API",
    description="Backend de búsqueda para MetaPiqma",
    version="1.0.0"
)

# Configurar CORS para permitir solicitudes desde React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Agregar URL de producción aquí
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# MODELOS
# ============================================================================

class SearchStrategies(BaseModel):
    """Estrategias de búsqueda enviadas desde React"""
    pubmed: str
    semanticScholar: str
    arxivCrossref: str

class Article(BaseModel):
    """Modelo de artículo devuelto por el servidor"""
    id: str
    title: str
    authors: List[str]
    source: str
    year: Optional[int] = None
    abstract: str

class SearchResponse(BaseModel):
    """Respuesta de búsqueda"""
    success: bool
    articles: List[Article]
    total_count: int
    message: str

# ============================================================================
# DATOS SIMULADOS
# ============================================================================

MOCK_PUBMED_ARTICLES = [
    {
        "id": "pubmed_1",
        "title": "Metformin and Glycemic Control in Type 2 Diabetes: A Systematic Review",
        "authors": ["Smith A", "Johnson B", "Williams C"],
        "source": "PubMed",
        "year": 2024,
        "abstract": "This systematic review examines the efficacy of metformin in controlling blood glucose levels in patients with type 2 diabetes. We analyzed 45 randomized controlled trials involving 12,000 patients. Results show significant HbA1c reduction of 1.5-2.0% compared to placebo."
    },
    {
        "id": "pubmed_2",
        "title": "Cardiovascular Safety of Metformin in Diabetic Patients",
        "authors": ["Brown D", "Davis E"],
        "source": "PubMed",
        "year": 2023,
        "abstract": "Long-term cardiovascular outcomes in 8,000 type 2 diabetic patients treated with metformin. No significant increase in adverse events. Mortality rates comparable to control group."
    },
    {
        "id": "pubmed_3",
        "title": "Lactic Acidosis Risk with Metformin: A Meta-Analysis",
        "authors": ["Garcia F", "Martinez G", "Lopez H"],
        "source": "PubMed",
        "year": 2023,
        "abstract": "Meta-analysis of 120 studies examining lactic acidosis incidence in metformin users. Incidence rate: 0.03 cases per 1000 patient-years in patients with normal renal function."
    }
]

MOCK_SEMANTIC_SCHOLAR_ARTICLES = [
    {
        "id": "semantic_1",
        "title": "Metformin Mechanism of Action in Type 2 Diabetes",
        "authors": ["Chen X", "Wang Y"],
        "source": "Semantic Scholar",
        "year": 2024,
        "abstract": "Comprehensive review of metformin's molecular mechanisms including AMPK activation, mitochondrial function, and glucose metabolism pathways."
    },
    {
        "id": "semantic_2",
        "title": "Efficacy Comparison: Metformin vs Other Antidiabetic Drugs",
        "authors": ["Patel R", "Kumar S", "Singh T"],
        "source": "Semantic Scholar",
        "year": 2023,
        "abstract": "Comparative analysis of metformin, sulfonylureas, and insulin in type 2 diabetes management. Metformin shows superior glycemic control with fewer hypoglycemic episodes."
    }
]

MOCK_ARXIV_ARTICLES = [
    {
        "id": "arxiv_1",
        "title": "Machine Learning Prediction of Metformin Response in Type 2 Diabetes",
        "authors": ["Zhang L", "Liu M", "Wu N"],
        "source": "ArXiv",
        "year": 2024,
        "abstract": "Novel machine learning model predicts individual patient response to metformin therapy based on genetic and clinical parameters. Accuracy: 87%."
    },
    {
        "id": "arxiv_2",
        "title": "Computational Analysis of Metformin-Protein Interactions",
        "authors": ["Park J", "Kim K"],
        "source": "ArXiv",
        "year": 2023,
        "abstract": "Molecular dynamics simulations of metformin interactions with cellular proteins. Identifies key binding sites and mechanisms of action."
    }
]

# ============================================================================
# FUNCIONES DE BÚSQUEDA SIMULADAS
# ============================================================================

def search_pubmed(query: str) -> List[dict]:
    """
    Simula búsqueda en PubMed
    
    PARA BÚSQUEDA REAL:
    1. Usar la API de PubMed E-utilities: https://www.ncbi.nlm.nih.gov/books/NBK25499/
    2. Endpoint: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
    3. Parámetros: db=pubmed, term=<query>, retmax=100, rettype=json
    4. Parsear respuesta JSON y extraer UIDs
    5. Usar efetch para obtener detalles de artículos
    6. Parsear XML y extraer: title, authors, abstract, year
    
    Ejemplo:
        response = requests.get(
            'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
            params={
                'db': 'pubmed',
                'term': query,
                'retmax': 100,
                'rettype': 'json'
            }
        )
        uids = response.json()['esearchresult']['idlist']
        # ... obtener detalles con efetch ...
    """
    print(f"[PubMed] Buscando: {query}")
    # Simular latencia de API
    return MOCK_PUBMED_ARTICLES

def search_semantic_scholar(query: str, api_key: Optional[str] = None) -> List[dict]:
    """
    Simula búsqueda en Semantic Scholar
    
    PARA BÚSQUEDA REAL:
    1. Obtener API key de: https://www.semanticscholar.org/product/api
    2. Endpoint: https://api.semanticscholar.org/graph/v1/paper/search
    3. Headers: {'x-api-key': api_key}
    4. Parámetros: query=<query>, limit=100, fields=title,authors,abstract,year,venue
    5. Parsear respuesta JSON
    6. Extraer: title, authors (lista de dicts con 'name'), abstract, year
    
    Ejemplo:
        headers = {'x-api-key': api_key}
        response = requests.get(
            'https://api.semanticscholar.org/graph/v1/paper/search',
            params={'query': query, 'limit': 100, 'fields': 'title,authors,abstract,year'},
            headers=headers
        )
        papers = response.json()['data']
        # ... procesar papers ...
    """
    print(f"[Semantic Scholar] Buscando: {query}")
    if api_key:
        print(f"[Semantic Scholar] Usando API key: {api_key[:10]}...")
    # Simular latencia de API
    return MOCK_SEMANTIC_SCHOLAR_ARTICLES

def search_arxiv(query: str) -> List[dict]:
    """
    Simula búsqueda en ArXiv
    
    PARA BÚSQUEDA REAL:
    1. No requiere API key (acceso público)
    2. Endpoint: http://export.arxiv.org/api/query
    3. Parámetros: search_query=all:<query>&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending
    4. Parsear respuesta XML (Atom format)
    5. Extraer: title, authors (lista de dicts con 'name'), summary (abstract), published (year)
    
    Ejemplo:
        response = requests.get(
            'http://export.arxiv.org/api/query',
            params={
                'search_query': f'all:{query}',
                'start': 0,
                'max_results': 100,
                'sortBy': 'submittedDate',
                'sortOrder': 'descending'
            }
        )
        # Parsear XML con ElementTree
        # ... extraer entries ...
    """
    print(f"[ArXiv] Buscando: {query}")
    # Simular latencia de API
    return MOCK_ARXIV_ARTICLES

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Verificar que el servidor está activo"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "MetaPiqma Search API"
    }

@app.post("/api/v1/search", response_model=SearchResponse)
async def search(strategies: SearchStrategies):
    """
    Endpoint principal de búsqueda
    
    Recibe estrategias de búsqueda de React y devuelve artículos unificados
    
    Entrada:
    {
        "pubmed": "(diabetes) AND (metformin) AND (type 2)",
        "semanticScholar": "diabetes metformin treatment",
        "arxivCrossref": "diabetes metformin cardiovascular"
    }
    
    Salida:
    {
        "success": true,
        "articles": [...],
        "total_count": 8,
        "message": "Búsqueda completada exitosamente"
    }
    """
    try:
        # Validar que al menos una estrategia no esté vacía
        if not any([strategies.pubmed, strategies.semanticScholar, strategies.arxivCrossref]):
            raise HTTPException(
                status_code=400,
                detail="Al menos una estrategia de búsqueda debe ser proporcionada"
            )
        
        print(f"\n[SEARCH] Iniciando búsqueda con estrategias:")
        print(f"  - PubMed: {strategies.pubmed}")
        print(f"  - Semantic Scholar: {strategies.semanticScholar}")
        print(f"  - ArXiv: {strategies.arxivCrossref}")
        
        # Ejecutar búsquedas (simuladas por ahora)
        pubmed_articles = search_pubmed(strategies.pubmed) if strategies.pubmed else []
        semantic_articles = search_semantic_scholar(strategies.semanticScholar) if strategies.semanticScholar else []
        arxiv_articles = search_arxiv(strategies.arxivCrossref) if strategies.arxivCrossref else []
        
        # Unificar resultados
        all_articles = pubmed_articles + semantic_articles + arxiv_articles
        
        # Eliminar duplicados por título (simple deduplicación)
        seen_titles = set()
        unique_articles = []
        for article in all_articles:
            title_lower = article['title'].lower()
            if title_lower not in seen_titles:
                seen_titles.add(title_lower)
                unique_articles.append(article)
        
        print(f"\n[SEARCH] Resultados:")
        print(f"  - PubMed: {len(pubmed_articles)} artículos")
        print(f"  - Semantic Scholar: {len(semantic_articles)} artículos")
        print(f"  - ArXiv: {len(arxiv_articles)} artículos")
        print(f"  - Total (sin duplicados): {len(unique_articles)} artículos")
        
        return SearchResponse(
            success=True,
            articles=unique_articles,
            total_count=len(unique_articles),
            message="Búsqueda completada exitosamente"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"\n[ERROR] Error en búsqueda: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error en búsqueda: {str(e)}"
        )

# ============================================================================
# PUNTO DE ENTRADA
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 80)
    print("MetaPiqma Search Server")
    print("=" * 80)
    print("\nIniciando servidor en http://localhost:8000")
    print("Documentación interactiva: http://localhost:8000/docs")
    print("=" * 80 + "\n")
    
    uvicorn.run(
        "search_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
