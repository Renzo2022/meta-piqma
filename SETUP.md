# 🚀 Guía de Instalación y Configuración - MetaPiqma

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación del Backend](#instalación-del-backend)
3. [Instalación del Frontend](#instalación-del-frontend)
4. [Configuración de Supabase](#configuración-de-supabase)
5. [Ejecución Local](#ejecución-local)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

## ✅ Requisitos Previos

### Software Requerido
- **Node.js** 16.x o superior ([descargar](https://nodejs.org/))
- **Python** 3.8 o superior ([descargar](https://www.python.org/))
- **Git** ([descargar](https://git-scm.com/))
- **npm** o **yarn** (incluido con Node.js)

### Cuentas Necesarias
- [GitHub](https://github.com) - Para clonar el repositorio
- [Supabase](https://supabase.com) - Base de datos y autenticación
- [Render.com](https://render.com) - Para deployment del backend (opcional)
- [Vercel](https://vercel.com) o [Netlify](https://netlify.com) - Para deployment del frontend (opcional)

### Verificar Instalación
```bash
# Verificar Node.js
node --version  # Debe ser v16.0.0 o superior

# Verificar npm
npm --version

# Verificar Python
python --version  # Debe ser 3.8 o superior

# Verificar Git
git --version
```

## 🔧 Instalación del Backend

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/Renzo2022/meta-piqma.git
cd meta-piqma
```

### Paso 2: Crear Entorno Virtual de Python
```bash
# En Windows
python -m venv venv
venv\Scripts\activate

# En macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Paso 3: Instalar Dependencias Python
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Paso 4: Crear Archivo .env
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
# Necesitarás:
# - SUPABASE_URL
# - SUPABASE_KEY
# - SUPABASE_SERVICE_KEY
```

### Paso 5: Verificar Instalación
```bash
python search_server.py
# Deberías ver: "Uvicorn running on http://127.0.0.1:8000"
```

## 📦 Instalación del Frontend

### Paso 1: Instalar Dependencias Node
```bash
npm install
```

### Paso 2: Crear Archivo .env.local
```bash
# Crear archivo
echo "" > .env.local

# Editar .env.local con:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Paso 3: Verificar Instalación
```bash
npm run build
# Deberías ver: "dist/index.html" y otros archivos compilados
```

## 🗄️ Configuración de Supabase

### Paso 1: Crear Proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com)
2. Hacer clic en "New Project"
3. Llenar formulario:
   - **Name**: meta-piqma
   - **Database Password**: (guardar en lugar seguro)
   - **Region**: Elegir más cercana
4. Esperar a que se cree el proyecto (5-10 minutos)

### Paso 2: Obtener Credenciales
1. Ir a **Settings** → **API**
2. Copiar:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_KEY`

### Paso 3: Crear Tablas
```sql
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de proyectos
CREATE TABLE public.projects (
    id bigserial PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Tabla de artículos
CREATE TABLE public.articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    project_id bigint NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    authors text[] DEFAULT ARRAY[]::text[],
    source text,
    year integer,
    abstract text,
    url text,
    status text DEFAULT 'unscreened',
    CONSTRAINT articles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- 3. Tabla de meta-análisis
CREATE TABLE public.meta_analysis_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    project_id bigint NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    article_id text NOT NULL,
    n_intervention integer,
    mean_intervention numeric,
    sd_intervention numeric,
    n_control integer,
    mean_control numeric,
    sd_control numeric,
    CONSTRAINT meta_analysis_data_unique_article UNIQUE(article_id),
    CONSTRAINT meta_analysis_data_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- 4. Crear índices
CREATE INDEX idx_articles_project_id ON public.articles(project_id);
CREATE INDEX idx_meta_analysis_project_id ON public.meta_analysis_data(project_id);

-- 5. Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_analysis_data ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS
CREATE POLICY "Enable read for authenticated users" ON public.projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.projects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.projects FOR DELETE USING (auth.role() = 'authenticated');

-- Repetir para articles y meta_analysis_data...
```

### Paso 4: Configurar Autenticación
1. Ir a **Authentication** → **Providers**
2. Habilitar "Email" (por defecto está habilitado)
3. Configurar URL de redirección:
   - Agregar `http://localhost:5173` para desarrollo
   - Agregar tu URL de producción

## 🏃 Ejecución Local

### Terminal 1: Backend
```bash
# Asegúrate de estar en el directorio raíz
cd meta-piqma

# Activar entorno virtual (si no está activo)
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Ejecutar servidor
python search_server.py

# Deberías ver:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     Application startup complete
```

### Terminal 2: Frontend
```bash
# Asegúrate de estar en el directorio raíz
cd meta-piqma

# Ejecutar servidor de desarrollo
npm run dev

# Deberías ver:
# VITE v4.3.9  ready in 234 ms
# ➜  Local:   http://localhost:5173/
```

### Acceder a la Aplicación
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs

## 🌍 Deployment

### Backend (Render.com)

1. **Crear cuenta en Render.com**
2. **Conectar repositorio GitHub**
3. **Crear nuevo Web Service**:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn search_server:app --host 0.0.0.0 --port $PORT`
4. **Agregar variables de entorno**:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_KEY`
5. **Deploy**

### Frontend (Vercel)

1. **Crear cuenta en Vercel.com**
2. **Conectar repositorio GitHub**
3. **Configurar proyecto**:
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Agregar variables de entorno**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy**

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'fastapi'"
```bash
# Solución: Instalar dependencias
pip install -r requirements.txt
```

### Error: "Cannot find module 'react'"
```bash
# Solución: Instalar dependencias
npm install
```

### Error: "SUPABASE_URL is not defined"
```bash
# Solución: Crear archivo .env con credenciales
cp .env.example .env
# Editar .env con tus valores
```

### Error: "Port 8000 already in use"
```bash
# Solución: Cambiar puerto
python search_server.py --port 8001
```

### Error: "Port 5173 already in use"
```bash
# Solución: Vite usa automáticamente el siguiente puerto disponible
# O cambiar manualmente en vite.config.js
```

### Error: "CORS error" en navegador
```bash
# Solución: Verificar que el backend está corriendo
# Y que las URLs en .env.local son correctas
```

## ✅ Verificación Final

```bash
# 1. Backend está corriendo
curl http://localhost:8000/health

# 2. Frontend está corriendo
curl http://localhost:5173

# 3. Supabase está conectado
# Ir a http://localhost:5173 y intentar login

# 4. Base de datos está configurada
# Ir a Supabase Dashboard y verificar tablas
```

## 📞 Soporte

Si tienes problemas:
1. Revisar [Troubleshooting](#troubleshooting)
2. Consultar [README.md](./README.md)
3. Abrir un [Issue en GitHub](https://github.com/Renzo2022/meta-piqma/issues)

---

**Última actualización**: Noviembre 2025
