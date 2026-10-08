# Boilerplate maison (copier-coller)

Inspiré du repo `melko_news`. Racine = `ui/` + `server/` (vierge tant que pas de
vision backend) + `README.md` + `TODO.md` + scripts + Docker.

## Arborescence

```
<Projet>/
├── ui/
│   ├── index.html · package.json · postcss.config.js · tailwind.config.js
│   ├── tsconfig.json · vite.config.ts
│   ├── public/favicon.svg  (+ assets optimisés, ex. robot-*.webp)
│   └── src/
│       ├── main.tsx · App.tsx
│       ├── styles/index.css
│       ├── state/animations.tsx           (contexte animations on/off)
│       ├── lib/  queryClient.ts · types.ts · api.ts (mock) · donneesDemo.ts · animations.ts
│       ├── components/  BarreSuperieure · RailLateral · Pilule · Composeur · Mascotte · BasculeAnimations
│       └── features/
│           ├── accueil/  PageAccueil · ZoneHeros · CarteFeature · BarreActions
│           └── conversation/  PageConversation · BulleMessage · SourcesCitees · IndicateurReflexion · useConversation
├── server/                (vierge : README « à définir »)
├── docker-compose.yml · Dockerfile · nginx.conf · .env.example
├── start-all.bat · stop-all.bat · deploy.bat
├── README.md · TODO.md · .gitignore
```

## ui/package.json (deps qui marchent ensemble, React 18)

```json
{
  "name": "<projet>-ui", "private": true, "version": "0.1.0", "type": "module",
  "scripts": { "dev": "vite", "build": "tsc -b && vite build", "preview": "vite preview",
    "lint": "tsc --noEmit", "test": "vitest run", "test:watch": "vitest" },
  "dependencies": {
    "@fontsource/instrument-serif": "^5.3.0", "@fontsource/inter": "^5.1.0",
    "@tanstack/react-query": "^5.62.7", "framer-motion": "^11.15.0",
    "lucide-react": "^0.468.0", "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": {
    "@testing-library/dom": "^10.4.1", "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2", "@types/node": "^26.1.1",
    "@types/react": "^18.3.12", "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4", "autoprefixer": "^10.4.20", "jsdom": "^25.0.1",
    "postcss": "^8.4.49", "tailwindcss": "^3.4.17", "typescript": "^5.6.3",
    "vite": "^5.4.11", "vitest": "^2.1.9" }
}
```

## tailwind.config.js (charte Melko — inchangée)

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'],
      display: ['"Instrument Serif"', 'Georgia', 'serif'] },
    colors: {
      encre: '#0E1A24', meta: '#5F6B73',
      papier: { DEFAULT: '#FAF8F4', 100: '#F4F1EA', 200: '#ECE8DE' },
      foret: { DEFAULT: '#3F8A3D', deep: '#2A5C29', soft: '#6FA86D', tint: '#EAF1E9' },
      saphir: { DEFAULT: '#1B5F8C', deep: '#0E3D5C', soft: '#4E83AB', tint: '#E6EDF3' } },
    borderRadius: { fenetre: '36px', carte: '28px', pilule: '999px' },
    boxShadow: {
      fenetre: '0 50px 120px -40px rgba(14,26,36,0.35)',
      carte: '0 24px 60px -30px rgba(14,26,36,0.28)',
      pilule: '0 1px 2px rgba(14,26,36,0.06)',
      bulle: '0 12px 30px -14px rgba(14,26,36,0.28)' } } },
  plugins: [],
}
```

## src/styles/index.css (fond + keyframes + garde reduced-motion)

```css
@tailwind base; @tailwind components; @tailwind utilities;

body { @apply min-h-screen font-sans text-encre antialiased;
  background:
    radial-gradient(60rem 42rem at 6% -12%, rgba(63,138,61,0.1), transparent 60%),
    radial-gradient(52rem 38rem at 104% 6%, rgba(27,95,140,0.1), transparent 60%),
    #faf8f4; }

.pilule { @apply inline-flex items-center gap-1.5 rounded-pilule bg-white px-4 py-2 text-sm font-medium text-encre shadow-pilule transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95; }
.pilule-active { @apply bg-encre text-white; }

@keyframes flotter { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes pulser { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:.85;transform:scale(1.06)} }
@keyframes tourner { to{transform:rotate(360deg)} }
@keyframes deriver { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(24px,-18px) scale(1.08)} }
@keyframes rebondir { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }

@media (prefers-reduced-motion: reduce) {
  *,*::before,*::after { animation: none !important; transition-duration: 0.01ms !important; } }
```

## vite.config.ts (host réseau + ports Melko + proxy /api)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 6009, strictPort: true,   // ← créneau Melko suivant
    proxy: { '/api': 'http://127.0.0.1:3009' } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' },
})
```

## tsconfig.json / postcss.config.js
`tsconfig` : `strict`, `noUnusedLocals`, `noUnusedParameters`, `jsx: react-jsx`,
`moduleResolution: bundler`, `types: ["vite/client","vitest/globals","@testing-library/jest-dom"]`.
`postcss` : `{ plugins: { tailwindcss: {}, autoprefixer: {} } }`.

## src/state/animations.tsx (contexte on/off + reduced-motion)

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
const Ctx = createContext<{ animations: boolean; basculer: () => void } | null>(null)
export function FournisseurAnimations({ children }: { children: ReactNode }) {
  const [animations, set] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia
      ? true : !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => { if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => set(!mq.matches); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f) }, [])
  const v = useMemo(() => ({ animations, basculer: () => set(x => !x) }), [animations])
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}
export function useAnimations() { const c = useContext(Ctx)
  if (!c) throw new Error('useAnimations hors FournisseurAnimations'); return c }
```

`main.tsx` : importer les fonts (`@fontsource/inter/{400..800}.css`,
`@fontsource/instrument-serif/{400,400-italic}.css`), envelopper `<App/>` dans
`<QueryClientProvider><FournisseurAnimations>`. `id` racine = `racine`.
`lib/queryClient.ts` : `new QueryClient({ defaultOptions:{ queries:{ staleTime:30_000, retry:1, refetchOnWindowFocus:false } } })`.

## start-all.bat (⚠️ AUCUN bloc parenthésé — voir pieges)

```bat
@echo off
chcp 65001 >nul
title <Projet> - Demarrage
echo.
echo  ============================================================
echo   <Projet> - demarrage complet
echo  ============================================================
echo.
echo [1/3] Prod Docker 6109 - optionnel...
where docker >nul 2>&1 && if exist "%~dp0docker-compose.yml" docker compose up -d >nul 2>&1
echo [2/3] Backend dev 3009 - si present...
if exist "%~dp0server\package.json" start "<Projet> BACKEND 3009" cmd /k "cd /d "%~dp0server" && npm run dev"
echo [3/3] Frontend dev 6009...
start "<Projet> VITE 6009" cmd /k "cd /d "%~dp0ui" && npm run dev"
echo.
echo  DEV  : http://localhost:6009
echo  Arret : .\stop-all.bat
echo.
timeout /t 4 /nobreak >nul
start "" "http://localhost:6009"
exit /b 0
```

## stop-all.bat

```bat
@echo off
chcp 65001 >nul
title <Projet> - Arret
echo Arret <Projet> - ports 3009 6009 + conteneur Docker
for %%p in (3009 6009) do (
  for /f "tokens=5" %%i in ('netstat -aon ^| findstr ":%%p " ^| findstr "LISTENING"') do (
    echo   Kill port %%p PID %%i
    taskkill /F /PID %%i >nul 2>&1 ) )
if exist "%~dp0docker-compose.yml" docker compose stop
echo Termine.
pause
exit /b 0
```

## deploy.bat + Dockerfile + nginx.conf + docker-compose.yml (prod = SPA statique nginx)

`deploy.bat` : `docker compose up -d --build` puis message ; `if errorlevel 1 (echo [ERREUR]... & pause & exit /b 1)` (echo sans parenthèses).

```dockerfile
# Dockerfile — build UI puis nginx statique (fallback SPA)
FROM node:22-slim AS ui-build
WORKDIR /build/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=ui-build /build/ui/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
server { listen 80; server_name _; root /usr/share/nginx/html; index index.html;
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location / { try_files $uri $uri/ /index.html; } }
```

```yaml
services:
  <projet>:
    build: { context: ., dockerfile: Dockerfile }
    image: <projet>:prod
    ports: [ "${<PROJET>_PORT:-6109}:80" ]
    restart: unless-stopped
```

## .gitignore
`node_modules/`, `.env` + `.env.*` (sauf `.env.example`), `dist/`, `ui/dist/`, `*.log`,
`.DS_Store`, **les gros assets sources** (`/*.eps`, gros `.jpg` d'origine).
⚠️ **Ne PAS ignorer `Template/`** : c'est le dossier d'entrée de design (les images que
la skill lit). Le versionner si les images sont utiles et légères ; sinon n'exclure que
les originaux lourds, pas le dossier entier.
