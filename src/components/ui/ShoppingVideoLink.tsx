import { useState } from 'react'
import { Play } from 'lucide-react'
import { getShoppingVideoUrl } from '../../lib/shoppingVideo'

interface ShoppingVideoLinkProps {
  /** Chemin de la vidéo dans le bucket privé (ou ancienne URL publique). */
  video: string
}

/** Ouvre la vidéo de liste de courses par une URL signée demandée au moment du clic. */
export default function ShoppingVideoLink({ video }: ShoppingVideoLinkProps) {
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function openVideo() {
    setFailed(false)
    setLoading(true)
    // Onglet ouvert pendant le clic (sinon bloqué comme fenêtre surgissante), rempli après signature.
    const tab = window.open('', '_blank')
    try {
      const url = await getShoppingVideoUrl(video)
      if (tab) {
        tab.opener = null
        tab.location.href = url
      } else {
        window.location.assign(url)
      }
    } catch (error) {
      console.error('Vidéo de liste de courses indisponible', error)
      tab?.close()
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openVideo}
        disabled={loading}
        className="block text-left text-[11px] font-semibold text-brand disabled:opacity-60"
      >
        <Play className="mr-1 inline h-3 w-3" />
        {loading ? 'Ouverture de la vidéo…' : 'Voir la vidéo de la liste de courses'}
      </button>
      {failed && (
        <p role="alert" className="text-[11px] font-semibold text-danger">
          Vidéo indisponible
        </p>
      )}
    </div>
  )
}
