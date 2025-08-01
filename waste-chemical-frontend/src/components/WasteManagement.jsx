import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Filter, Search, Download, CheckSquare, Square, Calendar, MapPin, Package, X, FileText, QrCode } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { usePermissions } from '../hooks/usePermissions'
import FileUpload from './FileUpload'
import { supabase } from '../lib/supabase'
import QRCodeModal from './QRCodeModal'
import QRScanner from './QRScanner'

const WasteManagement = () => {
  const [waste, setWaste] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWaste, setEditingWaste] = useState(null)
  const [filters, setFilters] = useState({ category: '', status: '', search: '' })
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()
  const location = useLocation()
  const navigate = useNavigate()
  const hasPermission = usePermissions()
  const [qrCodeItem, setQrCodeItem] = useState(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  useEffect(() => {
    if (location.state?.preFilter === 'pending') {
      setFilters(prev => ({ ...prev, status: 'pending' }))
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  useEffect(() => { fetchWaste() }, [filters])

  const fetchWaste = async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      const response = await api.get('/api/waste', { params })
      setWaste(response.data || [])
    } catch (error) { toast.error('Error fetching waste data') }
    finally { setLoading(false) }
  }

  const onSubmit = async (data) => {
    try {
      if (editingWaste) {
        await api.put(`/api/waste/${editingWaste.id}`, data)
        toast.success('Waste updated successfully')
      } else {
        await api.post('/api/waste', data)
        toast.success('Waste created successfully')
      }
      fetchWaste()
      resetForm()
    } catch (error) { toast.error('Error saving waste') }
  }

  const deleteWaste = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await api.delete(`/api/waste/${id}`)
        toast.success('Waste deleted')
        fetchWaste()
      } catch (error) { toast.error('Error deleting waste') }
    }
  }

  const resetForm = () => {
    reset()
    setShowForm(false)
    setEditingWaste(null)
  }

  const editWaste = (wasteItem) => {
    setEditingWaste(wasteItem)
    setValue('name', wasteItem.name)
    setValue('category', wasteItem.category)
    setValue('quantity', wasteItem.quantity)
    setValue('status', wasteItem.status)
    setValue('location', wasteItem.location || '')
    setValue('collection_date', wasteItem.collection_date || '')
    setValue('certificate_file_path', wasteItem.certificate_file_path || '')
    setShowForm(true)
  }

  const handleScanSuccess = (data) => {
    if (data.type === 'waste') {
      setFilters({ category: '', status: '', search: data.id })
    } else {
      toast.error(`Scanned item is not waste (Type: ${data.type})`)
    }
    setIsScannerOpen(false)
  }

  const getPublicUrl = (filePath) => {
    if (!filePath) return '#'
    const { data } = supabase.storage.from('certificates').getPublicUrl(filePath)
    return data.publicUrl
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'collected': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'processed': return 'bg-green-100 text-green-800 border-green-200'
      case 'disposed': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const wasteCategories = ['Hazardous', 'Recyclable', 'Organic', 'Electronic', 'General']
  const wasteStatuses = ['pending', 'collected', 'processed', 'disposed']

  if (loading) return <div className="flex justify-center items-center h-64"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      {qrCodeItem && <QRCodeModal item={qrCodeItem} itemType="waste" onClose={() => setQrCodeItem(null)} />}
      {isScannerOpen && <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setIsScannerOpen(false)} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Waste Management</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage and track your waste inventory across all locations.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsScannerOpen(true)} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <QrCode className="h-4 w-4 mr-2" /> Scan
          </button>
          {hasPermission('waste:create') && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors">
              <Plus className="h-4 w-4 mr-2" /> Add Waste
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingWaste ? 'Edit Waste Item' : 'Add New Waste Item'}</h3>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                      <input type="text" {...register('name', { required: 'Name is required' })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="Enter waste item name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                      <select {...register('category', { required: 'Category is required' })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                        <option value="">Select Category</option>
                        {wasteCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity *</label>
                      <input type="number" step="0.01" {...register('quantity', { required: 'Quantity is required', min: 0 })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                      <select {...register('status', { required: 'Status is required' })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                        {wasteStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Collection Date</label>
                      <input type="date" {...register('collection_date')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                      <input type="text" {...register('location')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="Enter location" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Disposal Certificate</label>
                      <FileUpload bucket="certificates" initialFilePath={editingWaste?.certificate_file_path} onUploadSuccess={(path) => setValue('certificate_file_path', path)} onRemove={() => setValue('certificate_file_path', null)} />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 border border-transparent rounded-lg transition-colors">{editingWaste ? 'Update Item' : 'Create Item'}</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Certificate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collection Date</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {waste.map((item, index) => (
                <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><Package className="h-5 w-5 text-gray-400" /></div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{item.category} - {item.quantity} kg</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.certificate_file_path ? (<a href={getPublicUrl(item.certificate_file_path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"><FileText className="h-4 w-4 mr-2" /> View File</a>) : (<span className="text-sm text-gray-400">None</span>)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {item.collection_date ? (<div className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{format(parseISO(item.collection_date), 'PP')}</div>) : ('Not set')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => setQrCodeItem(item)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Show QR Code"><QrCode className="h-4 w-4" /></button>
                      {hasPermission('waste:update') && <button onClick={() => editWaste(item)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors" title="Edit"><Edit2 className="h-4 w-4" /></button>}
                      {hasPermission('waste:delete') && <button onClick={() => deleteWaste(item.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default WasteManagement