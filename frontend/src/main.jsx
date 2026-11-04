import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initOfflineSupport } from './offlineMock.js'
import { initRealtimeSync } from './realtimeSync.js'

// Initialize 24/7 offline mobile fallback & multi-device realtime synchronization
initOfflineSupport()
initRealtimeSync()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
