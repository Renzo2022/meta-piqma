import React, { useReducer, createContext, useContext, useState } from 'react';
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
} from 'lucide-react';
import './index.css';

// ============================================================================
// CONTEXT Y REDUCER (El "Cerebro" de la Aplicación)
// ============================================================================

const ProjectContext = createContext();

const initialState = {
  currentPage: 'pico',
  sidebarOpen: true,
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
  isLoading: false,
  searchResults: [],
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
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
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
// SERVICIO API (Stub para compatibilidad R/Python)
// ============================================================================

const apiClient = {
  async mockSearchAPI(strategies) {
    // Simula una espera de 2 segundos
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Devuelve los artículos mock
    return mockArticles;
  },
  
  async fetchScreeningData() {
    console.log('Fetching screening data...');
  },
  async fetchEligibilityData() {
    console.log('Fetching eligibility data...');
  },
  async fetchMetaAnalysisData() {
    console.log('Fetching meta-analysis data...');
  },
  async fetchGraphAnalysisData() {
    console.log('Fetching graph analysis data...');
  },
};

// ============================================================================
// COMPONENTES REUTILIZABLES
// ============================================================================

const LoadingSpinner = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center justify-center py-12"
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      className="w-12 h-12 border-4 border-monokai-pink border-t-monokai-green rounded-full"
    />
    <p className="text-monokai-subtle mt-4">Buscando artículos...</p>
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
        <span className="ml-4 px-3 py-1 bg-monokai-dark rounded-full text-xs font-semibold text-monokai-green whitespace-nowrap">
          {article.source}
        </span>
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
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
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
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
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
        ) : state.searchResults.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-monokai-subtle mb-4">
              Se encontraron {state.searchResults.length} artículos
            </p>
            <AnimatePresence>
              {state.searchResults.map((article) => (
                <ArticleCard key={article.id} article={article} />
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

const ModuleScreening = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <h1 className="text-4xl font-bold text-monokai-yellow mb-4">Cribado de Estudios</h1>
    <p className="text-monokai-subtle">
      Cribado por título y resumen, seguido de cribado a texto completo
    </p>
  </motion.div>
);

const ModuleEligibility = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <h1 className="text-4xl font-bold text-monokai-blue mb-4">Evaluación de Elegibilidad</h1>
    <p className="text-monokai-subtle">
      Evaluación detallada de criterios de inclusión/exclusión
    </p>
  </motion.div>
);

const ModulePRISMA = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <h1 className="text-4xl font-bold text-monokai-purple mb-4">Reporte PRISMA</h1>
    <p className="text-monokai-subtle">
      Generación automática del reporte PRISMA 2020
    </p>
  </motion.div>
);

const ModuleMetaAnalysis = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <h1 className="text-4xl font-bold text-monokai-orange mb-4">Meta-Análisis</h1>
    <p className="text-monokai-subtle">
      Análisis estadístico combinado de múltiples estudios
    </p>
  </motion.div>
);

const ModuleGraphAnalysis = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <h1 className="text-4xl font-bold text-monokai-pink mb-4">Análisis de Grafos</h1>
    <p className="text-monokai-subtle">
      Visualización y análisis de redes de estudios y conceptos
    </p>
  </motion.div>
);

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
// COMPONENTE APP (Contenedor principal)
// ============================================================================

export default function App() {
  return (
    <ProjectProvider>
      <div className="min-h-screen bg-monokai-bg text-monokai-text">
        <Header />
        <Sidebar />
        <MainContent />
      </div>
    </ProjectProvider>
  );
}
