import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      // The stored token can outlive its user (e.g. after a local db reset): ask the server.
      let current = data.session
      if (current) {
        const { error } = await supabase.auth.getUser()
        if (error) {
          await supabase.auth.signOut({ scope: 'local' })
          current = null
        }
      }
      setSession(current)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
        try {
          sessionStorage.removeItem('spielzug.trainer-gate')
        } catch {
          // Auth sign-out must not depend on browser storage.
        }
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}
