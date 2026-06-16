import { create } from 'zustand'
import { apiService } from '../services/api'
import { AuthUser } from '../types'

const TOKEN_KEY = 'audioscribe_token'

interface AuthState {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
  /** Restore a session from a stored token on app load (validates it server-side). */
  loadSession: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  loading: false,

  login: async (identifier, password) => {
    const { access_token, user } = await apiService.login(identifier, password)
    localStorage.setItem(TOKEN_KEY, access_token)
    set({ token: access_token, user })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, user: null })
  },

  loadSession: async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    set({ loading: true })
    try {
      const user = await apiService.getMe()
      set({ token, user, loading: false })
    } catch {
      // Token expired/invalid — clear it.
      localStorage.removeItem(TOKEN_KEY)
      set({ token: null, user: null, loading: false })
    }
  },
}))

export { TOKEN_KEY }
