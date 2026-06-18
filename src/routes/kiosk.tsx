import { createFileRoute } from '@tanstack/react-router'
import { KioskMode } from '@/components/KioskMode'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export const Route = createFileRoute('/kiosk')({
  component: GuardedKiosk,
})

function GuardedKiosk() {
  return (
    <ProtectedRoute requiredRole="owner">
      <KioskMode />
    </ProtectedRoute>
  )
}
