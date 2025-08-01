import React from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { motion } from 'framer-motion'
import { X, Printer } from 'lucide-react'

const QRCodeModal = ({ item, itemType, onClose }) => {
  if (!item) return null

  // Create a structured JSON string for the QR code
  const qrCodeValue = JSON.stringify({
    id: item.id,
    type: itemType,
    name: item.name,
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl printable-area"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 no-print">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              QR Code
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeCanvas value={qrCodeValue} size={256} />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 dark:text-gray-200">{item.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Type: {itemType}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mono">ID: {item.id}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 no-print">
            <button
              onClick={handlePrint}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 border border-transparent rounded-lg transition-colors"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Label
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default QRCodeModal