import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider }  from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import App from './App'
import './index.css'
import { pingBackend } from './lib/api'

pingBackend() // wake up Render free tier on app start

// Apply saved theme before first paint (avoids flash)
const saved = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const dark = saved ? saved === 'dark' : prefersDark
document.documentElement.classList.add(dark ? 'dark' : 'light')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
