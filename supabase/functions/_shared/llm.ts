// Server-side LLM helper. The API key lives only in Edge Function secrets, never in the frontend.
//
// Env vars:
//   LLM_PROVIDER  "anthropic" (default). Add other providers in callLLM's switch.
//   LLM_API_KEY   provider API key (required)
//   LLM_MODEL     model id (default: claude-opus-5-5)
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0'

const DEFAULT_MODEL = 'claude-opus-5-5'

// Models that accept server-side refusal fallbacks (`fallbacks: "default"`). If the model
// declines a request on safety grounds, the API retries it on a suitable fallback model
// inside the same call. Other models are called without it.
const FALLBACK_MODELS = new Set([
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
  'claude-fable-5-1',
  'claude-fable-5-2',
])

export interface CallLLMOptions {
  system: string
  prompt: string
  /** Free-text description or JSON Schema of the expected output, appended to the system prompt. */
  jsonSchemaHint?: string
  maxTokens?: number
}

export class LLMError extends Error {
  constructor(
    message: string,
    public raw?: string,
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

/**
 * Calls the configured LLM, asks for JSON only, and returns the parsed value.
 * Throws LLMError if the model refuses, is truncated, or returns invalid JSON.
 *
 * TODO: validate the parsed output with a Zod schema per call site
 *       (e.g. callLLM(...).then((x) => ParsedResumeSchema.parse(x))) instead of trusting the cast.
 */
export async function callLLM<T = unknown>(opts: CallLLMOptions): Promise<T> {
  const provider = (Deno.env.get('LLM_PROVIDER') ?? 'anthropic').toLowerCase()
  const apiKey = Deno.env.get('LLM_API_KEY')
  if (!apiKey) throw new LLMError('LLM_API_KEY is not set (supabase secrets set LLM_API_KEY=...)')

  const system = [
    opts.system,
    'Respond with a single valid JSON value only. No prose, no explanations, no markdown code fences.',
    opts.jsonSchemaHint ? `The JSON must match this shape:\n${opts.jsonSchemaHint}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  let text: string
  switch (provider) {
    case 'anthropic':
      text = await callAnthropic(apiKey, system, opts.prompt, opts.maxTokens ?? 16000)
      break
    default:
      throw new LLMError(`Unsupported LLM_PROVIDER "${provider}". Only "anthropic" is implemented.`)
  }

  return parseJson<T>(text)
}

async function callAnthropic(apiKey: string, system: string, prompt: string, maxTokens: number) {
  const model = Deno.env.get('LLM_MODEL') || DEFAULT_MODEL
  const client = new Anthropic({ apiKey })

  const response = await client.beta.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    ...(FALLBACK_MODELS.has(model)
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
      : {}),
  })

  if (response.stop_reason === 'refusal') {
    throw new LLMError(
      `LLM refused the request (${response.stop_details?.category ?? 'no category'})`,
    )
  }
  if (response.stop_reason === 'max_tokens') {
    throw new LLMError('LLM output was truncated (max_tokens reached); raise maxTokens')
  }

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function parseJson<T>(text: string): T {
  // Be forgiving about a stray ```json fence even though we asked for none.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    const preview = cleaned.length > 300 ? `${cleaned.slice(0, 300)}…` : cleaned
    throw new LLMError(
      `LLM returned invalid JSON: ${(err as Error).message}. Output started with: ${preview}`,
      text,
    )
  }
}
