import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Falta el elemento #root en index.html')

createRoot(rootEl).render(
  <StrictMode>
    <div className="p-8">
      <h1 className="text-2xl font-bold">WordAlimentate</h1>
      <p className="mt-2 text-gray-500">Scaffold inicial — la app se construye en las siguientes tasks.</p>
    </div>
  </StrictMode>,
)
