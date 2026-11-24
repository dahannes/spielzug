// The one way to call the server functions in api/: typed by the shared contracts, with the
// user's access token, failing with ApiError (German text via errorText).
import type { ApiRoutes } from '../../shared/api/contracts'
import { apiJson } from './apiError'
import { supabase } from './supabase'

export async function postApi<P extends keyof ApiRoutes>(
  path: P,
  body: ApiRoutes[P]['request'],
  signal?: AbortSignal,
): Promise<ApiRoutes[P]['response']> {
  const { data } = await supabase.auth.getSession()
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
    signal,
  })
  return apiJson<ApiRoutes[P]['response']>(res)
}

/** Base64 of a blob, without the data: prefix (images for the LLM calls). */
export async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
