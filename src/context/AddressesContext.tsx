import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Address } from '../types'
import { addresses as seedAddresses } from '../data/addresses'
import { readSession, writeSession } from '../lib/storage'

interface AddressesContextValue {
  addresses: Address[]
  addAddress: (address: Omit<Address, 'id' | 'isDefault'>) => Address
}

const AddressesContext = createContext<AddressesContextValue | null>(null)

export function AddressesProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>(() => readSession('addresses', seedAddresses))

  useEffect(() => writeSession('addresses', addresses), [addresses])

  function addAddress(input: Omit<Address, 'id' | 'isDefault'>) {
    const newAddress: Address = { ...input, id: `addr-${Date.now()}`, isDefault: false }
    setAddresses((prev) => [...prev, newAddress])
    return newAddress
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
