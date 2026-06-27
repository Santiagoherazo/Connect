import { create } from 'zustand'
import { Profile, PinCategory } from '@/types'

// ─── Auth Store ───────────────────────────────────────────────────
interface AuthState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}))

// ─── Map Store ────────────────────────────────────────────────────
interface MapState {
  selectedCategory: PinCategory | null
  setSelectedCategory: (cat: PinCategory | null) => void
  userLocation: [number, number] | null
  setUserLocation: (loc: [number, number] | null) => void
  selectedPinId: string | null
  setSelectedPinId: (id: string | null) => void
  showNewPinModal: boolean
  setShowNewPinModal: (show: boolean) => void
  newPinCoords: [number, number] | null
  setNewPinCoords: (coords: [number, number] | null) => void
}

export const useMapStore = create<MapState>((set) => ({
  selectedCategory: null,
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  selectedPinId: null,
  setSelectedPinId: (id) => set({ selectedPinId: id }),
  showNewPinModal: false,
  setShowNewPinModal: (show) => set({ showNewPinModal: show }),
  newPinCoords: null,
  setNewPinCoords: (coords) => set({ newPinCoords: coords }),
}))
