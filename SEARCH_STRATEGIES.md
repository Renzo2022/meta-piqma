# 🔍 Guía de Estrategias de Búsqueda - MetaPiqma

## 📋 Introducción

Las estrategias de búsqueda son consultas optimizadas para cada base de datos académica. MetaPiqma utiliza **IA (Groq/Llama 3.3)** para generar automáticamente estrategias basadas en criterios PICO.

## 🎯 Criterios PICO

Antes de generar estrategias, define claramente:

- **P (Población)**: ¿A quién afecta el problema?
- **I (Intervención)**: ¿Qué tratamiento/intervención se evalúa?
- **C (Comparación)**: ¿Con qué se compara?
- **O (Outcome)**: ¿Cuál es el resultado esperado?

### Ejemplo Completo

```
P: Pacientes con diabetes tipo 2
I: Tratamiento con metformina
C: Insulina, sulfonilureas o placebo
O: Reducción de riesgos cardiovasculares
```

## 🔗 Estrategias por Base de Datos

### 1. PubMed (Sintaxis MeSH)

**Formato:**
```
(("MeSH Term 1"[Mesh] OR Synonym1 OR "MeSH Term 2") AND ("MeSH Term 3"[Mesh] OR Synonym2))
```

**Ejemplo (Diabetes + Metformina):**
```
(("Type 2 Diabetes Mellitus"[Mesh] OR T2DM OR "Diabetes Mellitus, Non-Insulin-Dependent" OR NIDDM OR "Adult-Onset Diabetes") AND (Metformin[Mesh] OR Metformin OR Glucophage OR Biguanides))
```

**Características:**
- ✅ Usa términos MeSH (Medical Subject Headings)
- ✅ Operadores booleanos: AND, OR, NOT
- ✅ Campos: [Mesh], [Title], [Abstract], [Author]
- ✅ Muy preciso y específico
- ✅ Mejor para búsquedas médicas

**Componentes:**
- `"Type 2 Diabetes Mellitus"[Mesh]` - Término MeSH principal
- `T2DM` - Acrónimo
- `OR` - Incluye sinónimos
- `AND` - Combina conceptos

---

### 2. Semantic Scholar (Palabras Clave Naturales)

**Formato:**
```
(Term1 OR Synonym1) AND (Term2) AND (Outcome)
```

**Ejemplo (Diabetes + Metformina):**
```
(Type 2 Diabetes Mellitus OR T2DM) AND (Metformin) AND (Cardiovascular Risk)
```

**Características:**
- ✅ Búsqueda semántica (entiende significado)
- ✅ Palabras clave naturales en inglés
- ✅ Operadores simples: AND, OR
- ✅ Más flexible que PubMed
- ✅ Cubre múltiples disciplinas

**Componentes:**
- `Type 2 Diabetes Mellitus OR T2DM` - Concepto población
- `Metformin` - Concepto intervención
- `Cardiovascular Risk` - Concepto outcome

---

### 3. ArXiv (Términos Clave Naturales)

**Formato:**
```
keyword1 keyword2 keyword3 outcome (sin operadores AND/OR)
```

**Ejemplo (Diabetes + Metformina):**
```
Type 2 diabetes treatment metformin cardiovascular outcomes
```

**Características:**
- ✅ Términos amplios y naturales
- ✅ **SIN operadores booleanos** (AND/OR)
- ✅ Búsqueda por palabras clave
- ✅ Incluye variaciones y sinónimos
- ✅ Mejor para preprints científicos

**Componentes:**
- `Type 2 diabetes` - Población (variaciones: T2DM, diabetes)
- `treatment` - Intervención (variaciones: therapy, management)
- `metformin` - Fármaco específico
- `cardiovascular outcomes` - Resultado esperado

**Mejoras en ArXiv:**
- ✅ Filtros de categoría automáticos (q-bio, stat, cs.AI)
- ✅ Búsqueda en "all" (título, abstract, autores)
- ✅ Manejo inteligente de 5+ palabras clave
- ✅ Detección automática de términos médicos

---

### 4. Crossref (Metadatos de Publicaciones)

**Formato:**
```
Term1 Mesh Synonym1 Term2 Mesh Synonym2
```

**Ejemplo (Diabetes + Metformina):**
```
Type 2 Diabetes Mellitus T2DM Non-Insulin-Dependent Diabetes NIDDM Adult-Onset Diabetes Metformin Glucophage Biguanides
```

**Características:**
- ✅ Copia la estrategia de PubMed sin comillas ni corchetes
- ✅ Búsqueda por relevancia
- ✅ Metadatos de publicaciones
- ✅ DOI como identificador único
- ✅ Cobertura amplia de disciplinas

**Componentes:**
- Términos principales y sinónimos separados por espacios
- Sin operadores booleanos
- Sin comillas ni corchetes

---

## 🤖 Generación Automática con IA

### Cómo Funciona

1. **Usuario ingresa PICO** en Módulo 1
2. **Usuario hace clic** en "✨ Generar Estrategias con IA"
3. **Frontend envía** datos PICO al backend
4. **Backend (Groq/Llama 3.3)** genera 3 estrategias (PubMed, Semantic Scholar, Crossref)
5. **Backend copia automáticamente** la estrategia de Crossref a ArXiv (para ahorrar tokens)
6. **Estrategias se rellenan** automáticamente en los campos
7. **Usuario puede editar** si es necesario

### Prompt de IA

```
Actúa como un bibliotecario experto en revisiones sistemáticas...

Basado en este PICO:
- Población: [P]
- Intervención: [I]
- Comparación: [C]
- Outcome: [O]

Genera 3 estrategias de búsqueda optimizadas siguiendo EXACTAMENTE estos formatos:
1. PubMed (MeSH syntax)
2. Semantic Scholar (palabras clave)
3. Crossref (sin comillas)

NOTA: ArXiv usará la misma estrategia que Crossref (para ahorrar tokens)

IMPORTANTE:
- Traduce todos los términos al INGLÉS
- Usa sinónimos y términos MeSH apropiados
- Para ArXiv: incluye términos amplios, variaciones y sinónimos
```

### Ejemplo de Salida

```json
{
  "pubmed": "(\"Type 2 Diabetes Mellitus\"[Mesh] OR T2DM...) AND (Metformin[Mesh] OR...)",
  "semantic": "(Type 2 Diabetes Mellitus OR T2DM) AND (Metformin) AND (Cardiovascular Risk)",
  "arxiv": "Type 2 Diabetes Mellitus T2DM Non-Insulin-Dependent Diabetes NIDDM Adult-Onset Diabetes Metformin Glucophage Biguanides",
  "crossref": "Type 2 Diabetes Mellitus T2DM Non-Insulin-Dependent Diabetes NIDDM Adult-Onset Diabetes Metformin Glucophage Biguanides"
}
```

---

## Mejoras en ArXiv

### Problema Anterior
- Búsquedas muy restrictivas (solo título/abstract)
- Sin filtros de categoría
- Resultados de física, matemáticas en lugar de biomedicina

### Soluciones Implementadas

**1. Búsqueda en "all:" (todas partes)**
```
all:diabetes AND all:metformin AND all:cardiovascular
```
- Busca en título, abstract, autores, etc.
- Mayor cobertura de resultados relevantes

**2. Filtros de Categoría Automáticos**
```
(all:diabetes AND all:metformin) AND (cat:q-bio OR cat:stat OR cat:cs.AI OR cat:physics.med-ph)
```
- Detecta términos médicos automáticamente
- Filtra por categorías relevantes:
  - `q-bio` = Biología Cuantitativa
  - `q-bio.PE` = Poblaciones y Evolución
  - `q-bio.QM` = Métodos Cuantitativos
  - `stat` = Estadística
  - `cs.AI` = IA/Machine Learning
  - `physics.med-ph` = Física Médica

**3. Estrategia de Palabras Clave Inteligente**
- 1 palabra: `all:keyword`
- 2-4 palabras: `all:kw1 AND all:kw2 AND all:kw3`
- 5+ palabras: `(all:kw1 AND all:kw2 AND all:kw3) AND (all:kw4 OR all:kw5)`

---

## 📊 Comparación de Bases de Datos

| Aspecto | PubMed | Semantic Scholar | ArXiv | Crossref |
|---------|--------|------------------|-------|----------|
| **Cobertura** | Médica/Biomédica | Multidisciplinaria | Preprints | General |
| **Sintaxis** | MeSH compleja | Palabras clave | Natural | Simple |
| **Precisión** | Muy alta | Alta | Media | Media-Alta |
| **Volumen** | Medio | Muy alto | Alto | Muy alto |
| **Mejor para** | Medicina | Ciencia general | Preprints | Metadatos |

---

## 💡 Consejos Prácticos

### ✅ Buenas Prácticas

1. **Usa sinónimos**: diabetes, T2DM, NIDDM, "adult-onset diabetes"
2. **Sé específico**: "Type 2 Diabetes" vs solo "Diabetes"
3. **Incluye variaciones**: metformin, glucophage, biguanides
4. **Traduce al inglés**: Todas las estrategias en inglés
5. **Prueba y ajusta**: Revisa resultados y refina si es necesario

### ❌ Errores Comunes

1. ❌ Mezclar operadores en ArXiv: `Type 2 diabetes AND metformin` (NO)
2. ❌ Usar comillas en Crossref: `"Type 2 Diabetes"` (NO)
3. ❌ Olvidar MeSH en PubMed: `diabetes` en lugar de `"Type 2 Diabetes Mellitus"[Mesh]`
4. ❌ Términos muy generales: `disease` en lugar de `diabetes`
5. ❌ No traducir al inglés: Usar español en búsquedas

---

## 🚀 Flujo Completo de Búsqueda

```
1. Usuario define PICO
   ↓
2. Usuario genera estrategias con IA
   ↓
3. Sistema genera 4 estrategias optimizadas
   ↓
4. Usuario selecciona bases de datos
   ↓
5. Sistema ejecuta búsquedas paralelas
   ↓
6. Resultados se unifican y se eliminan duplicados
   ↓
7. Artículos se guardan en Supabase
   ↓
8. Usuario continúa con cribado
```

---

## 📚 Recursos Adicionales

### PubMed
- [MeSH Browser](https://www.ncbi.nlm.nih.gov/mesh)
- [PubMed Help](https://pubmed.ncbi.nlm.nih.gov/help/)
- [Search Field Descriptions](https://pubmed.ncbi.nlm.nih.gov/help/#search-field-descriptions)

### Semantic Scholar
- [About](https://www.semanticscholar.org/about)
- [API Documentation](https://www.semanticscholar.org/product/api)

### ArXiv
- [API Documentation](https://arxiv.org/help/api)
- [Categories](https://arxiv.org/category_taxonomy)

### Crossref
- [REST API](https://github.com/CrossRef/rest-api-doc)
- [Query Syntax](https://github.com/CrossRef/rest-api-doc#queries)

---

## 🎓 Ejemplos Adicionales

### Ejemplo 2: Cáncer de Mama + Tamoxifeno

**PICO:**
- P: Mujeres con cáncer de mama
- I: Tratamiento con tamoxifeno
- C: Placebo o sin tratamiento
- O: Tasa de supervivencia

**Estrategias Generadas:**

**PubMed:**
```
(("Breast Neoplasms"[Mesh] OR "Breast Cancer" OR "Mammary Carcinoma") AND (Tamoxifen[Mesh] OR Tamoxifen OR Nolvadex)) AND ("Survival Rate"[Mesh] OR "Overall Survival" OR "Disease-Free Survival")
```

**Semantic Scholar:**
```
(Breast Cancer OR Breast Neoplasms) AND (Tamoxifen) AND (Survival Rate)
```

**ArXiv:**
```
breast cancer treatment tamoxifen survival outcomes
```

**Crossref:**
```
Breast Neoplasms Breast Cancer Mammary Carcinoma Tamoxifen Nolvadex Survival Rate Overall Survival
```

---

## 📞 Soporte

Para preguntas sobre estrategias:
1. Consulta [README.md](./README.md)
2. Revisa ejemplos en este documento
3. Abre un [Issue en GitHub](https://github.com/Renzo2022/meta-piqma/issues)

---

**Última actualización**: Noviembre 2025
