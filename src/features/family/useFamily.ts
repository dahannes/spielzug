import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'

/** The signed-in trainer's team; created on first use unless an invitation is accepted first. */
export function useFamily() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['family', userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ensure_family')
      if (error) throw error
      const membership = await supabase.from('family_members').select('role, families(name)').eq('user_id', userId!).single()
      if (membership.error) throw membership.error
      return { id: data, role: membership.data.role, name: membership.data.families?.name ?? '' }
    },
  })
}
