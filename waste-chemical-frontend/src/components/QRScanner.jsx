import React from 'react'
// --- THIS IS THE FIX ---
// The component is exported as 'Scanner', not 'QrScanner'.
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

const QRScanner = ({ onScanSuccess, onClose }) => {
  const handleDecode = (result) => {
    try {
      const data = JSON.parse(result)
      if (data && data.id && data.type) {
        toast.success(`Item found: ${data.name}`)
        onScanSuccess(data)
      } else {
        toast.error("Invalid QR code scanned.")
      }
    } catch (e) {
      toast.error("Scanned QR code is not in the correct format.")
    }
  }

  const handleError = (error) => {
    console.error("QR Scanner Error:", error?.message)
    toast.error("Could not start the camera. Please check permissions.")
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
      >
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 dark:text-white">Scan QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="w-full h-80 bg-gray-900">
          <QrScanner
            onDecode={handleDecode}
            onError={handleError}
            containerStyle={{ width: '100%', height: '100%', paddingTop: 0 }}
            videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Point your camera at a QR code label.</p>
        </div>
      </motion.div>
    </div>
  )
}

export default QRScanner