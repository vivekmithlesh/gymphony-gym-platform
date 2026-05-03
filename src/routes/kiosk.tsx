import { createFileRoute } from '@tanstack/react-router'
import { KioskMode } from '@/components/KioskMode'

export const Route = createFileRoute('/kiosk')({
  component: KioskMode,
})
