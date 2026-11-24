// Langfuse via OpenTelemetry. Registered once per function instance; without Langfuse keys
// (tests, local runs) spans are no-ops. Call flushTraces() before a function returns,
// otherwise traces of short-lived serverless invocations are lost.
import { LangfuseSpanProcessor } from '@langfuse/otel'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'

let processor: LangfuseSpanProcessor | undefined

export function initTracing(): void {
  if (processor || !process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) return
  processor = new LangfuseSpanProcessor()
  const provider = new NodeTracerProvider({ spanProcessors: [processor] })
  provider.register()
}

export async function flushTraces(): Promise<void> {
  await processor?.forceFlush()
}
