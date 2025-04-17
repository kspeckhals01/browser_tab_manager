import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './index.css';
import { Toaster } from 'sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
        <App />
        <Toaster duration={2000} richColors position="top-center" closeButton />
  </StrictMode>,
)
