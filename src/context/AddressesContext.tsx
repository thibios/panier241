import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Address } from '../types'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

interface AddressesContextValue {
  addresses: Address[]
  addAddress: (address: Omit<Address, 'id' | 'isDefault'>) => Promise<void>
}

const AddressesContext = createContext<AddressesContextValue | null>(null)

interface AddressRow {
  id: string
  label: string
  full_address: string
  neighborhood: string
  city: string
  is_default: boolean
  lat: number | null
  lng: number | null
}

const ADDRESS_COLUMNS = 'id, label, full_address, neighborhood, city, is_default, lat, lng'

function fromRow(row: AddressRow): Address {
  return {
    id: row.id,
    label: row.label,
    fullAddress: row.full_address,
    neighborhood: row.neighborhood,
    city: row.city,
    isDefault: row.is_default,
    lat: row.lat,
    lng: row.lng,
  }
}

export function AddressesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('addresses')
      .select(ADDRESS_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setAddresses(data.map(fromRow))
      })
  }, [user])

  async function addAddress(input: Omit<Address, 'id' | 'isDefault'>) {
    if (!user) return
    const { data } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
        label: input.label,
        full_address: input.fullAddress,
        neighborhood: input.neighborhood,
        city: input.city,
        is_default: addresses.length === 0,
        lat: input.lat,
        lng: input.lng,
      })
      .select(ADDRESS_COLUMNS)
      .single()

    if (data) setAddresses((prev) => [...prev, fromRow(data)])
  }

  return (
    <AddressesContext.Provider value={{ addresses, addAddress }}>{children}</AddressesContext.Provider>
  )
}

export function useAddresses() {
  const ctx = useContext(AddressesContext)
  if (!ctx) throw new Error('useAddresses doit être utilisé à l’intérieur de AddressesProvider')
  return ctx
}
