import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { User, Edit, Trash2, PlusCircle } from 'lucide-react'

const actionIcons = {
  "Created": <PlusCircle className="h-5 w-5 text-green-500" />,
  "Updated": <Edit className="h-5 w-5 text-blue-500" />,
  "Deleted": <Trash2 className="h-5 w-5 text-red-500" />,
}

const ActivityLog = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/activity-log')
      .then(response => setLogs(response.data))
      .catch(error => console.error("Failed to fetch activity logs", error))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center items-center h-64"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">A trail of all recent actions performed in the system.</p>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {logs.map((log, index) => (
          <motion.li key={log.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="p-6 flex items-start space-x-4">
            <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full p-3">
              {actionIcons[log.action.split(' ')[0]] || <User className="h-5 w-5 text-gray-500" />}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-800 dark:text-gray-200">
                <span className="font-semibold">{log.user_email || 'System'}</span>
                {' '}{log.action.toLowerCase()}{' '}
                <span className="font-semibold">{log.details?.name}</span>.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {/* FIX: Explicitly parse the timestamp string */}
                {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
              </p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

export default ActivityLog