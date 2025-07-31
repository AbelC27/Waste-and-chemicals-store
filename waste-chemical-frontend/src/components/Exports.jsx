import React, { useState } from 'react'
import { motion } from 'framer-motion'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Download, FileText, FileSpreadsheet, Calendar } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Papa from 'papaparse'

const Exports = () => {
  const [reportType, setReportType] = useState('waste')
  const [format, setFormat] = useState('csv')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/api/${reportType}`)
      let data = response.data || []

      // Filter by date range if specified
      if (dateRange.from && dateRange.to) {
        const from = new Date(dateRange.from)
        const to = new Date(dateRange.to)
        data = data.filter((item) => {
          const itemDate = new Date(item.created_at)
          return itemDate >= from && itemDate <= to
        })
      }

      if (data.length === 0) {
        toast.error('No data found for the selected criteria.')
        return
      }

      if (format === 'csv') {
        exportCSV(data)
      } else {
        exportPDF(data)
      }
    } catch (error) {
      toast.error('Failed to generate report.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = (data) => {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `${reportType}_report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV report downloaded.')
  }

  const exportPDF = (data) => {
    const doc = new jsPDF()
    const tableColumns =
      reportType === 'waste'
        ? ['Name', 'Category', 'Quantity', 'Status', 'Collection Date']
        : ['Name', 'Category', 'Quantity', 'Expiration Date', 'Location']
    const tableRows = data.map((item) =>
      reportType === 'waste'
        ? [
            item.name,
            item.category,
            item.quantity,
            item.status,
            item.collection_date || 'N/A',
          ]
        : [
            item.name,
            item.category,
            item.quantity,
            item.expiration_date || 'N/A',
            item.location || 'N/A',
          ]
    )

    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 20,
    })
    doc.text(
      `${
        reportType.charAt(0).toUpperCase() + reportType.slice(1)
      } Report`,
      14,
      15
    )
    doc.save(`${reportType}_report.pdf`)
    toast.success('PDF report downloaded.')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8"
    >
      <div className="text-center mb-8">
        <Download className="mx-auto h-12 w-12 text-indigo-500" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          Generate Reports
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Select your criteria to download a customized report.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="waste">Waste Data</option>
            <option value="chemicals">Chemical Data</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date Range (Optional)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange({ ...dateRange, from: e.target.value })
              }
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange({ ...dateRange, to: e.target.value })
              }
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Format
          </label>
          <div className="flex space-x-4">
            <button
              onClick={() => setFormat('csv')}
              className={`flex-1 inline-flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                format === 'csv'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
              }`}
            >
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              CSV
            </button>
            <button
              onClick={() => setFormat('pdf')}
              className={`flex-1 inline-flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                format === 'pdf'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
              }`}
            >
              <FileText className="h-5 w-5 mr-2" />
              PDF
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 mr-3 border-2 border-white border-t-transparent rounded-full"
                />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-3" />
                Download Report
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default Exports