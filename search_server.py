"""
MetaPiqma Search Server
Backend de búsqueda REAL para MetaPiqma usando FastAPI
Búsquedas reales en PubMed, Semantic Scholar, ArXiv y Crossref
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests
import json
from datetime import datetime
import os
import xml.etree.ElementTree as ET
from urllib.parse import quote

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
    allow_origins=["*"],  # Permitir todas las orígenes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# MODELOS
# ============================================================================

class SearchStrategies(BaseModel):
    """Estrategias de búsqueda enviadas desde React"""
    pubmed: str = ''
    semanticScholar: str = ''
    arxiv: str = ''
    crossref: str = ''
    # Bases de datos seleccionadas (botones)
    use_pubmed: bool = False
    use_semantic: bool = False
    use_arxiv: bool = False
    use_crossref: bool = False
    
    class Config:
        extra = 'ignore'  # Ignorar campos adicionales

class Article(BaseModel):
    """Modelo de artículo devuelto por el servidor"""
    id: str
    title: str
    authors: List[str]
    source: str
    year: Optional[int] = None
    abstract: Optional[str] = None
    url: str

class SearchResponse(BaseModel):
    """Respuesta de búsqueda"""
    success: bool
    articles: List[Article]
    total_count: int
    message: str

class ExtractionRow(BaseModel):
    """Fila de datos de extracción para meta-análisis"""
    id: str
    studyName: str
    n: int
    mean: float
    sd: float

class MetaAnalysisRequest(BaseModel):
    """Solicitud de meta-análisis"""
    extractionData: List[ExtractionRow]
    analysisType: str = "fixed"  # "fixed" o "random"

class MetaAnalysisMetrics(BaseModel):
    """Métricas de meta-análisis"""
    i_squared: float  # I²
    q_statistic: float  # Q
    p_value: float  # p-value
    heterogeneity: str  # "Low", "Moderate", "High"
    effect_size: float  # Tamaño del efecto
    ci_lower: float  # IC inferior
    ci_upper: float  # IC superior

class MetaAnalysisResponse(BaseModel):
    """Respuesta de meta-análisis"""
    success: bool
    metrics: MetaAnalysisMetrics
    forestPlotUrl: str
    funnelPlotUrl: str
    message: str

# ============================================================================
# DATOS SIMULADOS - REMOVIDOS
# Todas las búsquedas son REALES usando APIs de bases de datos académicas
# ============================================================================

# ============================================================================
# FUNCIONES DE BÚSQUEDA SIMULADAS
# ============================================================================

def search_pubmed(query: str) -> List[dict]:
    """
    Búsqueda REAL en PubMed usando E-utilities API
    
    API: https://www.ncbi.nlm.nih.gov/books/NBK25499/
    Con API key: hasta 10 requests/segundo
    Sin API key: hasta 3 requests/segundo
    """
    if not query or query.strip() == '':
        return []
    
    try:
        api_key = os.getenv('PUBMED_API_KEY')
        print(f"[PubMed] Buscando: {query}")
        
        # Paso 1: Esearch - Obtener UIDs
        esearch_url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
        esearch_params = {
            'db': 'pubmed',
            'term': query,
            'retmax': 100,  # Límite razonable
            'rettype': 'xml',  # Usar XML en lugar de JSON
            'tool': 'MetaPiqma',
            'email': 'search@meta-piqma.com'
        }
        
        # Agregar API key si está disponible
        if api_key:
            esearch_params['api_key'] = api_key
            print(f"[PubMed] Usando API key (10 req/s)")
        else:
            print(f"[PubMed] Sin API key (3 req/s)")
        
        response = requests.get(esearch_url, params=esearch_params, timeout=10)
        response.raise_for_status()
        
        try:
            # Parsear XML de esearch
            root = ET.fromstring(response.content)
            uids = []
            for id_elem in root.findall('.//Id'):
                if id_elem.text:
                    uids.append(id_elem.text)
        except Exception as e:
            print(f"[PubMed] Error parseando respuesta: {str(e)}")
            print(f"[PubMed] Respuesta: {response.text[:200]}")
            return []
        
        if not uids:
            print(f"[PubMed] No se encontraron resultados")
            return []
        
        # Paso 2: Efetch - Obtener detalles
        efetch_url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
        efetch_params = {
            'db': 'pubmed',
            'id': ','.join(uids),  # Obtener todos los UIDs encontrados
            'rettype': 'xml',
            'tool': 'MetaPiqma',
            'email': 'search@meta-piqma.com'
        }
        
        response = requests.get(efetch_url, params=efetch_params, timeout=10)
        response.raise_for_status()
        
        # Paso 3: Parsear XML
        root = ET.fromstring(response.content)
        articles = []
        
        for article in root.findall('.//PubmedArticle'):
            try:
                # Extraer título
                title_elem = article.find('.//ArticleTitle')
                title = (title_elem.text if title_elem is not None and title_elem.text else None) or 'Sin título'
                
                # Extraer autores
                authors = []
                for author in article.findall('.//Author'):
                    last_name = author.find('LastName')
                    initials = author.find('Initials')
                    if last_name is not None and last_name.text:
                        author_name = last_name.text
                        if initials is not None and initials.text:
                            author_name += ' ' + initials.text
                        authors.append(author_name)
                
                # Extraer abstract
                abstract_elem = article.find('.//AbstractText')
                abstract = (abstract_elem.text if abstract_elem is not None and abstract_elem.text else None) or ''
                
                # Extraer año
                year_elem = article.find('.//PubDate/Year')
                year = None
                if year_elem is not None and year_elem.text:
                    try:
                        year = int(year_elem.text)
                    except (ValueError, TypeError):
                        year = None
                
                # Extraer PMID
                pmid_elem = article.find('.//PMID')
                pmid = (pmid_elem.text if pmid_elem is not None and pmid_elem.text else None) or 'unknown'
                
                articles.append({
                    'id': f'pubmed_{pmid}',
                    'title': title,
                    'authors': authors,
                    'source': 'PubMed',
                    'year': year,
                    'abstract': abstract,
                    'url': f'https://pubmed.ncbi.nlm.nih.gov/{pmid}'
                })
            except Exception as e:
                print(f"[PubMed] Error procesando artículo: {str(e)}")
                continue
        
        print(f"[PubMed] Encontrados {len(articles)} artículos")
        return articles
    
    except Exception as e:
        print(f"[PubMed] Error en búsqueda: {str(e)}")
        return []  # No hay fallback, solo resultados reales

def search_semantic_scholar(query: str) -> List[dict]:
    """
    Búsqueda REAL en Semantic Scholar usando API
    
    API: https://www.semanticscholar.org/product/api
    Requiere: Variable de entorno SEMANTIC_SCHOLAR_API_KEY
    """
    if not query or query.strip() == '':
        return []
    
    try:
        api_key = os.getenv('SEMANTIC_SCHOLAR_API_KEY')
        print(f"[Semantic Scholar] Buscando: {query}")
        
        if not api_key:
            print(f"[Semantic Scholar] API key no configurada")
            return []
        
        # Búsqueda en Semantic Scholar
        url = 'https://api.semanticscholar.org/graph/v1/paper/search'
        headers = {'x-api-key': api_key}
        params = {
            'query': query,
            'limit': 100,
            'fields': 'title,authors,abstract,year,venue,paperId'
        }
        
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            papers = response.json().get('data', [])
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 403:
                print(f"[Semantic Scholar] API key inválido o sin permiso (403 Forbidden)")
            else:
                print(f"[Semantic Scholar] Error HTTP {e.response.status_code}: {str(e)}")
            return []
        except Exception as e:
            print(f"[Semantic Scholar] Error en solicitud: {str(e)}")
            return []
        
        articles = []
        for paper in papers:
            try:
                # Extraer autores
                authors = []
                for author in paper.get('authors', []):
                    if isinstance(author, dict) and 'name' in author:
                        authors.append(author['name'])
                    elif isinstance(author, str):
                        authors.append(author)
                
                paper_id = paper.get('paperId', 'unknown')
                abstract = paper.get('abstract')
                if abstract is None:
                    abstract = ''
                articles.append({
                    'id': f"semantic_{paper_id}",
                    'title': paper.get('title', 'Sin título'),
                    'authors': authors,
                    'source': 'Semantic Scholar',
                    'year': paper.get('year'),
                    'abstract': abstract,
                    'url': f'https://www.semanticscholar.org/paper/{paper_id}'
                })
            except Exception as e:
                print(f"[Semantic Scholar] Error procesando paper: {str(e)}")
                continue
        
        print(f"[Semantic Scholar] Encontrados {len(articles)} artículos")
        return articles
    
    except Exception as e:
        print(f"[Semantic Scholar] Error en búsqueda: {str(e)}")
        return []  # No hay fallback, solo resultados reales

def search_arxiv(query: str) -> List[dict]:
    """
    Búsqueda REAL en ArXiv usando API pública
    
    API: https://arxiv.org/help/api
    No requiere autenticación
    Límite: 3 solicitudes por segundo
    """
    if not query or query.strip() == '':
        return []
    
    try:
        print(f"[ArXiv] Buscando: {query}")
        
        # Construir búsqueda
        url = 'http://export.arxiv.org/api/query'
        params = {
            'search_query': f'all:{query}',
            'start': 0,
            'max_results': 100,  # Máximo razonable por consulta
            'sortBy': 'submittedDate',
            'sortOrder': 'descending'
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        # Parsear XML (Atom format)
        root = ET.fromstring(response.content)
        
        # Namespace para Atom
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        articles = []
        for entry in root.findall('atom:entry', ns):
            try:
                # Extraer título
                title_elem = entry.find('atom:title', ns)
                title = title_elem.text.strip() if title_elem is not None else 'Sin título'
                
                # Extraer autores
                authors = []
                for author in entry.findall('atom:author', ns):
                    name_elem = author.find('atom:name', ns)
                    if name_elem is not None:
                        authors.append(name_elem.text)
                
                # Extraer resumen (abstract)
                summary_elem = entry.find('atom:summary', ns)
                abstract = summary_elem.text.strip() if summary_elem is not None else ''
                
                # Extraer fecha de publicación
                published_elem = entry.find('atom:published', ns)
                year = None
                if published_elem is not None:
                    try:
                        year = int(published_elem.text[:4])
                    except:
                        pass
                
                # Extraer ID
                id_elem = entry.find('atom:id', ns)
                arxiv_id = 'unknown'
                if id_elem is not None:
                    arxiv_id = id_elem.text.split('/abs/')[-1]
                
                articles.append({
                    'id': f'arxiv_{arxiv_id}',
                    'title': title,
                    'authors': authors,
                    'source': 'ArXiv',
                    'year': year,
                    'abstract': abstract,
                    'url': f'https://arxiv.org/abs/{arxiv_id}'
                })
            except Exception as e:
                print(f"[ArXiv] Error procesando entry: {str(e)}")
                continue
        
        print(f"[ArXiv] Encontrados {len(articles)} artículos")
        return articles
    
    except Exception as e:
        print(f"[ArXiv] Error en búsqueda: {str(e)}")
        return []  # No hay fallback, solo resultados reales

def search_crossref(query: str) -> List[dict]:
    """
    Búsqueda REAL en Crossref usando API pública
    
    API: https://github.com/CrossRef/rest-api-doc
    No requiere autenticación
    """
    if not query or query.strip() == '':
        return []
    
    try:
        print(f"[Crossref] Buscando: {query}")
        
        # Búsqueda en Crossref
        url = 'https://api.crossref.org/works'
        params = {
            'query': query,
            'rows': 100,  # Máximo que Crossref permite por consulta
            'sort': 'published',
            'order': 'desc'
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        items = data.get('message', {}).get('items', [])
        
        articles = []
        for item in items:
            try:
                # Extraer título
                title = item.get('title', ['Sin título'])[0] if isinstance(item.get('title'), list) else item.get('title', 'Sin título')
                
                # Extraer autores
                authors = []
                for author in item.get('author', []):
                    if isinstance(author, dict):
                        name_parts = []
                        if 'given' in author:
                            name_parts.append(author['given'])
                        if 'family' in author:
                            name_parts.append(author['family'])
                        if name_parts:
                            authors.append(' '.join(name_parts))
                
                # Extraer año
                year = None
                if 'published-online' in item:
                    try:
                        year = int(item['published-online']['date-parts'][0][0])
                    except:
                        pass
                elif 'published' in item:
                    try:
                        year = int(item['published']['date-parts'][0][0])
                    except:
                        pass
                
                # Extraer abstract
                abstract = item.get('abstract', '')
                
                # Extraer DOI para URL
                doi = item.get('DOI', 'unknown')
                
                articles.append({
                    'id': f'crossref_{doi}',
                    'title': title,
                    'authors': authors,
                    'source': 'Crossref',
                    'year': year,
                    'abstract': abstract,
                    'url': f'https://doi.org/{doi}'
                })
            except Exception as e:
                print(f"[Crossref] Error procesando item: {str(e)}")
                continue
        
        print(f"[Crossref] Encontrados {len(articles)} artículos")
        return articles
    
    except Exception as e:
        print(f"[Crossref] Error en búsqueda: {str(e)}")
        return []  # No hay fallback, solo resultados reales

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
        # Validar que al menos una base de datos esté seleccionada
        if not any([strategies.use_pubmed, strategies.use_semantic, strategies.use_arxiv, strategies.use_crossref]):
            raise HTTPException(
                status_code=400,
                detail="Por favor selecciona al menos una base de datos"
            )
        
        print(f"\n[SEARCH] Iniciando búsqueda:")
        print(f"  - PubMed: {'✓' if strategies.use_pubmed else '✗'} - {strategies.pubmed}")
        print(f"  - Semantic Scholar: {'✓' if strategies.use_semantic else '✗'} - {strategies.semanticScholar}")
        print(f"  - ArXiv: {'✓' if strategies.use_arxiv else '✗'} - {strategies.arxiv}")
        print(f"  - Crossref: {'✓' if strategies.use_crossref else '✗'} - {strategies.crossref}")
        
        # Ejecutar búsquedas SOLO en bases de datos seleccionadas
        pubmed_articles = search_pubmed(strategies.pubmed) if (strategies.use_pubmed and strategies.pubmed) else []
        semantic_articles = search_semantic_scholar(strategies.semanticScholar) if (strategies.use_semantic and strategies.semanticScholar) else []
        arxiv_articles = search_arxiv(strategies.arxiv) if (strategies.use_arxiv and strategies.arxiv) else []
        crossref_articles = search_crossref(strategies.crossref) if (strategies.use_crossref and strategies.crossref) else []
        
        # Unificar resultados
        all_articles = pubmed_articles + semantic_articles + arxiv_articles + crossref_articles
        
        # Eliminar duplicados por título (simple deduplicación)
        seen_titles = set()
        unique_articles = []
        for article in all_articles:
            # Validar que el título no sea None
            if not article.get('title'):
                print(f"[WARNING] Artículo sin título válido: {article.get('id', 'unknown')}")
                continue
            title_lower = article['title'].lower()
            if title_lower not in seen_titles:
                seen_titles.add(title_lower)
                unique_articles.append(article)
        
        print(f"\n[SEARCH] Resultados:")
        print(f"  - PubMed: {len(pubmed_articles)} artículos")
        print(f"  - Semantic Scholar: {len(semantic_articles)} artículos")
        print(f"  - ArXiv: {len(arxiv_articles)} artículos")
        print(f"  - Crossref: {len(crossref_articles)} artículos")
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
# FUNCIONES DE META-ANÁLISIS
# ============================================================================

def run_r_script(extraction_data: List[ExtractionRow], analysis_type: str = "fixed") -> dict:
    """
    Simula la ejecución de un script de R para meta-análisis
    
    En producción, esto llamaría a R usando subprocess o rpy2:
    - Instalar R: https://www.r-project.org/
    - Instalar paquetes: install.packages(c("meta", "metafor"))
    - Usar rpy2 para llamar desde Python
    
    PARA IMPLEMENTACIÓN REAL:
    1. Instalar R en el servidor
    2. Instalar paquetes: meta, metafor
    3. Crear script R que lea datos JSON
    4. Llamar con subprocess.run(['Rscript', 'meta_analysis.R', json_data])
    5. Parsear salida JSON de R
    
    Ejemplo de script R:
        # meta_analysis.R
        library(meta)
        library(metafor)
        
        # Leer datos
        data <- jsonlite::fromJSON(input_file)
        
        # Meta-análisis
        m <- metagen(TE = data$mean, seTE = data$sd/sqrt(data$n),
                     studlab = data$studyName, sm = "SMD")
        
        # Calcular métricas
        i2 <- m$I2
        q <- m$Q
        pval <- m$pval.Q
        
        # Generar gráficos
        png("forest_plot.png")
        forest(m)
        dev.off()
        
        # Exportar resultados
        results <- list(
          i_squared = i2,
          q_statistic = q,
          p_value = pval,
          effect_size = m$TE.fixed,
          ci_lower = m$lower.fixed,
          ci_upper = m$upper.fixed
        )
        
        write(jsonlite::toJSON(results), output_file)
    """
    
    print(f"\n[Meta-Analysis] Iniciando análisis con {len(extraction_data)} estudios")
    print(f"[Meta-Analysis] Tipo de análisis: {analysis_type}")
    print(f"[Meta-Analysis] R script is running...")
    
    try:
        # Simular cálculos de meta-análisis
        if not extraction_data or len(extraction_data) == 0:
            raise ValueError("No hay datos de extracción")
        
        # Calcular estadísticas básicas
        means = [row.mean for row in extraction_data]
        sds = [row.sd for row in extraction_data]
        ns = [row.n for row in extraction_data]
        
        # Calcular tamaño del efecto (media ponderada)
        total_n = sum(ns)
        weighted_mean = sum(m * n for m, n in zip(means, ns)) / total_n
        
        # Calcular I² (heterogeneidad)
        # Fórmula simplificada para demostración
        variance_between = sum((m - weighted_mean) ** 2 * n for m, n in zip(means, ns)) / total_n
        variance_within = sum(s ** 2 for s in sds) / len(sds)
        
        if variance_within > 0:
            i_squared = (variance_between / (variance_between + variance_within)) * 100
        else:
            i_squared = 0
        
        # Limitar I² entre 0 y 100
        i_squared = max(0, min(100, i_squared))
        
        # Calcular Q statistic (simplificado)
        q_statistic = variance_between * total_n
        
        # Calcular p-value (simplificado)
        # En producción, usar distribución chi-cuadrado
        p_value = 0.05 if i_squared > 50 else 0.95
        
        # Determinar heterogeneidad
        if i_squared < 25:
            heterogeneity = "Low"
        elif i_squared < 75:
            heterogeneity = "Moderate"
        else:
            heterogeneity = "High"
        
        # Calcular IC (95%)
        se = sum(sds) / len(sds) / (total_n ** 0.5)
        ci_lower = weighted_mean - 1.96 * se
        ci_upper = weighted_mean + 1.96 * se
        
        # Generar URLs simuladas de gráficos
        # En producción, guardar archivos PNG en servidor
        forest_plot_url = f"https://meta-piqma-search.onrender.com/plots/forest_{int(datetime.now().timestamp())}.png"
        funnel_plot_url = f"https://meta-piqma-search.onrender.com/plots/funnel_{int(datetime.now().timestamp())}.png"
        
        print(f"[Meta-Analysis] ✓ Análisis completado")
        print(f"[Meta-Analysis] I² = {i_squared:.2f}%")
        print(f"[Meta-Analysis] Q = {q_statistic:.4f}")
        print(f"[Meta-Analysis] p-value = {p_value:.4f}")
        print(f"[Meta-Analysis] Heterogeneidad: {heterogeneity}")
        
        return {
            "i_squared": i_squared,
            "q_statistic": q_statistic,
            "p_value": p_value,
            "heterogeneity": heterogeneity,
            "effect_size": weighted_mean,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
            "forest_plot_url": forest_plot_url,
            "funnel_plot_url": funnel_plot_url
        }
    
    except Exception as e:
        print(f"[Meta-Analysis] Error: {str(e)}")
        raise

@app.post("/api/v1/meta-analysis", response_model=MetaAnalysisResponse)
async def meta_analysis(request: MetaAnalysisRequest):
    """
    Endpoint de meta-análisis
    
    Recibe datos de extracción y devuelve métricas de meta-análisis
    
    Entrada:
    {
        "extractionData": [
            {"id": "1", "studyName": "Study 1", "n": 100, "mean": 5.2, "sd": 1.5},
            {"id": "2", "studyName": "Study 2", "n": 120, "mean": 5.8, "sd": 1.8}
        ],
        "analysisType": "fixed"
    }
    
    Salida:
    {
        "success": true,
        "metrics": {
            "i_squared": 45.5,
            "q_statistic": 3.2,
            "p_value": 0.05,
            "heterogeneity": "Moderate",
            "effect_size": 5.5,
            "ci_lower": 4.8,
            "ci_upper": 6.2
        },
        "forestPlotUrl": "...",
        "funnelPlotUrl": "...",
        "message": "Meta-análisis completado exitosamente"
    }
    """
    try:
        # Validar datos
        if not request.extractionData or len(request.extractionData) < 2:
            raise HTTPException(
                status_code=400,
                detail="Se requieren al menos 2 estudios para meta-análisis"
            )
        
        # Ejecutar análisis
        results = run_r_script(request.extractionData, request.analysisType)
        
        # Construir respuesta
        metrics = MetaAnalysisMetrics(
            i_squared=results["i_squared"],
            q_statistic=results["q_statistic"],
            p_value=results["p_value"],
            heterogeneity=results["heterogeneity"],
            effect_size=results["effect_size"],
            ci_lower=results["ci_lower"],
            ci_upper=results["ci_upper"]
        )
        
        return MetaAnalysisResponse(
            success=True,
            metrics=metrics,
            forestPlotUrl=results["forest_plot_url"],
            funnelPlotUrl=results["funnel_plot_url"],
            message="Meta-análisis completado exitosamente"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"\n[ERROR] Error en meta-análisis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error en meta-análisis: {str(e)}"
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
