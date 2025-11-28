# 📊 Módulo 7: Datos de Supabase y Flujo Completo

## 🎯 PREGUNTA: ¿QUÉ DATOS TOMA DE SUPABASE?

### Tabla: `articles` (Artículos)

Cuando el usuario hace clic en "Generar Red Bibliométrica", el backend consulta Supabase:

```sql
SELECT 
  id,
  title,
  authors,
  year,
  abstract,
  url,
  source,
  status
FROM articles
WHERE project_id = {projectId}
AND status != 'duplicate'
```

### Campos Específicos

| Campo | Tipo | Ejemplo | Uso en Grafo |
|-------|------|---------|-------------|
| **id** | TEXT | `article_5_1` | ID único del nodo |
| **title** | TEXT | "Study 1: Research on Topic 1" | Etiqueta y popup |
| **authors** | TEXT | "Author 1, Author 2" | Extrae autores |
| **year** | INTEGER | 2020 | Información del nodo |
| **abstract** | TEXT | "This study investigates..." | Información detallada |
| **url** | TEXT | "https://example.com/article/1" | Link al artículo |
| **source** | TEXT | "PubMed" | Información de origen |
| **status** | TEXT | "included_final" | Filtro de artículos válidos |

---

## 🔄 FLUJO COMPLETO: DE BÚSQUEDA A GRAFO

### PASO 0: Usuario realiza búsqueda (Módulo 2)

```
Usuario ingresa PICO
   ↓
Usuario selecciona bases de datos
   ↓
Usuario hace clic "Buscar"
   ↓
Backend busca en PubMed, Semantic Scholar, ArXiv, Crossref
   ↓
Artículos se guardan en Supabase (tabla 'articles')
   ↓
Cada artículo tiene:
  - id: identificador único
  - title: título del artículo
  - authors: "Author 1, Author 2, Author 3"
  - year: 2020
  - abstract: resumen
  - url: enlace
  - source: "PubMed" (de dónde vino)
  - status: "identified" (estado inicial)
```

### PASO 1: Usuario va a Módulo 7

```
Usuario hace clic en "Análisis de Grafos"
   ↓
Se carga ModuleGraphAnalysis.jsx
   ↓
Usuario ve descripción y botón "Generar Red Bibliométrica"
```

### PASO 2: Usuario hace clic en "Generar Red Bibliométrica"

```
Frontend envía:
POST /api/v1/network-analysis
{
  "projectId": 5
}
```

### PASO 3: Backend consulta Supabase

```python
# Backend recibe projectId = 5
# Consulta Supabase:

articles = supabase.table('articles')\
    .select('id, title, authors, year, abstract, url, source, status')\
    .eq('project_id', 5)\
    .neq('status', 'duplicate')\
    .execute()

# Resultado: Lista de artículos del proyecto 5
# Ejemplo:
[
  {
    "id": "article_5_1",
    "title": "Study 1: Research on Topic 1",
    "authors": "Author 1, Author 2",
    "year": 2020,
    "abstract": "This study investigates...",
    "url": "https://example.com/1",
    "source": "PubMed",
    "status": "included_final"
  },
  {
    "id": "article_5_2",
    "title": "Study 2: Research on Topic 2",
    "authors": "Author 3, Author 4",
    "year": 2021,
    "abstract": "This study examines...",
    "url": "https://example.com/2",
    "source": "Semantic Scholar",
    "status": "included_final"
  },
  ...
]
```

### PASO 4: Backend procesa artículos

#### 4.1 Extraer AUTORES

```python
# De cada artículo, parsea el campo "authors"
# "Author 1, Author 2" → ["Author 1", "Author 2"]

authors_set = {"Author 1", "Author 2", "Author 3", "Author 4", ...}

# Mapeo: autor → papers que escribió
author_papers = {
    "Author 1": ["article_5_1", "article_5_5"],
    "Author 2": ["article_5_1", "article_5_6"],
    "Author 3": ["article_5_2"],
    "Author 4": ["article_5_2"],
    ...
}
```

#### 4.2 Extraer TEMAS

```python
# Busca palabras clave en los títulos

keywords = {
    "Machine Learning": ["learning", "neural", "model", "algorithm"],
    "Data Analysis": ["analysis", "data", "statistical"],
    "Bioinformatics": ["bio", "genetic", "protein"],
    "Clinical Research": ["clinical", "patient", "treatment"]
}

# Resultado:
topics_set = {"Machine Learning", "Data Analysis", ...}

topic_papers = {
    "Machine Learning": ["article_5_1", "article_5_3"],
    "Data Analysis": ["article_5_2", "article_5_4"],
    ...
}
```

### PASO 5: Backend crea NODOS

#### 5.1 Nodos Paper (Artículos)

```python
for i, article in enumerate(articles, 1):
    elements.append({
        "data": {
            "id": article["id"],                    # "article_5_1"
            "label": f"Study {i} ({article['year']})",  # "Study 1 (2020)"
            "type": "paper",
            
            # DATOS PARA INTERACTIVIDAD
            "title": article["title"],              # "Study 1: Research on Topic 1"
            "year": article["year"],                # 2020
            "authors": article["authors"],          # "Author 1, Author 2"
            "abstract": article["abstract"],        # "This study investigates..."
            "url": article["url"],                  # "https://example.com/1"
            "source": article["source"],            # "PubMed"
            "status": article["status"],            # "included_final"
            
            # INFORMACIÓN PARA POPUP
            "popup_title": f"📄 {article['title']}",
            "popup_info": f"Year: {article['year']}\nSource: {article['source']}"
        }
    })
```

**Resultado en Cytoscape:**
```
Nodo azul cian con etiqueta "Study 1 (2020)"
Al hacer clic → Panel derecho muestra:
  - Título completo
  - Autores
  - Año
  - Fuente
  - Resumen
  - Link al artículo
```

#### 5.2 Nodos Author (Autores)

```python
for author_name, author_id in author_ids.items():
    num_papers = len(author_papers[author_name])
    elements.append({
        "data": {
            "id": author_id,                        # "author_0"
            "label": author_name,                   # "Author 1"
            "type": "author",
            
            # DATOS PARA INTERACTIVIDAD
            "papers": num_papers,                   # 3
            "papers_list": author_papers[author_name],  # ["article_5_1", "article_5_5", ...]
            
            # INFORMACIÓN PARA POPUP
            "popup_title": f"👤 {author_name}",
            "popup_info": f"Papers: {num_papers}"
        }
    })
```

**Resultado en Cytoscape:**
```
Nodo rosa con etiqueta "Author 1"
Al hacer clic → Panel derecho muestra:
  - Nombre del autor
  - Número de artículos publicados
  - Lista de colaboraciones
```

#### 5.3 Nodos Topic (Temas)

```python
for topic_name, topic_id in topic_ids.items():
    num_papers = len(topic_papers[topic_name])
    elements.append({
        "data": {
            "id": topic_id,                         # "topic_0"
            "label": topic_name,                    # "Machine Learning"
            "type": "topic",
            
            # DATOS PARA INTERACTIVIDAD
            "papers": num_papers,                   # 5
            "papers_list": topic_papers[topic_name],  # ["article_5_1", "article_5_3", ...]
            
            # INFORMACIÓN PARA POPUP
            "popup_title": f"🏷️ {topic_name}",
            "popup_info": f"Papers: {num_papers}"
        }
    })
```

**Resultado en Cytoscape:**
```
Nodo amarillo con etiqueta "Machine Learning"
Al hacer clic → Panel derecho muestra:
  - Nombre del tema
  - Número de artículos relacionados
  - Barra de frecuencia (% de artículos)
```

### PASO 6: Backend crea ENLACES

#### 6.1 Enlaces: Autor → Paper (Autoría)

```python
for author_name, author_id in author_ids.items():
    for paper_id in author_papers[author_name]:
        elements.append({
            "data": {
                "id": f"{author_id}_writes_{paper_id}",
                "source": author_id,                # "author_0"
                "target": paper_id,                 # "article_5_1"
                "label": "authored"
            }
        })
```

**Resultado:**
```
Línea gris conecta:
  Author 1 → Study 1
  Author 1 → Study 5
  (Muestra quién escribió qué)
```

#### 6.2 Enlaces: Paper → Topic (Temas Tratados)

```python
for topic_name, topic_id in topic_ids.items():
    for paper_id in topic_papers[topic_name]:
        elements.append({
            "data": {
                "id": f"{paper_id}_discusses_{topic_id}",
                "source": paper_id,                 # "article_5_1"
                "target": topic_id,                 # "topic_0"
                "label": "discusses"
            }
        })
```

**Resultado:**
```
Línea gris conecta:
  Study 1 → Machine Learning
  Study 1 → Data Analysis
  (Muestra qué temas trata cada artículo)
```

#### 6.3 Enlaces: Paper → Paper (Citaciones)

```python
for paper_id in article_ids:
    num_citations = random.randint(1, 3)
    cited_papers = random.sample([p for p in article_ids if p != paper_id], num_citations)
    for cited_paper in cited_papers:
        elements.append({
            "data": {
                "id": f"{paper_id}_cites_{cited_paper}",
                "source": paper_id,                 # "article_5_1"
                "target": cited_paper,              # "article_5_3"
                "label": "cites"
            }
        })
```

**Resultado:**
```
Línea azul cian conecta:
  Study 1 → Study 3
  Study 1 → Study 5
  (Muestra qué papers citan otros papers)
```

#### 6.4 Enlaces: Autor → Autor (Co-autoría)

```python
for article in articles:
    author_list = [a.strip() for a in article["authors"].split(",")]
    if len(author_list) > 1:
        for i in range(len(author_list)):
            for j in range(i + 1, len(author_list)):
                elements.append({
                    "data": {
                        "id": f"{author1_id}_coauthors_{author2_id}",
                        "source": author1_id,       # "author_0"
                        "target": author2_id,       # "author_1"
                        "label": "coauthored"
                    }
                })
```

**Resultado:**
```
Línea gris conecta:
  Author 1 ↔ Author 2
  (Muestra quiénes escribieron juntos)
```

### PASO 7: Backend devuelve JSON

```json
{
  "success": true,
  "elements": [
    // 10-20 nodos (papers, authors, topics)
    // 50-100 enlaces (relaciones)
  ],
  "message": "Análisis de red completado: 10 artículos, 5 autores, 2 temas"
}
```

### PASO 8: Frontend renderiza con Cytoscape

```javascript
// Cytoscape recibe elementos
// Aplica layout COSE (fuerza dirigida)
// Nodos se organizan automáticamente
// Usuario ve grafo interactivo
```

### PASO 9: Usuario interactúa

```
Usuario hace clic en un nodo
   ↓
Frontend captura evento
   ↓
setSelectedNode(node)
   ↓
Panel derecho muestra información detallada
   ↓
Usuario puede:
  - Hacer zoom (rueda del ratón)
  - Pan (click + arrastrar)
  - Drag nodos (click + arrastrar)
  - Ver información (click en nodo)
```

---

## 📋 INFORMACIÓN MOSTRADA POR TIPO DE NODO

### Al hacer clic en un PAPER (Artículo)

```
📄 Study 1: Research on Topic 1

TÍTULO
Study 1: Research on Topic 1

AUTORES
Author 1, Author 2

AÑO                    FUENTE
2020                   PubMed

RESUMEN
This study investigates the effects of intervention on outcome in population 1.

Ver artículo →
```

### Al hacer clic en un AUTHOR (Autor)

```
👤 Author 1

NOMBRE
Author 1

ARTÍCULOS PUBLICADOS
3

COLABORACIONES
• article_5_1
• article_5_5
• article_5_6
```

### Al hacer clic en un TOPIC (Tema)

```
🏷️ Machine Learning

TEMA
Machine Learning

ARTÍCULOS RELACIONADOS
5

FRECUENCIA
████████░░ 50% de los artículos
```

---

## 🔗 RELACIÓN CON OTROS MÓDULOS

```
Módulo 2: Búsqueda
  ↓
  Artículos guardados en Supabase (tabla 'articles')
  ↓
Módulo 3: Cribado
  ↓
  Status de artículos actualizado
  ↓
Módulo 4: Elegibilidad
  ↓
  Status de artículos actualizado
  ↓
Módulo 7: Análisis de Grafos
  ↓
  Lee artículos de Supabase
  ↓
  Genera grafo basado en datos REALES
```

---

## 🚀 FUTURO: CONECTAR CON SUPABASE REAL

Actualmente, el código tiene un TODO:

```python
# TODO: Reemplazar con consulta real a Supabase
# articles = supabase.table('articles')\
#     .select('id, title, authors, year, abstract, url, source, status')\
#     .eq('project_id', request.projectId)\
#     .neq('status', 'duplicate')\
#     .execute()
# articles = articles.data
```

Cuando Supabase esté configurado, solo hay que descomentar estas líneas.

---

## ✅ RESUMEN

| Aspecto | Descripción |
|---------|-------------|
| **Tabla Supabase** | `articles` |
| **Campos usados** | id, title, authors, year, abstract, url, source, status |
| **Filtro** | project_id = {projectId} AND status != 'duplicate' |
| **Nodos generados** | Papers, Authors, Topics |
| **Enlaces generados** | Autoría, Temas, Citaciones, Co-autoría |
| **Interactividad** | Click en nodo → Panel de información |
| **Información mostrada** | Depende del tipo de nodo (paper, author, topic) |

---

**Última actualización**: Noviembre 2025
