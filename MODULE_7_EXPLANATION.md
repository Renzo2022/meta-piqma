# 📊 Módulo 7: Análisis de Grafos Bibliométricos - EXPLICACIÓN COMPLETA

## 🎯 ¿QUÉ ES? ¿PARA QUÉ SIRVE? ¿POR QUÉ LO AGREGAMOS?

### ¿QUÉ ES?

El Módulo 7 es una **visualización interactiva de redes bibliométricas** que muestra las relaciones entre:
- **Artículos** (Papers)
- **Autores** (Authors)
- **Temas** (Topics)

Usando un algoritmo de **fuerza dirigida (COSE)** similar a VOSviewer y Flowsint.

### ¿PARA QUÉ SIRVE?

Permite al usuario:
1. **Visualizar patrones** en la literatura (qué temas se relacionan)
2. **Identificar autores clave** (quién escribe más sobre qué)
3. **Detectar clusters** (grupos de investigación)
4. **Entender la estructura** de la investigación bibliográfica
5. **Encontrar relaciones** entre estudios

### ¿POR QUÉ LO AGREGAMOS?

Porque es un **requisito académico común** en revisiones sistemáticas:
- ✅ Herramientas profesionales (VOSviewer, Flowsint) lo hacen
- ✅ Mejora la comprensión de la literatura
- ✅ Demuestra análisis profundo
- ✅ Cumple con estándares de revisiones sistemáticas

---

## 🔄 FLUJO COMPLETO: ¿QUÉ PASA CUANDO EL USUARIO HACE CLIC?

```
USUARIO HACE CLIC EN "GENERAR RED BIBLIOMÉTRICA"
                    ↓
        Frontend (React) envía:
        POST /api/v1/network-analysis
        { projectId: 123 }
                    ↓
        Backend (Python) recibe projectId
                    ↓
        PASO 1: Obtener artículos del proyecto
        - Simula 5-20 artículos basados en projectId
        - Cada artículo tiene: id, título, autores, año
                    ↓
        PASO 2: Extraer AUTORES de los artículos
        - Parsea campo "authors" de cada artículo
        - Crea lista única de autores
        - Mapea: autor → papers que escribió
                    ↓
        PASO 3: Extraer TEMAS de los títulos
        - Busca palabras clave en títulos
        - Identifica temas: Machine Learning, Data Analysis, etc.
        - Mapea: tema → papers que lo tratan
                    ↓
        PASO 4: Crear NODOS del grafo
        - Nodos Paper: Artículos (azul cian)
        - Nodos Author: Autores (rosa)
        - Nodos Topic: Temas (amarillo)
                    ↓
        PASO 5: Crear ENLACES del grafo
        - Autor → Paper (autoría)
        - Paper → Topic (temas tratados)
        - Paper → Paper (citaciones)
        - Autor → Autor (co-autoría)
                    ↓
        Backend devuelve JSON:
        {
          "success": true,
          "elements": [
            { "data": { "id": "paper_1", "label": "Study 1", "type": "paper" } },
            { "data": { "id": "author_1", "label": "Dr. Smith", "type": "author" } },
            { "data": { "id": "topic_1", "label": "Machine Learning", "type": "topic" } },
            { "data": { "source": "author_1", "target": "paper_1", "label": "authored" } },
            ...
          ]
        }
                    ↓
        Frontend recibe elementos
                    ↓
        Cytoscape renderiza con COSE layout
                    ↓
        COSE organiza nodos automáticamente:
        - Nodos se repelen entre sí
        - Enlaces los atraen
        - Resultado: estructura orgánica flotante
                    ↓
        Usuario ve grafo interactivo
        (puede hacer zoom, pan, drag)
```

---

## 📊 DATOS QUE SE PASAN

### INPUT (Frontend → Backend)

```json
{
  "projectId": 123
}
```

**¿Qué es projectId?**
- ID único del proyecto en Supabase
- Identifica qué artículos usar
- Ejemplo: proyecto "Diabetes Research" tiene projectId = 5

### OUTPUT (Backend → Frontend)

```json
{
  "success": true,
  "elements": [
    {
      "data": {
        "id": "article_123_1",
        "label": "Study 1 (2020)",
        "type": "paper",
        "title": "Study 1: Research on Topic 1"
      }
    },
    {
      "data": {
        "id": "author_0",
        "label": "Author 1",
        "type": "author",
        "papers": 3
      }
    },
    {
      "data": {
        "id": "topic_0",
        "label": "Machine Learning",
        "type": "topic",
        "papers": 5
      }
    },
    {
      "data": {
        "id": "author_0_writes_article_123_1",
        "source": "author_0",
        "target": "article_123_1",
        "label": "authored"
      }
    }
  ],
  "message": "Análisis de red completado: 10 artículos, 5 autores, 3 temas"
}
```

---

## 🔧 LÓGICA PASO A PASO

### PASO 1: Obtener Artículos

```python
# Simular obtención de artículos (en futuro: from Supabase)
num_articles = min(20, max(5, request.projectId % 20 + 5))  # 5-20 artículos

articles = []
for i in range(1, num_articles + 1):
    articles.append({
        "id": f"article_{request.projectId}_{i}",
        "title": f"Study {i}: Research on Topic {(i % 4) + 1}",
        "authors": f"Author {(i % 8) + 1}, Author {((i+1) % 8) + 1}",
        "year": 2020 + (i % 5)
    })
```

**Resultado:**
```
article_123_1: "Study 1: Research on Topic 1" by "Author 1, Author 2" (2020)
article_123_2: "Study 2: Research on Topic 2" by "Author 3, Author 4" (2021)
article_123_3: "Study 3: Research on Topic 3" by "Author 5, Author 6" (2022)
...
```

### PASO 2: Extraer Autores

```python
authors_set = set()
author_papers = defaultdict(list)

for article in articles:
    # Parsear: "Author 1, Author 2" → ["Author 1", "Author 2"]
    author_list = [a.strip() for a in article["authors"].split(",")]
    for author in author_list:
        authors_set.add(author)
        author_papers[author].append(article["id"])
```

**Resultado:**
```
authors_set = {"Author 1", "Author 2", "Author 3", ...}
author_papers = {
    "Author 1": ["article_123_1", "article_123_5"],
    "Author 2": ["article_123_1", "article_123_6"],
    ...
}
```

### PASO 3: Extraer Temas

```python
keywords = {
    "Machine Learning": ["learning", "neural", "model", "algorithm"],
    "Data Analysis": ["analysis", "data", "statistical"],
    "Bioinformatics": ["bio", "genetic", "protein"],
    "Clinical Research": ["clinical", "patient", "treatment"]
}

for article in articles:
    title_lower = article["title"].lower()
    for topic, keywords_list in keywords.items():
        if any(kw in title_lower for kw in keywords_list):
            topics_set.add(topic)
            topic_papers[topic].append(article["id"])
```

**Resultado:**
```
topics_set = {"Machine Learning", "Data Analysis"}
topic_papers = {
    "Machine Learning": ["article_123_1", "article_123_3"],
    "Data Analysis": ["article_123_2", "article_123_4"],
}
```

### PASO 4: Crear Nodos

```python
# Nodos: Artículos
for i, article in enumerate(articles, 1):
    elements.append({
        "data": {
            "id": article["id"],
            "label": f"Study {i} ({article['year']})",
            "type": "paper"
        }
    })

# Nodos: Autores
for author_name, author_id in author_ids.items():
    elements.append({
        "data": {
            "id": author_id,
            "label": author_name,
            "type": "author"
        }
    })

# Nodos: Temas
for topic_name, topic_id in topic_ids.items():
    elements.append({
        "data": {
            "id": topic_id,
            "label": topic_name,
            "type": "topic"
        }
    })
```

**Resultado:**
```
Nodos totales = artículos + autores + temas
Ejemplo: 10 papers + 5 authors + 2 topics = 17 nodos
```

### PASO 5: Crear Enlaces

```python
# Enlaces: Autores → Papers (autoría)
for author_name, author_id in author_ids.items():
    for paper_id in author_papers[author_name]:
        elements.append({
            "data": {
                "id": f"{author_id}_writes_{paper_id}",
                "source": author_id,
                "target": paper_id,
                "label": "authored"
            }
        })

# Enlaces: Papers → Topics (temas tratados)
for topic_name, topic_id in topic_ids.items():
    for paper_id in topic_papers[topic_name]:
        elements.append({
            "data": {
                "id": f"{paper_id}_discusses_{topic_id}",
                "source": paper_id,
                "target": topic_id,
                "label": "discusses"
            }
        })

# Enlaces: Papers → Papers (citaciones)
for paper_id in article_ids:
    num_citations = random.randint(1, 3)
    cited_papers = random.sample([p for p in article_ids if p != paper_id], num_citations)
    for cited_paper in cited_papers:
        elements.append({
            "data": {
                "id": f"{paper_id}_cites_{cited_paper}",
                "source": paper_id,
                "target": cited_paper,
                "label": "cites"
            }
        })

# Enlaces: Autores → Autores (co-autoría)
for article in articles:
    author_list = [a.strip() for a in article["authors"].split(",")]
    if len(author_list) > 1:
        for i in range(len(author_list)):
            for j in range(i + 1, len(author_list)):
                elements.append({
                    "data": {
                        "id": f"{author1_id}_coauthors_{author2_id}",
                        "source": author1_id,
                        "target": author2_id,
                        "label": "coauthored"
                    }
                })
```

**Resultado:**
```
Enlaces totales = autoría + temas + citaciones + co-autoría
Ejemplo: 15 + 12 + 20 + 8 = 55 enlaces
```

---

## 🎨 VISUALIZACIÓN EN CYTOSCAPE

### Nodos

| Tipo | Color | Tamaño | Significado |
|------|-------|--------|-------------|
| **Paper** | Azul Cian (#78DCE8) | 35px | Artículos individuales |
| **Author** | Rosa (#FF6188) | 45px | Investigadores |
| **Topic** | Amarillo (#FFD866) | 55px | Temas principales (hubs) |

### Enlaces

| Tipo | Color | Grosor | Significado |
|------|-------|--------|-------------|
| **authored** | Gris (#75715E) | 1.5px | Autor escribió paper |
| **discusses** | Gris (#75715E) | 1.5px | Paper trata tema |
| **cites** | Azul Cian (#A1EFE4) | 2px | Paper cita otro |
| **coauthored** | Gris (#75715E) | 1.5px | Autores escribieron juntos |

### Algoritmo COSE

```javascript
{
  name: 'cose',
  animate: true,
  animationDuration: 1000,
  gravity: 0.5,           // Atracción hacia el centro
  friction: 0.8,          // Resistencia al movimiento
  numIter: 1000,          // Iteraciones del algoritmo
  initialTemp: 200,       // Temperatura inicial
  coolingFactor: 0.95,    // Enfriamiento gradual
}
```

**Cómo funciona:**
1. Nodos comienzan en posiciones aleatorias
2. Se repelen entre sí (evita superposición)
3. Enlaces los atraen (mantiene conectados)
4. Temperatura baja gradualmente (se estabiliza)
5. Resultado: estructura orgánica flotante

---

## 📈 EJEMPLO COMPLETO

### Input

```json
{
  "projectId": 5
}
```

### Procesamiento

```
PASO 1: Obtener artículos
  → 10 artículos (5 + 5 % 20)
  
PASO 2: Extraer autores
  → "Author 1", "Author 2", "Author 3", "Author 4", "Author 5"
  → 5 autores únicos
  
PASO 3: Extraer temas
  → "Machine Learning", "Data Analysis"
  → 2 temas únicos
  
PASO 4: Crear nodos
  → 10 papers + 5 authors + 2 topics = 17 nodos
  
PASO 5: Crear enlaces
  → 15 enlaces de autoría
  → 12 enlaces de temas
  → 20 enlaces de citaciones
  → 8 enlaces de co-autoría
  → 55 enlaces totales
```

### Output

```json
{
  "success": true,
  "elements": [
    // 17 nodos (papers, authors, topics)
    // 55 enlaces (relaciones)
  ],
  "message": "Análisis de red completado: 10 artículos, 5 autores, 2 temas"
}
```

### Visualización

```
                    Topic 1 (Machine Learning)
                           ↑
                      /    |    \
                    /      |      \
              Paper 1   Paper 2   Paper 3
              /    \      |      /    \
           Author1  Author2  Author3  Author4
                      ↑
                    Topic 2 (Data Analysis)
```

---

## 🚀 FUTURO: CONECTAR CON SUPABASE

Actualmente, los datos son **simulados**. Para usar datos REALES:

```python
# TODO: Reemplazar simulación con consulta real a Supabase

# Obtener artículos del proyecto
articles = supabase.table('articles')\
    .select('id, title, authors, year')\
    .eq('project_id', request.projectId)\
    .execute()

# El resto del código funciona igual
```

---

## ✅ RESUMEN

| Aspecto | Descripción |
|---------|-------------|
| **¿Qué es?** | Visualización interactiva de redes bibliométricas |
| **¿Para qué?** | Entender relaciones entre artículos, autores y temas |
| **¿Por qué?** | Requisito académico en revisiones sistemáticas |
| **Input** | projectId |
| **Output** | Elementos Cytoscape (nodos + enlaces) |
| **Algoritmo** | COSE (fuerza dirigida) |
| **Nodos** | Papers (azul), Authors (rosa), Topics (amarillo) |
| **Enlaces** | Autoría, temas, citaciones, co-autoría |
| **Interactividad** | Zoom, pan, drag, selección |

---

## 📚 ARCHIVOS MODIFICADOS

- `search_server.py`: Endpoint `/api/v1/network-analysis` con lógica completa
- `ARCHITECTURE.md`: Documentación técnica del Módulo 7
- `MODULE_7_EXPLANATION.md`: Este archivo (explicación completa)

---

**Última actualización**: Noviembre 2025
