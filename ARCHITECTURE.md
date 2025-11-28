# 🏗️ Arquitectura Técnica - MetaPiqma

## 📊 Diagrama General

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (NAVEGADOR)                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React App (Vite)                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │   Módulo 1   │  │   Módulo 3   │  │   Módulo 5   │   │   │
│  │  │   Búsqueda   │  │   Cribado    │  │   PRISMA     │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │   Módulo 2   │  │   Módulo 4   │  │   Módulo 6   │   │   │
│  │  │   Artículos  │  │  Elegibilidad│  │ Meta-Análisis│   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │                                                            │   │
│  │  Componentes Compartidos:                                │   │
│  │  - apiClient (llamadas HTTP)                             │   │
│  │  - State Management (useReducer)                         │   │
│  │  - Supabase Client                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                    SERVIDOR (Backend Python)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FastAPI Application                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │   /search    │  │  /prisma     │  │  /meta-      │   │   │
│  │  │   endpoints  │  │  endpoints   │  │  analysis    │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │                                                            │   │
│  │  Módulos:                                                │   │
│  │  - search_pubmed()                                       │   │
│  │  - search_semantic_scholar()                             │   │
│  │  - search_arxiv()                                        │   │
│  │  - search_crossref()                                     │   │
│  │  - PRISMADiagramGenerator                                │   │
│  │  - Meta-analysis calculations                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ SQL
┌─────────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS (Supabase)                       │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   projects   │  │   articles   │  │meta_analysis │           │
│  │              │  │              │  │    _data     │           │
│  │ - id (PK)    │  │ - id (PK)    │  │ - id (PK)    │           │
│  │ - user_id    │  │ - project_id │  │ - project_id │           │
│  │ - title      │  │ - title      │  │ - article_id │           │
│  │ - description│  │ - authors    │  │ - n_interv   │           │
│  │              │  │ - source     │  │ - mean_interv│           │
│  │              │  │ - year       │  │ - sd_interv  │           │
│  │              │  │ - abstract   │  │ - n_control  │           │
│  │              │  │ - url        │  │ - mean_ctrl  │           │
│  │              │  │ - status     │  │ - sd_control │           │
│  │              │  │              │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  Auth: Supabase Auth (JWT)                                      │
│  RLS: Row Level Security habilitado                             │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Datos

### 1. Búsqueda de Artículos

```
Usuario ingresa criterios PICO
         ↓
React envía POST /api/v1/search
         ↓
Backend ejecuta búsquedas paralelas:
  - search_pubmed(query)
  - search_semantic_scholar(query)
  - search_arxiv(query)
  - search_crossref(query)
         ↓
Backend unifica resultados
         ↓
Backend detecta duplicados (Levenshtein)
         ↓
Backend devuelve JSON con artículos
         ↓
React guarda en Supabase (tabla articles)
         ↓
React muestra resultados en UI
```

### 2. Cribado y Elegibilidad

```
Usuario selecciona artículos
         ↓
Usuario marca como incluido/excluido
         ↓
React actualiza status en Supabase
         ↓
Backend calcula contadores PRISMA
         ↓
React actualiza diagrama PRISMA
         ↓
Usuario continúa con siguiente módulo
```

### 3. Meta-Análisis

```
Usuario ingresa datos de extracción
         ↓
React auto-guarda en meta_analysis_data
         ↓
Usuario hace clic "Ejecutar Meta-Análisis"
         ↓
React envía POST /api/v1/run-meta-analysis
         ↓
Backend calcula:
  - I² (heterogeneidad)
  - Q (estadístico Q)
  - p-value
  - Efecto combinado
         ↓
Backend genera gráficos (Plotly)
         ↓
Backend devuelve URLs de gráficos
         ↓
React renderiza Forest Plot y Funnel Plot
```

## 📁 Estructura de Directorios

```
meta-piqma/
├── src/
│   ├── main.jsx                    # Punto de entrada React
│   ├── App.jsx                     # Componente principal (3751 líneas)
│   ├── index.css                   # Estilos Tailwind
│   ├── components/
│   │   ├── MetaAnalysisCharts.jsx  # Forest Plot, Funnel Plot
│   │   └── ... (otros componentes)
│   └── apiClient.js                # Cliente HTTP para backend
│
├── search_server.py                # Backend FastAPI (1679 líneas)
├── prisma_generator.py             # Generador PRISMA (542 líneas)
│
├── package.json                    # Dependencias Node.js
├── requirements.txt                # Dependencias Python
├── vite.config.js                  # Configuración Vite
├── tailwind.config.js              # Configuración Tailwind
│
├── README.md                       # Documentación general
├── SETUP.md                        # Guía de instalación
├── ARCHITECTURE.md                 # Este archivo
│
└── .env.example                    # Variables de entorno (ejemplo)
```

## 🔌 Endpoints API

### Búsqueda
```
POST /api/v1/search
  Input: SearchStrategies
  Output: SearchResponse
  
POST /api/v1/run-meta-analysis
  Input: { projectId }
  Output: { metrics, charts }

POST /api/v1/generate-strategies
  Input: GenerateStrategiesRequest { population, intervention, comparison, outcome }
  Output: GenerateStrategiesResponse { strategies: { pubmed, semantic, crossref, arxiv } }
```

### PRISMA
```
POST /api/v1/prisma-validate
  Input: PRISMAData
  Output: { valid, errors }
  
POST /api/v1/prisma-diagram
  Input: PRISMAData
  Output: { svg_url, png_url }
  
GET /api/v1/prisma-example
  Output: PRISMAData (ejemplo)
```

### Salud
```
GET /health
  Output: { status, timestamp, service }
```

## 🗄️ Modelo de Datos

### Tabla: projects
```sql
id (bigserial, PK)
created_at (timestamp)
user_id (uuid, FK → auth.users)
title (text)
description (text)
```

### Tabla: articles
```sql
id (uuid, PK)
created_at (timestamp)
project_id (bigint, FK → projects)
title (text)
authors (text[])
source (text) -- PubMed, Semantic Scholar, ArXiv, Crossref
year (integer)
abstract (text)
url (text)
status (text) -- unscreened, duplicate, excluded_title, included_title, excluded_fulltext, included_final
```

### Tabla: meta_analysis_data
```sql
id (uuid, PK)
created_at (timestamp)
project_id (bigint, FK → projects)
article_id (text, UNIQUE)
n_intervention (integer)
mean_intervention (numeric)
sd_intervention (numeric)
n_control (integer)
mean_control (numeric)
sd_control (numeric)
```

## 🔐 Seguridad

### Autenticación
- Supabase Auth (JWT)
- Tokens almacenados en localStorage
- Refresh automático de tokens

### Autorización
- Row Level Security (RLS) en todas las tablas
- Usuarios solo ven sus propios proyectos
- Políticas por rol

### Validación
- Pydantic models en backend
- Validación de entrada en frontend
- CORS configurado

## 🚀 Tecnologías por Capa

### Frontend
- **Framework**: React 18
- **Build**: Vite 4
- **Estilos**: Tailwind CSS 3
- **Animaciones**: Framer Motion
- **Gráficos**: Plotly.js, Cytoscape.js
- **HTTP**: Fetch API
- **DB Client**: Supabase JS

### Backend
- **Framework**: FastAPI
- **Servidor**: Uvicorn
- **Validación**: Pydantic
- **HTTP Client**: Requests
- **Parsing**: ElementTree (XML)

### Database
- **Motor**: PostgreSQL (Supabase)
- **API**: PostgREST
- **Auth**: JWT

## 📊 Estrategias de Búsqueda

### PubMed
- Sintaxis MeSH
- Operadores booleanos (AND, OR, NOT)
- Campos: [Mesh], [Title], [Abstract]

### Semantic Scholar
- Búsqueda semántica
- Palabras clave naturales
- Filtros por año, tipo de documento

### ArXiv
- Búsqueda en "all" (título, abstract, autores)
- Filtros de categoría (q-bio, stat, cs.AI, physics.med-ph)
- Operadores: AND, OR
- Sintaxis: `all:keyword`, `cat:category`

### Crossref
- Búsqueda por relevancia
- Metadatos de publicaciones
- DOI como identificador único

## 🔄 Detección de Duplicados

### Algoritmo
1. **Levenshtein Distance** en títulos (95%+ similitud)
2. **Mismo autor + año + título exacto** (100%)

### Ejemplo
```
Artículo 1: "Effects of Exercise on Diabetes" (Smith, 2020)
Artículo 2: "Effect of Exercise on Diabetes" (Smith, 2020)
→ DUPLICADO (95% similitud + mismo autor/año)
```

## 📈 Cálculos Estadísticos

### Forest Plot
- Efecto de cada estudio (Media Intervención - Media Control)
- Intervalo de confianza 95%
- Efecto combinado (promedio ponderado)

### Funnel Plot
- Eje X: Riesgo Relativo (escala logarítmica)
- Eje Y: Error Estándar
- Triángulo: Intervalo de confianza 95%
- Línea central: Efecto combinado

### Heterogeneidad
- I²: Porcentaje de variabilidad entre estudios
- Q: Estadístico de heterogeneidad
- p-value: Significancia estadística

## 🎯 Patrones de Diseño

### Frontend
- **State Management**: useReducer + Context API
- **Component Composition**: Componentes reutilizables
- **Async Operations**: Promises + async/await
- **Error Handling**: Try-catch + user feedback

### Backend
- **API Design**: RESTful
- **Error Handling**: HTTPException + logging
- **Data Validation**: Pydantic models
- **Async Operations**: Requests library

## 🤖 Generación de Estrategias con IA

### Flujo Completo

```
Usuario define PICO
         ↓
Usuario hace clic "Generar Estrategias con IA"
         ↓
Frontend envía POST /api/v1/generate-strategies
         ↓
Backend (Groq/Llama 3.3) procesa:
  1. Recibe: { population, intervention, comparison, outcome }
  2. Construye prompt especializado
  3. Llama a Groq API
  4. Parsea respuesta JSON
  5. Valida 3 claves: pubmed, semantic, crossref
  6. Copia crossref → arxiv (ahorro de tokens)
  7. Devuelve 4 estrategias
         ↓
Frontend recibe estrategias
         ↓
Campos se rellenan automáticamente
         ↓
Usuario puede editar si es necesario
```

### Prompt de IA

El backend construye un prompt especializado que instruye a Groq para:
- Actuar como bibliotecario experto en revisiones sistemáticas
- Generar 3 estrategias optimizadas (PubMed, Semantic Scholar, Crossref)
- Usar sintaxis específica para cada base de datos
- Traducir términos al inglés
- Incluir sinónimos y términos MeSH
- Devolver JSON válido

### Optimización de Tokens

- **Antes**: 4 estrategias generadas = más tokens
- **Ahora**: 3 estrategias generadas + 1 copiada = ~30% menos tokens
- **Estrategia**: Crossref es similar a ArXiv, se reutiliza

### Manejo de Errores

```python
if not GROQ_API_KEY:
    print("[Groq] ⚠ API key no configurada")
    # Aplicación sigue funcionando sin IA

if not client:
    raise HTTPException(500, "API Key de Groq no configurada")

try:
    response = client.chat.completions.create(...)
except Exception as e:
    raise HTTPException(500, f"Error generando estrategias: {str(e)}")
```

## 🧪 Testing

### Backend
- Unit tests con pytest
- Integration tests
- API tests con requests
- Tests de generación de estrategias con IA

### Frontend
- Component tests con Vitest
- E2E tests con Playwright
- Manual testing
- Tests de integración con Groq API

## 📦 Dependencias Principales

### Frontend (package.json)
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-plotly.js": "^2.6.0",
  "plotly.js": "^3.3.0",
  "framer-motion": "^10.16.4",
  "tailwindcss": "^3.3.0",
  "@supabase/supabase-js": "^2.81.1"
}
```

### Backend (requirements.txt)
```
fastapi==0.109.0
uvicorn==0.27.0
requests==2.31.0
pydantic==2.5.0
python-multipart==0.0.6
groq==0.4.1  # Para generación de estrategias con IA
```

## 🚀 Performance

### Frontend
- Code splitting con Vite
- Lazy loading de componentes
- Memoization con React.memo
- Debouncing en búsquedas

### Backend
- Búsquedas paralelas
- Caché de resultados (futuro)
- Índices en base de datos
- Paginación de resultados

## 🔄 CI/CD

### GitHub Actions (futuro)
- Tests automáticos
- Build automático
- Deployment automático a Render/Vercel

## 📞 Contacto

Para preguntas sobre la arquitectura:
- Abrir un [Issue](https://github.com/Renzo2022/meta-piqma/issues)
- Consultar la [documentación](./README.md)

---

**Última actualización**: Noviembre 2025
