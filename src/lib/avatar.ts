import { supabase } from './supabaseClient'

const MAX_SIZE = 512

/** Recadre l'image au carré (centre) et la réduit à 512 px en JPEG : envoi léger, affichage net. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const size = Math.min(side, MAX_SIZE)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encodage'))), 'image/jpeg', 0.85),
  )
}

/** Chemin du fichier dans le bucket à partir de son URL publique. */
function pathFromPublicUrl(url: string): string | null {
  const marker = '/storage/v1/object/public/avatars/'
  const i = url.indexOf(marker)
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split('?')[0]) : null
}

/** Envoie une nouvelle photo de profil, l'enregistre sur le profil et supprime l'ancienne. */
export async function uploadAvatar(userId: string, file: File, previousUrl: string | null): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez une image (JPEG, PNG ou WebP).')
  const blob = await toSquareJpeg(file)
  const path = `${userId}/avatar-${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) throw new Error("La photo n'a pas pu être envoyée. Réessayez.")

  const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
  if (updateError) throw new Error("La photo n'a pas pu être enregistrée sur votre profil.")

  const oldPath = previousUrl ? pathFromPublicUrl(previousUrl) : null
  if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
  return url
}

/** Retire la photo de profil (fichier et lien). */
export async function removeAvatar(userId: string, currentUrl: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw new Error("La photo n'a pas pu être retirée.")
  const path = pathFromPublicUrl(currentUrl)
  if (path) await supabase.storage.from('avatars').remove([path])
}
