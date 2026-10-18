/**
 * Quartiers du Grand Libreville, d'après OpenStreetMap (relevé du 18 octobre 2026),
 * noms harmonisés et doublons fusionnés. Les zones servent à la lecture de la liste ;
 * ce n'est pas un découpage administratif officiel.
 */
export const neighborhoodZones: { zone: string; names: string[] }[] = [
  {
    zone: 'Libreville, centre et bord de mer',
    names: [
      'Batterie IV', 'Baie des Rois', 'Bas de Gué-Gué', 'Camp des Boys', 'Centre-Ville', 'Charbonnages',
      'Cité de la Démocratie', 'Derrière la Prison', 'Glass', 'Haut de Gué-Gué', 'Louis', 'Montagne Sainte',
      'Petit Paris', 'Plaine Orety', 'Quaben', 'Sorbonne', 'Toulon', 'Trois Quartiers', 'Vallée Sainte-Marie',
      'Michel Marine', 'London',
    ],
  },
  {
    zone: 'Libreville, centre-est',
    names: [
      'Akébé-Ville', 'Akébé Plaine', 'Akébé Frontière (Baraka)', 'Akébé-Kinguélé', 'Akémindjogoni', 'Ambilambani',
      'Ancien Sobraga', 'Atong-Abè', 'Atsib-Tchoss', 'Avéa', 'Awendjé', 'Baraka-Mission', 'Batavéa', 'Belle-Vue',
      'Campagne', 'Cité Mébiame', 'Cocotiers', "Derrière l'Hôpital", 'Kosmoparc', 'Likouala-Moussaka', 'Mont-Bouët',
      'Nkembo', 'Nombakélé', 'Peyrie', 'Plaine Niger', 'Cité de la Caisse', 'Sotega', 'STFO', 'Venez-Voir', 'PK5',
      'Bassin du PK5', 'Lalala-Droite', 'Lalala-Gauche',
    ],
  },
  {
    zone: 'Libreville, sud et est',
    names: [
      'Lalala-Dakar', 'Oloumi', "Zone industrielle d'Oloumi", 'Ozangué', 'Ozoungué', 'Acaé', 'Smag',
      'Institut des Sports', 'IAI-Golf', 'Cité Damas', 'Beau-Séjour', 'Plein-Ciel', 'Terre-Nouvelle', 'Mindoubé 1',
      'Mindoubé 2', 'Mindoubé 3', 'Nzeng-Ayong', 'Cité des Ambassadeurs', 'Montalier', 'Sibang', 'PK10',
      'Cité Horizon', 'Bizango-Rail', 'Bikélé',
    ],
  },
  {
    zone: 'Libreville, nord',
    names: ['Alibandeng', 'Ambowè', 'Bel-Air', 'Ondogo', 'Aéroport', 'Mikolongo', 'Tahiti', 'Okala'],
  },
  {
    zone: 'Akanda',
    names: ['Angondjé', 'Angondjé Village', 'Sablière', 'Avorbam', 'Première Cité', 'Malibé', 'Cap Estérias'],
  },
  {
    zone: 'Owendo',
    names: [
      'Owendo Port', 'Akournam I', 'Akournam II', 'Alénakirie', 'Awoungou', 'Barakounda', 'Grand Village', 'La Nomba',
      'Nomba-Domaine', 'Pont-Nomba', 'Lycée Technique', 'Razel', 'Setrag', 'Igoumié',
    ],
  },
  {
    zone: 'Ntoum et périphérie',
    names: ['Nkok', 'Nkoltang', 'Essassa', 'Bambouchine'],
  },
]

export const allNeighborhoods = neighborhoodZones.flatMap((z) => z.names.map((name) => ({ name, zone: z.zone })))
