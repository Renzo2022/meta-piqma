import React, { useReducer, createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  ClipboardList,
  Search,
  Filter,
  CheckCircle,
  BarChart3,
  Network,
  Zap,
  Menu,
  X,
  Info,
  Wand2,
  Edit,
  ArrowDown,
  Download,
  CheckCircle2,
  Plus,
  Share2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import CytoscapeComponent from 'react-cytoscapejs';
import { createClient } from '@supabase/supabase-js';
import './index.css';

// ============================================================================
// CLIENTE SUPABASE
// ============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// CONTEXT Y REDUCER (El "Cerebro" de la Aplicación)
// ============================================================================

const ProjectContext = createContext();

const initialState = {
  currentPage: 'home',
  sidebarOpen: true,
  currentProjectId: null,
  isLoading: true,
  articlesLoaded: false,
  pico: {
    population: '',
    intervention: '',
    comparison: '',
    outcome: '',
  },
  searchStrategies: {
    pubmed: '',
    semanticScholar: '',
    arxiv: '',
    crossref: '',
  },
  // Bases de datos seleccionadas (todas por defecto)
  selectedDatabases: {
    pubmed: true,
    semanticScholar: true,
    arxiv: true,
    crossref: true,
  },
  projectArticles: [],
  totalOriginalArticles: 0,
  exclusionReasons: [
    'Outcome incorrecto',
    'Población incorrecta',
    'Tipo de estudio incorrecto',
    'Texto completo no disponible',
    'Otro',
  ],
  extractionColumns: [
    { id: 'study_name', label: 'Nombre del Estudio' },
    { id: 'n_intervention', label: 'N (Intervención)' },
    { id: 'mean_intervention', label: 'Media (Intervención)' },
    { id: 'sd_intervention', label: 'DE (Intervención)' },
    { id: 'n_control', label: 'N (Control)' },
    { id: 'mean_control', label: 'Media (Control)' },
    { id: 'sd_control', label: 'DE (Control)' },
  ],
  extractionData: [
    {
      id: 'row_1',
      study_name: '',
      n_intervention: '',
      mean_intervention: '',
      sd_intervention: '',
      n_control: '',
      mean_control: '',
      sd_control: '',
    },
  ],
  metaAnalysisResults: null,
  graphElements: [],
  isLoadingGraph: false,
};

const projectReducer = (state, action) => {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'UPDATE_PICO_FIELD':
      return {
        ...state,
        pico: {
          ...state.pico,
          [action.payload.field]: action.payload.value,
        },
      };
    case 'UPDATE_STRATEGY_FIELD':
      return {
        ...state,
        searchStrategies: {
          ...state.searchStrategies,
          [action.payload.db]: action.payload.value,
        },
      };
    case 'TOGGLE_DATABASE':
      return {
        ...state,
        selectedDatabases: {
          ...state.selectedDatabases,
          [action.payload]: !state.selectedDatabases[action.payload],
        },
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOAD_PROJECT_ARTICLES':
      const articlesWithIds = action.payload.map((article) => ({
        ...article,
        uniqueId: crypto.randomUUID(),
        status: 'unscreened',
      }));
      return { 
        ...state, 
        projectArticles: articlesWithIds,
        totalOriginalArticles: action.payload.length,
      };
    case 'UPDATE_ARTICLE_STATUS':
      return {
        ...state,
        projectArticles: state.projectArticles.map((article) =>
          article.uniqueId === action.payload.articleId
            ? {
                ...article,
                status: action.payload.newStatus,
                ...(action.payload.reason && { exclusionReason: action.payload.reason }),
              }
            : article
        ),
      };
    case 'REMOVE_ARTICLES': {
      const ids = Array.isArray(action.payload) ? action.payload : action.payload.ids;
      const reason = Array.isArray(action.payload) ? 'removed' : action.payload.reason;
      return {
        ...state,
        projectArticles: state.projectArticles.map((article) =>
          ids.includes(article.uniqueId)
            ? { ...article, status: reason }
            : article
        ),
      };
    }
    case 'MARK_DUPLICATES': {
      // Función para calcular similitud entre dos strings (Levenshtein distance)
      const calculateSimilarity = (str1, str2) => {
        // Validar que sean strings
        if (!str1 || !str2) return 0;
        if (typeof str1 !== 'string') str1 = String(str1);
        if (typeof str2 !== 'string') str2 = String(str2);
        
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        
        if (s1 === s2) return 1; // Exacto
        
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        
        if (longer.length === 0) return 1;
        
        const editDistance = getEditDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
      };

      // Calcular distancia de edición (Levenshtein)
      const getEditDistance = (s1, s2) => {
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
          let lastValue = i;
          for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
              costs[j] = j;
            } else if (j > 0) {
              let newValue = costs[j - 1];
              if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              }
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
          if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
      };

      // Función para extraer primer autor
      const getFirstAuthor = (authors) => {
        if (!authors) return '';
        
        // Si es un array, tomar el primer elemento
        if (Array.isArray(authors)) {
          return authors[0]?.toLowerCase().trim() || '';
        }
        
        // Si es un string, dividir por coma
        if (typeof authors === 'string') {
          return authors.split(',')[0].trim().toLowerCase();
        }
        
        return '';
      };

      // Función para verificar si dos artículos son duplicados
      const isDuplicate = (article1, article2) => {
        // Validar que ambos artículos tengan título
        if (!article1.title || !article2.title) return false;
        
        // Comparar títulos con similitud >= 95% (muy estricto)
        const titleSimilarity = calculateSimilarity(article1.title, article2.title);
        if (titleSimilarity >= 0.95) {
          return true;
        }

        // Comparar: mismo primer autor + mismo año + título IDÉNTICO (100%)
        const firstAuthor1 = getFirstAuthor(article1.authors);
        const firstAuthor2 = getFirstAuthor(article2.authors);
        
        const sameFirstAuthor = firstAuthor1 && firstAuthor2 && firstAuthor1 === firstAuthor2;
        const sameYear = article1.year && article2.year && article1.year === article2.year;
        const identicalTitle = titleSimilarity === 1.0; // Exactamente igual

        if (sameFirstAuthor && sameYear && identicalTitle) {
          return true;
        }

        return false;
      };

      // Marcar duplicados
      const articlesWithDuplicates = state.projectArticles.map((article, index) => {
        // Verificar si este artículo es duplicado de alguno anterior
        for (let i = 0; i < index; i++) {
          if (isDuplicate(article, state.projectArticles[i])) {
            return { ...article, status: 'duplicate' };
          }
        }
        return article;
      });

      return { ...state, projectArticles: articlesWithDuplicates };
    }
    case 'ADD_EXTRACTION_ROW':
      const newRow = {
        id: `row_${Date.now()}`,
        ...state.extractionColumns.reduce((acc, col) => {
          acc[col.id] = '';
          return acc;
        }, {}),
      };
      return {
        ...state,
        extractionData: [...state.extractionData, newRow],
      };
    case 'UPDATE_EXTRACTION_CELL':
      return {
        ...state,
        extractionData: state.extractionData.map((row, idx) =>
          idx === action.payload.rowIndex
            ? { ...row, [action.payload.columnId]: action.payload.value }
            : row
        ),
      };
    case 'SET_META_ANALYSIS_RESULTS':
      return { ...state, metaAnalysisResults: action.payload };
    case 'SET_LOADING_GRAPH':
      return { ...state, isLoadingGraph: action.payload };
    case 'SET_GRAPH_ELEMENTS':
      return { ...state, graphElements: action.payload };
    case 'SET_PROJECT_DATA':
      const projectData = action.payload;
      return {
        ...state,
        currentProjectId: projectData.id,
        pico: {
          population: projectData.pico_population || '',
          intervention: projectData.pico_intervention || '',
          comparison: projectData.pico_comparison || '',
          outcome: projectData.pico_outcome || '',
        },
        searchStrategies: {
          pubmed: projectData.strategy_pubmed || '',
          semanticScholar: projectData.strategy_semantic || '',
          arxiv: projectData.strategy_arxiv || '',
          crossref: projectData.strategy_crossref || '',
        },
      };
    case 'SET_PROJECT_ARTICLES':
      if (Array.isArray(action.payload)) {
        const articlesWithIds = action.payload.map((article) => ({
          ...article,
          uniqueId: article.uniqueId || crypto.randomUUID(),
          status: article.status || 'unscreened',
        }));
        return {
          ...state,
          projectArticles: articlesWithIds,
          articlesLoaded: true,
        };
      }
      return state;
    default:
      return state;
  }
};

const ProjectProvider = ({ children }) => {
  const [state, dispatch] = useReducer(projectReducer, initialState);
  return (
    <ProjectContext.Provider value={{ state, dispatch }}>
      {children}
    </ProjectContext.Provider>
  );
};

const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject debe usarse dentro de ProjectProvider');
  }
  return context;
};

// ============================================================================
// SERVICIO API (Stub para compatibilidad R/Python)
// ============================================================================

// ============================================================================
// MOCK DATA PARA BÚSQUEDA
// ============================================================================

const mockArticles = [
  {
    id: 1,
    title: 'Efficacy of Metformin in Type 2 Diabetes Mellitus: A Systematic Review',
    authors: 'Smith J, Johnson A, Williams B',
    source: 'PubMed',
    year: 2023,
    abstract: 'This systematic review examines the efficacy of metformin in reducing cardiovascular risk in patients with type 2 diabetes mellitus. A total of 45 randomized controlled trials were included...',
  },
  {
    id: 2,
    title: 'Cardiovascular Outcomes with Metformin vs Insulin in Type 2 Diabetes',
    authors: 'Brown C, Davis D, Miller E',
    source: 'Semantic Scholar',
    year: 2022,
    abstract: 'We conducted a meta-analysis comparing cardiovascular outcomes between metformin and insulin therapy in type 2 diabetic patients. Results showed a 23% reduction in cardiovascular events...',
  },
  {
    id: 3,
    title: 'Long-term Effects of Metformin on Glycemic Control and Mortality',
    authors: 'Garcia F, Martinez G, Lopez H',
    source: 'PubMed',
    year: 2023,
    abstract: 'A prospective cohort study of 2,500 patients with type 2 diabetes treated with metformin showed sustained glycemic control over 10 years with improved survival rates...',
  },
  {
    id: 4,
    title: 'Metformin Monotherapy vs Combination Therapy in Diabetes Management',
    authors: 'Taylor I, Anderson J, Thomas K',
    source: 'Crossref',
    year: 2021,
    abstract: 'This comparative effectiveness study evaluated metformin monotherapy against combination therapies. Monotherapy was effective in 68% of patients with adequate glycemic control...',
  },
  {
    id: 5,
    title: 'Adverse Effects and Safety Profile of Metformin: A Systematic Review',
    authors: 'White L, Harris M, Young N',
    source: 'Semantic Scholar',
    year: 2022,
    abstract: 'Safety analysis of metformin use in type 2 diabetes revealed gastrointestinal side effects in 15% of patients, with lactic acidosis occurring in less than 0.1% of cases...',
  },
];

// ============================================================================
// SERVICIO API (Real + Simulado)
// ============================================================================

const apiClient = {
  // Carga el primer proyecto que encuentra
  loadProject: async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .limit(1)
        .single();
      
      if (error) {
        // Si no hay proyectos, retorna null sin error
        if (error.code === 'PGRST116') {
          console.log('No hay proyectos en la base de datos');
          return null;
        }
        console.error('Error cargando proyecto:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Error en loadProject:', err);
      return null;
    }
  },

  // Guarda los datos en el proyecto con el ID especificado
  saveProject: async (projectId, picoData, strategyData) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          pico_population: picoData.population,
          pico_intervention: picoData.intervention,
          pico_comparison: picoData.comparison,
          pico_outcome: picoData.outcome,
          strategy_pubmed: strategyData.pubmed,
          strategy_semantic: strategyData.semanticScholar,
          strategy_arxiv: strategyData.arxiv,
          strategy_crossref: strategyData.crossref,
        })
        .eq('id', projectId);
      if (error) console.error('Error guardando proyecto:', error);
    } catch (err) {
      console.error('Error en saveProject:', err);
    }
  },

  // Carga todos los artículos de un proyecto
  loadArticles: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('project_id', projectId)
        .limit(1);
      
      if (data && data.length > 0) {
        console.log('[loadArticles] Estructura de artículo:', Object.keys(data[0]));
        console.log('[loadArticles] Primer artículo:', data[0]);
      }
      
      // Cargar todos sin límite
      const { data: allData, error: allError } = await supabase
        .from('articles')
        .select('*')
        .eq('project_id', projectId);
      
      if (allError) {
        console.error('Error cargando artículos:', allError);
        return [];
      }
      
      return allData || [];
    } catch (err) {
      console.error('Error en loadArticles:', err);
      return [];
    }
  },

  // Guarda (inserta) múltiples artículos en Supabase
  saveArticles: async (projectId, articles) => {
    try {
      // Mapear artículos para agregar project_id
      const articlesToInsert = articles.map((article) => ({
        project_id: projectId,
        title: article.title,
        authors: article.authors?.join(', ') || '',
        source: article.source,
        year: article.year,
        abstract: article.abstract,
        url: article.url || '',
        status: 'unscreened',
        exclusion_reason: null,
      }));

      const { error } = await supabase
        .from('articles')
        .insert(articlesToInsert);
      
      if (error) {
        console.error('Error guardando artículos:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error en saveArticles:', err);
      return false;
    }
  },

  // Actualiza el estado de un artículo específico
  updateArticleStatus: async (articleId, newStatus, reason = null, articleTitle = null) => {
    try {
      console.log('[updateArticleStatus] Intentando actualizar artículo:', articleId, 'a status:', newStatus);
      
      const updateData = {
        status: newStatus,
      };
      
      if (reason) {
        updateData.exclusion_reason = reason;
      }

      // Verificar si articleId es un número válido
      const numericId = parseInt(articleId);
      const isValidNumericId = !isNaN(numericId) && numericId > 0;
      
      let result;
      
      if (isValidNumericId) {
        // Si es un ID numérico válido, actualizar por ID
        console.log('[updateArticleStatus] Actualizando por ID numérico:', numericId);
        result = await supabase
          .from('articles')
          .update(updateData)
          .eq('id', numericId);
      } else if (articleTitle) {
        // Si no es un ID válido pero tenemos título, actualizar por título directamente
        console.log('[updateArticleStatus] ID inválido, actualizando por title:', articleTitle);
        result = await supabase
          .from('articles')
          .update(updateData)
          .eq('title', articleTitle);
      } else {
        console.error('[updateArticleStatus] No hay ID válido ni título disponible');
        return false;
      }
      
      if (result.error) {
        console.error('Error actualizando artículo:', result.error);
        return false;
      }
      
      console.log('[updateArticleStatus] ✓ Artículo actualizado correctamente');
      return true;
    } catch (err) {
      console.error('Error en updateArticleStatus:', err);
      return false;
    }
  },

  // Elimina todos los artículos de un proyecto en Supabase
  deleteAllArticles: async (projectId) => {
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('project_id', projectId);
      
      if (error) {
        console.error('Error eliminando artículos:', error);
        return false;
      }
      
      console.log(`[Articles] ✓ Todos los artículos del proyecto ${projectId} fueron eliminados`);
      return true;
    } catch (err) {
      console.error('Error en deleteAllArticles:', err);
      return false;
    }
  },

  // Búsqueda real usando servidor Python
  async runRealSearch(strategies) {
    try {
      // URL del servidor de búsqueda
      // Por defecto: localhost:8000 (desarrollo)
      // Producción: configurar VITE_SEARCH_SERVER_URL en .env.local
      const SEARCH_SERVER_URL = import.meta.env.VITE_SEARCH_SERVER_URL || 'http://localhost:8000';
      
      // Preparar datos para enviar al backend
      const searchPayload = {
        pubmed: strategies.pubmed || '',
        semanticScholar: strategies.semanticScholar || '',
        arxiv: strategies.arxiv || '',
        crossref: strategies.crossref || '',
        use_pubmed: strategies.use_pubmed !== undefined ? strategies.use_pubmed : true,
        use_semantic: strategies.use_semantic !== undefined ? strategies.use_semantic : true,
        use_arxiv: strategies.use_arxiv !== undefined ? strategies.use_arxiv : true,
        use_crossref: strategies.use_crossref !== undefined ? strategies.use_crossref : true,
      };
      
      console.log(`[Search] Conectando a: ${SEARCH_SERVER_URL}/api/v1/search`);
      console.log('[Search] Payload:', searchPayload);
      
      const response = await fetch(`${SEARCH_SERVER_URL}/api/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload),
      });
      
      if (!response.ok) {
        let errorMessage = `Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error en búsqueda');
      }
      
      console.log(`[Search] Resultados: ${data.total_count} artículos encontrados`);
      
      // Mapear respuesta del servidor al formato esperado por React
      return data.articles.map((article) => ({
        id: article.id,
        title: article.title,
        authors: article.authors,
        source: article.source,
        year: article.year,
        abstract: article.abstract,
        url: article.url,
      }));
    } catch (error) {
      console.error('[Search] Error:', error);
      throw error;
    }
  },

  // Meta-análisis real usando servidor Python
  async runMetaAnalysis(extractionData) {
    try {
      // URL del servidor de búsqueda
      const SEARCH_SERVER_URL = import.meta.env.VITE_SEARCH_SERVER_URL || 'http://localhost:8000';
      
      console.log(`[Meta-Analysis] Conectando a: ${SEARCH_SERVER_URL}/api/v1/meta-analysis`);
      console.log(`[Meta-Analysis] Enviando ${extractionData.length} estudios`);
      
      // Convertir extractionData al formato esperado por el servidor
      const formattedData = extractionData.map((row) => ({
        id: row.id,
        studyName: row.studyName || `Study ${row.id}`,
        n: parseInt(row.n) || 0,
        mean: parseFloat(row.mean) || 0,
        sd: parseFloat(row.sd) || 0,
      }));
      
      const response = await fetch(`${SEARCH_SERVER_URL}/api/v1/meta-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extractionData: formattedData,
          analysisType: 'fixed',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error en meta-análisis: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error en meta-análisis');
      }
      
      console.log(`[Meta-Analysis] ✓ Análisis completado`);
      console.log(`[Meta-Analysis] I² = ${data.metrics.i_squared.toFixed(2)}%`);
      console.log(`[Meta-Analysis] Q = ${data.metrics.q_statistic.toFixed(4)}`);
      console.log(`[Meta-Analysis] p-value = ${data.metrics.p_value.toFixed(4)}`);
      
      // Mapear respuesta del servidor al formato esperado por React
      return {
        metrics: {
          i2: `${data.metrics.i_squared.toFixed(1)}%`,
          q: data.metrics.q_statistic,
          p_value: data.metrics.p_value < 0.001 ? '< 0.001' : `${data.metrics.p_value.toFixed(4)}`,
          heterogeneity: data.metrics.heterogeneity,
        },
        forestPlotUrl: data.forestPlotUrl,
        funnelPlotUrl: data.funnelPlotUrl,
      };
    } catch (error) {
      console.error('[Meta-Analysis] Error:', error);
      throw error;
    }
  },

  // Carga datos de extracción desde Supabase (Módulo 6)
  loadExtractionData: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('meta_analysis_data')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) {
        console.error('Error cargando datos de extracción:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('Error en loadExtractionData:', err);
      return [];
    }
  },

  // Guarda datos de extracción en Supabase (Módulo 6)
  saveExtractionData: async (projectId, articleId, articleTitle, extractionData) => {
    try {
      // Convertir articleId a string para que coincida con article_id TEXT en Supabase
      const articleIdStr = String(articleId);
      
      console.log(`[Meta-Analysis] Guardando datos para artículo ID: ${articleIdStr}, Título: ${articleTitle}`);
      console.log(`[Meta-Analysis] Datos:`, extractionData);
      
      // Verificar si ya existe un registro para este artículo
      const { data: existing, error: selectError } = await supabase
        .from('meta_analysis_data')
        .select('id')
        .eq('article_id', articleIdStr)
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') {
        // Error diferente a "no rows found"
        console.error('Error verificando existencia:', selectError);
      }
      
      if (existing) {
        // Actualizar registro existente
        const { error } = await supabase
          .from('meta_analysis_data')
          .update({
            article_title: articleTitle,
            n_intervention: extractionData.n_intervention || null,
            mean_intervention: extractionData.mean_intervention || null,
            sd_intervention: extractionData.sd_intervention || null,
            n_control: extractionData.n_control || null,
            mean_control: extractionData.mean_control || null,
            sd_control: extractionData.sd_control || null,
          })
          .eq('article_id', articleIdStr);
        
        if (error) {
          console.error('Error actualizando datos de extracción:', error);
          return false;
        }
        console.log(`[Meta-Analysis] ✓ Datos actualizados para artículo: ${articleIdStr}`);
      } else {
        // Insertar nuevo registro
        console.log(`[Meta-Analysis] Insertando nuevo registro para artículo: ${articleIdStr}`);
        console.log(`[Meta-Analysis] Payload a insertar:`, {
          project_id: projectId,
          article_id: articleIdStr,
          article_title: articleTitle,
          n_intervention: extractionData.n_intervention || null,
          mean_intervention: extractionData.mean_intervention || null,
          sd_intervention: extractionData.sd_intervention || null,
          n_control: extractionData.n_control || null,
          mean_control: extractionData.mean_control || null,
          sd_control: extractionData.sd_control || null,
        });
        
        const { data: insertedData, error } = await supabase
          .from('meta_analysis_data')
          .insert({
            project_id: projectId,
            article_id: articleIdStr,
            article_title: articleTitle,
            n_intervention: extractionData.n_intervention || null,
            mean_intervention: extractionData.mean_intervention || null,
            sd_intervention: extractionData.sd_intervention || null,
            n_control: extractionData.n_control || null,
            mean_control: extractionData.mean_control || null,
            sd_control: extractionData.sd_control || null,
          })
          .select();
        
        if (error) {
          console.error('[Meta-Analysis] ❌ Error guardando datos de extracción:', error);
          console.error('[Meta-Analysis] Código de error:', error.code);
          console.error('[Meta-Analysis] Mensaje:', error.message);
          console.error('[Meta-Analysis] Detalles:', error.details);
          console.error('[Meta-Analysis] Hint:', error.hint);
          return false;
        }
        console.log(`[Meta-Analysis] ✓ Datos guardados para artículo: ${articleIdStr}`);
        console.log(`[Meta-Analysis] Datos insertados:`, insertedData);
      }
      
      return true;
    } catch (err) {
      console.error('Error en saveExtractionData:', err);
      return false;
    }
  },

  // Ejecuta meta-análisis usando el nuevo endpoint (Módulo 6)
  async runMetaAnalysisFromSupabase(projectId, extractionData = []) {
    try {
      const SEARCH_SERVER_URL = import.meta.env.VITE_SEARCH_SERVER_URL || 'http://localhost:8000';
      
      console.log(`[Meta-Analysis] Conectando a: ${SEARCH_SERVER_URL}/api/v1/run-meta-analysis`);
      console.log(`[Meta-Analysis] Proyecto ID: ${projectId}`);
      console.log(`[Meta-Analysis] Estudios a analizar: ${extractionData.length}`);
      
      const response = await fetch(`${SEARCH_SERVER_URL}/api/v1/run-meta-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId, extractionData }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error en meta-análisis: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error en meta-análisis');
      }
      
      console.log(`[Meta-Analysis] ✓ Análisis completado`);
      console.log(`[Meta-Analysis] I² = ${data.metrics.i2}%`);
      console.log(`[Meta-Analysis] Q = ${data.metrics.q}`);
      console.log(`[Meta-Analysis] p-value = ${data.metrics.pValue}`);
      
      return {
        metrics: {
          i2: `${data.metrics.i2}%`,
          q: data.metrics.q,
          pValue: data.metrics.pValue,
          heterogeneity: data.metrics.heterogeneity,
        },
        forestPlotUrl: data.forestPlotUrl,
        funnelPlotUrl: data.funnelPlotUrl,
      };
    } catch (error) {
      console.error('[Meta-Analysis] Error:', error);
      throw error;
    }
  },

  // Análisis de red bibliométrica (Módulo 7)
  async runNetworkAnalysis(projectId) {
    try {
      const SEARCH_SERVER_URL = import.meta.env.VITE_SEARCH_SERVER_URL || 'http://localhost:8000';
      
      console.log(`[Network] Conectando a: ${SEARCH_SERVER_URL}/api/v1/network-analysis`);
      console.log(`[Network] Proyecto ID: ${projectId}`);
      
      const response = await fetch(`${SEARCH_SERVER_URL}/api/v1/network-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error en análisis de red: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error en análisis de red');
      }
      
      console.log(`[Network] ✓ Análisis completado`);
      console.log(`[Network] Elementos totales: ${data.elements.length}`);
      
      return data.elements.map((elem) => ({ data: elem.data }));
    } catch (error) {
      console.error('[Network] Error:', error);
      throw error;
    }
  },

  async mockGraphAPI() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const elements = [
      { data: { id: 'a1', label: 'Estudio A', type: 'article' } },
      { data: { id: 'a2', label: 'Estudio B', type: 'article' } },
      { data: { id: 'a3', label: 'Estudio C', type: 'article' } },
      { data: { id: 'a4', label: 'Estudio D', type: 'article' } },
      { data: { id: 'a5', label: 'Estudio E', type: 'article' } },
      { data: { id: 'a6', label: 'Estudio F', type: 'article' } },
      { data: { id: 'a7', label: 'Estudio G', type: 'article' } },
      { data: { id: 'a8', label: 'Estudio H', type: 'article' } },
      { data: { id: 'a9', label: 'Estudio I', type: 'article' } },
      { data: { id: 'a10', label: 'Estudio J', type: 'article' } },
      { data: { id: 'au1', label: 'Autor Smith', type: 'author' } },
      { data: { id: 'au2', label: 'Autor Johnson', type: 'author' } },
      { data: { id: 'au3', label: 'Autor Williams', type: 'author' } },
      { data: { id: 'au4', label: 'Autor Brown', type: 'author' } },
      { data: { id: 'au5', label: 'Autor Jones', type: 'author' } },
      { data: { id: 'au6', label: 'Autor Garcia', type: 'author' } },
      { data: { id: 'au7', label: 'Autor Miller', type: 'author' } },
      { data: { id: 'au8', label: 'Autor Davis', type: 'author' } },
      { data: { id: 'au9', label: 'Autor Rodriguez', type: 'author' } },
      { data: { id: 'au10', label: 'Autor Martinez', type: 'author' } },
      { data: { source: 'a1', target: 'au1' } },
      { data: { source: 'a1', target: 'au2' } },
      { data: { source: 'a1', target: 'au3' } },
      { data: { source: 'a2', target: 'au1' } },
      { data: { source: 'a2', target: 'au4' } },
      { data: { source: 'a2', target: 'au5' } },
      { data: { source: 'a3', target: 'au2' } },
      { data: { source: 'a3', target: 'au6' } },
      { data: { source: 'a3', target: 'au7' } },
      { data: { source: 'a4', target: 'au3' } },
      { data: { source: 'a4', target: 'au8' } },
      { data: { source: 'a4', target: 'au9' } },
      { data: { source: 'a5', target: 'au4' } },
      { data: { source: 'a5', target: 'au10' } },
      { data: { source: 'a5', target: 'au1' } },
      { data: { source: 'a6', target: 'au5' } },
      { data: { source: 'a6', target: 'au6' } },
      { data: { source: 'a6', target: 'au2' } },
      { data: { source: 'a7', target: 'au7' } },
      { data: { source: 'a7', target: 'au8' } },
      { data: { source: 'a7', target: 'au3' } },
      { data: { source: 'a8', target: 'au9' } },
      { data: { source: 'a8', target: 'au10' } },
      { data: { source: 'a8', target: 'au4' } },
      { data: { source: 'a9', target: 'au1' } },
      { data: { source: 'a9', target: 'au5' } },
      { data: { source: 'a9', target: 'au6' } },
      { data: { source: 'a10', target: 'au2' } },
      { data: { source: 'a10', target: 'au7' } },
      { data: { source: 'a10', target: 'au10' } },
      { data: { source: 'au1', target: 'au2' } },
      { data: { source: 'au3', target: 'au4' } },
      { data: { source: 'au5', target: 'au6' } },
    ];
    return elements;
  },
};

// ============================================================================
// COMPONENTES REUTILIZABLES
// ============================================================================

const LoadingSpinner = ({ fullScreen = false }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className={`flex flex-col items-center justify-center ${fullScreen ? 'fixed inset-0 bg-monokai-dark' : 'py-12'}`}
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      className="w-12 h-12 border-4 border-monokai-pink border-t-monokai-green rounded-full"
    />
    <p className="text-monokai-subtle mt-4">Cargando proyecto...</p>
  </motion.div>
);

const ArticleCard = ({ article }) => {
  const [showAbstract, setShowAbstract] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-monokai-sidebar p-6 rounded-lg border border-monokai-subtle border-opacity-30 hover:border-opacity-60 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-monokai-pink mb-2 hover:text-monokai-cyan transition-colors cursor-pointer block"
            >
              {article.title}
            </a>
          ) : (
            <h3 className="text-lg font-semibold text-monokai-pink mb-2">{article.title}</h3>
          )}
          <p className="text-sm text-monokai-subtle mb-2">{article.authors}</p>
        </div>
        <div className="ml-4 flex flex-col gap-2 items-end">
          <span className="px-3 py-1 bg-monokai-dark rounded-full text-xs font-semibold text-monokai-green whitespace-nowrap">
            {article.source}
          </span>
          {article.exclusionReason && (
            <span className="px-3 py-1 bg-monokai-pink rounded-full text-xs font-semibold text-monokai-text whitespace-nowrap">
              {article.exclusionReason}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <span className="text-sm text-monokai-subtle">Año: {article.year}</span>
      </div>

      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAbstract(!showAbstract)}
          className="text-sm text-monokai-blue hover:text-monokai-cyan transition-colors font-semibold"
        >
          {showAbstract ? 'Ocultar Abstracto' : 'Ver Abstracto'}
        </motion.button>
      </div>

      <AnimatePresence>
        {showAbstract && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3 pt-3 border-t border-monokai-subtle border-opacity-30"
          >
            <p className="text-sm text-monokai-text leading-relaxed">{article.abstract}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// COMPONENTES STUB (Placeholders para cada módulo)
// ============================================================================

const LandingPage = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center justify-center h-full"
  >
    <div className="text-center">
      <h1 className="text-5xl font-bold mb-4 text-monokai-pink">
        Bienvenido a MetaPiqma
      </h1>
      <p className="text-xl text-monokai-subtle mb-8">
        Plataforma integrada para revisiones sistemáticas y meta-análisis
      </p>
      <div className="grid grid-cols-2 gap-4 mt-12">
        <div className="p-6 bg-monokai-sidebar rounded-lg border border-monokai-pink border-opacity-30">
          <Zap className="w-8 h-8 text-monokai-yellow mb-2" />
          <p className="text-sm">Rápido y eficiente</p>
        </div>
        <div className="p-6 bg-monokai-sidebar rounded-lg border border-monokai-blue border-opacity-30">
          <Network className="w-8 h-8 text-monokai-blue mb-2" />
          <p className="text-sm">Análisis integrado</p>
        </div>
      </div>
    </div>
  </motion.div>
);

// ============================================================================
// SUB-COMPONENTES PARA MÓDULO PICO
// ============================================================================

const PicoExampleGuide = () => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-monokai-dark p-4 rounded-lg border border-monokai-pink border-opacity-30 mb-6"
  >
    <h3 className="text-lg font-semibold text-monokai-pink mb-3">Ejemplo PICO</h3>
    <div className="space-y-2 text-sm text-monokai-text">
      <p>
        <span className="text-monokai-green font-semibold">P (Población):</span> Pacientes con diabetes tipo 2
      </p>
      <p>
        <span className="text-monokai-yellow font-semibold">I (Intervención):</span> Tratamiento con metformina
      </p>
      <p>
        <span className="text-monokai-blue font-semibold">C (Comparación):</span> Insulina, sulfonilureas o placebo
      </p>
      <p>
        <span className="text-monokai-purple font-semibold">O (Outcome):</span> Reducción de riesgos cardiovasculares
      </p>
    </div>
  </motion.div>
);

const SearchStrategyGuide = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-monokai-dark p-4 rounded-lg border border-monokai-blue border-opacity-30 mb-6"
  >
    <h3 className="text-lg font-semibold text-monokai-blue mb-3">Consejos para Estrategia de Búsqueda</h3>
    <div className="space-y-4 text-sm text-monokai-text">
      <p className="text-monokai-yellow">
        💡 <span className="font-semibold">Tip:</span> Para mejores resultados, traduce los términos a inglés y usa la sintaxis correcta para cada base de datos.
      </p>
      
      <div>
        <p className="text-monokai-green font-semibold mb-2">PubMed (Usa sintaxis MeSH y operadores booleanos):</p>
        <div className="bg-monokai-sidebar p-3 rounded space-y-2">
          <p className="text-monokai-subtle text-xs">
            <span className="text-monokai-green font-semibold">✓ Correcto:</span> (("Type 2 Diabetes Mellitus"[Mesh] OR T2DM OR NIDDM) AND (Metformin[Mesh] OR Metformin OR Glucophage) AND (Cardiovascular[Mesh] OR Heart))
          </p>
          <p className="text-monokai-subtle text-xs">
            <span className="text-monokai-pink font-semibold">✗ Incorrecto:</span> type 2 diabetes (sin operadores booleanos ni campos MeSH)
          </p>
        </div>
      </div>
      
      <div>
        <p className="text-monokai-yellow font-semibold mb-2">Semantic Scholar (Usa palabras clave naturales):</p>
        <div className="bg-monokai-sidebar p-3 rounded space-y-2">
          <p className="text-monokai-subtle text-xs">
            <span className="text-monokai-green font-semibold">✓ Correcto:</span> type 2 diabetes metformin cardiovascular risk treatment
          </p>
          <p className="text-monokai-subtle text-xs">
            <span className="text-monokai-pink font-semibold">✗ Incorrecto:</span> (type 2 diabetes[Mesh] AND metformin[Mesh]) (sintaxis PubMed no funciona aquí)
          </p>
        </div>
      </div>
      
      <div>
        <p className="text-monokai-blue font-semibold mb-2">ArXiv (Usa palabras clave simples):</p>
        <div className="bg-monokai-sidebar p-3 rounded space-y-2">
          <p className="text-monokai-subtle text-xs">
            <span className="text-monokai-green font-semibold">✓ Correcto:</span> machine learning deep learning neural networks
          </p>
          <p className="text-monokai-subtle text-xs">
            <span className="text-monokai-pink font-semibold">✗ Incorrecto:</span> (machine learning[Mesh] OR deep learning[Mesh]) (ArXiv no usa MeSH)
          </p>
        </div>
      </div>
      
      <div>
        <p className="text-monokai-purple font-semibold mb-2">Crossref (Usa palabras clave naturales):</p>
        <div className="bg-monokai-sidebar p-3 rounded space-y-2">
          <p className="text-monokai-subtle text-xs">
            <span className="text-monokai-green font-semibold">✓ Correcto:</span> diabetes treatment cardiovascular outcomes clinical trial
          </p>
          <p className="text-monokai-subtle text-xs">
            <span className="text-monokai-pink font-semibold">✗ Incorrecto:</span> (diabetes[Mesh] AND treatment[Mesh]) (Crossref no usa MeSH)
          </p>
        </div>
      </div>
    </div>
  </motion.div>
);

const PicoFormCard = ({ label, field, icon: Icon, color, placeholder }) => {
  const { state, dispatch } = useProject();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-monokai-sidebar p-6 rounded-lg border border-monokai-pink border-opacity-20 hover:border-opacity-40 transition-all"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <label className="text-lg font-semibold text-monokai-text">{label}</label>
      </div>
      <textarea
        value={state.pico[field]}
        onChange={(e) =>
          dispatch({
            type: 'UPDATE_PICO_FIELD',
            payload: { field, value: e.target.value },
          })
        }
        placeholder={placeholder}
        className="w-full h-32 bg-monokai-dark text-monokai-text placeholder-monokai-subtle rounded-lg p-3 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-pink focus:ring-opacity-30 resize-none transition-all"
      />
    </motion.div>
  );
};

const StrategyField = ({ label, db, placeholder, color }) => {
  const { state, dispatch } = useProject();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <label className={`block text-sm font-semibold mb-2 ${color}`}>{label}</label>
      <textarea
        value={state.searchStrategies[db]}
        onChange={(e) =>
          dispatch({
            type: 'UPDATE_STRATEGY_FIELD',
            payload: { db, value: e.target.value },
          })
        }
        placeholder={placeholder}
        className="w-full h-24 bg-monokai-dark text-monokai-text placeholder-monokai-subtle rounded-lg p-3 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-pink focus:ring-opacity-30 resize-none transition-all"
      />
    </motion.div>
  );
};

const ModulePICO = () => {
  const { state, dispatch } = useProject();
  const [showGuide, setShowGuide] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Título con botón de información */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-4xl font-bold text-monokai-green">Módulo 1: Definición PICO</h1>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowGuide(!showGuide)}
          className="p-2 rounded-lg bg-monokai-sidebar hover:bg-monokai-dark transition-colors"
        >
          <Info className="w-6 h-6 text-monokai-blue" />
        </motion.button>
      </div>

      {/* Guía de ejemplo PICO */}
      <AnimatePresence>
        {showGuide && <PicoExampleGuide />}
      </AnimatePresence>

      {/* Grid de formulario PICO */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <PicoFormCard
          label="Población (P)"
          field="population"
          icon={ClipboardList}
          color="text-monokai-green"
          placeholder="Ej: Pacientes con diabetes tipo 2, mayores de 18 años..."
        />
        <PicoFormCard
          label="Intervención (I)"
          field="intervention"
          icon={Zap}
          color="text-monokai-yellow"
          placeholder="Ej: Tratamiento con metformina, dosis 500-2000 mg/día..."
        />
        <PicoFormCard
          label="Comparación (C)"
          field="comparison"
          icon={Filter}
          color="text-monokai-blue"
          placeholder="Ej: Insulina, sulfonilureas, placebo o sin tratamiento..."
        />
        <PicoFormCard
          label="Outcome/Resultado (O)"
          field="outcome"
          icon={BarChart3}
          color="text-monokai-purple"
          placeholder="Ej: Reducción de HbA1c, riesgos cardiovasculares, mortalidad..."
        />
      </div>

      {/* Sección de Estrategia de Búsqueda */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold text-monokai-green mb-4">Estrategia de Búsqueda</h2>

        {/* Guía de estrategia */}
        <SearchStrategyGuide />

        {/* Botón IA (disabled) */}
        <div className="mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled
            className="flex items-center gap-2 px-6 py-3 bg-monokai-sidebar text-monokai-subtle rounded-lg opacity-50 cursor-not-allowed transition-all"
          >
            <Wand2 className="w-5 h-5" />
            Generar con IA (Próximamente)
          </motion.button>
        </div>

        {/* 3 campos de estrategia */}
        <div className="space-y-6">
          <StrategyField
            label="Estrategia PubMed (Sintaxis Mesh)"
            db="pubmed"
            placeholder='Ej: (("Type 2 Diabetes Mellitus"[Mesh]) AND (Metformin[Mesh]))'
            color="text-monokai-green"
          />
          <StrategyField
            label="Estrategia Semantic Scholar"
            db="semanticScholar"
            placeholder="Ej: (Type 2 Diabetes Mellitus OR T2DM) AND (Metformin) AND (Cardiovascular Risk)"
            color="text-monokai-yellow"
          />
          <StrategyField
            label="Estrategia ArXiv (Términos clave)"
            db="arxiv"
            placeholder="Ej: Type 2 diabetes treatment with metformin cardiovascular outcomes"
            color="text-monokai-blue"
          />
          <StrategyField
            label="Estrategia Crossref (Términos clave)"
            db="crossref"
            placeholder="Ej: Type 2 diabetes treatment with metformin cardiovascular outcomes"
            color="text-monokai-purple"
          />
        </div>
      </div>
    </motion.div>
  );
};

// Componente para dropdown de límites de búsqueda
const SearchLimitDropdown = ({ label, value, onChange, color }) => {
  const options = [
    { label: 'Ninguno', value: 0 },
    { label: '10 resultados', value: 10 },
    { label: '50 resultados', value: 50 },
    { label: '100 resultados', value: 100 },
    { label: '150 resultados', value: 150 },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className={`text-xs font-semibold ${color}`}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="bg-monokai-dark text-monokai-text rounded-lg p-2 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-opacity-30 transition-all cursor-pointer"
        style={{
          focusRingColor: color.replace('text-', ''),
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const ModuleSearch = () => {
  const { state, dispatch } = useProject();
  const [activeTab, setActiveTab] = useState('pico');
  const [quickSearchTerm, setQuickSearchTerm] = useState('');
  const [searchLimits, setSearchLimits] = useState({
    max_pubmed: 5,
    max_semantic: 5,
    max_arxiv: 5,
    max_crossref: 5,
  });

  const handleSearchPICO = async () => {
    // Validar que al menos una estrategia tenga contenido
    const hasStrategy = state.searchStrategies.pubmed || 
                       state.searchStrategies.semanticScholar || 
                       state.searchStrategies.arxiv || 
                       state.searchStrategies.crossref;
    
    if (!hasStrategy) {
      alert('Por favor ingresa al menos una estrategia de búsqueda');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Enviar estrategias y bases de datos seleccionadas
      const searchData = {
        pubmed: state.searchStrategies.pubmed || '',
        semanticScholar: state.searchStrategies.semanticScholar || '',
        arxiv: state.searchStrategies.arxiv || '',
        crossref: state.searchStrategies.crossref || '',
        use_pubmed: state.selectedDatabases.pubmed,
        use_semantic: state.selectedDatabases.semanticScholar,
        use_arxiv: state.selectedDatabases.arxiv,
        use_crossref: state.selectedDatabases.crossref,
      };
      const results = await apiClient.runRealSearch(searchData);
      // Guardar artículos en Supabase
      if (state.currentProjectId && results.length > 0) {
        await apiClient.saveArticles(state.currentProjectId, results);
      }
      dispatch({ type: 'LOAD_PROJECT_ARTICLES', payload: results });
    } catch (error) {
      console.error('Error en búsqueda:', error);
      alert('Error en búsqueda: ' + error.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleQuickSearch = async () => {
    // Validar que haya término de búsqueda
    if (!quickSearchTerm.trim()) {
      alert('Por favor ingresa un término de búsqueda');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Búsqueda rápida en todas las bases de datos seleccionadas
      const searchData = {
        pubmed: quickSearchTerm,
        semanticScholar: quickSearchTerm,
        arxiv: quickSearchTerm,
        crossref: quickSearchTerm,
        use_pubmed: state.selectedDatabases.pubmed,
        use_semantic: state.selectedDatabases.semanticScholar,
        use_arxiv: state.selectedDatabases.arxiv,
        use_crossref: state.selectedDatabases.crossref,
      };
      const results = await apiClient.runRealSearch(searchData);
      // Guardar artículos en Supabase
      if (state.currentProjectId && results.length > 0) {
        await apiClient.saveArticles(state.currentProjectId, results);
      }
      dispatch({ type: 'LOAD_PROJECT_ARTICLES', payload: results });
    } catch (error) {
      console.error('Error en búsqueda rápida:', error);
      alert('Error en búsqueda: ' + error.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-4xl font-bold text-monokai-yellow mb-6">Módulo 2: Búsqueda Bibliográfica</h1>

      {/* Pestañas */}
      <div className="flex gap-4 mb-6 border-b border-monokai-subtle border-opacity-30">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('pico')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'pico'
              ? 'text-monokai-green border-b-2 border-monokai-green'
              : 'text-monokai-subtle hover:text-monokai-text'
          }`}
        >
          Búsqueda PICO
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('quick')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'quick'
              ? 'text-monokai-green border-b-2 border-monokai-green'
              : 'text-monokai-subtle hover:text-monokai-text'
          }`}
        >
          Búsqueda Rápida
        </motion.button>
      </div>

      {/* Contenido de Pestaña 1: Búsqueda PICO */}
      <AnimatePresence mode="wait">
        {activeTab === 'pico' && (
          <motion.div
            key="pico-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 mb-8"
          >
            {/* Botones de Selección de Bases de Datos */}
            <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
              <p className="text-sm font-semibold text-monokai-pink mb-3">Selecciona las bases de datos a buscar:</p>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dispatch({ type: 'TOGGLE_DATABASE', payload: 'pubmed' })}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    state.selectedDatabases.pubmed
                      ? 'bg-monokai-green text-monokai-dark'
                      : 'bg-monokai-dark text-monokai-green border border-monokai-green'
                  }`}
                >
                  {state.selectedDatabases.pubmed ? '✓' : '○'} PubMed
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dispatch({ type: 'TOGGLE_DATABASE', payload: 'semanticScholar' })}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    state.selectedDatabases.semanticScholar
                      ? 'bg-monokai-yellow text-monokai-dark'
                      : 'bg-monokai-dark text-monokai-yellow border border-monokai-yellow'
                  }`}
                >
                  {state.selectedDatabases.semanticScholar ? '✓' : '○'} Semantic Scholar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dispatch({ type: 'TOGGLE_DATABASE', payload: 'arxiv' })}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    state.selectedDatabases.arxiv
                      ? 'bg-monokai-blue text-monokai-dark'
                      : 'bg-monokai-dark text-monokai-blue border border-monokai-blue'
                  }`}
                >
                  {state.selectedDatabases.arxiv ? '✓' : '○'} ArXiv
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dispatch({ type: 'TOGGLE_DATABASE', payload: 'crossref' })}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    state.selectedDatabases.crossref
                      ? 'bg-monokai-purple text-monokai-dark'
                      : 'bg-monokai-dark text-monokai-purple border border-monokai-purple'
                  }`}
                >
                  {state.selectedDatabases.crossref ? '✓' : '○'} Crossref
                </motion.button>
              </div>
            </div>

            <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30 space-y-3">
              <div>
                <label className="text-sm font-semibold text-monokai-green mb-2 block">
                  Estrategia PubMed
                </label>
                <textarea
                  value={state.searchStrategies.pubmed}
                  disabled
                  className="w-full h-16 bg-monokai-dark text-monokai-subtle rounded-lg p-3 border border-monokai-subtle border-opacity-30 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-monokai-yellow mb-2 block">
                  Estrategia Semantic Scholar
                </label>
                <textarea
                  value={state.searchStrategies.semanticScholar}
                  disabled
                  className="w-full h-16 bg-monokai-dark text-monokai-subtle rounded-lg p-3 border border-monokai-subtle border-opacity-30 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-monokai-blue mb-2 block">
                  Estrategia ArXiv
                </label>
                <textarea
                  value={state.searchStrategies.arxiv}
                  disabled
                  className="w-full h-16 bg-monokai-dark text-monokai-subtle rounded-lg p-3 border border-monokai-subtle border-opacity-30 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-monokai-purple mb-2 block">
                  Estrategia Crossref
                </label>
                <textarea
                  value={state.searchStrategies.crossref}
                  disabled
                  className="w-full h-16 bg-monokai-dark text-monokai-subtle rounded-lg p-3 border border-monokai-subtle border-opacity-30 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  if (confirm('¿Estás seguro de que deseas limpiar la tabla de artículos? Esto eliminará todos los artículos de Supabase.')) {
                    try {
                      if (state.currentProjectId) {
                        const success = await apiClient.deleteAllArticles(state.currentProjectId);
                        if (success) {
                          dispatch({ type: 'LOAD_PROJECT_ARTICLES', payload: [] });
                          alert('Tabla limpiada correctamente');
                        } else {
                          alert('Error al limpiar la tabla');
                        }
                      }
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Error al limpiar la tabla: ' + error.message);
                    }
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-monokai-red text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                <Trash2 className="w-5 h-5" />
                Limpiar Tabla
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSearchPICO}
                disabled={state.isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-monokai-green text-monokai-dark font-semibold rounded-lg hover:shadow-monokai-green transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-5 h-5" />
                {state.isLoading ? 'Buscando...' : 'Buscar usando Estrategias PICO'}
              </motion.button>
            </div>

            {/* Filtros de Datos en Búsqueda PICO */}
            <div className="mt-6 bg-monokai-sidebar p-6 rounded-lg border border-monokai-subtle border-opacity-30">
              <h3 className="text-lg font-bold text-monokai-yellow mb-4">Filtros de Datos Incompletos</h3>
              <p className="text-monokai-subtle mb-6">Elimina artículos que no tengan ciertos datos:</p>
              
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const articlesWithoutTitle = state.projectArticles.filter((a) => (!a.title || a.title.trim() === '') && !a.status.startsWith('removed_'));
                    console.log('[DEBUG] Artículos sin título encontrados:', articlesWithoutTitle.length);
                    console.log('[DEBUG] Primeros 3 artículos sin título:', articlesWithoutTitle.slice(0, 3));
                    console.log('[DEBUG] Todos los artículos actuales:', state.projectArticles.map(a => ({ title: a.title ? a.title.substring(0, 30) : 'SIN TÍTULO', status: a.status })));
                    dispatch({
                      type: 'REMOVE_ARTICLES',
                      payload: { ids: articlesWithoutTitle.map((a) => a.uniqueId), reason: 'removed_without_title' },
                    });
                    alert(`${articlesWithoutTitle.length} artículos sin título eliminados`);
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  <X className="w-5 h-5" />
                  Eliminar sin Título
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const articlesWithoutAuthors = state.projectArticles.filter((a) => (!a.authors || a.authors.length === 0) && !a.status.startsWith('removed_'));
                    dispatch({
                      type: 'REMOVE_ARTICLES',
                      payload: { ids: articlesWithoutAuthors.map((a) => a.uniqueId), reason: 'removed_without_authors' },
                    });
                    alert(`${articlesWithoutAuthors.length} artículos sin autores eliminados`);
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  <X className="w-5 h-5" />
                  Eliminar sin Autores
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const articlesWithoutYear = state.projectArticles.filter((a) => !a.year && !a.status.startsWith('removed_'));
                    dispatch({
                      type: 'REMOVE_ARTICLES',
                      payload: { ids: articlesWithoutYear.map((a) => a.uniqueId), reason: 'removed_without_year' },
                    });
                    alert(`${articlesWithoutYear.length} artículos sin año eliminados`);
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  <X className="w-5 h-5" />
                  Eliminar sin Año
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const articlesWithoutURL = state.projectArticles.filter((a) => (!a.url || a.url.trim() === '') && !a.status.startsWith('removed_'));
                    dispatch({
                      type: 'REMOVE_ARTICLES',
                      payload: { ids: articlesWithoutURL.map((a) => a.uniqueId), reason: 'removed_without_url' },
                    });
                    alert(`${articlesWithoutURL.length} artículos sin URL eliminados`);
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  <X className="w-5 h-5" />
                  Eliminar sin URL
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const articlesWithoutAbstract = state.projectArticles.filter((a) => !a.abstract || a.abstract.trim() === '');
                    dispatch({
                      type: 'REMOVE_ARTICLES',
                      payload: { ids: articlesWithoutAbstract.map((a) => a.uniqueId), reason: 'removed_without_abstract' },
                    });
                    alert(`${articlesWithoutAbstract.length} artículos sin abstract eliminados`);
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  <X className="w-5 h-5" />
                  Eliminar sin Abstract
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Contenido de Pestaña 2: Búsqueda Rápida */}
        {activeTab === 'quick' && (
          <motion.div
            key="quick-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 mb-8"
          >
            {/* Botones de Selección de Bases de Datos */}
            <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
              <p className="text-sm font-semibold text-monokai-pink mb-3">Selecciona las bases de datos a buscar:</p>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dispatch({ type: 'TOGGLE_DATABASE', payload: 'pubmed' })}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    state.selectedDatabases.pubmed
                      ? 'bg-monokai-green text-monokai-dark'
                      : 'bg-monokai-dark text-monokai-green border border-monokai-green'
                  }`}
                >
                  {state.selectedDatabases.pubmed ? '✓' : '○'} PubMed
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dispatch({ type: 'TOGGLE_DATABASE', payload: 'semanticScholar' })}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    state.selectedDatabases.semanticScholar
                      ? 'bg-monokai-yellow text-monokai-dark'
                      : 'bg-monokai-dark text-monokai-yellow border border-monokai-yellow'
                  }`}
                >
                  {state.selectedDatabases.semanticScholar ? '✓' : '○'} Semantic Scholar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dispatch({ type: 'TOGGLE_DATABASE', payload: 'arxiv' })}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    state.selectedDatabases.arxiv
                      ? 'bg-monokai-blue text-monokai-dark'
                      : 'bg-monokai-dark text-monokai-blue border border-monokai-blue'
                  }`}
                >
                  {state.selectedDatabases.arxiv ? '✓' : '○'} ArXiv
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dispatch({ type: 'TOGGLE_DATABASE', payload: 'crossref' })}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    state.selectedDatabases.crossref
                      ? 'bg-monokai-purple text-monokai-dark'
                      : 'bg-monokai-dark text-monokai-purple border border-monokai-purple'
                  }`}
                >
                  {state.selectedDatabases.crossref ? '✓' : '○'} Crossref
                </motion.button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={quickSearchTerm}
                  onChange={(e) => setQuickSearchTerm(e.target.value)}
                  placeholder="Ej: diabetes metformina cardiovascular..."
                  className="flex-1 bg-monokai-dark text-monokai-text placeholder-monokai-subtle rounded-lg p-3 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-green focus:ring-opacity-30 transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleQuickSearch}
                  disabled={state.isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-monokai-green text-monokai-dark font-semibold rounded-lg hover:shadow-monokai-green transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="w-5 h-5" />
                  {state.isLoading ? 'Buscando...' : 'Buscar'}
                </motion.button>
              </div>

              {/* Filtros de Datos en Búsqueda Rápida */}
              <div className="mt-6 bg-monokai-sidebar p-6 rounded-lg border border-monokai-subtle border-opacity-30">
                <h3 className="text-lg font-bold text-monokai-yellow mb-4">Filtros de Datos Incompletos</h3>
                <p className="text-monokai-subtle mb-6">Elimina artículos que no tengan ciertos datos:</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const articlesWithoutTitle = state.projectArticles.filter((a) => (!a.title || a.title.trim() === '') && !a.status.startsWith('removed_'));
                      dispatch({
                        type: 'REMOVE_ARTICLES',
                        payload: { ids: articlesWithoutTitle.map((a) => a.uniqueId), reason: 'removed_without_title' },
                      });
                      alert(`${articlesWithoutTitle.length} artículos sin título eliminados`);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                    Eliminar sin Título
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const articlesWithoutAuthors = state.projectArticles.filter((a) => (!a.authors || a.authors.length === 0) && !a.status.startsWith('removed_'));
                      dispatch({
                        type: 'REMOVE_ARTICLES',
                        payload: { ids: articlesWithoutAuthors.map((a) => a.uniqueId), reason: 'removed_without_authors' },
                      });
                      alert(`${articlesWithoutAuthors.length} artículos sin autores eliminados`);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                    Eliminar sin Autores
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const articlesWithoutYear = state.projectArticles.filter((a) => !a.year && !a.status.startsWith('removed_'));
                      dispatch({
                        type: 'REMOVE_ARTICLES',
                        payload: { ids: articlesWithoutYear.map((a) => a.uniqueId), reason: 'removed_without_year' },
                      });
                      alert(`${articlesWithoutYear.length} artículos sin año eliminados`);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                    Eliminar sin Año
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const articlesWithoutURL = state.projectArticles.filter((a) => (!a.url || a.url.trim() === '') && !a.status.startsWith('removed_'));
                      dispatch({
                        type: 'REMOVE_ARTICLES',
                        payload: { ids: articlesWithoutURL.map((a) => a.uniqueId), reason: 'removed_without_url' },
                      });
                      alert(`${articlesWithoutURL.length} artículos sin URL eliminados`);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                    Eliminar sin URL
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const articlesWithoutAbstract = state.projectArticles.filter((a) => (!a.abstract || a.abstract.trim() === '') && !a.status.startsWith('removed_'));
                      dispatch({
                        type: 'REMOVE_ARTICLES',
                        payload: { ids: articlesWithoutAbstract.map((a) => a.uniqueId), reason: 'removed_without_abstract' },
                      });
                      alert(`${articlesWithoutAbstract.length} artículos sin abstract eliminados`);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                    Eliminar sin Abstract
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sección de Resultados */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-monokai-pink mb-6">Resultados</h2>

        {state.isLoading ? (
          <LoadingSpinner />
        ) : state.projectArticles.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
              <p className="text-sm font-semibold text-monokai-pink mb-3">Resultados por base de datos:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-monokai-dark p-3 rounded-lg">
                  <p className="text-xs text-monokai-subtle">PubMed</p>
                  <p className="text-lg font-bold text-monokai-green">
                    {state.projectArticles.filter((a) => a.source === 'PubMed' && a.status !== 'excluded_title').length}
                  </p>
                </div>
                <div className="bg-monokai-dark p-3 rounded-lg">
                  <p className="text-xs text-monokai-subtle">Semantic Scholar</p>
                  <p className="text-lg font-bold text-monokai-yellow">
                    {state.projectArticles.filter((a) => a.source === 'Semantic Scholar' && a.status !== 'excluded_title').length}
                  </p>
                </div>
                <div className="bg-monokai-dark p-3 rounded-lg">
                  <p className="text-xs text-monokai-subtle">ArXiv</p>
                  <p className="text-lg font-bold text-monokai-blue">
                    {state.projectArticles.filter((a) => a.source === 'ArXiv' && a.status !== 'excluded_title').length}
                  </p>
                </div>
                <div className="bg-monokai-dark p-3 rounded-lg">
                  <p className="text-xs text-monokai-subtle">Crossref</p>
                  <p className="text-lg font-bold text-monokai-purple">
                    {state.projectArticles.filter((a) => a.source === 'Crossref' && a.status !== 'excluded_title').length}
                  </p>
                </div>
              </div>
              <p className="text-sm text-monokai-subtle mt-3 pt-3 border-t border-monokai-subtle border-opacity-30">
                Total: {state.projectArticles.filter((a) => a.status !== 'excluded_title').length} artículos
              </p>
            </div>
            <AnimatePresence>
              {state.projectArticles.map((article) => (
                <ArticleCard key={article.uniqueId} article={article} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-monokai-subtle">
              Realiza una búsqueda para ver los resultados aquí
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ModuleScreening = () => {
  const { state, dispatch } = useProject();
  const [activeTab, setActiveTab] = useState('duplicates');

  // Calcular estadísticas
  const totalArticles = state.projectArticles.length;
  const duplicates = state.projectArticles.filter((a) => a.status === 'duplicate');
  const screened = state.projectArticles.filter(
    (a) => a.status === 'included_title' || a.status === 'excluded_title'
  );
  const unscreened = state.projectArticles.filter((a) => a.status === 'unscreened');
  const nextArticle = unscreened.length > 0 ? unscreened[0] : null;

  const handleInclude = () => {
    if (nextArticle) {
      dispatch({
        type: 'UPDATE_ARTICLE_STATUS',
        payload: { articleId: nextArticle.uniqueId, newStatus: 'included_title' },
      });
    }
  };

  const handleExclude = () => {
    if (nextArticle) {
      dispatch({
        type: 'UPDATE_ARTICLE_STATUS',
        payload: { articleId: nextArticle.uniqueId, newStatus: 'excluded_title' },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-4xl font-bold text-monokai-blue mb-6">Módulo 3: Cribado de Estudios</h1>

      {/* Pestañas */}
      <div className="flex gap-4 mb-6 border-b border-monokai-subtle border-opacity-30">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('duplicates')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'duplicates'
              ? 'text-monokai-yellow border-b-2 border-monokai-yellow'
              : 'text-monokai-subtle hover:text-monokai-text'
          }`}
        >
          Detección de Duplicados
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('screening')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'screening'
              ? 'text-monokai-yellow border-b-2 border-monokai-yellow'
              : 'text-monokai-subtle hover:text-monokai-text'
          }`}
        >
          Cribado Título/Resumen
        </motion.button>
      </div>

      {/* Pestaña 1: Detección de Duplicados */}
      <AnimatePresence mode="wait">
        {activeTab === 'duplicates' && (
          <motion.div
            key="duplicates-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Botón Buscar Duplicados */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch({ type: 'MARK_DUPLICATES' })}
              className="flex items-center gap-2 px-6 py-3 bg-monokai-yellow text-monokai-dark font-semibold rounded-lg hover:shadow-lg transition-all mb-6"
            >
              <Search className="w-5 h-5" />
              Buscar Duplicados
            </motion.button>

            {/* Resumen */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
                <p className="text-sm text-monokai-subtle mb-1">Total de artículos</p>
                <p className="text-3xl font-bold text-monokai-yellow">{totalArticles}</p>
              </div>
              <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
                <p className="text-sm text-monokai-subtle mb-1">Duplicados encontrados</p>
                <p className="text-3xl font-bold text-monokai-pink">{duplicates.length}</p>
              </div>
            </div>

            {/* Lista de Duplicados */}
            {duplicates.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-monokai-subtle mb-4">
                  Artículos marcados como duplicados:
                </p>
                <AnimatePresence>
                  {duplicates.map((article) => (
                    <ArticleCard key={article.uniqueId} article={article} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12 bg-monokai-sidebar rounded-lg border border-monokai-subtle border-opacity-30">
                <p className="text-monokai-subtle">
                  No hay duplicados detectados. Haz clic en "Buscar Duplicados" para iniciar.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Pestaña 2: Cribado Título/Resumen */}
        {activeTab === 'screening' && (
          <motion.div
            key="screening-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
                <p className="text-sm text-monokai-subtle mb-1">Total</p>
                <p className="text-2xl font-bold text-monokai-green">{totalArticles}</p>
              </div>
              <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
                <p className="text-sm text-monokai-subtle mb-1">Cribados</p>
                <p className="text-2xl font-bold text-monokai-yellow">{screened.length}</p>
              </div>
              <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
                <p className="text-sm text-monokai-subtle mb-1">Restantes</p>
                <p className="text-2xl font-bold text-monokai-pink">{unscreened.length}</p>
              </div>
            </div>

            {/* Artículo para Cribado */}
            {nextArticle ? (
              <div className="space-y-6">
                <ArticleCard article={nextArticle} />

                {/* Botones de Acción */}
                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleInclude}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-monokai-green text-monokai-dark font-bold rounded-lg hover:shadow-monokai-green transition-all text-lg"
                  >
                    <CheckCircle className="w-6 h-6" />
                    Incluir
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExclude}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-monokai-pink text-monokai-text font-bold rounded-lg hover:shadow-monokai-pink transition-all text-lg"
                  >
                    <X className="w-6 h-6" />
                    Excluir
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-monokai-sidebar rounded-lg border border-monokai-subtle border-opacity-30">
                <p className="text-2xl font-bold text-monokai-green mb-2">¡Cribado completado!</p>
                <p className="text-monokai-subtle">
                  Se han cribado {screened.length} de {totalArticles} artículos.
                </p>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
};

const ModuleEligibility = () => {
  const { state, dispatch } = useProject();
  const [showOtherReasonModal, setShowOtherReasonModal] = useState(false);
  const [otherReason, setOtherReason] = useState('');

  // Calcular estadísticas
  const forReview = state.projectArticles.filter((a) => a.status === 'included_title');
  const included = state.projectArticles.filter((a) => a.status === 'included_final');
  const excluded = state.projectArticles.filter((a) => a.status === 'excluded_fulltext');
  const nextArticle = forReview.length > 0 ? forReview[0] : null;

  const handleIncludeFinal = async () => {
    if (nextArticle) {
      // Actualizar en estado local
      dispatch({
        type: 'UPDATE_ARTICLE_STATUS',
        payload: { articleId: nextArticle.uniqueId, newStatus: 'included_final' },
      });
      
      // Guardar en Supabase - pasar title como fallback
      await apiClient.updateArticleStatus(nextArticle.id, 'included_final', null, nextArticle.title);
      console.log(`[Eligibility] ✓ Artículo ${nextArticle.title} marcado como included_final en Supabase`);
    }
  };

  const handleExcludeWithReason = async (reason) => {
    if (reason === 'Otro') {
      setShowOtherReasonModal(true);
    } else {
      if (nextArticle) {
        // Actualizar en estado local
        dispatch({
          type: 'UPDATE_ARTICLE_STATUS',
          payload: {
            articleId: nextArticle.uniqueId,
            newStatus: 'excluded_fulltext',
            reason,
          },
        });
        
        // Guardar en Supabase - pasar title como fallback
        await apiClient.updateArticleStatus(nextArticle.id, 'excluded_fulltext', reason, nextArticle.title);
        console.log(`[Eligibility] ✓ Artículo ${nextArticle.title} excluido en Supabase`);
      }
    }
  };

  const handleAcceptOtherReason = async () => {
    if (otherReason.trim() && nextArticle) {
      // Actualizar en estado local
      dispatch({
        type: 'UPDATE_ARTICLE_STATUS',
        payload: {
          articleId: nextArticle.uniqueId,
          newStatus: 'excluded_fulltext',
          reason: otherReason,
        },
      });
      
      // Guardar en Supabase - pasar title como fallback
      await apiClient.updateArticleStatus(nextArticle.id, 'excluded_fulltext', otherReason, nextArticle.title);
      console.log(`[Eligibility] ✓ Artículo ${nextArticle.title} excluido con razón personalizada en Supabase`);
      
      setOtherReason('');
      setShowOtherReasonModal(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-4xl font-bold text-monokai-purple mb-6">Módulo 4: Evaluación de Elegibilidad</h1>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
          <p className="text-sm text-monokai-subtle mb-1">Para revisión</p>
          <p className="text-3xl font-bold text-monokai-blue">{forReview.length}</p>
        </div>
        <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
          <p className="text-sm text-monokai-subtle mb-1">Incluidos</p>
          <p className="text-3xl font-bold text-monokai-green">{included.length}</p>
        </div>
        <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
          <p className="text-sm text-monokai-subtle mb-1">Excluidos</p>
          <p className="text-3xl font-bold text-monokai-pink">{excluded.length}</p>
        </div>
        <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
          <p className="text-sm text-monokai-subtle mb-1">Total</p>
          <p className="text-3xl font-bold text-monokai-yellow">{state.projectArticles.length}</p>
        </div>
      </div>

      {/* Artículo para Revisión */}
      {nextArticle ? (
        <div className="space-y-6">
          <ArticleCard article={nextArticle} />

          {/* Botón Incluir */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleIncludeFinal}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-monokai-green text-monokai-dark font-bold rounded-lg hover:shadow-monokai-green transition-all text-lg mb-6"
          >
            <CheckCircle className="w-6 h-6" />
            Incluir
          </motion.button>

          {/* Sección de Exclusión */}
          <div>
            <h2 className="text-lg font-bold text-monokai-pink mb-4">Excluir por motivo:</h2>
            <div className="grid grid-cols-1 gap-3">
              {state.exclusionReasons.map((reason) => (
                <motion.button
                  key={reason}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleExcludeWithReason(reason)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-monokai-pink transition-all"
                >
                  <X className="w-5 h-5" />
                  {reason}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Modal para "Otro" */}
          <AnimatePresence>
            {showOtherReasonModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setShowOtherReasonModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-monokai-sidebar p-8 rounded-lg border-2 border-monokai-pink max-w-md w-full mx-4"
                >
                  <h3 className="text-xl font-bold text-monokai-pink mb-4">Especifica el motivo de exclusión</h3>
                  <input
                    type="text"
                    placeholder="Escribe el motivo..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAcceptOtherReason()}
                    autoFocus
                    className="w-full px-4 py-3 mb-6 bg-monokai-dark border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-pink"
                  />
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowOtherReasonModal(false)}
                      className="flex-1 px-4 py-2 bg-monokai-subtle text-monokai-text font-semibold rounded-lg hover:bg-monokai-subtle hover:bg-opacity-80 transition-all"
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAcceptOtherReason}
                      disabled={!otherReason.trim()}
                      className="flex-1 px-4 py-2 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-monokai-pink transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aceptar
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-16 bg-monokai-sidebar rounded-lg border border-monokai-subtle border-opacity-30">
          <p className="text-2xl font-bold text-monokai-blue mb-2">¡Revisión de elegibilidad completada!</p>
          <p className="text-monokai-subtle mb-6">
            Se han revisado {included.length + excluded.length} de {state.projectArticles.length} artículos.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="bg-monokai-dark p-4 rounded-lg">
              <p className="text-sm text-monokai-subtle mb-1">Incluidos</p>
              <p className="text-2xl font-bold text-monokai-green">{included.length}</p>
            </div>
            <div className="bg-monokai-dark p-4 rounded-lg">
              <p className="text-sm text-monokai-subtle mb-1">Excluidos</p>
              <p className="text-2xl font-bold text-monokai-pink">{excluded.length}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const ModulePRISMA = () => {
  const { state } = useProject();
  const [showInputs, setShowInputs] = useState(false);
  const [prismaData, setPrismaData] = useState({
    // Estudios previos
    previous_studies: 0,
    previous_reports: 0,
    
    // Identificación - Bases de datos
    identified_databases: 0,
    identified_databases_records: 0,
    
    // Identificación - Otros métodos
    identified_websites: 0,
    identified_organizations: 0,
    identified_citations: 0,
    
    // Cribado - Eliminados antes
    duplicates_removed: 0,
    marked_ineligible_automation: 0,
    removed_other_reasons: 0,
    
    // Cribado
    records_screened: 0,
    excluded_screening: 0,
    
    // Elegibilidad - Bases de datos
    reports_sought_retrieval: 0,
    reports_not_retrieved: 0,
    reports_assessed_fulltext: 0,
    exclusion_reasons_db: {
      reason_1: 0,
      reason_2: 0,
      reason_3: 0,
    },
    
    // Elegibilidad - Otros métodos
    reports_sought_retrieval_other: 0,
    reports_not_retrieved_other: 0,
    reports_assessed_fulltext_other: 0,
    exclusion_reasons_other: {
      reason_1: 0,
      reason_2: 0,
      reason_3: 0,
    },
    
    // Incluidos
    new_studies_included: 0,
    new_studies_reports: 0,
    total_studies_included: 0,
    total_studies_reports: 0,
    
    // Otros
    other_exclusion_reason: '',
  });

  // Calcular datos PRISMA automáticamente desde artículos
  useEffect(() => {
    // Usar el total original de artículos (antes de filtros)
    const totalIdentified = state.totalOriginalArticles || state.projectArticles.length;
    const duplicates = state.projectArticles.filter((a) => a.status === 'duplicate').length;
    const withoutTitle = state.projectArticles.filter((a) => a.status === 'removed_without_title').length;
    const withoutAuthors = state.projectArticles.filter((a) => a.status === 'removed_without_authors').length;
    const withoutYear = state.projectArticles.filter((a) => a.status === 'removed_without_year').length;
    const withoutUrl = state.projectArticles.filter((a) => a.status === 'removed_without_url').length;
    const withoutAbstract = state.projectArticles.filter((a) => a.status === 'removed_without_abstract').length;
    
    // Debug log
    console.log('[PRISMA] Contadores calculados:', {
      totalIdentified,
      duplicates,
      withoutTitle,
      withoutAuthors,
      withoutYear,
      withoutUrl,
      withoutAbstract,
    });
    
    // Debug: mostrar todos los status únicos
    const uniqueStatuses = [...new Set(state.projectArticles.map(a => a.status))];
    console.log('[PRISMA] Status únicos en artículos:', uniqueStatuses);
    
    // Artículos eliminados antes del cribado
    const eliminatedBefore = duplicates + withoutTitle + withoutAuthors + withoutYear + withoutUrl + withoutAbstract;
    
    // Artículos que llegan al cribado
    const screened = totalIdentified - eliminatedBefore;
    
    const excludedTitle = state.projectArticles.filter((a) => a.status === 'excluded_title').length;
    const includedTitle = state.projectArticles.filter((a) => a.status === 'included_title').length;
    const excludedFullText = state.projectArticles.filter((a) => a.status === 'excluded_fulltext').length;
    const includedFinal = state.projectArticles.filter((a) => a.status === 'included_final').length;
    
    // Total que pasó a evaluación de texto completo
    const fullTextEvaluation = includedTitle + excludedFullText + includedFinal;

    // Contar artículos por fuente (excluyendo eliminados)
    const pubmedCount = state.projectArticles.filter((a) => a.source === 'PubMed' && !a.status.startsWith('removed_')).length;
    const semanticCount = state.projectArticles.filter((a) => a.source === 'Semantic Scholar' && !a.status.startsWith('removed_')).length;
    const arxivCount = state.projectArticles.filter((a) => a.source === 'ArXiv' && !a.status.startsWith('removed_')).length;
    const crossrefCount = state.projectArticles.filter((a) => a.source === 'Crossref' && !a.status.startsWith('removed_')).length;

    // Contar artículos excluidos por cada razón
    const exclusionReasonsCounts = {};
    const customReasons = new Set();
    
    // Extraer motivos personalizados únicos
    state.projectArticles.forEach((a) => {
      if (a.status === 'excluded_fulltext' && 
          a.exclusionReason && 
          !state.exclusionReasons.includes(a.exclusionReason)) {
        customReasons.add(a.exclusionReason);
      }
    });
    
    // Contar razones predefinidas
    state.exclusionReasons.forEach((reason, index) => {
      if (reason !== 'Otro') {
        const count = state.projectArticles.filter(
          (a) => a.status === 'excluded_fulltext' && a.exclusionReason === reason
        ).length;
        exclusionReasonsCounts[`reason_${index + 1}`] = count;
      }
    });
    
    // Agregar motivos personalizados
    const customReasonsArray = Array.from(customReasons);
    customReasonsArray.forEach((customReason, index) => {
      const count = state.projectArticles.filter(
        (a) => a.status === 'excluded_fulltext' && a.exclusionReason === customReason
      ).length;
      exclusionReasonsCounts[`custom_${index + 1}`] = { reason: customReason, count };
    });

    setPrismaData({
      // Estudios previos - TOMAN EL TOTAL IDENTIFICADO
      previous_studies: totalIdentified,
      previous_reports: totalIdentified,
      
      // Identificación - Bases de datos por fuente
      identified_pubmed: pubmedCount,
      identified_semantic: semanticCount,
      identified_arxiv: arxivCount,
      identified_crossref: crossrefCount,
      
      // Identificación - Otros métodos - COMIENZAN EN 0
      identified_websites: 0,
      identified_organizations: 0,
      identified_citations: 0,
      
      // Cribado - Eliminados antes
      duplicates_removed: duplicates,
      without_title: withoutTitle,
      without_authors: withoutAuthors,
      without_year: withoutYear,
      without_url: withoutUrl,
      without_abstract: withoutAbstract,
      
      // Cribado
      records_screened: screened,
      excluded_screening: excludedTitle,
      
      // Elegibilidad - Bases de datos
      reports_sought_retrieval: 0,
      reports_not_retrieved: 0,
      reports_assessed_fulltext: includedTitle,
      exclusion_reasons_db: exclusionReasonsCounts,
      
      // Elegibilidad - Otros métodos
      reports_sought_retrieval_other: 0,
      reports_not_retrieved_other: 0,
      reports_assessed_fulltext_other: 0,
      exclusion_reasons_other: {
        reason_1: 0,
        reason_2: 0,
        reason_3: 0,
      },
      
      // Incluidos
      new_studies_included: includedFinal,
      new_studies_reports: includedFinal,
      total_studies_included: includedFinal,
      total_studies_reports: includedFinal,
    });
  }, [state.projectArticles, state.exclusionReasons]);

  // Actualizar campo de datos PRISMA
  const handleDataChange = (field, value) => {
    setPrismaData((prev) => {
      if (field.includes('.')) {
        // Manejar campos anidados como exclusion_reasons.reason_1
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: parseInt(value) || 0,
          },
        };
      }
      return {
        ...prev,
        [field]: parseInt(value) || 0,
      };
    });
  };

  // Función para exportar estadísticas como JSON
  const handleExportJSON = () => {
    const statistics = {
      timestamp: new Date().toISOString(),
      projectId: state.currentProjectId,
      totalIdentified: state.projectArticles.length,
      duplicates: state.projectArticles.filter((a) => a.status === 'duplicate').length,
      screened: state.projectArticles.filter((a) => a.status !== 'duplicate').length,
      excludedTitle: state.projectArticles.filter((a) => a.status === 'excluded_title').length,
      fullText: state.projectArticles.filter((a) => a.status === 'included_title').length,
      excludedFullText: state.projectArticles.filter((a) => a.status === 'excluded_fulltext').length,
      includedFinal: state.projectArticles.filter((a) => a.status === 'included_final').length,
    };

    const dataStr = JSON.stringify(statistics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prisma-estadisticas-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Función para exportar estudios incluidos como CSV
  const handleExportCSV = () => {
    const includedArticles = state.projectArticles.filter((a) => a.status === 'included_final');
    
    const headers = ['Título', 'Autores', 'Año', 'Fuente', 'URL', 'Abstract'];
    const rows = includedArticles.map((article) => [
      `"${article.title.replace(/"/g, '""')}"`,
      `"${(article.authors || []).join('; ').replace(/"/g, '""')}"`,
      article.year || '',
      article.source || '',
      article.url || '',
      `"${(article.abstract || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estudios-incluidos-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Función para exportar diagrama PRISMA como PNG
  const handleExportPNG = async () => {
    try {
      // Importar html2canvas dinámicamente
      const html2canvas = (await import('html2canvas')).default;
      
      const diagramElement = document.getElementById('prisma-diagram');
      if (!diagramElement) {
        alert('No se encontró el diagrama PRISMA');
        return;
      }

      const canvas = await html2canvas(diagramElement, {
        backgroundColor: '#1e1e1e',
        scale: 2,
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `diagrama-prisma-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exportando PNG:', error);
      alert('Error al exportar el diagrama. Asegúrate de tener html2canvas instalado.');
    }
  };

  // Selectores para calcular métricas
  const countTotalIdentified = state.projectArticles.length;
  const countDuplicates = state.projectArticles.filter((a) => a.status === 'duplicate').length;
  const countScreened = countTotalIdentified - countDuplicates;
  const countExcludedTitle = state.projectArticles.filter((a) => a.status === 'excluded_title').length;
  const countFullText = state.projectArticles.filter(
    (a) => a.status === 'included_title' || a.status === 'included_final' || a.status === 'excluded_fulltext'
  ).length;
  const countExcludedFullText = state.projectArticles.filter((a) => a.status === 'excluded_fulltext').length;
  const countIncludedFinal = state.projectArticles.filter((a) => a.status === 'included_final').length;

  const includedArticles = state.projectArticles.filter((a) => a.status === 'included_final');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-4xl font-bold text-monokai-orange mb-8">Módulo 5: Reporte PRISMA 2020</h1>

      {/* Sección 1: Controles */}
      <div className="mb-12 bg-monokai-sidebar p-6 rounded-lg border border-monokai-blue border-opacity-30">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-monokai-blue">Datos del Diagrama</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowInputs(!showInputs)}
            className="flex items-center gap-2 px-4 py-2 bg-monokai-purple text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            <Edit className="w-4 h-4" />
            {showInputs ? 'Ocultar' : 'Editar'} Datos
          </motion.button>
        </div>

        {/* Inputs Editable */}
        {showInputs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 grid grid-cols-2 gap-4 p-4 bg-monokai-dark rounded-lg border border-monokai-subtle border-opacity-20"
          >
            {/* Estudios Previos */}
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Estudios incluidos en versión previa</label>
              <input type="number" value={prismaData.previous_studies} onChange={(e) => handleDataChange('previous_studies', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>

            {/* Identificación - Bases de datos */}
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">PubMed</label>
              <input type="number" value={prismaData.identified_pubmed || 0} onChange={(e) => handleDataChange('identified_pubmed', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Semantic Scholar</label>
              <input type="number" value={prismaData.identified_semantic || 0} onChange={(e) => handleDataChange('identified_semantic', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">ArXiv</label>
              <input type="number" value={prismaData.identified_arxiv || 0} onChange={(e) => handleDataChange('identified_arxiv', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Crossref</label>
              <input type="number" value={prismaData.identified_crossref || 0} onChange={(e) => handleDataChange('identified_crossref', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>

            {/* Identificación - Otros métodos */}
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Sitios Web</label>
              <input type="number" value={prismaData.identified_websites} onChange={(e) => handleDataChange('identified_websites', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Organizaciones</label>
              <input type="number" value={prismaData.identified_organizations} onChange={(e) => handleDataChange('identified_organizations', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Búsqueda de citaciones</label>
              <input type="number" value={prismaData.identified_citations} onChange={(e) => handleDataChange('identified_citations', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>

            {/* Cribado */}
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Registros duplicados eliminados</label>
              <input type="number" value={prismaData.duplicates_removed} onChange={(e) => handleDataChange('duplicates_removed', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Eliminar sin Abstract</label>
              <input type="number" value={prismaData.without_abstract || 0} onChange={(e) => handleDataChange('without_abstract', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Registros cribados</label>
              <input type="number" value={prismaData.records_screened} onChange={(e) => handleDataChange('records_screened', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Registros excluidos en cribado</label>
              <input type="number" value={prismaData.excluded_screening} onChange={(e) => handleDataChange('excluded_screening', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>

            {/* Elegibilidad - Bases de datos */}
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Reportes evaluados para elegibilidad (BD)</label>
              <input type="number" value={prismaData.reports_assessed_fulltext} onChange={(e) => handleDataChange('reports_assessed_fulltext', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>

            {/* Incluidos */}
            <div>
              <label className="block text-sm font-semibold text-monokai-text mb-2">Estudios incluidos en la revisión</label>
              <input type="number" value={prismaData.new_studies_included} onChange={(e) => handleDataChange('new_studies_included', e.target.value)} className="w-full px-3 py-2 bg-monokai-sidebar border border-monokai-subtle rounded-lg text-monokai-text focus:outline-none focus:border-monokai-blue" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Sección 2: Diagrama PRISMA Visual */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-monokai-purple mb-8">Diagrama de Flujo PRISMA 2020</h2>

        <div id="prisma-diagram" className="space-y-8">
          {/* ESTUDIOS PREVIOS */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-pink">
            <h3 className="text-lg font-bold text-monokai-pink mb-4">Estudios Previos</h3>
            <div className="space-y-2 text-sm">
              <p className="text-monokai-text">Estudios incluidos en la versión previa de la revisión (n = <span className="font-bold">{prismaData.previous_studies}</span>)</p>
            </div>
          </motion.div>

          {/* IDENTIFICACIÓN */}
          <div className="grid grid-cols-2 gap-6">
            {/* Bases de datos */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-green">
              <h3 className="text-lg font-bold text-monokai-green mb-4">Identificación de nuevos estudios a través de las bases de datos y registros</h3>
              <div className="space-y-2 text-sm">
                <p className="text-monokai-text">Registros o citas identificados desde:</p>
                <p className="text-monokai-subtle">PubMed (n = <span className="font-bold">{prismaData.identified_pubmed || 0}</span>)</p>
                <p className="text-monokai-subtle">Semantic Scholar (n = <span className="font-bold">{prismaData.identified_semantic || 0}</span>)</p>
                <p className="text-monokai-subtle">ArXiv (n = <span className="font-bold">{prismaData.identified_arxiv || 0}</span>)</p>
                <p className="text-monokai-subtle">Crossref (n = <span className="font-bold">{prismaData.identified_crossref || 0}</span>)</p>
                
                <p className="text-monokai-text mt-4">Registros eliminados por falta de datos:</p>
                <p className="text-monokai-subtle">Eliminar sin Abstract (n = <span className="font-bold">{prismaData.without_abstract || 0}</span>)</p>
              </div>
            </motion.div>

            {/* Otros métodos */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-blue">
              <h3 className="text-lg font-bold text-monokai-blue mb-4">Identificación de nuevos estudios a través de otros métodos</h3>
              <div className="space-y-2 text-sm">
                <p className="text-monokai-text">Registros o citas identificados a partir de:</p>
                <p className="text-monokai-subtle">Sitios Web (n = <span className="font-bold">{prismaData.identified_websites}</span>)</p>
                <p className="text-monokai-subtle">Organizaciones (n = <span className="font-bold">{prismaData.identified_organizations}</span>)</p>
                <p className="text-monokai-subtle">Búsqueda de citaciones (n = <span className="font-bold">{prismaData.identified_citations}</span>)</p>
              </div>
            </motion.div>
          </div>

          {/* CRIBADO */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-yellow">
            <h3 className="text-lg font-bold text-monokai-yellow mb-4">Cribado</h3>
            <div className="space-y-2 text-sm">
              <p className="text-monokai-text">Registros o citas duplicados (n = <span className="font-bold">{prismaData.duplicates_removed}</span>)</p>
              <p className="text-monokai-text">Registros o citas excluidos (n = <span className="font-bold">{prismaData.excluded_screening}</span>)</p>
            </div>
          </motion.div>

          {/* ELEGIBILIDAD */}
          <div className="grid grid-cols-2 gap-6">
            {/* Bases de datos */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-green">
              <h3 className="text-lg font-bold text-monokai-green mb-4">Elegibilidad (Bases de datos)</h3>
              <div className="space-y-2 text-sm">
                <p className="text-monokai-text">Reportes buscados para su recuperación (n = <span className="font-bold">{prismaData.reports_sought_retrieval}</span>)</p>
                <p className="text-monokai-text">Reportes no recuperados (n = <span className="font-bold">{prismaData.reports_not_retrieved}</span>)</p>
                <p className="text-monokai-text mt-4">Reportes evaluados para decidir su elegibilidad (n = <span className="font-bold">{prismaData.reports_assessed_fulltext}</span>)</p>
                <p className="text-monokai-text">Reportes excluidos:</p>
                {state.exclusionReasons.map((reason, index) => 
                  reason !== 'Otro' && (
                    <p key={reason} className="text-monokai-subtle">
                      {reason} (n = <span className="font-bold">{prismaData.exclusion_reasons_db[`reason_${index + 1}`] || 0}</span>)
                    </p>
                  )
                )}
                {Object.keys(prismaData.exclusion_reasons_db).map((key) => 
                  key.startsWith('custom_') && (
                    <p key={key} className="text-monokai-subtle">
                      {prismaData.exclusion_reasons_db[key].reason} (n = <span className="font-bold">{prismaData.exclusion_reasons_db[key].count}</span>)
                    </p>
                  )
                )}
              </div>
            </motion.div>

            {/* INCLUIDOS */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-green">
              <h3 className="text-lg font-bold text-monokai-green mb-4">Incluidos</h3>
              <div className="space-y-2 text-sm">
                <p className="text-monokai-text">Estudios incluidos en la revisión (n = <span className="font-bold">{prismaData.new_studies_included}</span>)</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Sección 3: Exportación de Datos */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-monokai-purple mb-6">Exportar Reporte</h2>
        <div className="grid grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-blue text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            <Download className="w-5 h-5" />
            Estadísticas (JSON)
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-green text-monokai-dark font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            <Download className="w-5 h-5" />
            Estudios (CSV)
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportPNG}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-purple text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            <Download className="w-5 h-5" />
            Diagrama (PNG)
          </motion.button>
        </div>
      </div>

      {/* Sección 4: Lista de Estudios Incluidos */}
      <div>
        <h2 className="text-2xl font-bold text-monokai-purple mb-6">
          Estudios Incluidos en la Revisión (n = <span className="text-monokai-green">{prismaData.studies_qualitative_synthesis}</span>)
        </h2>

        {includedArticles.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {includedArticles.map((article) => (
                <ArticleCard key={article.uniqueId} article={article} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12 bg-monokai-sidebar rounded-lg border border-monokai-subtle border-opacity-30">
            <p className="text-monokai-subtle">
              No hay estudios incluidos aún. Completa los módulos anteriores para ver los resultados.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ModuleMetaAnalysis = () => {
  const { state, dispatch } = useProject();
  const [extractionData, setExtractionData] = useState({});
  const [metaAnalysisResults, setMetaAnalysisResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [articlesWithData, setArticlesWithData] = useState([]);

  // Artículos incluidos finales
  const includedArticles = state.projectArticles.filter((a) => a.status === 'included_final');

  // Cargar datos de extracción al montar
  useEffect(() => {
    const loadData = async () => {
      if (state.currentProjectId) {
        console.log('[ModuleMetaAnalysis] Cargando datos para proyecto:', state.currentProjectId);
        console.log('[ModuleMetaAnalysis] Artículos en estado:', state.projectArticles.length);
        console.log('[ModuleMetaAnalysis] Artículos included_final en estado:', state.projectArticles.filter(a => a.status === 'included_final').length);
        
        // Cargar datos de extracción desde Supabase
        const data = await apiClient.loadExtractionData(state.currentProjectId);
        console.log('[ModuleMetaAnalysis] Datos de extracción cargados:', data.length);
        
        const dataMap = {};
        const articleIdsWithData = new Set();
        
        data.forEach((row) => {
          dataMap[row.article_id] = {
            n_intervention: row.n_intervention,
            mean_intervention: row.mean_intervention,
            sd_intervention: row.sd_intervention,
            n_control: row.n_control,
            mean_control: row.mean_control,
            sd_control: row.sd_control,
          };
          articleIdsWithData.add(row.article_id);
        });
        
        console.log('[ModuleMetaAnalysis] Article IDs con datos:', Array.from(articleIdsWithData));
        setExtractionData(dataMap);
        
        // Cargar todos los artículos desde Supabase
        const allArticles = await apiClient.loadArticles(state.currentProjectId);
        console.log('[ModuleMetaAnalysis] Todos los artículos desde Supabase:', allArticles.length);
        console.log('[ModuleMetaAnalysis] Artículos included_final desde Supabase:', allArticles.filter(a => a.status === 'included_final').length);
        console.log('[ModuleMetaAnalysis] Artículos included_final detalles:', allArticles.filter(a => a.status === 'included_final').map(a => ({ id: a.id, title: a.title, status: a.status })));
        
        // Obtener artículos included_final DESDE SUPABASE (con IDs correctos BIGINT)
        const includedFinalArticles = allArticles.filter((a) => a.status === 'included_final');
        console.log('[ModuleMetaAnalysis] Artículos included_final con IDs BIGINT:', includedFinalArticles.map(a => ({ id: a.id, type: typeof a.id, title: a.title })));
        
        // Crear artículos "virtuales" para los datos guardados que no están en la lista actual
        // (datos de búsquedas anteriores que fueron eliminados)
        const virtualArticles = Array.from(articleIdsWithData)
          .filter(articleId => !allArticles.some(a => a.id === articleId))
          .map(articleId => ({
            id: articleId,
            title: articleId, // Usar el ID como título temporal
            status: 'included_final',
            source: 'saved_data',
            year: null,
            abstract: null,
            authors: '',
            url: '',
          }));
        
        console.log('[ModuleMetaAnalysis] Artículos virtuales creados:', virtualArticles.length);
        
        // Combinar: artículos included_final + artículos virtuales (de búsquedas anteriores)
        const combinedArticles = [
          ...includedFinalArticles,
          ...virtualArticles,
        ];
        
        console.log('[ModuleMetaAnalysis] Artículos combinados:', combinedArticles.length);
        
        // Eliminar duplicados por ID
        const uniqueArticles = Array.from(
          new Map(combinedArticles.map(a => [a.id, a])).values()
        );
        
        console.log('[ModuleMetaAnalysis] Artículos únicos finales:', uniqueArticles.length);
        console.log('[ModuleMetaAnalysis] Artículos finales:', uniqueArticles.map(a => ({ id: a.id, title: a.title })));
        console.log('[ModuleMetaAnalysis] ✓ Actualizando state con setArticlesWithData');
        setArticlesWithData(uniqueArticles);
        console.log('[ModuleMetaAnalysis] ✓ State actualizado');
      }
    };
    loadData();
  }, [state.currentProjectId]);

  // Manejar cambio en inputs
  const handleInputChange = async (articleId, field, value) => {
    console.log(`[handleInputChange] Cambio detectado - articleId: ${articleId}, field: ${field}, value: ${value}`);
    
    const newData = {
      ...extractionData,
      [articleId]: {
        ...extractionData[articleId],
        [field]: value === '' ? null : parseFloat(value) || value,
      },
    };
    setExtractionData(newData);

    // Auto-guardar a Supabase
    if (state.currentProjectId) {
      // Encontrar el artículo para obtener su título
      const article = articlesWithData.find(a => a.id === articleId);
      const articleTitle = article?.title || `Article ${articleId}`;
      
      console.log(`[handleInputChange] Llamando a saveExtractionData con projectId: ${state.currentProjectId}`);
      const result = await apiClient.saveExtractionData(
        state.currentProjectId,
        articleId,
        articleTitle,
        newData[articleId]
      );
      console.log(`[handleInputChange] Resultado de saveExtractionData:`, result);
    } else {
      console.warn('[handleInputChange] No hay projectId, no se puede guardar');
    }
  };

  // Ejecutar meta-análisis
  const handleExecuteMetaAnalysis = async () => {
    if (!state.currentProjectId) {
      alert('No hay proyecto seleccionado');
      return;
    }

    // Preparar datos de extracción con títulos de artículos
    const dataToAnalyze = includedArticles
      .filter((article) => extractionData[article.id]) // Solo artículos con datos
      .map((article) => ({
        title: article.title,
        n_intervention: extractionData[article.id]?.n_intervention,
        mean_intervention: extractionData[article.id]?.mean_intervention,
        sd_intervention: extractionData[article.id]?.sd_intervention,
        n_control: extractionData[article.id]?.n_control,
        mean_control: extractionData[article.id]?.mean_control,
        sd_control: extractionData[article.id]?.sd_control,
      }));

    if (dataToAnalyze.length === 0) {
      alert('Por favor ingresa datos de extracción para al menos un estudio');
      return;
    }

    console.log(`[Meta-Analysis] Enviando ${dataToAnalyze.length} estudios al análisis`);
    dataToAnalyze.forEach((study, i) => {
      console.log(`  ${i + 1}. ${study.title}`);
    });

    setIsLoading(true);
    try {
      const results = await apiClient.runMetaAnalysisFromSupabase(state.currentProjectId, dataToAnalyze);
      setMetaAnalysisResults(results);
    } catch (error) {
      console.error('Error en meta-análisis:', error);
      alert('Error en meta-análisis: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-4xl font-bold text-monokai-pink mb-8">Módulo 6: Extracción de Datos y Meta-Análisis</h1>

      {/* Sección 1: Tabla de Extracción */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-monokai-orange mb-6">Extracción de Datos de Estudios Incluidos</h2>
        {console.log('[ModuleMetaAnalysis RENDER] articlesWithData.length:', articlesWithData.length)}

        {articlesWithData.length > 0 ? (
          <div className="overflow-x-auto bg-monokai-sidebar rounded-lg border border-monokai-subtle border-opacity-30">
            <table className="w-full divide-y divide-monokai-subtle divide-opacity-30 text-sm">
              <thead className="bg-monokai-dark">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-monokai-yellow">Estudio</th>
                  <th className="px-4 py-3 text-left font-semibold text-monokai-yellow">N (Intervención)</th>
                  <th className="px-4 py-3 text-left font-semibold text-monokai-yellow">Media (Intervención)</th>
                  <th className="px-4 py-3 text-left font-semibold text-monokai-yellow">DE (Intervención)</th>
                  <th className="px-4 py-3 text-left font-semibold text-monokai-yellow">N (Control)</th>
                  <th className="px-4 py-3 text-left font-semibold text-monokai-yellow">Media (Control)</th>
                  <th className="px-4 py-3 text-left font-semibold text-monokai-yellow">DE (Control)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-monokai-subtle divide-opacity-30">
                {articlesWithData.map((article, index) => (
                  <tr key={`${article.id}-${index}`} className="hover:bg-monokai-dark transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-monokai-text truncate block max-w-xs" title={article.title}>
                        {article.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={extractionData[article.id]?.n_intervention || ''}
                        onChange={(e) => handleInputChange(article.id, 'n_intervention', e.target.value)}
                        placeholder="N"
                        className="w-20 bg-monokai-sidebar text-monokai-text rounded px-2 py-1 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-blue focus:ring-opacity-30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={extractionData[article.id]?.mean_intervention || ''}
                        onChange={(e) => handleInputChange(article.id, 'mean_intervention', e.target.value)}
                        placeholder="Media"
                        className="w-20 bg-monokai-sidebar text-monokai-text rounded px-2 py-1 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-blue focus:ring-opacity-30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={extractionData[article.id]?.sd_intervention || ''}
                        onChange={(e) => handleInputChange(article.id, 'sd_intervention', e.target.value)}
                        placeholder="DE"
                        className="w-20 bg-monokai-sidebar text-monokai-text rounded px-2 py-1 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-blue focus:ring-opacity-30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={extractionData[article.id]?.n_control || ''}
                        onChange={(e) => handleInputChange(article.id, 'n_control', e.target.value)}
                        placeholder="N"
                        className="w-20 bg-monokai-sidebar text-monokai-text rounded px-2 py-1 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-blue focus:ring-opacity-30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={extractionData[article.id]?.mean_control || ''}
                        onChange={(e) => handleInputChange(article.id, 'mean_control', e.target.value)}
                        placeholder="Media"
                        className="w-20 bg-monokai-sidebar text-monokai-text rounded px-2 py-1 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-blue focus:ring-opacity-30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={extractionData[article.id]?.sd_control || ''}
                        onChange={(e) => handleInputChange(article.id, 'sd_control', e.target.value)}
                        placeholder="DE"
                        className="w-20 bg-monokai-sidebar text-monokai-text rounded px-2 py-1 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-blue focus:ring-opacity-30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-monokai-sidebar rounded-lg border border-monokai-subtle border-opacity-30">
            <p className="text-monokai-subtle">
              No hay estudios incluidos. Completa los módulos anteriores para ver los artículos aquí.
            </p>
          </div>
        )}
      </div>

      {/* Sección 2: Botón Ejecutar */}
      {includedArticles.length > 0 && (
        <div className="mb-12">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExecuteMetaAnalysis}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-monokai-blue text-monokai-text font-bold rounded-lg hover:shadow-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 className="w-6 h-6" />
            {isLoading ? 'Ejecutando Meta-Análisis...' : 'Ejecutar Meta-Análisis'}
          </motion.button>
        </div>
      )}

      {/* Sección 3: Resultados */}
      {isLoading ? (
        <LoadingSpinner />
      ) : metaAnalysisResults ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Métricas */}
          <div className="bg-monokai-dark p-6 rounded-lg border border-monokai-subtle border-opacity-30">
            <h3 className="text-xl font-bold text-monokai-orange mb-4">Métricas de Heterogeneidad</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-monokai-subtle mb-1">I² (Inconsistencia)</p>
                <p className="text-2xl font-bold text-monokai-yellow">{metaAnalysisResults.metrics.i2}</p>
              </div>
              <div>
                <p className="text-sm text-monokai-subtle mb-1">Q (Estadístico)</p>
                <p className="text-2xl font-bold text-monokai-yellow">{metaAnalysisResults.metrics.q.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-monokai-subtle mb-1">P-value</p>
                <p className="text-2xl font-bold text-monokai-yellow">{metaAnalysisResults.metrics.pValue.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-monokai-subtle mb-1">Heterogeneidad</p>
                <p className="text-2xl font-bold text-monokai-yellow">{metaAnalysisResults.metrics.heterogeneity}</p>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-monokai-sidebar p-6 rounded-lg border border-monokai-subtle border-opacity-30"
            >
              <h3 className="text-lg font-bold text-monokai-orange mb-4">Forest Plot</h3>
              <img
                src={metaAnalysisResults.forestPlotUrl}
                alt="Forest Plot"
                className="w-full rounded-lg"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-monokai-sidebar p-6 rounded-lg border border-monokai-subtle border-opacity-30"
            >
              <h3 className="text-lg font-bold text-monokai-orange mb-4">Funnel Plot</h3>
              <img
                src={metaAnalysisResults.funnelPlotUrl}
                alt="Funnel Plot"
                className="w-full rounded-lg"
              />
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
};

const ModuleGraphAnalysis = () => {
  const { state } = useProject();
  const [isLoading, setIsLoading] = useState(false);
  const [graphElements, setGraphElements] = useState([]);

  // Estilos Monokai para Cytoscape - Profesional tipo VOSviewer
  const graphStylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#78DCE8',
        'label': 'data(label)',
        'color': '#F8F8F2',
        'font-size': '11px',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': '35px',
        'height': '35px',
        'border-width': '2px',
        'border-color': '#75715E',
        'text-opacity': 1,
        'text-background-opacity': 0.8,
        'text-background-color': '#272822',
        'text-background-padding': '3px',
      },
    },
    {
      selector: 'node[type="author"]',
      style: {
        'background-color': '#FF6188',
        'width': '45px',
        'height': '45px',
      },
    },
    {
      selector: 'node[type="topic"]',
      style: {
        'background-color': '#FFD866',
        'width': '55px',
        'height': '55px',
        'font-weight': 'bold',
        'font-size': '12px',
        'color': '#272822',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': '#75715E',
        'opacity': 0.6,
        'curve-style': 'bezier',
        'target-arrow-color': '#75715E',
        'target-arrow-shape': 'none',
      },
    },
    {
      selector: 'edge[label="cites"]',
      style: {
        'width': 2,
        'opacity': 0.8,
        'line-color': '#A1EFE4',
      },
    },
  ];

  // Layout de fuerza dirigida (COSE)
  const graphLayout = {
    name: 'cose',
    animate: true,
    animationDuration: 1000,
    fit: true,
    padding: 30,
    nodeSpacing: 15,
    gravity: 0.5,
    friction: 0.8,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  };

  const handleGenerateNetwork = async () => {
    if (!state.currentProjectId) {
      alert('No hay proyecto seleccionado');
      return;
    }

    setIsLoading(true);
    try {
      const elements = await apiClient.runNetworkAnalysis(state.currentProjectId);
      setGraphElements(elements);
    } catch (error) {
      console.error('Error generando red:', error);
      alert('Error generando red: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-4xl font-bold text-monokai-blue mb-8">Módulo 7: Análisis de Redes Bibliométricas</h1>

      <div className="mb-8 bg-monokai-sidebar p-6 rounded-lg border border-monokai-subtle border-opacity-30">
        <p className="text-monokai-text mb-4">
          Visualiza la red de relaciones entre artículos, autores y temas usando un algoritmo de física dirigida (COSE).
          Los nodos se organizan automáticamente para revelar patrones y clusters en tu investigación.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGenerateNetwork}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-monokai-blue text-monokai-text font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Network className="w-5 h-5" />
          {isLoading ? 'Generando Red Bibliométrica...' : 'Generar Red Bibliométrica'}
        </motion.button>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-6 rounded-full bg-cyan-400" />
            <span className="font-semibold text-monokai-text">Artículos</span>
          </div>
          <p className="text-sm text-monokai-subtle">Nodos azul cian (20)</p>
        </div>
        <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-6 rounded-full bg-pink-400" />
            <span className="font-semibold text-monokai-text">Autores</span>
          </div>
          <p className="text-sm text-monokai-subtle">Nodos rosa (8)</p>
        </div>
        <div className="bg-monokai-sidebar p-4 rounded-lg border border-monokai-subtle border-opacity-30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-6 rounded-full bg-yellow-400" />
            <span className="font-semibold text-monokai-text">Temas</span>
          </div>
          <p className="text-sm text-monokai-subtle">Nodos amarillo (4, hubs)</p>
        </div>
      </div>

      <div className="relative w-full h-[600px] bg-monokai-dark rounded-lg border border-monokai-subtle border-opacity-30 overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-monokai-dark bg-opacity-80">
            <LoadingSpinner />
          </div>
        ) : graphElements.length > 0 ? (
          <CytoscapeComponent
            elements={graphElements}
            style={{ width: '100%', height: '100%' }}
            stylesheet={graphStylesheet}
            layout={graphLayout}
            wheelSensitivity={0.1}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Network className="w-12 h-12 text-monokai-subtle mx-auto mb-4" />
              <p className="text-monokai-subtle">
                Haz clic en "Generar Red Bibliométrica" para visualizar la red
              </p>
            </div>
          </div>
        )}
      </div>

      {graphElements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 bg-monokai-sidebar p-6 rounded-lg border border-monokai-subtle border-opacity-30"
        >
          <h3 className="text-lg font-bold text-monokai-orange mb-4">Información de la Red</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-monokai-subtle mb-1">Elementos Totales</p>
              <p className="text-2xl font-bold text-monokai-yellow">{graphElements.length}</p>
            </div>
            <div>
              <p className="text-sm text-monokai-subtle mb-1">Nodos</p>
              <p className="text-2xl font-bold text-monokai-yellow">
                {graphElements.filter((e) => !e.data.source).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-monokai-subtle mb-1">Enlaces</p>
              <p className="text-2xl font-bold text-monokai-yellow">
                {graphElements.filter((e) => e.data.source).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-monokai-subtle mb-1">Algoritmo</p>
              <p className="text-lg font-bold text-monokai-green">COSE (Física Dirigida)</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ============================================================================
// COMPONENTE SIDEBAR (Navegación)
// ============================================================================

const Sidebar = () => {
  const { state, dispatch } = useProject();

  const modules = [
    { id: 'home', label: 'Inicio', icon: Home, color: 'text-monokai-pink' },
    { id: 'pico', label: 'PICO', icon: ClipboardList, color: 'text-monokai-green' },
    { id: 'search', label: 'Búsqueda', icon: Search, color: 'text-monokai-yellow' },
    { id: 'screening', label: 'Cribado', icon: Filter, color: 'text-monokai-blue' },
    { id: 'eligibility', label: 'Elegibilidad', icon: CheckCircle, color: 'text-monokai-purple' },
    { id: 'prisma', label: 'Reporte PRISMA', icon: BarChart3, color: 'text-monokai-orange' },
    { id: 'metaanalysis', label: 'Meta-Análisis', icon: Zap, color: 'text-monokai-pink' },
    { id: 'graphanalysis', label: 'Análisis de Grafos', icon: Network, color: 'text-monokai-blue' },
  ];

  return (
    <motion.aside
      initial={{ x: -256 }}
      animate={{ x: state.sidebarOpen ? 0 : -256 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-screen w-64 bg-monokai-sidebar border-r border-monokai-pink border-opacity-20 shadow-lg z-40"
    >
      <div className="p-6 border-b border-monokai-pink border-opacity-20">
        <h2 className="text-2xl font-bold text-monokai-pink">
          MetaPiqma
        </h2>
      </div>

      <nav className="p-4 space-y-2">
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive = state.currentPage === module.id;

          return (
            <motion.li
              key={module.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              className="list-none"
            >
              <button
                onClick={() => dispatch({ type: 'SET_PAGE', payload: module.id })}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-monokai-pink bg-opacity-20 border border-monokai-pink text-monokai-pink'
                    : 'text-monokai-text hover:bg-monokai-dark hover:bg-opacity-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${module.color}`} />
                <span className="text-sm font-medium">{module.label}</span>
              </button>
            </motion.li>
          );
        })}
      </nav>
    </motion.aside>
  );
};

// ============================================================================
// COMPONENTE HEADER (Barra superior con toggle de sidebar)
// ============================================================================

// ============================================================================
// COMPONENTE MAIN CONTENT (Área de contenido principal)
// ============================================================================

const MainContent = () => {
  const { state } = useProject();

  const renderModule = () => {
    switch (state.currentPage) {
      case 'home':
        return <LandingPage />;
      case 'pico':
        return <ModulePICO />;
      case 'search':
        return <ModuleSearch />;
      case 'screening':
        return <ModuleScreening />;
      case 'eligibility':
        return <ModuleEligibility />;
      case 'prisma':
        return <ModulePRISMA />;
      case 'metaanalysis':
        return <ModuleMetaAnalysis />;
      case 'graphanalysis':
        return <ModuleGraphAnalysis />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <main className="ml-64 h-screen overflow-y-auto">
      <div className="p-8">
        <AnimatePresence mode="wait">
          {renderModule()}
        </AnimatePresence>
      </div>
    </main>
  );
};

// ============================================================================
// COMPONENTE APP CONTENT (Con lógica de carga y auto-guardado)
// ============================================================================

const AppContent = () => {
  const { state, dispatch } = useProject();

  // useEffect 1: Cargar proyecto y artículos al iniciar
  useEffect(() => {
    const loadProjectData = async () => {
      const projectData = await apiClient.loadProject();
      if (projectData) {
        dispatch({ type: 'SET_PROJECT_DATA', payload: projectData });
        
        // Cargar artículos del proyecto
        const articles = await apiClient.loadArticles(projectData.id);
        if (articles && articles.length > 0) {
          dispatch({ type: 'SET_PROJECT_ARTICLES', payload: articles });
        } else {
          dispatch({ type: 'SET_PROJECT_ARTICLES', payload: [] });
        }
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    loadProjectData();
  }, [dispatch]);

  // useEffect 2: Auto-guardado con debounce
  useEffect(() => {
    // No guardar si no hay proyecto o si está cargando
    if (!state.currentProjectId || state.isLoading) return;

    const debounceTimer = setTimeout(() => {
      apiClient.saveProject(state.currentProjectId, state.pico, state.searchStrategies);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [state.pico, state.searchStrategies, state.currentProjectId, state.isLoading]);

  // Mostrar spinner mientras carga proyecto o artículos
  if (state.isLoading || !state.articlesLoaded) {
    return <LoadingSpinner fullScreen={true} />;
  }

  return (
    <div className="min-h-screen bg-monokai-bg text-monokai-text">
      <Sidebar />
      <MainContent />
    </div>
  );
};

// ============================================================================
// COMPONENTE APP (Contenedor principal)
// ============================================================================

export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
