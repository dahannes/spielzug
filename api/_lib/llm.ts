// The one LLM call: an image plus text in, a structured output out, traced in Langfuse (never the
// image) and priced. With AI_FAKE=1 (E2E tests) it returns the caller's fake output instead.
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { startActiveObservation } from '@langfuse/tracing'
import type { ZodType } from 'zod'
import type { LlmResponse } from '../../shared/api/contracts.js'
import { costUsd, type Effort, type ModelId } from '../../shared/api/models.js'

export const aiFake = () => process.env.AI_FAKE === '1'

let client: Anthropic | undefined

export interface ReadImage<T> {
  /** Name of the trace in Langfuse. */
  name: string
  model: ModelId
  effort: Effort
  /** Caps cost and time; measured use plus room (ADR-023). */
  maxTokens: number
  system: string
  schema: ZodType<T>
  imageBase64: string
  text: string
  /** Output for AI_FAKE=1. */
  fake: () => T
}

export async function readImage<T>(o: ReadImage<T>): Promise<LlmResponse<T>> {
  if (aiFake()) return { output: o.fake(), model: 'fake', inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0 }
  // 45 s and one retry end the request cleanly before Vercel's 60 s function limit.
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 })
  return startActiveObservation(
    o.name,
    async (generation) => {
      const started = Date.now()
      const response = await client!.beta.messages.parse({
        model: o.model,
        max_tokens: o.maxTokens,
        output_config: { effort: o.effort, format: betaZodOutputFormat(o.schema) },
        system: o.system,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: o.imageBase64 } },
              { type: 'text', text: o.text },
            ],
          },
        ],
      })
      const usage = response.usage
      generation.update({
        // Never the image (working agreements): only its size.
        input: { imageBytes: Math.round((o.imageBase64.length * 3) / 4), effort: o.effort, text: o.text },
        output: response.parsed_output ?? { stop_reason: response.stop_reason },
        model: response.model,
        usageDetails: { input: usage.input_tokens, output: usage.output_tokens, total: usage.input_tokens + usage.output_tokens },
      })
      if (!response.parsed_output) throw new Error(`no structured output (stop_reason ${response.stop_reason})`)
      return {
        output: response.parsed_output as T,
        model: response.model,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        costUsd: costUsd(o.model, usage.input_tokens, usage.output_tokens),
        latencyMs: Date.now() - started,
        traceId: generation.traceId,
      }
    },
    { asType: 'generation' },
  )
}
