import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { motion } from 'framer-motion'
import { X, Upload, File, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

const CSVImporter = ({ isOpen, onClose, onImport, requiredFields, endpoint }) => {
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)

  const resetState = () => {
    setFile(null)
    setParsedData([])
    setErrors([])
    setImporting(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      setFile(selectedFile)
      parseFile(selectedFile)
    }
  }

  const parseFile = (fileToParse) => {
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateData(results.data)
      },
    })
  }

  const validateData = (data) => {
    const validationErrors = []
    const validatedData = data.map((row, index) => {
      const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '')
      if (missingFields.length > 0) {
        validationErrors.push(`Row ${index + 2}: Missing required fields - ${missingFields.join(', ')}`)
      }
      // Convert quantity to number
      if (row.quantity) {
        row.quantity = parseFloat(row.quantity)
        if (isNaN(row.quantity)) {
          validationErrors.push(`Row ${index + 2}: Invalid quantity value.`)
        }
      }
      return row
    })
    setErrors(validationErrors)
    setParsedData(validatedData)
  }

  const handleImport = async () => {
    if (errors.length > 0) {
      toast.error("Please fix the errors before importing.")
      return
    }
    setImporting(true)
    toast.loading("Importing data...")
    try {
      await onImport(parsedData)
      toast.dismiss()
      toast.success(`${parsedData.length} items imported successfully!`)
      handleClose()
    } catch (error) {
      toast.dismiss()
      toast.error("Import failed. Please check the console for details.")
      console.error("Import error:", error)
    } finally {
      setImporting(false)
    }
  }

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bulk Import from CSV</h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-6 w-6" /></button>
          </div>

          {!file ? (
            <div {...getRootProps()} className="p-12 border-2 border-dashed rounded-lg cursor-pointer text-center hover:border-indigo-500 transition-colors">
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Drag & drop a CSV file here, or click to select a file</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Required columns: {requiredFields.join(', ')}</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center"><File className="h-5 w-5 text-indigo-500" /><span className="ml-3 text-sm font-medium">{file.name}</span></div>
                <button onClick={resetState} className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">Change File</button>
              </div>

              {errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg max-h-32 overflow-y-auto">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 flex items-center"><AlertCircle className="h-4 w-4 mr-2" />Validation Errors</h4>
                  <ul className="list-disc list-inside mt-2 text-sm text-red-700 dark:text-red-400">
                    {errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                    {errors.length > 5 && <li>...and {errors.length - 5} more errors.</li>}
                  </ul>
                </div>
              )}

              <div className="mt-4 max-h-64 overflow-y-auto border rounded-lg dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {parsedData.length > 0 && Object.keys(parsedData[0]).map(key => (
                        <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">{String(val)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">Showing preview of the first 10 rows. Found {parsedData.length} total rows.</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button onClick={handleImport} disabled={!file || errors.length > 0 || importing} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 border border-transparent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
              {importing ? <Loader className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {importing ? 'Importing...' : `Import ${parsedData.length} Items`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default CSVImporter