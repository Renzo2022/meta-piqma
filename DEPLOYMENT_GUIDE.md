# 🚀 Guía de Deployment - MetaPiqma

## OPCIÓN 1: Desplegar en Netlify (Recomendado - Gratis)

### Paso 1: Instalar Netlify CLI
```bash
npm install -g netlify-cli
```

### Paso 2: Autenticarse con Netlify
```bash
netlify login
```
- Se abrirá tu navegador
- Inicia sesión con tu cuenta de Netlify (o crea una gratis)
- Autoriza la CLI

### Paso 3: Desplegar la aplicación
```bash
netlify deploy --prod
```

**Opciones:**
- `--prod`: Despliega a producción (URL final)
- Sin `--prod`: Despliega a preview (URL temporal para probar)

### Paso 4: Configurar variables de entorno
En Netlify Dashboard:
1. Ve a tu sitio → **Site Settings** → **Build & Deploy** → **Environment**
2. Agrega estas variables:
   ```
   VITE_SUPABASE_URL = https://quyvxrcjjhamxhiidjbx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_SEARCH_SERVER_URL = https://meta-piqma-search.onrender.com
   ```

### Paso 5: Redeploy
```bash
netlify deploy --prod
```

**Tu sitio estará en:** `https://meta-piqma-app.netlify.app`

---

## OPCIÓN 2: Desplegar en Vercel (Alternativa)

### Paso 1: Instalar Vercel CLI
```bash
npm install -g vercel
```

### Paso 2: Desplegar
```bash
vercel --prod
```

### Paso 3: Configurar variables en Vercel Dashboard
- Project Settings → Environment Variables
- Agrega las 3 variables (VITE_*)

---

## OPCIÓN 3: Desplegar en Render (Como tu backend)

### Paso 1: Crear nuevo servicio web en Render
1. Ve a https://render.com
2. Click en **New +** → **Web Service**
3. Conecta tu repositorio GitHub

### Paso 2: Configurar el servicio
- **Name:** `meta-piqma-app`
- **Environment:** `Node`
- **Build Command:** `npm run build`
- **Start Command:** `npm run preview` (o `npm run build && npm run preview`)
- **Publish Directory:** `dist`

### Paso 3: Agregar variables de entorno
En Render Dashboard:
- Environment → Agrega las 3 variables (VITE_*)

### Paso 4: Deploy
Render desplegará automáticamente cuando hagas push a main

---

## 📋 Checklist Pre-Deployment

- [ ] `netlify.toml` creado ✅
- [ ] `.env` configurado con URLs correctas ✅
- [ ] Backend en Render funcionando: https://meta-piqma-search.onrender.com
- [ ] Supabase configurado y accesible
- [ ] `npm run build` funciona localmente
- [ ] Git push realizado

---

## 🧪 Verificar después del deployment

1. **Frontend carga correctamente**
   - Abre tu URL de Netlify/Vercel/Render
   - Deberías ver la landing page con el flujo de trabajo

2. **Backend conecta correctamente**
   - Ve a Módulo 2 (Búsqueda)
   - Intenta buscar un artículo
   - Deberías ver resultados de PubMed, Semantic Scholar, etc.

3. **Supabase conecta correctamente**
   - Ve a Módulo 3 (Cribado)
   - Deberías ver los artículos que buscaste

4. **Grafos funcionan**
   - Ve a Módulo 7 (Grafos)
   - Haz clic en "Generar Red Bibliométrica"
   - Deberías ver un grafo con tus artículos

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'supabase'"
- Asegúrate de que `supabase==2.0.3` está en `requirements.txt`
- Redeploy el backend en Render

### Error: "VITE_SEARCH_SERVER_URL is undefined"
- Agrega las variables de entorno en el dashboard de tu plataforma
- Redeploy después de agregar las variables

### Error: "CORS error"
- El backend debe tener CORS habilitado (ya está en `search_server.py`)
- Verifica que `VITE_SEARCH_SERVER_URL` sea la URL correcta de Render

### Error: "Supabase connection failed"
- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` sean correctos
- Prueba conectar a Supabase desde tu máquina local

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en el dashboard de tu plataforma
2. Abre la consola del navegador (F12) para ver errores
3. Verifica que todas las URLs sean correctas

---

## ✅ Resumen Final

**Backend:** ✅ Ya en Render (https://meta-piqma-search.onrender.com)
**Frontend:** ⏳ Listo para desplegar en Netlify/Vercel/Render
**Base de Datos:** ✅ Supabase configurado

**Próximo paso:** Ejecuta el comando de deployment según tu plataforma elegida.
