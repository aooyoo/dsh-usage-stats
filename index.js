/**
 * Host half of `@local/dsh-usage-stats`.
 *
 * It folds provider-reported token usage out of the durable session logs and
 * serves one aggregated snapshot over Connection's authenticated exact Fetch
 * route, so the Client half never has to replay events. The route is owned by
 * this plugin: it disappears with the fiber that registered it.
 */

import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/** The exact Fetch route path served to the page. */
const ROUTE_PATH = '/api/usage.stats'
/** Document-relative fallback route, used when the Fetch registry is unavailable. */
const FALLBACK_PATH = '/usage-stats.json'
/** Fallback cache lifetime when the row config omits `cacheMs`. */
const DEFAULT_CACHE_MS = 30_000
/** Fallback session budget when the row config omits `maxSessions`. */
const DEFAULT_MAX_SESSIONS = 400
/** How many session logs are read at once while filling the cache. */
const READ_CONCURRENCY = 4
/** Only the newest sessions are reported in the per-session list. */
const SESSION_ROW_LIMIT = 200
/** Activation failures land here so the reason stays readable after a restart. */
const DIAGNOSTIC_PATH = join(tmpdir(), 'dsh-usage-stats-activation.json')

export const inject = ['connection']

export function apply(ctx, config) {
  const settings = config && typeof config === 'object' ? config : {}
  const diagnostics = settings.diagnostics !== false
  if (diagnostics) clearDiagnostic()
  try {
    start(ctx, settings, diagnostics)
  } catch (error) {
    if (diagnostics) recordFailure({ stage: 'apply', error })
    throw error
  }
}

/**
 * Wire the route and the snapshot cache onto one fiber.
 * @param ctx the plugin's own Host context
 * @param config the row config, already normalized to an object
 * @param diagnostics whether activation failures are recorded for bug reports
 */
function start(ctx, config, diagnostics) {
  const cacheMs = positiveNumber(config.cacheMs, DEFAULT_CACHE_MS)
  const maxSessions = positiveNumber(config.maxSessions, DEFAULT_MAX_SESSIONS)

  /** Sessions folded from the previous generation of their log. */
  const sessionCache = new Map()
  /** One whole-corpus snapshot, reused until `cacheMs` elapses. */
  let snapshot = null
  /** Shared in-flight computation so concurrent requests fold the corpus once. */
  let pending = null

  const lifetime = new AbortController()
  ctx.effect(() => () => lifetime.abort())

  /** `sessionQuery` is optional: its absence fails the request, not the plugin. */
  function sessions() {
    const service = ctx.get('sessionQuery')
    if (!service) throw new Error('the sessionQuery service is not mounted in this composition')
    return service
  }

  const registered = registerRoutes(ctx, answer, config.allowPlainRoute === true, diagnostics)
  ctx.effect(() => () => {
    Promise.resolve(registered)
      .then((dispose) => dispose())
      .catch(() => {})
  })

  /** Answer one usage request with the cached snapshot. */
  async function answer(request) {
    let refresh = false
    try {
      refresh = new URL(request.url).searchParams.get('refresh') === '1'
    } catch {
      // A request without a parseable URL is answered from the cache.
    }
    try {
      return jsonResponse(200, await readSnapshot(refresh))
    } catch (error) {
      return jsonResponse(500, { error: messageOf(error) })
    }
  }

  /**
   * Serve the cached snapshot, or fold the corpus once and cache it.
   * @param refresh whether the caller asked to bypass the cache
   */
  async function readSnapshot(refresh) {
    const now = Date.now()
    if (!refresh && snapshot && now - snapshot.at < cacheMs) return snapshot.value
    if (pending) return pending
    pending = compute(now)
      .then((value) => {
        snapshot = { at: Date.now(), value }
        return value
      })
      .finally(() => {
        pending = null
      })
    return pending
  }

  /**
   * Fold every visible session log into one snapshot.
   * @param startedAt the wall clock this computation began at
   */
  async function compute(startedAt) {
    const entries = await listSessionEntries()
    const stats = new Map()
    const stale = []

    for (const entry of entries) {
      const stamp = entry.updatedAt || entry.createdAt || 0
      const cached = sessionCache.get(entry.id)
      if (!entry.running && cached && cached.stamp === stamp) stats.set(entry.id, cached.stats)
      else stale.push({ entry, stamp })
    }

    await forEachConcurrently(stale, READ_CONCURRENCY, async ({ entry, stamp }) => {
      const folded = await readSessionStats(entry.id)
      sessionCache.set(entry.id, { stamp, stats: folded })
      stats.set(entry.id, folded)
    })

    return aggregate(entries, stats, startedAt)
  }

  /**
   * Read and fold one session log.
   * @param sessionId durable session identity
   */
  async function readSessionStats(sessionId) {
    const folded = newSessionStats()
    let log
    try {
      log = await sessions().readSession(sessionId)
    } catch {
      return folded
    }
    for (const event of log.events || []) {
      if (!event || typeof event.type !== 'string') continue
      const data = event.data || {}
      if (event.type === 'session/title') {
        if (typeof data.title === 'string' && data.title.trim()) {
          folded.title = data.title.trim()
          folded.titleAt = Number(event.time) || folded.titleAt
        }
        continue
      }
      if (event.type === 'user/message') {
        folded.messages += 1
        continue
      }
      if (event.type !== 'assistant/message') continue
      const usage = data.usage
      if (!usage || typeof usage !== 'object') continue
      const time = Number(event.time) || 0
      const source = (data.message && data.message.source) || {}
      const provider = typeof source.provider === 'string' ? source.provider : 'unknown'
      const model = typeof source.model === 'string' ? source.model : 'unknown'
      const key = `${provider}/${model}`

      folded.requests += 1
      addUsage(folded.tokens, usage)
      addModelUsage(folded.models, key, provider, model, usage)
      addDayUsage(folded.days, dayKey(time), usage)
      if (!folded.firstAt || time < folded.firstAt) folded.firstAt = time
      if (time > folded.lastAt) folded.lastAt = time
    }
    return folded
  }

  /**
   * Reduce the folded sessions into the payload the panel renders.
   * @param entries listed sessions, newest activity first
   * @param stats folded stats by session id
   * @param startedAt the wall clock this computation began at
   */
  function aggregate(entries, stats, startedAt) {
    const totals = newTotals()
    const days = new Map()
    const models = new Map()
    const rows = []

    for (const entry of entries) {
      const folded = stats.get(entry.id) || newSessionStats()
      if (folded.requests > 0 || folded.messages > 0) {
        totals.sessions += 1
        totals.requests += folded.requests
        totals.messages += folded.messages
        mergeTokens(totals.tokens, folded.tokens)
        for (const [day, usage] of folded.days) mergeDay(days, day, usage)
        for (const [key, usage] of folded.models) mergeModel(models, key, usage)
      }
      rows.push({
        id: entry.id,
        title: folded.title || '',
        cwd: entry.cwd || '',
        parentSessionId: entry.parentSessionId || '',
        origin: entry.origin || '',
        running: entry.running === true,
        createdAt: Math.round(entry.createdAt || 0),
        lastActivityAt: Math.round(Math.max(entry.updatedAt || 0, folded.lastAt || 0)),
        requests: folded.requests,
        messages: folded.messages,
        tokens: folded.tokens,
        days: [...folded.days.keys()].sort(),
      })
    }

    totals.sessionsTotal = entries.length
    rows.sort((left, right) => right.tokens.total - left.tokens.total || right.lastActivityAt - left.lastActivityAt)

    return {
      generatedAt: Date.now(),
      elapsedMs: Date.now() - startedAt,
      totals,
      days: [...days.values()].sort((left, right) => (left.day < right.day ? -1 : 1)),
      models: [...models.values()].sort((left, right) => right.tokens.total - left.tokens.total),
      sessions: rows.slice(0, SESSION_ROW_LIMIT),
    }
  }

  /** List the sessions this deployment can read, newest activity first. */
  async function listSessionEntries() {
    const signal = lifetime.signal
    const controller = ctx.get('sessionController')
    if (controller && typeof controller.list === 'function') {
      try {
        const value = await controller.list({}, signal)
        const items = (value && value.items) || []
        return items
          .map((item) => ({
            id: String(item.sessionId),
            createdAt: 0,
            updatedAt: Number(item.updatedAt) || 0,
            running: item.running === true,
            cwd: item.cwd || '',
            parentSessionId: item.parentSessionId ? String(item.parentSessionId) : '',
            origin: item.origin || '',
          }))
          .slice(0, maxSessions)
      } catch {
        // Fall through to the query service below.
      }
    }
    const records = await sessions().listSessions(signal)
    return records
      .map((record) => ({
        id: String(record.header.id),
        createdAt: Number(record.header.createdAt) || 0,
        updatedAt: Number(record.header.createdAt) || 0,
        running: record.live === true,
        cwd: record.header.cwd || '',
        parentSessionId: record.header.parentSession ? String(record.header.parentSession) : '',
        origin: record.header.origin || '',
      }))
      .slice(0, maxSessions)
  }
}

/**
 * Claim one route for the snapshot: Connection's authenticated exact Fetch route
 * first and, only when the row opts in, a plain web route second, so a missing
 * registry degrades the transport instead of failing activation.
 * @param ctx the plugin's own Host context
 * @param answer the request handler both transports share
 * @param allowPlainRoute whether the unauthenticated fallback route may be claimed
 * @param diagnostics whether failures are recorded for bug reports
 */
function registerRoutes(ctx, answer, allowPlainRoute, diagnostics) {
  try {
    return ctx.connection.fetch.register({
      path: ROUTE_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: answer,
    })
  } catch (error) {
    if (diagnostics) recordFailure({ stage: 'connection-route', error })
  }
  if (!allowPlainRoute) {
    if (diagnostics) {
      recordFailure({
        stage: 'web-route',
        error: new Error('the authenticated Fetch route was not claimed and allowPlainRoute is off'),
      })
    }
    return () => {}
  }
  const webServer = ctx.get('webServer')
  if (!webServer) {
    if (diagnostics) recordFailure({ stage: 'web-route', error: new Error('no webServer service for the fallback route') })
    return () => {}
  }
  try {
    return webServer.register({
      kind: 'exact',
      path: FALLBACK_PATH,
      handler: async (req, res) => {
        const response = await answer(new Request(new URL(req.url || '/', 'http://dsh.internal'), { method: 'GET' }))
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
        res.end(await response.text())
      },
    })
  } catch (error) {
    if (diagnostics) recordFailure({ stage: 'web-route', error })
    return () => {}
  }
}

/** Drop the previous boot's diagnostic so one boot reports only its own outcome. */
function clearDiagnostic() {
  try {
    rmSync(DIAGNOSTIC_PATH, { force: true })
  } catch {
    // Nothing to clear.
  }
}

/** Record why activation could not claim a transport, readable after a restart. */
function recordFailure(detail) {
  try {
    let entries = []
    try {
      const previous = JSON.parse(readFileSync(DIAGNOSTIC_PATH, 'utf8'))
      if (Array.isArray(previous)) entries = previous
    } catch {
      // No earlier diagnostic: start a new list.
    }
    entries.push({
      at: new Date().toISOString(),
      stage: detail.stage,
      message: messageOf(detail.error),
      stack: detail.error instanceof Error ? detail.error.stack : undefined,
    })
    writeFileSync(DIAGNOSTIC_PATH, JSON.stringify(entries, null, 2))
  } catch {
    // A diagnostic is best effort; never mask the original failure.
  }
}

/** Empty token counters. */
function emptyTokens() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0 }
}

/** Fresh whole-corpus totals. */
function newTotals() {
  return { sessions: 0, sessionsTotal: 0, requests: 0, messages: 0, tokens: emptyTokens() }
}

/** Fresh per-session fold state. */
function newSessionStats() {
  return {
    requests: 0,
    messages: 0,
    tokens: emptyTokens(),
    models: new Map(),
    days: new Map(),
    title: '',
    titleAt: 0,
    firstAt: 0,
    lastAt: 0,
  }
}

/** Add one provider usage report to a counter set. */
function addUsage(target, usage) {
  const input = count(usage.inputTokens)
  const output = count(usage.outputTokens)
  const cacheRead = count(usage.cacheReadTokens)
  const cacheWrite = count(usage.cacheWriteTokens)
  target.input += input
  target.output += output
  target.cacheRead += cacheRead
  target.cacheWrite += cacheWrite
  target.reasoning += count(usage.reasoningTokens)
  // Providers report `totalTokens` as exactly this sum when they report it at
  // all, so computing it keeps mixed-reporting logs on one definition.
  target.total += input + output + cacheRead + cacheWrite
}

/** Merge one counter set into another. */
function mergeTokens(target, usage) {
  target.input += usage.input
  target.output += usage.output
  target.cacheRead += usage.cacheRead
  target.cacheWrite += usage.cacheWrite
  target.reasoning += usage.reasoning
  target.total += usage.total
}

/** Accumulate one model's share. */
function addModelUsage(models, key, provider, model, usage) {
  let bucket = models.get(key)
  if (!bucket) {
    bucket = { provider, model, requests: 0, tokens: emptyTokens() }
    models.set(key, bucket)
  }
  bucket.requests += 1
  addUsage(bucket.tokens, usage)
}

/** Merge one model bucket into the corpus map. */
function mergeModel(models, key, bucket) {
  let target = models.get(key)
  if (!target) {
    target = { provider: bucket.provider, model: bucket.model, requests: 0, tokens: emptyTokens() }
    models.set(key, target)
  }
  target.requests += bucket.requests
  mergeTokens(target.tokens, bucket.tokens)
}

/** Accumulate one day's share. */
function addDayUsage(days, day, usage) {
  let bucket = days.get(day)
  if (!bucket) {
    bucket = { day, requests: 0, tokens: emptyTokens() }
    days.set(day, bucket)
  }
  bucket.requests += 1
  addUsage(bucket.tokens, usage)
}

/** Merge one day bucket into the corpus map. */
function mergeDay(days, day, bucket) {
  let target = days.get(day)
  if (!target) {
    target = { day, requests: 0, tokens: emptyTokens() }
    days.set(day, target)
  }
  target.requests += bucket.requests
  mergeTokens(target.tokens, bucket.tokens)
}

/** Local calendar day of one event timestamp. */
function dayKey(time) {
  const date = new Date(time || Date.now())
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Read a non-negative integer field. */
function count(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/** Resolve a positive numeric config value. */
function positiveNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

/** Error text for a failure response. */
function messageOf(error) {
  if (error instanceof Error && error.message) return error.message
  return String(error)
}

/** Answer with one JSON document. */
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Run an async worker over items with bounded concurrency. */
async function forEachConcurrently(items, limit, worker) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await worker(item)
    }
  })
  await Promise.all(runners)
}
