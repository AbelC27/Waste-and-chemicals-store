import { useAuth } from '../contexts/AuthContext'

export const usePermissions = () => {
  const { hasPermission } = useAuth()
  return hasPermission
}