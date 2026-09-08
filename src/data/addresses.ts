import type { Address, PaymentMethod, UserProfile } from '../types'

export const addresses: Address[] = [
  {
    id: 'addr-1',
    label: 'Domicile',
    fullAddress: 'Lot 245, Quartier Louis, derrière la pharmacie',
    neighborhood: 'Louis',
    city: 'Libreville',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Bureau',
    fullAddress: 'Immeuble Diamant, Boulevard Triomphal',
    neighborhood: 'Batterie IV',
    city: 'Libreville',
    isDefault: false,
  },
  {
    id: 'addr-3',
    label: 'Chez mes parents',
    fullAddress: 'Rue des Manguiers, non loin du carrefour PK8',
    neighborhood: 'PK8',
    city: 'Libreville',
    isDefault: false,
  },
]

export const paymentMethods: PaymentMethod[] = [
  { id: 'pay-1', label: 'Airtel Money', detail: '074 •• •• 32' },
  { id: 'pay-2', label: 'Moov Money', detail: '062 •• •• 18' },
  { id: 'pay-3', label: 'Espèces à la livraison', detail: 'Paiement en main propre' },
]

export const userProfile: UserProfile = {
  firstName: 'Chantal',
  lastName: 'Obiang',
  phone: '+241 074 12 34 56',
  email: 'chantal.obiang@example.com',
  memberSince: '2024-03-12',
  favoriteCount: 3,
  averageRatingGiven: 4.6,
}
