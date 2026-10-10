import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErreurPage } from './components/ErreurPage'
import { queryClient } from './lib/queryClient'
import './styles/index.css'

const racine = document.getElementById('racine')
if (!racine) throw new Error('Élément #racine introuvable.')

createRoot(racine).render(
  <StrictMode>
    <ErreurPage cle="application" pleinePage>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErreurPage>
  </StrictMode>,
)
