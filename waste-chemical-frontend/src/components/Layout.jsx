import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LogOut, Home, Trash2, Beaker, Menu, X, Moon, Sun, BarChart3, Download, Bell, BookUser
} from 'lucide-react'
import toast from 'react-hot-toast'
import NotificationsDropdown from './NotificationsDropdown'
import api from '../lib/api' // <-- THE FIX IS HERE

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/waste', icon: Trash2, label: 'Waste Mgmt' },
  { path: '/chemicals', icon: Beaker, label: 'Chemical Mgmt' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/activity-log', icon: BookUser, label: 'Activity Log' },
  { path: '/exports', icon: Download, label: 'Exports' },
]

const Sidebar = ({ sidebarOpen, setSidebarOpen, notificationCount, onBellClick }) => {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) return savedTheme === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const toggleDarkMode = () => setDarkMode(prevMode => !prevMode)

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between h-16 px-6 bg-indigo-600 dark:bg-indigo-700">
          <div className="flex items-center">
            <Beaker className="w-8 h-8 text-white" />
            <h1 className="ml-3 text-lg font-semibold text-white">WasteChem</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white hover:text-indigo-200">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`flex-shrink-0 w-5 h-5 mr-3 ${isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <button onClick={toggleDarkMode} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={onBellClick} className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">{user?.email?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.email}</p>
            </div>
            <button onClick={handleSignOut} className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const location = useLocation()
  const currentPage = navItems.find((item) => item.path === location.pathname) || {}

  useEffect(() => {
    api.get('/api/notifications').then(res => {
      if (res.data) {
        setNotificationCount(res.data.length)
      }
    }).catch(err => console.error("Could not fetch notification count:", err))
  }, [location]) // Re-fetch count on page navigation

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex h-screen">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} notificationCount={notificationCount} onBellClick={() => setNotificationsOpen(prev => !prev)} />
        <NotificationsDropdown isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} setNotificationCount={setNotificationCount} />
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between h-16 px-6">
              <div className="flex items-center">
                <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg lg:hidden">
                  <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white ml-2 lg:ml-0">{currentPage.label || 'Dashboard'}</h1>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout