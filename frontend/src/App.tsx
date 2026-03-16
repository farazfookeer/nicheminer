import { useState, useRef, useEffect, useMemo } from 'react'
import { discoverPainPoints, buildIdea, refineIdea, cancelAnalysis } from './services/api'
import type { PainPoint, BusinessIdea, StatusEvent, DiscoverResult, TokenUsage, BusinessCanvas, CompetitiveAnalysis, RevenueModel, ValidationScore, MarketingPlan } from './types'

const EXAMPLES = ['remote workers', 'pet owners', 'home cooks', 'freelancers', 'new parents']
const SEV_CLR = { high: 'text-coral', medium: 'text-yellow-600', low: 'text-sky' }
const SEV_BG = { high: 'bg-red-50 border-coral/30', medium: 'bg-amber-50 border-yellow-400/30', low: 'bg-blue-50 border-sky/30' }
const DIFF_CLR = { easy: 'text-mint', medium: 'text-yellow-600', hard: 'text-coral' }

// --- Pixel Miner SVG ---
function Miner({ animate = false, className = '' }: { animate?: boolean; className?: string }) {
  return (
    <svg className={`${className} ${animate ? 'pixel-bounce' : ''}`} width="40" height="40" viewBox="0 0 20 20" shapeRendering="crispEdges">
      <rect x="6" y="0" width="6" height="1" fill="#FFD93D"/><rect x="5" y="1" width="8" height="1" fill="#FFD93D"/>
      <rect x="4" y="2" width="10" height="1" fill="#FFD93D"/><rect x="8" y="0" width="2" height="1" fill="#FF6B6B"/>
      <rect x="5" y="3" width="8" height="1" fill="#FFDAB9"/><rect x="4" y="4" width="10" height="1" fill="#FFDAB9"/>
      <rect x="4" y="5" width="10" height="1" fill="#FFDAB9"/><rect x="5" y="6" width="8" height="1" fill="#FFDAB9"/>
      <rect x="6" y="4" width="2" height="1" fill="#2D3436"/><rect x="10" y="4" width="2" height="1" fill="#2D3436"/>
      <rect x="7" y="6" width="4" height="1" fill="#FF6B6B"/>
      <rect x="5" y="7" width="8" height="1" fill="#4D96FF"/><rect x="4" y="8" width="10" height="1" fill="#4D96FF"/>
      <rect x="4" y="9" width="10" height="1" fill="#4D96FF"/><rect x="4" y="10" width="10" height="1" fill="#4D96FF"/>
      <rect x="5" y="11" width="8" height="1" fill="#4D96FF"/>
      <rect x="6" y="8" width="1" height="1" fill="#FFD93D"/><rect x="11" y="8" width="1" height="1" fill="#FFD93D"/>
      <rect x="2" y="8" width="2" height="1" fill="#FFDAB9"/><rect x="2" y="9" width="2" height="1" fill="#FFDAB9"/>
      <rect x="14" y="8" width="2" height="1" fill="#FFDAB9"/><rect x="14" y="9" width="2" height="1" fill="#FFDAB9"/>
      <rect x="1" y="5" width="1" height="1" fill="#8B4513"/><rect x="1" y="6" width="1" height="1" fill="#8B4513"/>
      <rect x="1" y="7" width="1" height="1" fill="#8B4513"/><rect x="2" y="7" width="1" height="1" fill="#8B4513"/>
      <rect x="0" y="4" width="3" height="1" fill="#636E72"/><rect x="0" y="3" width="1" height="1" fill="#636E72"/>
      <rect x="2" y="3" width="1" height="1" fill="#636E72"/>
      <rect x="5" y="12" width="3" height="2" fill="#2D3436"/><rect x="10" y="12" width="3" height="2" fill="#2D3436"/>
      <rect x="4" y="14" width="4" height="1" fill="#8B4513"/><rect x="10" y="14" width="4" height="1" fill="#8B4513"/>
    </svg>
  )
}

// --- Radar Chart SVG ---
function RadarChart({ scores }: { scores: ValidationScore }) {
  const dims = [
    { key: 'market_size', label: 'Market Size' },
    { key: 'competition', label: 'Competition' },
    { key: 'feasibility', label: 'Feasibility' },
    { key: 'time_to_market', label: 'Time to Market' },
    { key: 'revenue_potential', label: 'Revenue' },
    { key: 'defensibility', label: 'Defensibility' },
  ] as const
  const cx = 150, cy = 140, r = 110, n = dims.length
  const angleStep = (2 * Math.PI) / n
  const getPoint = (i: number, val: number) => {
    const angle = angleStep * i - Math.PI / 2
    return { x: cx + (r * val / 10) * Math.cos(angle), y: cy + (r * val / 10) * Math.sin(angle) }
  }
  const gridLevels = [2, 4, 6, 8, 10]

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => (
        <polygon key={level} fill="none" stroke="#E2E8F0" strokeWidth="0.5"
          points={dims.map((_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}` }).join(' ')} />
      ))}
      {/* Axes */}
      {dims.map((_, i) => {
        const p = getPoint(i, 10)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E2E8F0" strokeWidth="0.5" />
      })}
      {/* Data polygon */}
      <polygon
        fill="rgba(255,107,107,0.2)" stroke="#FF6B6B" strokeWidth="2"
        points={dims.map((d, i) => { const p = getPoint(i, scores[d.key]); return `${p.x},${p.y}` }).join(' ')} />
      {/* Data dots */}
      {dims.map((d, i) => {
        const p = getPoint(i, scores[d.key])
        return <circle key={i} cx={p.x} cy={p.y} r="4" fill="#FF6B6B" />
      })}
      {/* Labels */}
      {dims.map((d, i) => {
        const p = getPoint(i, 12)
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            className="text-[9px] fill-gray-500 font-mono">
            {d.label} ({scores[d.key]})
          </text>
        )
      })}
    </svg>
  )
}

// --- Revenue Calculator ---
function RevenueCalc({ defaults }: { defaults: RevenueModel }) {
  const [price, setPrice] = useState(defaults.price_per_month)
  const [users, setUsers] = useState(defaults.initial_users_month1)
  const [growth, setGrowth] = useState(defaults.monthly_growth_rate)
  const [churn, setChurn] = useState(defaults.churn_rate)
  const [costs, setCosts] = useState(defaults.monthly_costs)

  const projections = useMemo(() => {
    const months = []
    let activeUsers = users
    for (let m = 1; m <= 12; m++) {
      const newUsers = Math.floor(activeUsers * growth)
      const churned = Math.floor(activeUsers * churn)
      activeUsers = activeUsers + newUsers - churned
      const mrr = activeUsers * price
      const profit = mrr - costs - (newUsers * defaults.cac)
      months.push({ month: m, users: activeUsers, mrr, profit })
    }
    return months
  }, [price, users, growth, churn, costs, defaults.cac])

  const maxMrr = Math.max(...projections.map((p) => p.mrr), 1)
  const month12 = projections[11]

  return (
    <div className="space-y-6">
      {/* Sliders */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Price/mo', value: price, set: setPrice, min: 1, max: 200, prefix: '$' },
          { label: 'Initial users', value: users, set: setUsers, min: 1, max: 500, prefix: '' },
          { label: 'Monthly growth', value: growth, set: (v: number) => setGrowth(v), min: 0, max: 0.5, step: 0.01, prefix: '', fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
          { label: 'Monthly churn', value: churn, set: (v: number) => setChurn(v), min: 0, max: 0.3, step: 0.01, prefix: '', fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
          { label: 'Monthly costs', value: costs, set: setCosts, min: 0, max: 10000, step: 100, prefix: '$' },
        ].map(({ label, value, set, min, max, step, prefix, fmt }) => (
          <div key={label} className="bg-cream rounded-lg p-3">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-xs text-subtle">{label}</span>
              <span className="font-mono text-sm text-ink font-bold">
                {prefix}{fmt ? fmt(value) : value.toLocaleString()}
              </span>
            </div>
            <input type="range" min={min} max={max} step={step || 1} value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="w-full accent-coral h-1.5" />
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-cream rounded-lg p-4">
        <h4 className="font-mono text-xs text-subtle uppercase tracking-widest mb-3">12-Month MRR Projection</h4>
        <div className="flex items-end gap-1 h-32">
          {projections.map((p) => (
            <div key={p.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t" style={{
                height: `${(p.mrr / maxMrr) * 100}%`,
                backgroundColor: p.profit >= 0 ? '#6BCB77' : '#FF6B6B',
                minHeight: '2px',
              }} />
              <span className="font-mono text-[9px] text-subtle">{p.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cream rounded-lg p-3 text-center">
          <div className="font-mono text-xs text-subtle">Month 12 MRR</div>
          <div className="font-mono text-lg text-ink font-bold">${month12.mrr.toLocaleString()}</div>
        </div>
        <div className="bg-cream rounded-lg p-3 text-center">
          <div className="font-mono text-xs text-subtle">ARR</div>
          <div className="font-mono text-lg text-ink font-bold">${(month12.mrr * 12).toLocaleString()}</div>
        </div>
        <div className="bg-cream rounded-lg p-3 text-center">
          <div className="font-mono text-xs text-subtle">Month 12 Users</div>
          <div className="font-mono text-lg text-ink font-bold">{month12.users.toLocaleString()}</div>
        </div>
      </div>

      {/* Pricing tiers */}
      {defaults.pricing_tiers.length > 0 && (
        <div>
          <h4 className="font-mono text-xs text-subtle uppercase tracking-widest mb-3">Suggested Pricing Tiers</h4>
          <div className="grid gap-3 grid-cols-3">
            {defaults.pricing_tiers.map((tier) => (
              <div key={tier.name} className="bg-cream rounded-lg p-3">
                <div className="font-mono text-sm font-bold text-ink">{tier.name}</div>
                <div className="font-mono text-lg text-coral font-bold">${tier.price}/mo</div>
                <ul className="mt-2 space-y-1">
                  {tier.features.map((f, i) => <li key={i} className="text-xs text-subtle flex gap-1"><span className="text-mint">✓</span> {f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-subtle italic">{defaults.rationale}</p>
    </div>
  )
}

type TabKey = 'canvas' | 'competitors' | 'revenue' | 'validation' | 'marketing'

export default function App() {
  const [niche, setNiche] = useState('')
  const [count, setCount] = useState(3)
  const [discovering, setDiscovering] = useState(false)
  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null)

  const [building, setBuilding] = useState(false)
  const [buildId, setBuildId] = useState<string | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<BusinessIdea | null>(null)
  const [canvas, setCanvas] = useState<BusinessCanvas | null>(null)
  const [competitors, setCompetitors] = useState<CompetitiveAnalysis | null>(null)
  const [revenueModel, setRevenueModel] = useState<RevenueModel | null>(null)
  const [validation, setValidation] = useState<ValidationScore | null>(null)
  const [marketing, setMarketing] = useState<MarketingPlan | null>(null)

  const [logs, setLogs] = useState<StatusEvent[]>([])
  const [tokens, setTokens] = useState<TokenUsage>({ input_tokens: 0, output_tokens: 0, total_tokens: 0 })
  const [activeTab, setActiveTab] = useState<TabKey>('canvas')
  const [feedback, setFeedback] = useState('')
  const [refining, setRefining] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => { logRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  const busy = discovering || building || refining

  const buildCallbacks = () => ({
    onStatus: (s: StatusEvent) => setLogs((p) => [...p, s]),
    onTokens: (t: TokenUsage) => setTokens(t),
    onCanvas: (c: BusinessCanvas) => { setCanvas(c); setActiveTab('canvas') },
    onCompetitiveAnalysis: (ca: CompetitiveAnalysis) => { setCompetitors(ca); setActiveTab('competitors') },
    onRevenueModel: (rm: RevenueModel) => { setRevenueModel(rm); setActiveTab('revenue') },
    onValidationScore: (vs: ValidationScore) => { setValidation(vs); setActiveTab('validation') },
    onMarketingPlan: (mp: MarketingPlan) => { setMarketing(mp); setActiveTab('marketing') },
    onComplete: () => {},
    onAnalysisId: (id: string) => setBuildId(id),
    onError: (e: string) => setLogs((p) => [...p, { message: `Error: ${e}` }]),
    onDone: () => { setBuilding(false); setRefining(false) },
  })

  const handleDiscover = async (v: string) => {
    const q = v || niche
    if (!q.trim() || busy) return
    setNiche(q); setDiscovering(true); setDiscoverResult(null); setSelectedIdea(null)
    setCanvas(null); setCompetitors(null); setRevenueModel(null); setValidation(null); setMarketing(null)
    setLogs([]); setTokens({ input_tokens: 0, output_tokens: 0, total_tokens: 0 })
    await discoverPainPoints(q.trim(), count, {
      onStatus: (s) => setLogs((p) => [...p, s]),
      onTokens: (t) => setTokens(t),
      onResult: (r) => setDiscoverResult(r),
      onError: (e) => setLogs((p) => [...p, { message: `Error: ${e}` }]),
      onDone: () => setDiscovering(false),
    })
  }

  const handleBuild = async (idea: BusinessIdea) => {
    setSelectedIdea(idea); setBuilding(true); setLogs([])
    setCanvas(null); setCompetitors(null); setRevenueModel(null); setValidation(null); setMarketing(null)
    setActiveTab('canvas')
    await buildIdea(idea.name, idea.description, idea.target_pain_point, niche, buildCallbacks())
  }

  const handleRefine = async () => {
    if (!feedback.trim() || !selectedIdea || busy) return
    setRefining(true); setLogs([])
    const currentBuild = { canvas, competitive_analysis: competitors, revenue_model: revenueModel, validation_score: validation, marketing_plan: marketing }
    await refineIdea(selectedIdea.name, selectedIdea.description, selectedIdea.target_pain_point, niche,
      feedback, currentBuild as Record<string, unknown>, buildCallbacks())
    setFeedback('')
  }

  const handleExport = () => {
    const data = {
      idea: selectedIdea, niche, canvas, competitive_analysis: competitors,
      revenue_model: revenueModel, validation_score: validation, marketing_plan: marketing,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${selectedIdea?.name || 'idea'}-build.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const tabs: { key: TabKey; label: string; ready: boolean }[] = [
    { key: 'canvas', label: 'Canvas', ready: !!canvas },
    { key: 'competitors', label: 'Competitors', ready: !!competitors },
    { key: 'revenue', label: 'Revenue', ready: !!revenueModel },
    { key: 'validation', label: 'Validation', ready: !!validation },
    { key: 'marketing', label: 'Marketing', ready: !!marketing },
  ]

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-peach px-6 py-5 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Miner animate={busy} className="shrink-0" />
          <div className="flex-1">
            <h1 className="font-mono text-xl font-bold text-ink">Niche<span className="text-coral">Miner</span></h1>
            <p className="text-subtle text-sm mt-0.5">Find pain points, pick an idea, watch it come to life</p>
          </div>
          {tokens.total_tokens > 0 && (
            <div className="flex gap-3 font-mono text-xs items-center">
              <div className="w-24 h-2 bg-peach/60 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sunny to-coral transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min((tokens.total_tokens / 50000) * 100, 100)}%` }} />
              </div>
              <span className="text-coral font-bold">{tokens.total_tokens.toLocaleString()} tokens</span>
              <span className="text-subtle">~${((tokens.input_tokens * 3 + tokens.output_tokens * 15) / 1_000_000).toFixed(3)}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Phase 1 */}
        {!selectedIdea && (
          <>
            <div className="mb-8">
              <div className="flex gap-3">
                <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDiscover(niche)}
                  placeholder="Enter a niche (e.g. 'remote workers')" disabled={busy}
                  className="flex-1 bg-white border-2 border-peach rounded-lg px-4 py-3 text-ink font-sans placeholder:text-subtle/60 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 disabled:opacity-50 shadow-sm" />
                <div className="flex items-center gap-2 bg-white border-2 border-peach rounded-lg px-3 shadow-sm">
                  <label className="font-mono text-xs text-subtle">Count</label>
                  <select value={count} onChange={(e) => setCount(Number(e.target.value))} disabled={busy}
                    className="bg-transparent font-mono text-ink font-bold text-sm focus:outline-none disabled:opacity-50 py-3">
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button onClick={() => handleDiscover(niche)} disabled={busy || !niche.trim()}
                  className="bg-ink text-sunny font-mono font-extrabold px-10 py-3 rounded-lg uppercase tracking-widest text-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 border-2 border-ink">
                  {discovering ? 'Mining...' : 'Mine'}
                </button>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {EXAMPLES.map((n) => (
                  <button key={n} onClick={() => handleDiscover(n)} disabled={busy}
                    className="text-xs font-mono text-subtle border-2 border-peach rounded-full px-4 py-1.5 hover:text-coral hover:border-coral hover:bg-red-50 transition-all disabled:opacity-50">{n}</button>
                ))}
              </div>
            </div>

            {logs.length > 0 && !discoverResult && (
              <div className="mb-8 bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3"><Miner animate={discovering} /><h2 className="font-mono text-xs text-subtle uppercase tracking-widest">Mining</h2></div>
                <div className="font-mono text-sm space-y-1.5">
                  {logs.map((l, i) => <div key={i} className="animate-fade-in flex gap-2"><span className="text-coral">{'>'}</span><span className="text-ink">{l.message}</span></div>)}
                  {discovering && <div className="flex gap-1 text-coral text-lg"><span className="pulse-dot">.</span><span className="pulse-dot">.</span><span className="pulse-dot">.</span></div>}
                </div>
              </div>
            )}

            {discoverResult && (
              <>
                <div className="mb-8">
                  <h2 className="font-mono text-xs text-subtle uppercase tracking-widest mb-4">Pain Points ({discoverResult.pain_points.length})</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {discoverResult.pain_points.map((pp, i) => (
                      <div key={i} className={`border-2 rounded-xl p-5 animate-fade-in shadow-sm ${SEV_BG[pp.severity]}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-mono text-sm font-bold text-ink">{pp.title}</h3>
                          <span className={`font-mono text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-white/60 ${SEV_CLR[pp.severity]}`}>{pp.severity}</span>
                        </div>
                        <p className="text-sm text-subtle mb-3">{pp.description}</p>
                        {pp.quotes.slice(0, 2).map((q, j) => (
                          <blockquote key={j} className="text-xs text-ink/60 border-l-2 border-coral/30 pl-3 italic bg-white/40 rounded-r py-1 mb-1">"{q.length > 120 ? q.slice(0, 120) + '...' : q}"</blockquote>
                        ))}
                        <div className="mt-2 flex gap-1.5 flex-wrap">
                          {pp.subreddits.map((s) => <span key={s} className="text-xs font-mono text-sky bg-blue-50 px-2 py-0.5 rounded-full border border-sky/20">r/{s}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-8">
                  <h2 className="font-mono text-xs text-subtle uppercase tracking-widest mb-2">Business Ideas — click to build</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {discoverResult.business_ideas.map((idea, i) => (
                      <button key={i} onClick={() => handleBuild(idea)}
                        className="text-left bg-white border-2 border-peach rounded-xl p-5 shadow-sm hover:border-coral hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-mono text-sm font-bold text-ink group-hover:text-coral transition-colors">{idea.name}</h3>
                          <span className={`font-mono text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-cream ${DIFF_CLR[idea.difficulty]}`}>{idea.difficulty}</span>
                        </div>
                        <p className="text-sm text-ink mb-2">{idea.description}</p>
                        <div className="flex gap-4 text-xs text-subtle"><span>Cost: {idea.estimated_cost}</span><span>Revenue: {idea.revenue_model}</span></div>
                        <div className="mt-2 text-xs font-mono text-coral opacity-0 group-hover:opacity-100 transition-opacity">Click to build →</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Phase 2 */}
        {selectedIdea && (
          <>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <button onClick={() => { setSelectedIdea(null); setLogs([]) }} disabled={busy}
                  className="text-sm font-mono text-subtle hover:text-coral transition-colors disabled:opacity-50 mb-2">← Back to ideas</button>
                <h2 className="font-mono text-lg font-bold text-ink">{selectedIdea.name}</h2>
                <p className="text-sm text-subtle mt-1">{selectedIdea.description}</p>
              </div>
              <div className="flex gap-2">
                {(canvas || competitors || revenueModel || validation || marketing) && (
                  <button onClick={handleExport}
                    className="font-mono text-xs text-subtle border-2 border-peach rounded-lg px-4 py-2 hover:border-coral hover:text-coral transition-all">
                    Export JSON
                  </button>
                )}
                {busy && (
                  <button onClick={() => buildId && cancelAnalysis(buildId)}
                    className="bg-ink text-white font-mono font-bold px-6 py-2 rounded-lg uppercase tracking-wider text-sm hover:bg-gray-700 transition-all shadow-md active:scale-95">Stop</button>
                )}
              </div>
            </div>

            {/* Log */}
            {logs.length > 0 && (
              <div className="mb-6 bg-white border-2 border-peach rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Miner animate={busy} /><h3 className="font-mono text-xs text-subtle uppercase tracking-widest">Building</h3></div>
                <div className="font-mono text-sm space-y-1 max-h-32 overflow-y-auto">
                  {logs.map((l, i) => <div key={i} className="animate-fade-in flex gap-2"><span className="text-coral">{l.call_number ? `[${l.call_number}]` : '>'}</span><span className="text-ink">{l.message}</span></div>)}
                  {busy && <div className="flex gap-1 text-coral text-lg"><span className="pulse-dot">.</span><span className="pulse-dot">.</span><span className="pulse-dot">.</span></div>}
                  <div ref={logRef} />
                </div>
              </div>
            )}

            {/* Tabs */}
            {tabs.some((t) => t.ready) && (
              <>
                <div className="flex gap-1 mb-6 bg-white border-2 border-peach rounded-lg p-1 shadow-sm inline-flex">
                  {tabs.map(({ key, label, ready }) => (
                    <button key={key} onClick={() => setActiveTab(key)} disabled={!ready}
                      className={`font-mono text-xs px-4 py-2 rounded transition-all ${activeTab === key ? 'bg-ink text-white' : ready ? 'text-ink hover:bg-peach/50' : 'text-subtle/40 cursor-not-allowed'}`}>
                      {label}{ready ? '' : '...'}
                    </button>
                  ))}
                </div>

                {/* Canvas */}
                {activeTab === 'canvas' && canvas && (
                  <div className="animate-fade-in grid grid-cols-5 gap-3 mb-8">
                    {([
                      { t: 'Key Partners', items: canvas.key_partners, s: 'col-span-1 row-span-2' },
                      { t: 'Key Activities', items: canvas.key_activities, s: 'col-span-1' },
                      { t: 'Value Props', items: canvas.value_propositions, s: 'col-span-1 row-span-2' },
                      { t: 'Customer Rel.', items: canvas.customer_relationships, s: 'col-span-1' },
                      { t: 'Segments', items: canvas.customer_segments, s: 'col-span-1 row-span-2' },
                      { t: 'Key Resources', items: canvas.key_resources, s: 'col-span-1' },
                      { t: 'Channels', items: canvas.channels, s: 'col-span-1' },
                      { t: 'Cost Structure', items: canvas.cost_structure, s: 'col-span-2' },
                      { t: 'Revenue Streams', items: canvas.revenue_streams, s: 'col-span-3' },
                    ] as const).map(({ t, items, s }) => (
                      <div key={t} className={`bg-white border-2 border-peach rounded-xl p-4 shadow-sm ${s}`}>
                        <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-2">{t}</h4>
                        <ul className="space-y-1">{items.map((item, j) => <li key={j} className="text-xs text-ink flex gap-1.5"><span className="text-sunny shrink-0">›</span>{item}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Competitors */}
                {activeTab === 'competitors' && competitors && (
                  <div className="animate-fade-in mb-8 space-y-6">
                    {/* Feature matrix */}
                    <div className="bg-white border-2 border-peach rounded-xl p-5 shadow-sm overflow-x-auto">
                      <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-3">Feature Comparison</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-peach">
                            <th className="text-left font-mono text-xs text-subtle py-2 pr-4">Feature</th>
                            <th className="text-center font-mono text-xs text-coral py-2 px-3">Ours</th>
                            {competitors.competitors.map((c) => <th key={c.name} className="text-center font-mono text-xs text-subtle py-2 px-3">{c.name}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {competitors.features.map((f, i) => (
                            <tr key={i} className="border-b border-peach/50">
                              <td className="py-2 pr-4 text-ink">{f.name}</td>
                              <td className="text-center py-2 px-3">{f.our_idea ? <span className="text-mint font-bold">✓</span> : <span className="text-subtle">—</span>}</td>
                              {competitors.competitors.map((c) => (
                                <td key={c.name} className="text-center py-2 px-3">
                                  {f.competitor_support[c.name] ? <span className="text-mint">✓</span> : <span className="text-subtle">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Competitor cards */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {competitors.competitors.map((c) => (
                        <div key={c.name} className="bg-white border-2 border-peach rounded-xl p-4 shadow-sm">
                          <h4 className="font-mono text-sm font-bold text-ink mb-1">{c.name}</h4>
                          <p className="text-xs text-subtle mb-2">{c.description} — <span className="text-coral">{c.pricing}</span></p>
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="font-mono text-xs text-mint">Strengths</span>{c.strengths.map((s, i) => <p key={i} className="text-xs text-ink">+ {s}</p>)}</div>
                            <div><span className="font-mono text-xs text-coral">Weaknesses</span>{c.weaknesses.map((w, i) => <p key={i} className="text-xs text-ink">- {w}</p>)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Gaps & advantage */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="bg-white border-2 border-peach rounded-xl p-4 shadow-sm">
                        <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-2">Market Gaps We Exploit</h4>
                        {competitors.market_gaps.map((g, i) => <p key={i} className="text-sm text-ink mb-1 flex gap-1.5"><span className="text-sunny">›</span>{g}</p>)}
                      </div>
                      <div className="bg-white border-2 border-peach rounded-xl p-4 shadow-sm">
                        <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-2">Unfair Advantage</h4>
                        <p className="text-sm text-ink">{competitors.unfair_advantage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Revenue */}
                {activeTab === 'revenue' && revenueModel && (
                  <div className="animate-fade-in mb-8 bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                    <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-4">Revenue Calculator</h4>
                    <RevenueCalc defaults={revenueModel} />
                  </div>
                )}

                {/* Validation */}
                {activeTab === 'validation' && validation && (
                  <div className="animate-fade-in mb-8 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                        <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-4">Viability Score</h4>
                        <RadarChart scores={validation} />
                        <div className="text-center mt-4">
                          <span className="font-mono text-3xl font-bold text-coral">{validation.overall_score}</span>
                          <span className="font-mono text-lg text-subtle">/10</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                          <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-2">Verdict</h4>
                          <p className="text-sm text-ink">{validation.verdict}</p>
                        </div>
                        <div className="bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                          <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-2">Risks</h4>
                          {validation.risks.map((r, i) => <p key={i} className="text-sm text-ink mb-1 flex gap-1.5"><span className="text-coral">!</span>{r}</p>)}
                        </div>
                        <div className="bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                          <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-2">Next Steps</h4>
                          {validation.next_steps.map((s, i) => <p key={i} className="text-sm text-ink mb-1 flex gap-1.5"><span className="text-mint">{i + 1}.</span>{s}</p>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Marketing */}
                {activeTab === 'marketing' && marketing && (
                  <div className="animate-fade-in mb-8 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                        <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-2">Target Audience</h4>
                        <p className="text-sm text-ink">{marketing.target_audience}</p>
                      </div>
                      <div className="bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                        <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-2">Positioning</h4>
                        <p className="text-sm text-ink">{marketing.positioning}</p>
                      </div>
                    </div>
                    <div className="bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-mono text-xs text-coral uppercase tracking-widest">Channels</h4>
                        <span className="font-mono text-xs text-subtle">Budget: <span className="text-coral font-bold">{marketing.total_budget}</span></span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {marketing.channels.map((ch, i) => (
                          <div key={i} className="bg-cream rounded-lg p-3">
                            <h5 className="font-mono text-sm font-bold text-ink mb-1">{ch.name}</h5>
                            <p className="text-xs text-subtle mb-2">{ch.strategy}</p>
                            <div className="flex gap-3 text-xs font-mono">
                              <span><span className="text-subtle">Budget:</span> {ch.budget}</span>
                              <span><span className="text-subtle">ROI:</span> <span className="text-mint">{ch.expected_roi}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                      <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-3">Launch Timeline</h4>
                      {marketing.launch_timeline.map((s, i) => (
                        <div key={i} className="flex gap-3 items-start mb-2">
                          <span className="font-mono text-xs text-coral font-bold shrink-0 w-16">{s.week}</span>
                          <span className="text-sm text-ink">{s.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Refinement */}
                {!busy && tabs.some((t) => t.ready) && (
                  <div className="mb-8 bg-white border-2 border-peach rounded-xl p-5 shadow-sm">
                    <h4 className="font-mono text-xs text-coral uppercase tracking-widest mb-3">Refine This Idea</h4>
                    <div className="flex gap-3">
                      <input type="text" value={feedback} onChange={(e) => setFeedback(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                        placeholder="e.g. 'make it more B2B', 'lower the price point', 'target enterprise'"
                        className="flex-1 bg-cream border-2 border-peach rounded-lg px-4 py-2.5 text-ink font-sans text-sm placeholder:text-subtle/60 focus:outline-none focus:border-coral" />
                      <button onClick={handleRefine} disabled={!feedback.trim()}
                        className="bg-ink text-sunny font-mono font-bold px-6 py-2.5 rounded-lg uppercase tracking-wider text-sm hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md active:scale-95">
                        Refine
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
