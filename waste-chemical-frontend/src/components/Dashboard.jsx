import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import api from '../lib/api'
import { Trash2, Beaker, AlertTriangle, Clock, Eye, Download, RefreshCw } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const [stats, setStats] = useState({ total_waste: 0, total_chemicals: 0, expiring_chemicals: 0, pending_waste: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [chartData, setChartData] = useState({ wasteCategories: [], chemicalCategories: [], monthlyTrends: [] })
  const navigate = useNavigate()

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      const [statsResponse, wasteResponse, chemicalResponse] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/waste'),
        api.get('/api/chemicals')
      ])

      setStats(statsResponse.data)

      const wasteData = wasteResponse.data || []
      const wasteCategoryData = wasteData.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {})
      const wasteCategories = Object.entries(wasteCategoryData).map(([category, count]) => ({ category, count, value: count }))

      const chemicalData = chemicalResponse.data || []
      const chemicalCategoryData = chemicalData.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {})
      const chemicalCategories = Object.entries(chemicalCategoryData).map(([category, count]) => ({ category, count, value: count }))

      const monthlyTrends = [
        { month: 'Jan', waste: 45, chemicals: 32 }, { month: 'Feb', waste: 52, chemicals: 41 },
        { month: 'Mar', waste: 48, chemicals: 38 }, { month: 'Apr', waste: 61, chemicals: 45 },
        { month: 'May', waste: 55, chemicals: 42 }, { month: 'Jun', waste: 67, chemicals: 49 },
      ]

      setChartData({ wasteCategories, chemicalCategories, monthlyTrends })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error("Failed to load dashboard data.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleExportReport = async () => {
    setExporting(true)
    toast.loading('Generating PDF report...')

    try {
      const [expiringRes, pendingRes] = await Promise.all([
        api.get('/api/chemicals', { params: { expiring_soon: true } }),
        api.get('/api/waste', { params: { status: 'pending' } })
      ])

      const expiringChemicals = expiringRes.data || []
      const pendingWaste = pendingRes.data || []

      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text("Dashboard Summary Report", 14, 22)
      doc.setFontSize(11)
      doc.setTextColor(100)
      doc.text(`Report generated on: ${format(new Date(), 'PPpp')}`, 14, 29)

      doc.setFontSize(12)
      doc.text("Key Metrics", 14, 45)
      doc.autoTable({
        startY: 50,
        head: [['Metric', 'Value']],
        body: [
          ['Total Waste Items', stats.total_waste],
          ['Total Chemicals', stats.total_chemicals],
          ['Expiring Chemicals (in 30 days)', stats.expiring_chemicals],
          ['Pending Waste Collection', stats.pending_waste],
        ],
        theme: 'grid'
      })

      if (expiringChemicals.length > 0) {
        doc.addPage()
        doc.text("Expiring Chemicals Details", 14, 22)
        doc.autoTable({
          startY: 30,
          head: [['Name', 'Category', 'Quantity', 'Expiration Date']],
          body: expiringChemicals.map(item => [item.name, item.category, item.quantity, item.expiration_date]),
        })
      }

      if (pendingWaste.length > 0) {
        if (expiringChemicals.length === 0) {
          doc.addPage()
          doc.text("Pending Waste Details", 14, 22)
        } else {
          // Check if there's space on the current page, otherwise add a new one
          // This is a simplified check
          if (doc.previousAutoTable.finalY > 200) {
            doc.addPage()
            doc.text("Pending Waste Details", 14, 22)
          } else {
            doc.text("Pending Waste Details", 14, doc.previousAutoTable.finalY + 15)
          }
        }
        doc.autoTable({
          startY: doc.previousAutoTable.finalY + 25,
          head: [['Name', 'Category', 'Quantity', 'Status']],
          body: pendingWaste.map(item => [item.name, item.category, item.quantity, item.status]),
        })
      }

      doc.save(`WasteChem_Dashboard_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
      toast.dismiss()
      toast.success('Report downloaded successfully!')
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to generate report.')
      console.error(error)
    } finally {
      setExporting(false)
    }
  }

  const StatCard = ({ icon: Icon, title, value, color = 'indigo' }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} className={`bg-white dark:bg-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 rounded-xl border border-gray-200 dark:border-gray-700`}>
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0"><div className={`w-12 h-12 bg-${color}-100 dark:bg-${color}-900/20 rounded-lg flex items-center justify-center`}><Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} /></div></div>
          <div className="ml-5 w-0 flex-1"><dl><dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</dt><dd><div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div></dd></dl></div>
        </div>
      </div>
    </motion.div>
  )

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  if (loading) return <div className="flex justify-center items-center h-64"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Welcome back! Here's what's happening with your waste and chemical management.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={fetchDashboardData} disabled={refreshing} className={`inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleExportReport} disabled={exporting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50">
            <Download className="h-4 w-4 mr-2" /> {exporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Trash2} title="Total Waste Items" value={stats.total_waste} color="green" />
        <StatCard icon={Beaker} title="Total Chemicals" value={stats.total_chemicals} color="blue" />
        <StatCard icon={AlertTriangle} title="Expiring Soon" value={stats.expiring_chemicals} color="yellow" />
        <StatCard icon={Clock} title="Pending Waste" value={stats.pending_waste} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Waste by Category</h3>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.wasteCategories}><CartesianGrid strokeDasharray="3 3" className="opacity-30" /><XAxis dataKey="category" className="text-xs" /><YAxis className="text-xs" /><Tooltip contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: '8px', color: 'white' }} /><Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chemical Distribution</h3>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.chemicalCategories} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">{chartData.chemicalCategories.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: '8px', color: 'white' }} /></PieChart></ResponsiveContainer></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Trends</h3>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData.monthlyTrends}><CartesianGrid strokeDasharray="3 3" className="opacity-30" /><XAxis dataKey="month" className="text-xs" /><YAxis className="text-xs" /><Tooltip contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: '8px', color: 'white' }} /><Area type="monotone" dataKey="waste" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} /><Area type="monotone" dataKey="chemicals" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} /></AreaChart></ResponsiveContainer></div>
        </motion.div>
      </div>

      {(stats.expiring_chemicals > 0 || stats.pending_waste > 0) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center"><AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />Attention Required</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.expiring_chemicals > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-yellow-400" /></div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Chemicals Expiring Soon</h4>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300"><p>You have {stats.expiring_chemicals} chemical(s) expiring within 30 days.</p></div>
                    <div className="mt-4">
                      <button onClick={() => navigate('/chemicals', { state: { preFilter: 'expiring_soon' } })} className="text-sm bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors">View Details</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {stats.pending_waste > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0"><Clock className="h-5 w-5 text-red-400" /></div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Pending Waste Collection</h4>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300"><p>You have {stats.pending_waste} waste item(s) pending collection.</p></div>
                    <div className="mt-4">
                      <button onClick={() => navigate('/waste', { state: { preFilter: 'pending' } })} className="text-sm bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors">View Details</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default Dashboard