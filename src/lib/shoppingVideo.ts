import { supabase } from './supabaseClient'

/**
 * Vidéos de liste de courses (bucket privé depuis la migration 028).
 * La commande stocke le chemin de l'objet (`<uid>/<fichier>`) ; l'affichage passe par une URL
 * signée de courte durée, accordée par la base au client, au commerçant de la commande, au livreur
 * affecté pendant sa course et à l'administrateur.
 */

const BUCKET = 'shopping-videos'
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`
/** Durée de validité d'une URL signée : 1 h. */
const SIGNED_URL_TTL_SECONDS = 3600

/** Chemin de l'objet, à partir d'un chemin ou d'une ancienne URL publique (commandes antérieures à 028). */
export function shoppingVideoPath(value: string): string {
  const i = value.indexOf(PUBLIC_MARKER)
  if (i < 0) return value
  return decodeURIComponent(value.slice(i + PUBLIC_MARKER.length).split('?')[0])
}

/** Envoie la vidéo dans le dossier du client et renvoie son chemin. */
export async function uploadShoppingVideo(userId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80) || 'video'
  const path = `${userId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw new Error(error.message)
  return path
}

/** URL signée (1 h) pour lire la vidéo ; lève une erreur si l'accès est refusé ou le fichier absent. */
export async function getShoppingVideoUrl(value: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(shoppingVideoPath(value), SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'URL signée absente')
  return data.signedUrl
}
