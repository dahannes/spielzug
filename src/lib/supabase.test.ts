import { describe, expect, it } from 'vitest'
import { resolveSupabaseUrl } from './supabase'

describe('resolveSupabaseUrl', () => {
  it('[SR-52] reaches the local stack through the dev server proxy, from any device', () => {
    expect(resolveSupabaseUrl('http://127.0.0.1:54321', 'https://192.168.2.200:5173')).toBe('https://192.168.2.200:5173/supabase')
    expect(resolveSupabaseUrl('http://127.0.0.1:54321', 'http://localhost:5174')).toBe('http://localhost:5174/supabase')
    expect(resolveSupabaseUrl('https://abc.supabase.co', 'https://192.168.2.200:5173')).toBe('https://abc.supabase.co')
  })
})
