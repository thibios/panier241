import type { Market } from '../types'

// Lieux de vente fixes. Les marchés et magasins ajoutés depuis l'application
// (table custom_markets) s'y ajoutent au chargement, via MarketsContext.
// Règle : un magasin ou une enseigne n'apparaît que s'il a un logo.
export const markets: Market[] = [
  {
    id: 'mkt-mont-bouet',
    name: 'Marché Mont-Bouët',
    neighborhood: 'Mont-Bouët',
    city: 'Libreville',
    kind: 'marche',
    photoQuery: 'african market',
    photoPage: 5,
    lat: 0.3901,
    lng: 9.4544,
  },
  {
    id: 'mkt-bati-plus',
    name: 'Bâti Plus',
    logoUrl: 'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/kiosk-photos/logos/bati-plus-gabon.jpg',
    logoWatermark: false,
    neighborhood: 'Oloumi',
    city: 'Libreville',
    kind: 'supermarche',
    lat: 0.407,
    lng: 9.448,
  },
  {
    id: 'mkt-ceca-gadis',
    name: 'Ceca-Gadis',
    logoUrl: 'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/kiosk-photos/logos/cecado.png',
    neighborhood: 'Nombakélé',
    city: 'Libreville',
    kind: 'supermarche',
    lat: 0.4,
    lng: 9.455,
  },
  {
    id: 'mkt-centre-affaires',
    name: "Centr' Affaires",
    neighborhood: 'Glass',
    city: 'Libreville',
    kind: 'supermarche',
    logoUrl: '/logos/centr-affaires.png',
    lat: 0.3936,
    lng: 9.4523,
  },
]
