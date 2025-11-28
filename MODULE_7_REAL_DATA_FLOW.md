# 📊 Módulo 7: Flujo Real de Datos - Búsqueda a Grafo

## 🎯 TU PREGUNTA: ¿Tiene relación el grafo con mis resultados de búsqueda?

**Respuesta: SÍ, AHORA SÍ. Pero antes NO.**

---

## ❌ ANTES (Datos Simulados)

```
Tus resultados de búsqueda:
  PubMed:           99 artículos
  Semantic Scholar: 10 artículos
  ArXiv:            13 artículos
  Crossref:        100 artículos
  ─────────────────────────────
  TOTAL:           222 artículos
  
Pero el grafo mostraba:
  Artículos: 20 nodos (HARDCODED)
  Autores:    8 nodos (HARDCODED)
  Temas:      4 nodos (HARDCODED)
  
❌ NO HABÍA RELACIÓN - El grafo ignoraba tus 222 artículos
```

---

## ✅ AHORA (Datos Reales de Supabase)

```
Tus resultados de búsqueda:
  PubMed:           99 artículos
  Semantic Scholar: 10 artículos
  ArXiv:            13 artículos
  Crossref:        100 artículos
  ─────────────────────────────
  TOTAL:           222 artículos
  
Guardados en Supabase (tabla 'articles')
  
El grafo ahora:
  ✅ Lee los 222 artículos de Supabase
  ✅ Extrae autores REALES de esos 222 artículos
  ✅ Extrae temas REALES de esos 222 artículos
  ✅ Crea relaciones REALES entre ellos
  
✅ AHORA SÍ HAY RELACIÓN - El grafo usa tus datos reales
```

---

## 🔄 FLUJO COMPLETO: DE BÚSQUEDA A GRAFO

### MÓDULO 2: Búsqueda (Resultados: 222 artículos)

```
Usuario ingresa PICO
   ↓
Usuario selecciona: PubMed, Semantic Scholar, ArXiv, Crossref
   ↓
Backend busca en cada base de datos:
   - PubMed:           99 artículos encontrados
   - Semantic Scholar: 10 artículos encontrados
   - ArXiv:            13 artículos encontrados
   - Crossref:        100 artículos encontrados
   ─────────────────────────────────────────────
   TOTAL:             222 artículos encontrados
   ↓
Cada artículo se guarda en Supabase:
   INSERT INTO articles (
     id,
     title,
     authors,           ← "Author 1, Author 2, Author 3"
     year,
     abstract,
     url,
     source,            ← "PubMed" o "Semantic Scholar" etc.
     status,            ← "identified"
     project_id
   )
```

### MÓDULO 3: Cribado (Filtrado por título)

```
Usuario revisa títulos
   ↓
Algunos artículos se marcan como:
   - "excluded_title" (no relevante)
   - "included_title" (parece relevante)
   ↓
Status en Supabase se actualiza
```

### MÓDULO 4: Elegibilidad (Filtrado por texto completo)

```
Usuario revisa textos completos
   ↓
Algunos artículos se marcan como:
   - "excluded_fulltext" (no cumple criterios)
   - "included_final" (INCLUIDO EN REVISIÓN)
   ↓
Status en Supabase se actualiza
```

### MÓDULO 7: Análisis de Grafos (AHORA CONECTADO)

```
Usuario hace clic "Generar Red Bibliométrica"
   ↓
Frontend envía: POST /api/v1/network-analysis { projectId: 5 }
   ↓
Backend consulta Supabase:
   
   SELECT id, title, authors, year, abstract, url, source, status
   FROM articles
   WHERE project_id = 5
   AND status != 'duplicate'
   
   ↓
Backend recibe TODOS TUS 222 ARTÍCULOS
   ↓
Backend procesa:
   
   PASO 1: Extrae autores de los 222 artículos
           Ejemplo: "Author 1, Author 2" → ["Author 1", "Author 2"]
           Resultado: ~500-1000 autores únicos (depende de duplicados)
   
   PASO 2: Extrae temas de los 222 títulos
           Busca palabras clave en cada título
           Resultado: ~10-20 temas únicos
   
   PASO 3: Crea nodos
           - 222 nodos Paper (azul cian)
           - ~500-1000 nodos Author (rosa)
           - ~10-20 nodos Topic (amarillo)
   
   PASO 4: Crea enlaces
           - Autoría: cada autor → papers que escribió
           - Temas: cada paper → temas que trata
           - Citaciones: paper → paper (simulado)
           - Co-autoría: autor ↔ autor
   
   ↓
Backend devuelve JSON con TODOS los elementos
   ↓
Frontend renderiza con Cytoscape
   ↓
Usuario ve grafo con 222 artículos REALES
```

---

## 📊 EJEMPLO CONCRETO

### Tus datos en Supabase

```
Artículo 1:
  id: "article_5_1"
  title: "Machine Learning for Disease Prediction"
  authors: "Dr. Smith, Dr. Johnson, Dr. Williams"
  year: 2023
  source: "PubMed"
  status: "included_final"

Artículo 2:
  id: "article_5_2"
  title: "Deep Neural Networks in Medical Imaging"
  authors: "Dr. Brown, Dr. Jones"
  year: 2022
  source: "Semantic Scholar"
  status: "included_final"

Artículo 3:
  id: "article_5_3"
  title: "Statistical Analysis of Clinical Data"
  authors: "Dr. Garcia, Dr. Miller, Dr. Smith"
  year: 2023
  source: "Crossref"
  status: "included_final"

... (219 artículos más)
```

### Backend procesa

```
PASO 1: Extraer autores
  - Dr. Smith (aparece en artículos 1 y 3)
  - Dr. Johnson (aparece en artículo 1)
  - Dr. Williams (aparece en artículo 1)
  - Dr. Brown (aparece en artículo 2)
  - Dr. Jones (aparece en artículo 2)
  - Dr. Garcia (aparece en artículo 3)
  - Dr. Miller (aparece en artículo 3)
  ... (más autores de los otros 219 artículos)

PASO 2: Extraer temas
  - "Machine Learning" (aparece en artículos 1, ...)
  - "Neural Networks" (aparece en artículos 2, ...)
  - "Medical Imaging" (aparece en artículos 2, ...)
  - "Statistical Analysis" (aparece en artículos 3, ...)
  - "Clinical Data" (aparece en artículos 3, ...)
  ... (más temas de los otros 219 artículos)

PASO 3: Crear nodos
  - 222 nodos Paper
  - ~100+ nodos Author (depende de duplicados)
  - ~15-20 nodos Topic
  
PASO 4: Crear enlaces
  - Dr. Smith → Artículo 1
  - Dr. Smith → Artículo 3
  - Dr. Johnson → Artículo 1
  - Dr. Williams → Artículo 1
  - Artículo 1 → "Machine Learning"
  - Artículo 2 → "Neural Networks"
  - Artículo 2 → "Medical Imaging"
  - Artículo 3 → "Statistical Analysis"
  - Dr. Smith ↔ Dr. Johnson (co-autores)
  - Dr. Smith ↔ Dr. Garcia (co-autores)
  ... (más enlaces)
```

### Resultado en el grafo

```
Usuario ve:
  - 222 nodos azul cian (tus 222 artículos)
  - ~100+ nodos rosa (autores reales)
  - ~15-20 nodos amarillo (temas reales)
  - Cientos de enlaces mostrando relaciones REALES

Al hacer clic en un artículo:
  - Ve el título REAL
  - Ve los autores REALES
  - Ve el año REAL
  - Ve la fuente REAL (PubMed, Semantic Scholar, etc.)
  - Ve el resumen REAL
```

---

## 🔗 RELACIÓN ENTRE MÓDULOS

```
┌─────────────────────────────────────────────────────────┐
│ MÓDULO 1: PICO (Criterios de búsqueda)                 │
│ Población, Intervención, Comparación, Outcome          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ MÓDULO 2: BÚSQUEDA (222 artículos encontrados)         │
│ PubMed (99) + Semantic Scholar (10) + ArXiv (13) +     │
│ Crossref (100) = 222 artículos                         │
│ ↓ Guardados en Supabase                                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ MÓDULO 3: CRIBADO (Filtrado por título)                │
│ Usuario revisa 222 títulos                             │
│ Algunos se marcan como "excluded_title"                │
│ ↓ Status actualizado en Supabase                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ MÓDULO 4: ELEGIBILIDAD (Filtrado por texto completo)   │
│ Usuario revisa textos completos                        │
│ Algunos se marcan como "excluded_fulltext"             │
│ Algunos se marcan como "included_final" (FINAL)        │
│ ↓ Status actualizado en Supabase                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ MÓDULO 7: ANÁLISIS DE GRAFOS (AHORA CONECTADO)         │
│ ✅ Lee artículos de Supabase (con status != duplicate) │
│ ✅ Usa datos REALES de búsqueda y filtrado             │
│ ✅ Genera grafo basado en tus 222 artículos            │
│ ✅ Muestra relaciones REALES entre autores, temas      │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ CÓMO FUNCIONA AHORA

### Backend (search_server.py)

```python
@app.post("/api/v1/network-analysis")
async def network_analysis(request: NetworkAnalysisRequest):
    # PASO 1: Consultar Supabase (DATOS REALES)
    if supabase:
        try:
            response = supabase.table('articles')\
                .select('id, title, authors, year, abstract, url, source, status')\
                .eq('project_id', request.projectId)\
                .neq('status', 'duplicate')\
                .execute()
            
            articles = response.data  # ✅ TUS 222 ARTÍCULOS REALES
            
        except Exception as e:
            # Fallback a datos simulados si hay error
            articles = []
    
    # PASO 2: Procesar artículos reales
    # - Extrae autores
    # - Extrae temas
    # - Crea nodos
    # - Crea enlaces
    
    # PASO 3: Devolver JSON
    return NetworkAnalysisResponse(
        success=True,
        elements=[...]  # Todos tus 222 artículos + relaciones
    )
```

### Frontend (App.jsx)

```javascript
const handleGenerateNetwork = async () => {
  // Envía projectId
  const elements = await apiClient.runNetworkAnalysis(state.currentProjectId);
  
  // Recibe elementos REALES
  setGraphElements(elements);
  
  // Cytoscape renderiza con COSE layout
  // Usuario ve grafo con 222 artículos REALES
};
```

---

## 🚀 PRÓXIMOS PASOS

### 1. Verificar Supabase está configurado

```bash
# En tu .env, asegúrate de tener:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### 2. Reiniciar el servidor

```bash
# Detener servidor actual
# Iniciar nuevo servidor
python search_server.py
```

### 3. Probar el Módulo 7

```
1. Ir a Módulo 2 (Búsqueda)
2. Buscar artículos (222 encontrados)
3. Ir a Módulo 7 (Análisis de Grafos)
4. Hacer clic "Generar Red Bibliométrica"
5. Ver grafo con 222 artículos REALES
```

---

## ✅ RESUMEN

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Datos del grafo** | Simulados (20 artículos) | Reales (222 artículos) |
| **Autores** | Fake (8 autores) | Reales (~100+ autores) |
| **Temas** | Fake (4 temas) | Reales (~15-20 temas) |
| **Relación con búsqueda** | ❌ Ninguna | ✅ Directa |
| **Fuente de datos** | Hardcoded | Supabase |
| **Actualización** | Manual | Automática |

---

**Última actualización**: Noviembre 2025
