// Serves the Vercel functions in api/ from the Vite dev server, so /api/* works locally
// (also from the tablet). Server code talks to the LOCAL Supabase stack; LLM and Langfuse keys
// come from .env.local. Production uses Vercel; this plugin only runs in `vite dev`.
import { execSync } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin, type ViteDevServer } from 'vite'

const SERVER_KEYS = [
  'ANTHROPIC_API_KEY',
  'LANGFUSE_SECRET_KEY',
  'LANGFUSE_PUBLIC_KEY',
  'LANGFUSE_BASE_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'PIN_PEPPER',
]

function localSupabase(): { url: string; secretKey: string; publishableKey: string } | undefined {
  try {
    const status = JSON.parse(
      execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
    )
    return { url: status.API_URL, secretKey: status.SECRET_KEY, publishableKey: status.PUBLISHABLE_KEY }
  } catch {
    return undefined
  }
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    // HTTP/2 (dev server over HTTPS) adds pseudo-headers like ":method"; fetch rejects them.
    if (typeof value === 'string' && !key.startsWith(':')) headers.set(key, value)
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && chunks.length > 0
  const host = req.headers.host ?? (req.headers[':authority'] as string | undefined) ?? 'localhost'
  return new Request(`http://${host}${req.url}`, {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  })
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

export function devApi(): Plugin {
  return {
    name: 'spielzug-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      for (const key of SERVER_KEYS) if (env[key] && !process.env[key]) process.env[key] = env[key]
      // The debug view (SR-42) is open for every account in local development only.
      process.env.DEBUG_OPEN = '1'
      const supabase = localSupabase()
      if (supabase) {
        process.env.SUPABASE_URL = supabase.url
        process.env.SUPABASE_SECRET_KEY = supabase.secretKey
        process.env.SUPABASE_PUBLISHABLE_KEY = supabase.publishableKey
      } else {
        server.config.logger.warn('[dev-api] local Supabase not running – /api/* will fail (npm run db:start)')
      }

      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/([a-z0-9-]+)(?:\?|$)/)
        if (!match) return next()
        try {
          const mod = (await server.ssrLoadModule(`/api/${match[1]}.ts`)) as Record<string, unknown>
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') return send(res, new Response('Method not allowed', { status: 405 }))
          await send(res, await (handler as (r: Request) => Promise<Response>)(await toRequest(req)))
        } catch (error) {
          server.config.logger.error(`[dev-api] ${req.method} ${req.url}: ${error instanceof Error ? error.message : error}`)
          await send(res, Response.json({ error: 'dev api failed' }, { status: 500 }))
        }
      })
    },
  }
}
