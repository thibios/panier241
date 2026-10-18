/**
 * Réduit une photo de téléphone (souvent 3 à 8 Mo) avant envoi : côté le plus long
 * ramené à `maxSize` px, JPEG qualité 0,85. Les limites des espaces de stockage
 * (5 Mo par image) sont ainsi toujours respectées, et l'envoi est plus rapide.
 */
export async function compressImage(file: File, maxSize = 1600): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Format non lisible par le navigateur (HEIC sur certains appareils) : envoi tel quel.
    return file
  }
}
