import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/** Bandeau affiché tant que l'appareil est hors connexion. */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-brand-dark px-4 py-2 text-xs font-medium text-white"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      Hors connexion : les informations affichées peuvent ne pas être à jour.
    </div>
  )
}
