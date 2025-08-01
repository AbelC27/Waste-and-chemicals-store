import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import { UploadCloud, File, X, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

const FileUpload = ({ bucket, onUploadSuccess, initialFilePath, onRemove }) => {
  const [uploading, setUploading] = useState(false)
  const [filePath, setFilePath] = useState(initialFilePath)

  const onDrop = useCallback(async (acceptedFiles, fileRejections) => {
    if (fileRejections.length > 0) {
      const firstError = fileRejections[0].errors[0]
      if (firstError.code === 'file-too-large') toast.error('File is too large. Maximum size is 5MB.')
      else if (firstError.code === 'file-invalid-type') toast.error('Invalid file type. Please upload a PDF, JPG, or PNG.')
      else toast.error(firstError.message)
      return
    }

    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    setUploading(true)
    toast.loading('Uploading file...')

    try {
      const { data: pathData } = await api.post('/api/storage/upload-url', {
        file_name: file.name,
        bucket: bucket,
      })
      const uniquePath = pathData.path

      // Upload the file to Supabase Storage
      const { error } = await supabase.storage.from(bucket).upload(uniquePath, file)

      if (error) {
        // This will catch specific Supabase errors (like RLS issues or bucket not found)
        console.error('Supabase Storage Error:', error)
        throw new Error(error.message)
      }

      onUploadSuccess(uniquePath)
      setFilePath(uniquePath)
      toast.dismiss()
      toast.success('File uploaded successfully!')
    } catch (error) {
      toast.dismiss()
      // Show a more specific error message if available
      toast.error(`File upload failed: ${error.message || 'Please try again.'}`)
      console.error('Full upload error object:', error)
    } finally {
      setUploading(false)
    }
  }, [bucket, onUploadSuccess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: uploading || !!filePath,
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
  })

  const handleRemoveFile = () => {
    setFilePath(null)
    onRemove()
    toast.success('File removed from this record.')
  }

  if (filePath) {
    const fileName = filePath.split('/').pop().split('-').slice(1).join('-')
    return (
      <div className="p-4 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <File className="h-5 w-5 text-indigo-500 flex-shrink-0" />
          <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 truncate" title={fileName}>{fileName}</span>
        </div>
        <button type="button" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 ml-4">
          <X className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
        ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center text-center">
        {uploading ? (
          <>
            <Loader className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Uploading...</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF, JPG, PNG (Max 5MB)</p>
          </>
        )}
      </div>
    </div>
  )
}

export default FileUpload