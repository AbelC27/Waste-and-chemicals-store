import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts'
import api from '../lib/api'
import { Package, Beaker, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const Analytics = () => {
  // ... (state and other functions)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ waste: [], chemicals: [] })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wasteRes, chemicalRes] = await Promise.all([api.get('/api/waste'), api.get('/api/chemicals')])
        setData({ waste: wasteRes.data || [], chemicals: chemicalRes.data || [] })
      } catch (error) { console.error('Failed to fetch analytics data', error) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const processMonthlyData = () => {
    const monthlyData = {}
    const allItems = [...(data.waste || []), ...(data.chemicals || [])]
    allItems.forEach((item) => {
      if (item.created_at) {
        // FIX: Explicitly parse the timestamp string
        const month = format(parseISO(item.created_at), 'MMM yyyy')
        if (!monthlyData[month]) {
          monthlyData[month] = { name: month, waste: 0, chemicals: 0 }
        }
        if (item.hasOwnProperty('sds_link')) {
          monthlyData[month].chemicals += 1
        } else {
          monthlyData[month].waste += 1
        }
      }
    })
    return Object.values(monthlyData).sort((a, b) => new Date(a.name) - new Date(b.name))
  }
  // ... (rest of the component is the same)
  const getWasteStatusData = () => {
    const statusCounts = (data.waste || []).reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})
    return Object.entries(statusCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
  }

  const getChemicalCategoryData = () => {
    const categoryCounts = (data.chemicals || []).reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {})
    return Object.entries(categoryCounts).map(([name, value]) => ({ name, value }))
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  if (loading) return <div className="flex justify-center items-center h-64"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Waste Items" value={data.waste.length} icon={Package} color="green" />
        <StatCard title="Total Chemicals" value={data.chemicals.length} icon={Beaker} color="blue" />
        <StatCard title="Pending Waste" value={data.waste.filter((w) => w.status === 'pending').length} icon={Clock} color="yellow" />
      </div>
      <ChartCard title="Monthly Activity">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={processMonthlyData()}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: '8px', color: 'white' }} />
            <Legend />
            <Line type="monotone" dataKey="waste" name="Waste Items" stroke="#10B981" strokeWidth={2} />
            <Line type="monotone" dataKey="chemicals" name="Chemicals" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Waste Status Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={getWasteStatusData()} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {getWasteStatusData().map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: '8px', color: 'white' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Chemicals by Category">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getChemicalCategoryData()} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: '8px', color: 'white' }} />
              <Bar dataKey="value" name="Count" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

const ChartCard = ({ title, children }) => <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>{children}</motion.div>
const StatCard = ({ title, value, icon: Icon, color }) => <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center space-x-4"><div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${color}-100 dark:bg-${color}-900/20`}><Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} /></div><div><p className="text-sm text-gray-500 dark:text-gray-400">{title}</p><p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p></div></motion.div>

export default Analytics