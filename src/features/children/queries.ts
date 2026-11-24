import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { postApi } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import type { PositionId } from '../player/positions'
import type { PlayerSchemeId } from './schemes'

const childrenKey = (familyId?: string) => ['children', familyId] as const

export function useChildren(familyId: string | undefined) {
  return useQuery({
    queryKey: childrenKey(familyId),
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, shirt_number, position, color, grade, league, photo_path, created_at')
        .eq('family_id', familyId!)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

export type Child = NonNullable<ReturnType<typeof useChildren>['data']>[number]

/**
 * Raises a player's league to what their rounds earned (SR-63). Only upwards and only once: the
 * result is the new league, or null when it was already that high (another tab was quicker).
 */
export function useRaiseLeague(familyId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ playerId, league }: { playerId: string; league: number }) => {
      const { data, error } = await supabase.from('children').update({ league }).eq('id', playerId).lt('league', league).select('league')
      if (error) throw error
      return data.length ? league : null
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: childrenKey(familyId) }),
  })
}

const PHOTO_BUCKET = 'player-photos'

/**
 * Adds a player or saves their card. `photo`: a new stylised image (Blob), null to remove the
 * photo, undefined to keep it. Each photo gets a new path, so no browser shows a stale one; the
 * old file is removed after the switch.
 */
export function useSaveChild(familyId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      id?: string
      name: string
      shirtNumber: number | null
      position: PositionId
      color: PlayerSchemeId
      grade: number
      /** Liga set by a trainer (SR-63); undefined keeps it. */
      league?: number
      photo?: Blob | null
      previousPhoto?: string | null
    }) => {
      const name = v.name.trim()
      const profile = { name, shirt_number: v.shirtNumber, position: v.position, color: v.color, grade: v.grade, ...(v.league === undefined ? {} : { league: v.league }) }
      const { data, error } = v.id
        ? await supabase.from('children').update(profile).eq('id', v.id).select('id').single()
        : await supabase.from('children').insert({ family_id: familyId!, ...profile }).select('id').single()
      if (error) throw error
      if (v.photo !== undefined) {
        let path: string | null = null
        if (v.photo) {
          path = `${familyId}/${data.id}-${Date.now()}.png`
          const upload = await supabase.storage.from(PHOTO_BUCKET).upload(path, v.photo, { contentType: 'image/png' })
          if (upload.error) throw upload.error
        }
        const set = await supabase.from('children').update({ photo_path: path }).eq('id', data.id)
        if (set.error) throw set.error
        if (v.previousPhoto) {
          const removed = await supabase.storage.from(PHOTO_BUCKET).remove([v.previousPhoto])
          if (removed.error) console.warn('old player photo not removed', removed.error)
        }
      }
      return data.id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: childrenKey(familyId) }),
  })
}

/** Deletes a player with their rounds and photos on the server (SR-09); lists and audio stay. */
export function useDeletePlayer(familyId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (playerId: string) => postApi('/api/delete-player', { playerId }),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: childrenKey(familyId) }), queryClient.invalidateQueries({ queryKey: ['word-lists'] })]),
  })
}

/** Signed URL of a player's stylised photo (undefined without one). */
export function usePlayerPhoto(path: string | null | undefined) {
  return useQuery({
    queryKey: ['player-photo', path],
    enabled: !!path,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path!, 3600)
      if (error) throw error
      return data.signedUrl
    },
  }).data
}

const STORAGE_KEY = 'spielzug.child'

// The chosen player is shared by the card, the header colour and the lists (one store, many readers).
let memory: string | null = null
const listeners = new Set<() => void>()

function storedChildId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? memory
  } catch {
    return memory
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Who practises on this device: remembered per device (a tablet usually belongs to one child),
 * falling back to the first child.
 */
export function useCurrentChild(children: readonly Child[] | undefined) {
  const chosen = useSyncExternalStore(subscribe, storedChildId)
  const current = children?.find((c) => c.id === chosen) ?? children?.[0]
  function choose(id: string) {
    memory = id
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // private mode: the choice lasts for this page only
    }
    listeners.forEach((l) => l())
  }
  return { current, choose }
}
