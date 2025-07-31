import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { AlertTriangle, Beaker, Trash2, X } from 'lucide-react'

const iconMap = {
  expiring: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  low_stock: <Beaker className="h-5 w-5 text-blue-500" />,
  pending_waste: <Trash2 className="h-5 w-5 text-red-500" />,
}

const NotificationsDropdown = ({ isOpen, onClose, setNotificationCount }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      api.get('/api/notifications')
        .then(response => {
          const data = response.data || []
          setNotifications(data)
          setNotificationCount(data.length)
        })
        .catch(error => {
          console.error("Failed to fetch notifications", error)
          setNotificationCount(0)
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, setNotificationCount])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-14 right-6 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50"
    >
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No new notifications.</div>
        ) : (
          <ul>
            {notifications.map(notif => (
              <li key={notif.id} className="border-b dark:border-gray-700 last:border-b-0">
                <Link to={notif.link} onClick={onClose} className="flex items-start p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex-shrink-0 mt-1">{iconMap[notif.type]}</div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{notif.message}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}

export default NotificationsDropdown