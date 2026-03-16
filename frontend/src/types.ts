export interface PainPoint {
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  quotes: string[]
  subreddits: string[]
}

export interface BusinessIdea {
  name: string
  description: string
  target_pain_point: string
  estimated_cost: string
  revenue_model: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface DiscoverResult {
  pain_points: PainPoint[]
  business_ideas: BusinessIdea[]
}

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  total_tokens: number
}

export interface StatusEvent {
  message: string
  call_number?: number
}

export interface BusinessCanvas {
  key_partners: string[]
  key_activities: string[]
  key_resources: string[]
  value_propositions: string[]
  customer_relationships: string[]
  channels: string[]
  customer_segments: string[]
  cost_structure: string[]
  revenue_streams: string[]
}

export interface Competitor {
  name: string
  description: string
  pricing: string
  strengths: string[]
  weaknesses: string[]
}

export interface FeatureComparison {
  name: string
  our_idea: boolean
  competitor_support: Record<string, boolean>
}

export interface CompetitiveAnalysis {
  competitors: Competitor[]
  features: FeatureComparison[]
  market_gaps: string[]
  unfair_advantage: string
}

export interface PricingTier {
  name: string
  price: number
  features: string[]
}

export interface RevenueModel {
  price_per_month: number
  initial_users_month1: number
  monthly_growth_rate: number
  churn_rate: number
  monthly_costs: number
  cac: number
  pricing_tiers: PricingTier[]
  rationale: string
}

export interface ValidationScore {
  market_size: number
  competition: number
  feasibility: number
  time_to_market: number
  revenue_potential: number
  defensibility: number
  overall_score: number
  verdict: string
  risks: string[]
  next_steps: string[]
}

export interface MarketingChannel {
  name: string
  strategy: string
  budget: string
  expected_roi: string
}

export interface MarketingPlan {
  target_audience: string
  positioning: string
  channels: MarketingChannel[]
  launch_timeline: { week: string; action: string }[]
  total_budget: string
}

export interface BuildResult {
  canvas: BusinessCanvas | null
  competitive_analysis: CompetitiveAnalysis | null
  revenue_model: RevenueModel | null
  validation_score: ValidationScore | null
  marketing_plan: MarketingPlan | null
  input_tokens: number
  output_tokens: number
}
