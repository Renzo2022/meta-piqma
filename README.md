# MetaPiqma - Systematic Review & Meta-Analysis Platform

## 📋 Descripción General

**MetaPiqma** es una plataforma web completa para realizar revisiones sistemáticas y meta-análisis de literatura científica. Permite buscar artículos en múltiples bases de datos, gestionar el flujo de trabajo PRISMA 2020, extraer datos y generar análisis estadísticos con visualizaciones profesionales.

## 🎯 Características Principales

### 1. **Búsqueda Avanzada Multi-Base de Datos**
- **PubMed**: Búsqueda con sintaxis MeSH
- **Semantic Scholar**: Búsqueda semántica
- **ArXiv**: Búsqueda en preprints científicos (con filtros de categoría)
- **Crossref**: Búsqueda en metadatos de publicaciones
- **Generación Automática con IA**: Groq/Llama 3.3 genera estrategias optimizadas basadas en criterios PICO

### 2. **Gestión PRISMA 2020**
- Diagrama interactivo del flujo PRISMA 2020
- Cálculo automático de contadores
- Validación de datos en tiempo real
- Exportación múltiple (JSON, CSV, SVG, PNG)

### 3. **Cribado y Elegibilidad**
- **Módulo 3**: Cribado por título y abstract
- **Módulo 4**: Evaluación de elegibilidad por texto completo
- Detección automática de duplicados (Levenshtein Distance)
- Gestión de estados de artículos

### 4. **Extracción de Datos y Meta-Análisis**
- Tabla interactiva para ingreso de datos
- Auto-guardado en Supabase
- Cálculo de métricas estadísticas (I², Q, p-value)
- Gráficos profesionales:
  - **Forest Plot**: Tabla + gráfico interactivo
  - **Funnel Plot**: Detección de sesgo de publicación

### 5. **Visualización de Red**
- Grafo de relaciones entre estudios
- Análisis de conectividad
- Exportación de visualizaciones

## 🤖 Generación de Estrategias con IA

MetaPiqma utiliza **Groq/Llama 3.3** para generar automáticamente estrategias de búsqueda optimizadas:

**Flujo:**
1. Usuario define criterios PICO (Población, Intervención, Comparación, Outcome)
2. Usuario hace clic en "✨ Generar Estrategias con IA"
3. Backend (Groq) genera 3 estrategias optimizadas:
   - **PubMed**: Sintaxis MeSH con términos controlados
   - **Semantic Scholar**: Palabras clave naturales con operadores booleanos
   - **Crossref**: Términos sin comillas ni corchetes
4. Backend copia automáticamente la estrategia de Crossref a ArXiv (para ahorrar tokens)
5. Estrategias se rellenan automáticamente en los campos
6. Usuario puede editar si es necesario

**Ventajas:**
- ✅ Estrategias optimizadas para cada base de datos
- ✅ Traducción automática al inglés
- ✅ Inclusión de sinónimos y términos MeSH
- ✅ Ahorro de tokens (reutiliza estrategia Crossref para ArXiv)
- ✅ Mejora en relevancia de resultados

**Requisitos:**
- Variable de entorno: `GROQ_API_KEY`
- Modelo: `llama-3.3-70b-versatile`

## 🏗️ Arquitectura

```
MetaPiqma/
├── Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx (componente principal)
│   │   ├── components/
│   │   │   ├── MetaAnalysisCharts.jsx (Forest Plot, Funnel Plot)
│   │   │   └── ... (otros componentes)
│   │   ├── index.css (Tailwind CSS)
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── Backend (Python + FastAPI)
│   ├── search_server.py (servidor principal)
│   ├── prisma_generator.py (generador PRISMA)
│   ├── requirements.txt
│   └── ... (módulos auxiliares)
│
├── Database (Supabase PostgreSQL)
│   ├── projects
│   ├── articles
│   ├── meta_analysis_data
│   └── ... (otras tablas)
│
└── Documentación
    ├── README.md (este archivo)
    ├── SETUP.md (instalación y configuración)
    └── ARCHITECTURE.md (arquitectura técnica)
```

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 16+
- Python 3.8+
- Cuenta en Supabase
- Git

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/Renzo2022/meta-piqma.git
cd meta-piqma
```

2. **Configurar Backend (Python)**
```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

3. **Configurar Frontend (React)**
```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tu URL de Supabase
```

4. **Ejecutar la aplicación**
```bash
# Terminal 1: Backend
python search_server.py

# Terminal 2: Frontend
npm run dev
```

5. **Acceder a la aplicación**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Swagger API: http://localhost:8000/docs

## 📊 Módulos Principales

### Módulo 1: Búsqueda PICO
- Definición de criterios PICO (Population, Intervention, Comparison, Outcome)
- Selección de bases de datos
- Ingreso de estrategias de búsqueda
- Ejecución de búsquedas

### Módulo 2: Gestión de Artículos
- Visualización de resultados
- Filtrado por año, fuente, etc.
- Eliminación de duplicados
- Exportación de datos

### Módulo 3: Cribado
- Cribado por título y abstract
- Inclusión/exclusión de artículos
- Actualización automática del diagrama PRISMA

### Módulo 4: Elegibilidad
- Evaluación de texto completo
- Registro de razones de exclusión
- Selección de estudios incluidos

### Módulo 5: Diagrama PRISMA 2020
- Visualización del flujo de revisión
- Cálculo automático de contadores
- Exportación de diagrama

### Módulo 6: Meta-Análisis
- Ingreso de datos de extracción
- Cálculo de métricas estadísticas
- Generación de Forest Plot y Funnel Plot
- Análisis de heterogeneidad

## 🔧 Tecnologías Utilizadas

### Frontend
- **React 18**: Framework UI
- **Vite**: Build tool
- **Tailwind CSS**: Estilos
- **Framer Motion**: Animaciones
- **Plotly.js**: Gráficos interactivos
- **Cytoscape.js**: Visualización de redes
- **Lucide React**: Iconos

### Backend
- **FastAPI**: Framework web
- **Python 3.8+**: Lenguaje
- **Requests**: Cliente HTTP
- **Pydantic**: Validación de datos

### Database
- **Supabase**: PostgreSQL + Auth
- **PostgREST**: API automática

## 📈 Flujo de Trabajo

```
1. Definir criterios PICO
   ↓
2. Buscar en múltiples bases de datos
   ↓
3. Eliminar duplicados
   ↓
4. Cribar por título/abstract
   ↓
5. Evaluar elegibilidad (texto completo)
   ↓
6. Extraer datos
   ↓
7. Realizar meta-análisis
   ↓
8. Generar reportes y visualizaciones
```

## 🔐 Seguridad

- Autenticación con Supabase Auth
- Row Level Security (RLS) en todas las tablas
- Variables de entorno para credenciales
- CORS configurado correctamente
- Validación de entrada en backend

## 📝 Variables de Entorno

### Backend (.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### Frontend (.env.local)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🧪 Testing

```bash
# Backend
pytest tests/

# Frontend
npm run test
```

## 📚 Documentación Adicional

- [SETUP.md](./SETUP.md) - Guía detallada de instalación
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura técnica
- [API.md](./API.md) - Documentación de endpoints

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

## 👨‍💻 Autor

**Renzo** - [GitHub](https://github.com/Renzo2022)

## 📞 Soporte

Para reportar bugs o solicitar features, abre un [Issue](https://github.com/Renzo2022/meta-piqma/issues).

---

**Última actualización**: Noviembre 2025
