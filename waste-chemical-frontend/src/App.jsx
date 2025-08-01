import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import WasteManagement from './components/WasteManagement'
import ChemicalManagement from './components/ChemicalManagement'
import Analytics from './components/Analytics'
import Exports from './components/Exports'
import ActivityLog from './components/ActivityLog'
import UserManagement from './components/UserManagement' // Import new page
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/waste" element={<WasteManagement />} />
                      <Route path="/chemicals" element={<ChemicalManagement />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/activity-log" element={<ActivityLog />} />
                      <Route path="/exports" element={<Exports />} />
                      <Route path="/user-management" element={<UserManagement />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App