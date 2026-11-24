import { useMutation } from '@tanstack/react-query'
import type { ApiRoutes } from '../../../shared/api/contracts'
import type { Effort, ModelId } from '../../../shared/api/models'
import { postApi, toBase64 } from '../../lib/api'

export type ScanAnalysis = ApiRoutes['/api/debug-scan']['response']

/** Sends a scan to the LLM; nothing is stored (debug view). */
export function useAnalyzeScan() {
  return useMutation({
    mutationFn: async (v: { scan: Blob; model: ModelId; effort: Effort }) =>
      postApi('/api/debug-scan', { image: await toBase64(v.scan), model: v.model, effort: v.effort }),
  })
}
