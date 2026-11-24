// LLM models the app may use, with prices. Shared by api/ (cost) and the debug view (picker).

export const MODEL_IDS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] as const
export type ModelId = (typeof MODEL_IDS)[number]

export const EFFORTS = ['low', 'medium', 'high'] as const
export type Effort = (typeof EFFORTS)[number]

/** Reading word lists and dictations (ADR-017). */
export const DICTATION_MODEL: ModelId = 'claude-haiku-5-5'

/** USD per million tokens (input, output). */
const PRICES: Record<ModelId, readonly [number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
}

export function costUsd(model: ModelId, inputTokens: number, outputTokens: number): number {
  const [input, output] = PRICES[model]
  return (inputTokens * input + outputTokens * output) / 1e6
}
