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
  currentPage: 'pico',
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
    arxivCrossref: '',
  },
  projectArticles: [],
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
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOAD_PROJECT_ARTICLES':
      const articlesWithIds = action.payload.map((article) => ({
        ...article,
        uniqueId: crypto.randomUUID(),
        status: 'unscreened',
      }));
      return { ...state, projectArticles: articlesWithIds };
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
    case 'MARK_DUPLICATES':
      // Simula búsqueda de duplicados por similitud de títulos
      const duplicateMap = new Map();
      const articlesWithDuplicates = state.projectArticles.map((article) => {
        // Normalizar título para comparación
        const normalizedTitle = article.title.toLowerCase().trim();
        
        if (duplicateMap.has(normalizedTitle)) {
          return { ...article, status: 'duplicate' };
        }
        duplicateMap.set(normalizedTitle, true);
        return article;
      });
      return { ...state, projectArticles: articlesWithDuplicates };
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
          arxivCrossref: projectData.strategy_arxiv || '',
        },
      };
    case 'SET_PROJECT_ARTICLES':
      if (Array.isArray(action.payload)) {
        return {
          ...state,
          projectArticles: action.payload,
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
          strategy_arxiv: strategyData.arxivCrossref,
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
        .eq('project_id', projectId);
      
      if (error) {
        console.error('Error cargando artículos:', error);
        return [];
      }
      
      return data || [];
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
  updateArticleStatus: async (articleId, newStatus, reason = null) => {
    try {
      const updateData = {
        status: newStatus,
      };
      
      if (reason) {
        updateData.exclusion_reason = reason;
      }

      const { error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', articleId);
      
      if (error) {
        console.error('Error actualizando artículo:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error en updateArticleStatus:', err);
      return false;
    }
  },

  // Funciones simuladas (mantenidas por ahora)
  async mockSearchAPI(strategies) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return mockArticles;
  },

  async mockMetaAnalysisAPI(data) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      metrics: {
        i2: '89.5%',
        q: 132.1,
        p_value: '< 0.001',
        heterogeneity: 'Alta',
      },
      forestPlotUrl: 'https://placehold.co/800x400/272822/F8F8F2?text=Forest+Plot+(Simulado)',
      funnelPlotUrl: 'https://placehold.co/600x400/272822/F8F8F2?text=Funnel+Plot+(Simulado)',
    };
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
          <h3 className="text-lg font-semibold text-monokai-pink mb-2">{article.title}</h3>
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

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAbstract(!showAbstract)}
        className="text-sm text-monokai-blue hover:text-monokai-cyan transition-colors font-semibold"
      >
        {showAbstract ? 'Ocultar Abstracto' : 'Ver Abstracto'}
      </motion.button>

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
    <div className="space-y-3 text-sm text-monokai-text">
      <p className="text-monokai-yellow">
        💡 <span className="font-semibold">Tip:</span> Para mejores resultados, traduce los términos a inglés.
      </p>
      <div>
        <p className="text-monokai-green font-semibold mb-1">Ejemplo (PubMed):</p>
        <p className="text-monokai-subtle text-xs bg-monokai-sidebar p-2 rounded">
          (("Type 2 Diabetes Mellitus"[Mesh] OR T2DM OR "Diabetes Mellitus, Non-Insulin-Dependent" OR NIDDM OR "Adult-Onset Diabetes")) AND (Metformin[Mesh] OR Metformin OR Glucophage OR Biguanides)
        </p>
      </div>
      <div>
        <p className="text-monokai-orange font-semibold mb-1">Ejemplo (Semantic Scholar):</p>
        <p className="text-monokai-subtle text-xs bg-monokai-sidebar p-2 rounded">
          (Type 2 Diabetes Mellitus OR T2DM) AND (Metformin) AND (Cardiovascular Risk)
        </p>
      </div>
      <div>
        <p className="text-monokai-purple font-semibold mb-1">Ejemplo (Crossref/ArXiv):</p>
        <p className="text-monokai-subtle text-xs bg-monokai-sidebar p-2 rounded">
          Type 2 diabetes treatment with metformin
        </p>
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
        <h1 className="text-4xl font-bold text-monokai-pink">Módulo 1: Definición PICO</h1>
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
            label="Estrategia ArXiv / Crossref (Términos clave)"
            db="arxivCrossref"
            placeholder="Ej: Type 2 diabetes treatment with metformin cardiovascular outcomes"
            color="text-monokai-blue"
          />
        </div>
      </div>
    </motion.div>
  );
};

const ModuleSearch = () => {
  const { state, dispatch } = useProject();
  const [activeTab, setActiveTab] = useState('pico');
  const [quickSearchTerm, setQuickSearchTerm] = useState('');

  const handleSearchPICO = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const results = await apiClient.mockSearchAPI(state.searchStrategies);
      dispatch({ type: 'LOAD_PROJECT_ARTICLES', payload: results });
    } catch (error) {
      console.error('Error en búsqueda:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleQuickSearch = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const results = await apiClient.mockSearchAPI({ quickSearch: quickSearchTerm });
      dispatch({ type: 'LOAD_PROJECT_ARTICLES', payload: results });
    } catch (error) {
      console.error('Error en búsqueda rápida:', error);
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
      <h1 className="text-4xl font-bold text-monokai-green mb-6">Módulo 2: Búsqueda Bibliográfica</h1>

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
                  Estrategia ArXiv / Crossref
                </label>
                <textarea
                  value={state.searchStrategies.arxivCrossref}
                  disabled
                  className="w-full h-16 bg-monokai-dark text-monokai-subtle rounded-lg p-3 border border-monokai-subtle border-opacity-30 resize-none"
                />
              </div>
            </div>

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
            <p className="text-sm text-monokai-subtle mb-4">
              Se encontraron {state.projectArticles.length} artículos
            </p>
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
      <h1 className="text-4xl font-bold text-monokai-yellow mb-6">Módulo 3: Cribado de Estudios</h1>

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

  // Calcular estadísticas
  const forReview = state.projectArticles.filter((a) => a.status === 'included_title');
  const included = state.projectArticles.filter((a) => a.status === 'included_final');
  const excluded = state.projectArticles.filter((a) => a.status === 'excluded_fulltext');
  const nextArticle = forReview.length > 0 ? forReview[0] : null;

  const handleIncludeFinal = () => {
    if (nextArticle) {
      dispatch({
        type: 'UPDATE_ARTICLE_STATUS',
        payload: { articleId: nextArticle.uniqueId, newStatus: 'included_final' },
      });
    }
  };

  const handleExcludeWithReason = (reason) => {
    if (nextArticle) {
      dispatch({
        type: 'UPDATE_ARTICLE_STATUS',
        payload: {
          articleId: nextArticle.uniqueId,
          newStatus: 'excluded_fulltext',
          reason,
        },
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
      <h1 className="text-4xl font-bold text-monokai-blue mb-6">Módulo 4: Evaluación de Elegibilidad</h1>

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
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-monokai-pink text-monokai-text font-semibold rounded-lg hover:shadow-monokai-pink transition-all"
                >
                  <X className="w-5 h-5" />
                  {reason}
                </motion.button>
              ))}
            </div>
          </div>
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
      <h1 className="text-4xl font-bold text-monokai-purple mb-8">Módulo 5: Reporte PRISMA 2020</h1>

      {/* Sección 1: Diagrama PRISMA Visual */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-monokai-purple mb-8">Diagrama de Flujo PRISMA 2020</h2>

        <div className="space-y-6">
          {/* Etapa 1: Identificación */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0 }}
            className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-green"
          >
            <h3 className="text-lg font-bold text-monokai-green mb-3">Identificación</h3>
            <p className="text-monokai-text mb-2">
              Registros identificados en bases de datos (n = <span className="font-bold text-monokai-yellow">{countTotalIdentified}</span>)
            </p>
            <p className="text-monokai-subtle text-sm">
              Resultados de búsqueda en PubMed, Semantic Scholar, ArXiv/Crossref
            </p>
          </motion.div>

          {/* Flecha 1 */}
          <div className="flex justify-center">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ArrowDown className="w-6 h-6 text-monokai-green" />
            </motion.div>
          </div>

          {/* Etapa 2: Cribado */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-yellow"
          >
            <h3 className="text-lg font-bold text-monokai-yellow mb-3">Cribado</h3>
            <div className="space-y-2">
              <p className="text-monokai-text mb-2">
                Registros después de eliminar duplicados (n = <span className="font-bold text-monokai-yellow">{countScreened}</span>)
              </p>
              <p className="text-monokai-subtle text-sm">
                Duplicados removidos: <span className="font-bold text-monokai-pink">{countDuplicates}</span>
              </p>
              <p className="text-monokai-text mt-3">
                Registros excluidos por título/resumen (n = <span className="font-bold text-monokai-pink">{countExcludedTitle}</span>)
              </p>
              <p className="text-monokai-subtle text-sm">
                Registros para revisión de texto completo: <span className="font-bold text-monokai-blue">{countFullText}</span>
              </p>
            </div>
          </motion.div>

          {/* Flecha 2 */}
          <div className="flex justify-center">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            >
              <ArrowDown className="w-6 h-6 text-monokai-yellow" />
            </motion.div>
          </div>

          {/* Etapa 3: Elegibilidad */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-blue"
          >
            <h3 className="text-lg font-bold text-monokai-blue mb-3">Elegibilidad</h3>
            <div className="space-y-2">
              <p className="text-monokai-text mb-2">
                Registros evaluados para elegibilidad (n = <span className="font-bold text-monokai-blue">{countFullText}</span>)
              </p>
              <p className="text-monokai-subtle text-sm">
                Registros excluidos con motivo: <span className="font-bold text-monokai-pink">{countExcludedFullText}</span>
              </p>
            </div>
          </motion.div>

          {/* Flecha 3 */}
          <div className="flex justify-center">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
            >
              <ArrowDown className="w-6 h-6 text-monokai-blue" />
            </motion.div>
          </div>

          {/* Etapa 4: Incluidos */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-monokai-sidebar p-6 rounded-lg border-2 border-monokai-green"
          >
            <h3 className="text-lg font-bold text-monokai-green mb-3">Incluidos</h3>
            <p className="text-monokai-text">
              Estudios incluidos en la revisión (n = <span className="font-bold text-monokai-green">{countIncludedFinal}</span>)
            </p>
          </motion.div>
        </div>
      </div>

      {/* Sección 2: Exportación de Datos */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-monokai-purple mb-6">Exportar Reporte</h2>
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-blue text-monokai-text font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            <Download className="w-5 h-5" />
            Exportar Estadísticas (JSON)
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-green text-monokai-dark font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            <Download className="w-5 h-5" />
            Exportar Estudios Incluidos (CSV)
          </motion.button>
        </div>
      </div>

      {/* Sección 3: Lista de Estudios Incluidos */}
      <div>
        <h2 className="text-2xl font-bold text-monokai-purple mb-6">
          Estudios Incluidos en la Revisión (n = <span className="text-monokai-green">{countIncludedFinal}</span>)
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

  const handleAddRow = () => {
    dispatch({ type: 'ADD_EXTRACTION_ROW' });
  };

  const handleCellChange = (rowIndex, columnId, value) => {
    dispatch({
      type: 'UPDATE_EXTRACTION_CELL',
      payload: { rowIndex, columnId, value },
    });
  };

  const handleExecuteMetaAnalysis = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const results = await apiClient.mockMetaAnalysisAPI(state.extractionData);
      dispatch({ type: 'SET_META_ANALYSIS_RESULTS', payload: results });
    } catch (error) {
      console.error('Error en meta-análisis:', error);
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
      <h1 className="text-4xl font-bold text-monokai-orange mb-8">Módulo 6: Meta-Análisis</h1>

      {/* Sección 1: Tabla de Extracción de Datos */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-monokai-orange mb-6">Extracción de Datos</h2>

        <div className="overflow-x-auto bg-monokai-sidebar rounded-lg border border-monokai-subtle border-opacity-30">
          <table className="w-full divide-y divide-monokai-subtle divide-opacity-30">
            <thead className="bg-monokai-dark">
              <tr>
                {state.extractionColumns.map((col) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-left text-sm font-semibold text-monokai-yellow"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-monokai-subtle divide-opacity-30">
              {state.extractionData.map((row, rowIndex) => (
                <tr key={row.id} className="hover:bg-monokai-dark transition-colors">
                  {state.extractionColumns.map((col) => (
                    <td key={`${row.id}-${col.id}`} className="px-4 py-3">
                      <input
                        type="text"
                        value={row[col.id] || ''}
                        onChange={(e) => handleCellChange(rowIndex, col.id, e.target.value)}
                        placeholder={col.label}
                        className="w-full bg-monokai-sidebar text-monokai-text placeholder-monokai-subtle rounded px-2 py-1 border border-monokai-subtle border-opacity-30 focus:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-monokai-orange focus:ring-opacity-30"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Botón Añadir Fila */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddRow}
          className="mt-4 flex items-center gap-2 px-6 py-3 bg-monokai-orange text-monokai-dark font-semibold rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Añadir Fila
        </motion.button>
      </div>

      {/* Sección 2: Ejecutar Análisis */}
      <div className="mb-12">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExecuteMetaAnalysis}
          disabled={state.isLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-monokai-blue text-monokai-text font-bold rounded-lg hover:shadow-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BarChart3 className="w-6 h-6" />
          Ejecutar Meta-Análisis (Simulado)
        </motion.button>
      </div>

      {/* Sección 3: Resultados del Meta-Análisis */}
      {state.isLoading ? (
        <LoadingSpinner />
      ) : state.metaAnalysisResults ? (
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
                <p className="text-2xl font-bold text-monokai-yellow">{state.metaAnalysisResults.metrics.i2}</p>
              </div>
              <div>
                <p className="text-sm text-monokai-subtle mb-1">Q (Estadístico)</p>
                <p className="text-2xl font-bold text-monokai-yellow">{state.metaAnalysisResults.metrics.q}</p>
              </div>
              <div>
                <p className="text-sm text-monokai-subtle mb-1">P-value</p>
                <p className="text-2xl font-bold text-monokai-yellow">{state.metaAnalysisResults.metrics.p_value}</p>
              </div>
              <div>
                <p className="text-sm text-monokai-subtle mb-1">Heterogeneidad</p>
                <p className="text-2xl font-bold text-monokai-yellow">{state.metaAnalysisResults.metrics.heterogeneity}</p>
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
                src={state.metaAnalysisResults.forestPlotUrl}
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
                src={state.metaAnalysisResults.funnelPlotUrl}
                alt="Funnel Plot"
                className="w-full rounded-lg"
              />
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-12 bg-monokai-sidebar rounded-lg border border-monokai-subtle border-opacity-30">
          <p className="text-monokai-subtle">
            Ingresa los datos de los estudios y haz clic en "Ejecutar Meta-Análisis" para ver los resultados.
          </p>
        </div>
      )}
    </motion.div>
  );
};

const ModuleGraphAnalysis = () => {
  const { state, dispatch } = useProject();

  // Estilos Monokai para Cytoscape
  const graphStylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#78DCE8',
        'label': 'data(label)',
        'color': '#F8F8F2',
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': '40px',
        'height': '40px',
        'border-width': '2px',
        'border-color': '#75715E',
      },
    },
    {
      selector: 'node[type="author"]',
      style: {
        'background-color': '#FF6188',
        'width': '50px',
        'height': '50px',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#75715E',
        'curve-style': 'bezier',
        'target-arrow-color': '#75715E',
        'target-arrow-shape': 'none',
      },
    },
  ];

  // Layout de fuerza dirigida (COSE)
  const graphLayout = {
    name: 'cose',
    animate: true,
    fit: true,
    padding: 20,
    nodeSpacing: 10,
    gravity: 1,
    friction: 0.8,
  };

  const handleGenerateGraph = async () => {
    dispatch({ type: 'SET_LOADING_GRAPH', payload: true });
    try {
      const elements = await apiClient.mockGraphAPI();
      dispatch({ type: 'SET_GRAPH_ELEMENTS', payload: elements });
    } catch (error) {
      console.error('Error generando grafo:', error);
    } finally {
      dispatch({ type: 'SET_LOADING_GRAPH', payload: false });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-4xl font-bold text-monokai-pink mb-8">Módulo 7: Análisis de Redes Bibliométricas</h1>

      {/* Sección 1: Controles */}
      <div className="mb-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGenerateGraph}
          disabled={state.isLoadingGraph}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-monokai-blue text-monokai-text font-bold rounded-lg hover:shadow-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Share2 className="w-6 h-6" />
          Generar Grafo de Co-autores (Simulado)
        </motion.button>
      </div>

      {/* Sección 2: Visualización del Grafo */}
      <div className="relative w-full h-[70vh] bg-monokai-sidebar rounded-lg border border-monokai-subtle border-opacity-30 overflow-hidden">
        {state.isLoadingGraph ? (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-monokai-dark bg-opacity-50">
            <LoadingSpinner />
          </div>
        ) : state.graphElements.length > 0 ? (
          <CytoscapeComponent
            elements={state.graphElements}
            style={{ width: '100%', height: '100%' }}
            stylesheet={graphStylesheet}
            layout={graphLayout}
            wheelSensitivity={0.1}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-monokai-subtle">
              Haz clic en "Generar Grafo" para visualizar la red de co-autores
            </p>
          </div>
        )}
      </div>
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
        <h2 className="text-2xl font-bold text-monokai-pink shadow-monokai-pink">
          MetaPiqma
        </h2>
        <p className="text-xs text-monokai-subtle mt-1">v0.1.0</p>
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

const Header = () => {
  const { state, dispatch } = useProject();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-monokai-sidebar border-b border-monokai-pink border-opacity-20 flex items-center px-6 z-30">
      <button
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="p-2 hover:bg-monokai-dark rounded-lg transition-colors"
      >
        {state.sidebarOpen ? (
          <X className="w-6 h-6 text-monokai-pink" />
        ) : (
          <Menu className="w-6 h-6 text-monokai-pink" />
        )}
      </button>
      <h1 className="ml-4 text-lg font-semibold text-monokai-text">MetaPiqma</h1>
    </header>
  );
};

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
    <main className="ml-64 mt-16 h-[calc(100vh-64px)] overflow-y-auto">
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
      <Header />
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
