import type { DeliveryPeriod, DeliverySlotOption } from '../types'

const periodMeta: Record<DeliveryPeriod, { label: string; timeRange: string }> = {
  matin: { label: 'Matin', timeRange: '8h00 - 11h00' },
  'apres-midi': { label: 'Après-midi', timeRange: '12h00 - 15h00' },
  soir: { label: 'Soir', timeRange: '16h00 - 19h00' },
  retrait: { label: 'Retrait sur stand', timeRange: 'Selon horaires du marché' },
}

const dayNames = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const monthNames = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

/** Génère les créneaux de livraison disponibles pour les prochains jours, à partir d'aujourd'hui. */
export function generateDeliveryDays(daysAhead = 5) {
  const today = new Date()
  const days: { date: string; dayLabel: string; slots: DeliverySlotOption[] }[] = []

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const iso = date.toISOString().slice(0, 10)
    const dayLabel = i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`

    const periods: DeliveryPeriod[] = i === 0 ? ['apres-midi', 'soir', 'retrait'] : ['matin', 'apres-midi', 'soir', 'retrait']

    days.push({
      date: iso,
      dayLabel,
      slots: periods.map((period) => ({
        id: `${iso}-${period}`,
        dayLabel,
        date: iso,
        period,
        periodLabel: periodMeta[period].label,
        timeRange: periodMeta[period].timeRange,
      })),
    })
  }

  return days
}
