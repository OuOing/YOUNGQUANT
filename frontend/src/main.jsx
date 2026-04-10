import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Show runtime errors on the page (helps debug "black screen" issues).
const ensureErrorOverlay = () => {
  const id = '__yq_error_overlay__'
  let el = document.getElementById(id)
  if (el) return el

  el = document.createElement('div')
  el.id = id
  el.style.position = 'fixed'
  el.style.top = '0'
  el.style.left = '0'
  el.style.right = '0'
  el.style.zIndex = '99999'
  el.style.background = 'rgba(255, 0, 0, 0.18)'
  el.style.color = '#fff'
  el.style.padding = '12px'
  el.style.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace'
  el.style.whiteSpace = 'pre-wrap'
  el.style.pointerEvents = 'none'
  el.style.display = 'none'
  document.body.appendChild(el)
  return el
}

const overlay = ensureErrorOverlay()
const showOverlay = (msg) => {
  overlay.textContent = msg || ''
  overlay.style.display = 'block'
}

window.addEventListener('error', (e) => {
  const err = e?.error || null
  const base = err?.stack || err?.message || String(e?.message || 'Unknown error')
  showOverlay([
    'Runtime error:',
    base,
    e?.filename ? `at ${e.filename}:${e.lineno}:${e.colno}` : '',
  ].filter(Boolean).join('\n'))
})

window.addEventListener('unhandledrejection', (e) => {
  const err = e?.reason
  const base = err?.stack || err?.message || String(err || 'Unknown rejection')
  showOverlay(['Unhandled rejection:', base].join('\n'))
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
