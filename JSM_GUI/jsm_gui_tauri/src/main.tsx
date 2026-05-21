import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { initI18n } from './i18n'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

const root = ReactDOM.createRoot(rootElement)

const App = React.lazy(async () => {
  const [appModule] = await Promise.all([
    import('./App.tsx'),
    initI18n().catch((error) => {
      console.error('Failed to initialize i18n', error)
    }),
  ])
  return appModule
})

const bootFallback = (
  <div className="boot-shell" data-capture-ignore="true">
    <div className="boot-card">
      <div className="boot-mark">JSM</div>
      <div className="boot-copy">
        <div className="boot-title">JoyShockMapper Custom Curve</div>
        <div className="boot-subtitle">Loading interface...</div>
      </div>
    </div>
  </div>
)

root.render(
  <React.StrictMode>
    <React.Suspense fallback={bootFallback}>
      <App />
    </React.Suspense>
  </React.StrictMode>,
)
