import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Filter, Search, Download, CheckSquare, Square, ExternalLink, AlertTriangle, Beaker, X, FileText, QrCode } from 'lucide-react'
import { format, isWithinInterval, addDays, parseISO } from 'date-fns'
import { usePermissions } from '../hooks/usePermissions'
import FileUpload from './FileUpload'
import { supabase } from '../lib/supabase'
import QRCodeModal from './QRCodeModal'
import QRScanner from './QRScanner'

const ChemicalManagement = () => {
  const [chemicals, setChemicals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingChemical, setEditingChemical] = useState(null)
  const [filters, setFilters] = useState({ category: '', search: '', expiring_soon: false })
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()
  const location = useLocation()
  const navigate = useNavigate()
  const hasPermission = usePermissions()
  const [qrCodeItem, setQrCodeItem] = useState(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  useEffect(() => {
    if (location.state?.preFilter === 'expiring_soon') {
      setFilters(prev => ({ ...prev, expiring_soon: true }))
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  useEffect(() => { fetchChemicals() }, [filters])

  const fetchChemicals = async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      const response = await api.get('/api/chemicals', { params })
      setChemicals(response.data || [])
    } catch (error) { toast.error('Error fetching chemical data') }
    finally { setLoading(false) }
  }

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, reorder_level: data.reorder_level === '' || data.reorder_level === null ? null : Number(data.reorder_level) }
      if (editingChemical) {
        await api.put(`/api/chemicals/${editingChemical.id}`, payload)
        toast.success('Chemical updated successfully')
      } else {
        await api.post('/api/chemicals', payload)
        toast.success('Chemical created successfully')
      }
      fetchChemicals()
      resetForm()
    } catch (error) { toast.error('Error saving chemical') }
  }

  const deleteChemical = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await api.delete(`/api/chemicals/${id}`)
        toast.success('Chemical deleted')
        fetchChemicals()
      } catch (error) { toast.error('Error deleting chemical') }
    }
  }

  const resetForm = () => {
    reset()
    setShowForm(false)
    setEditingChemical(null)
  }

  const editChemical = (chemical) => {
    setEditingChemical(chemical)
    setValue('name', chemical.name)
    setValue('category', chemical.category)
    setValue('quantity', chemical.quantity)
    setValue('location', chemical.location || '')
    setValue('sds_link', chemical.sds_link || '')
    setValue('reorder_level', chemical.reorder_level || '')
    setValue('expiration_date', chemical.expiration_date || '')
    setValue('sds_file_path', chemical.sds_file_path || '')
    setShowForm(true)
  }

  const handleScanSuccess = (data) => {
    if (data.type === 'chemical') {
      setFilters({ category: '', search: data.id, expiring_soon: false })
    } else {
      toast.error(`Scanned item is not a chemical (Type: ${data.type})`)
    }
    setIsScannerOpen(false)
  }

  const isExpiringSoon = (expirationDateStr) => {
    if (!expirationDateStr || typeof expirationDateStr !== 'string') return false
    const expirationDate = parseISO(expirationDateStr)
    return isWithinInterval(expirationDate, { start: new Date(), end: addDays(new Date(), 30) })
  }

  const getPublicUrl = (filePath) => {
    if (!filePath) return '#'
    const { data } = supabase.storage.from('sdsfiles').getPublicUrl(filePath) // Corrected bucket name
    return data.publicUrl
  }

  const chemicalCategories = ['Acid', 'Base', 'Solvent', 'Reagent', 'Buffer', 'Catalyst', 'Indicator']

  if (loading) return <div className="flex justify-center items-center h-64"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      {qrCodeItem && <QRCodeModal item={qrCodeItem} itemType="chemical" onClose={() => setQrCodeItem(null)} />}
      {isScannerOpen && <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setIsScannerOpen(false)} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chemical Management</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Track your chemical inventory, expiration dates, and safety data.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsScannerOpen(true)} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <QrCode className="h-4 w-4 mr-2" /> Scan
          </button>
          {hasPermission('chemicals:create') && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors">
              <Plus className="h-4 w-4 mr-2" /> Add Chemical
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingChemical ? 'Edit Chemical' : 'Add New Chemical'}</h3>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                      <input type="text" {...register('name', { required: 'Name is required' })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="e.g., Hydrochloric Acid" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                      <select {...register('category', { required: 'Category is required' })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                        <option value="">Select Category</option>
                        {chemicalCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity (L/g) *</label>
                      <input type="number" step="0.01" {...register('quantity', { required: 'Quantity is required', min: 0 })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Re-order Level</label>
                      <input type="number" step="0.01" {...register('reorder_level')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="e.g., 10.0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiration Date</label>
                      <input type="date" {...register('expiration_date')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                      <input type="text" {...register('location')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="e.g., Lab 3, Cabinet A" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SDS Link</label>
                      <input type="url" {...register('sds_link')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="https://example.com/sds.pdf" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SDS File</label>
                      {/* --- THIS IS THE FIX --- */}
                      <FileUpload
                        bucket="sdsfiles" 
                        initialFilePath={editingChemical?.sds_file_path}
                        onUploadSuccess={(path) => setValue('sds_file_path', path)}
                        onRemove={() => setValue('sds_file_path', null)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 border border-transparent rounded-lg transition-colors">{editingChemical ? 'Update Chemical' : 'Create Chemical'}</button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">SDS File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {chemicals.map((item, index) => (
                <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isExpiringSoon(item.expiration_date) ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><Beaker className="h-5 w-5 text-gray-400" /></div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{item.category} - {item.quantity}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.sds_file_path ? (<a href={getPublicUrl(item.sds_file_path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"><FileText className="h-4 w-4 mr-2" /> View File</a>) : (<span className="text-sm text-gray-400">None</span>)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {item.expiration_date ? (<div className="flex items-center">{isExpiringSoon(item.expiration_date) && <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />}{format(parseISO(item.expiration_date), 'PP')}</div>) : ('N/A')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.location || 'Not specified'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => setQrCodeItem(item)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Show QR Code"><QrCode className="h-4 w-4" /></button>
                      {hasPermission('chemicals:update') && <button onClick={() => editChemical(item)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors" title="Edit"><Edit2 className="h-4 w-4" /></button>}
                      {hasPermission('chemicals:delete') && <button onClick={() => deleteChemical(item.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>}
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

export default ChemicalManagement