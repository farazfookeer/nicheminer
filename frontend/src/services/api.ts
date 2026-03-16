import { StatusEvent, DiscoverResult, TokenUsage, BusinessCanvas, CompetitiveAnalysis, RevenueModel, ValidationScore, MarketingPlan, BuildResult } from '../types'

const API_BASE = 'http://localhost:8000'

// --- Discover ---
interface DiscoverCallbacks {
  onStatus: (s: StatusEvent) => void
  onTokens: (t: TokenUsage) => void
  onResult: (r: DiscoverResult) => void
  onError: (e: string) => void
  onDone: () => void
}

export async function discoverPainPoints(niche: string, count: number, cb: DiscoverCallbacks) {
  const resp = await fetch(`${API_BASE}/api/discover`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niche, target_pain_points: count }),
  })
  if (!resp.ok || !resp.body) { cb.onError('Failed to connect'); return }
  await processSSE(resp.body, {
    status: (d) => cb.onStatus(d), tokens: (d) => cb.onTokens(d),
    result: (d) => cb.onResult(d), done: () => cb.onDone(),
  })
  cb.onDone()
}

// --- Build / Refine ---
interface BuildCallbacks {
  onStatus: (s: StatusEvent) => void
  onTokens: (t: TokenUsage) => void
  onCanvas: (c: BusinessCanvas) => void
  onCompetitiveAnalysis: (ca: CompetitiveAnalysis) => void
  onRevenueModel: (rm: RevenueModel) => void
  onValidationScore: (vs: ValidationScore) => void
  onMarketingPlan: (mp: MarketingPlan) => void
  onComplete: (r: BuildResult) => void
  onAnalysisId: (id: string) => void
  onError: (e: string) => void
  onDone: () => void
}

export async function buildIdea(
  ideaName: string, ideaDescription: string, painPoint: string, niche: string, cb: BuildCallbacks
) {
  const resp = await fetch(`${API_BASE}/api/build`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea_name: ideaName, idea_description: ideaDescription, target_pain_point: painPoint, niche }),
  })
  if (!resp.ok || !resp.body) { cb.onError('Failed to connect'); return }
  await processSSE(resp.body, _buildHandlers(cb))
  cb.onDone()
}

export async function refineIdea(
  ideaName: string, ideaDescription: string, painPoint: string, niche: string,
  feedback: string, currentBuild: Record<string, unknown>, cb: BuildCallbacks
) {
  const resp = await fetch(`${API_BASE}/api/refine`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idea_name: ideaName, idea_description: ideaDescription,
      target_pain_point: painPoint, niche, feedback, current_build: currentBuild,
    }),
  })
  if (!resp.ok || !resp.body) { cb.onError('Failed to connect'); return }
  await processSSE(resp.body, _buildHandlers(cb))
  cb.onDone()
}

function _buildHandlers(cb: BuildCallbacks): Record<string, (d: any) => void> {
  return {
    status: (d) => cb.onStatus(d),
    tokens: (d) => cb.onTokens(d),
    analysis_id: (d) => cb.onAnalysisId(d),
    create_business_canvas: (d) => cb.onCanvas(d),
    generate_competitive_analysis: (d) => cb.onCompetitiveAnalysis(d),
    generate_revenue_model: (d) => cb.onRevenueModel(d),
    generate_validation_score: (d) => cb.onValidationScore(d),
    generate_marketing_plan: (d) => cb.onMarketingPlan(d),
    build_complete: (d) => cb.onComplete(d),
    done: () => cb.onDone(),
  }
}

export async function cancelAnalysis(id: string) {
  await fetch(`${API_BASE}/api/cancel/${id}`, { method: 'POST' })
}

// --- SSE parser ---
async function processSSE(body: ReadableStream, handlers: Record<string, (data: any) => void>) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', eventType = 'status'
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim()
      else if (line.startsWith('data: ')) {
        const h = handlers[eventType]
        if (h) try { h(JSON.parse(line.slice(6))) } catch { /* skip */ }
        eventType = 'status'
      }
    }
  }
}
