# 🚀 Instrucciones para Arreglar el Deployment en Render

## ⚠️ PROBLEMA ACTUAL

Render está usando el comando antiguo `npm run preview` en lugar del nuevo `npm start`.

## ✅ SOLUCIÓN

### Paso 1: Ve a tu Dashboard de Render
1. Abre https://dashboard.render.com
2. Selecciona tu servicio `meta-piqma-app`

### Paso 2: Actualiza el Start Command
1. Ve a **Settings** (engranaje en la esquina superior derecha)
2. Busca **Start Command**
3. Reemplaza lo que hay con:
   ```
   npm start
   ```
4. Haz clic en **Save Changes**

### Paso 3: Actualiza el Build Command (opcional pero recomendado)
1. En la misma sección de **Settings**
2. Busca **Build Command**
3. Reemplaza con:
   ```
   npm ci && npm run build
   ```
4. Haz clic en **Save Changes**

### Paso 4: Redeploy
1. Ve a la sección **Deploys**
2. Haz clic en el botón **Deploy latest commit** (o similar)
3. Espera a que termine

---

## 📋 Checklist de Variables de Entorno

En **Environment** (en Settings), verifica que tengas:

- [ ] `VITE_SUPABASE_URL` = `https://quyvxrcjjhamxhiidjbx.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = Tu clave (la larga con JWT)
- [ ] `VITE_SEARCH_SERVER_URL` = `https://meta-piqma-search.onrender.com`
- [ ] `NODE_ENV` = `production` (opcional)

Si falta alguna, agrégala y guarda.

---

## 🔍 Verificar que funciona

Después del deploy:

1. **Abre tu URL de Render** (ej: `https://meta-piqma-app.onrender.com`)
2. Deberías ver la landing page con:
   - Título "MetaPiqma" en gradiente
   - Flujo de trabajo con 7 iconos
3. **Abre la consola del navegador** (F12)
   - No debería haber errores rojos
   - Deberías ver logs de conexión a Supabase

---

## 🐛 Si aún no funciona

### Opción 1: Forzar redeploy
1. Ve a **Settings** → **Build & Deploy**
2. Haz clic en **Clear build cache**
3. Luego haz clic en **Deploy latest commit**

### Opción 2: Revisar los logs
1. Ve a **Logs** en el dashboard
2. Busca errores (líneas rojas)
3. Si ves `npm: command not found`, significa que Node.js no está instalado
4. Si ves `Cannot find module 'express'`, significa que npm install no corrió

### Opción 3: Contactar soporte de Render
- Ve a https://render.com/support
- Describe que el Start Command no se está ejecutando

---

## ✨ Resumen

| Paso | Acción | Estado |
|------|--------|--------|
| 1 | Ir a Render Dashboard | ⏳ |
| 2 | Cambiar Start Command a `npm start` | ⏳ |
| 3 | Cambiar Build Command a `npm ci && npm run build` | ⏳ |
| 4 | Verificar variables de entorno | ⏳ |
| 5 | Hacer redeploy | ⏳ |
| 6 | Esperar 2-3 minutos | ⏳ |
| 7 | Abrir URL y verificar | ⏳ |

---

## 📞 Soporte

Si tienes dudas:
1. Revisa los logs en Render Dashboard
2. Verifica que todas las variables estén correctas
3. Intenta hacer un redeploy con "Clear build cache"
