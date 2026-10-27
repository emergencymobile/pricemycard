import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Sync the 'dark' class on <html> with the system color-scheme preference so
// the WebView follows the device's light/dark setting automatically.
const mql = window.matchMedia('(prefers-color-scheme: dark)');
const applyColorScheme = (isDark) => {
  document.documentElement.classList.toggle('dark', isDark);
};
applyColorScheme(mql.matches);
mql.addEventListener('change', (e) => applyColorScheme(e.matches));

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)