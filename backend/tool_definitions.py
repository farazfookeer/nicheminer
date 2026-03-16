BUILDER_TOOLS = [
    {
        "name": "create_business_canvas",
        "description": "Generate a complete Business Model Canvas for the business idea. Call this first.",
        "input_schema": {
            "type": "object",
            "properties": {
                "key_partners": {"type": "array", "items": {"type": "string"}},
                "key_activities": {"type": "array", "items": {"type": "string"}},
                "key_resources": {"type": "array", "items": {"type": "string"}},
                "value_propositions": {"type": "array", "items": {"type": "string"}},
                "customer_relationships": {"type": "array", "items": {"type": "string"}},
                "channels": {"type": "array", "items": {"type": "string"}},
                "customer_segments": {"type": "array", "items": {"type": "string"}},
                "cost_structure": {"type": "array", "items": {"type": "string"}},
                "revenue_streams": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["key_partners", "key_activities", "key_resources", "value_propositions",
                         "customer_relationships", "channels", "customer_segments", "cost_structure", "revenue_streams"]
        }
    },
    {
        "name": "generate_competitive_analysis",
        "description": "Generate a competitive analysis comparing this idea against 3-4 existing solutions. Show feature gaps and market positioning.",
        "input_schema": {
            "type": "object",
            "properties": {
                "competitors": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "pricing": {"type": "string"},
                            "strengths": {"type": "array", "items": {"type": "string"}},
                            "weaknesses": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["name", "description", "pricing", "strengths", "weaknesses"]
                    }
                },
                "features": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Feature name"},
                            "our_idea": {"type": "boolean", "description": "Whether our idea has this feature"},
                            "competitor_support": {
                                "type": "object",
                                "description": "Map of competitor name to boolean",
                                "additionalProperties": {"type": "boolean"}
                            }
                        },
                        "required": ["name", "our_idea", "competitor_support"]
                    },
                    "description": "Feature comparison matrix"
                },
                "market_gaps": {"type": "array", "items": {"type": "string"}, "description": "Gaps in the market this idea exploits"},
                "unfair_advantage": {"type": "string", "description": "What makes this idea defensible"}
            },
            "required": ["competitors", "features", "market_gaps", "unfair_advantage"]
        }
    },
    {
        "name": "generate_revenue_model",
        "description": "Generate realistic revenue model defaults for an interactive calculator. Provide sensible starting values.",
        "input_schema": {
            "type": "object",
            "properties": {
                "price_per_month": {"type": "number", "description": "Suggested monthly price in USD"},
                "initial_users_month1": {"type": "integer", "description": "Realistic users acquired in month 1"},
                "monthly_growth_rate": {"type": "number", "description": "Monthly user growth rate as decimal (e.g. 0.15 for 15%)"},
                "churn_rate": {"type": "number", "description": "Monthly churn rate as decimal (e.g. 0.05 for 5%)"},
                "monthly_costs": {"type": "number", "description": "Estimated monthly fixed costs in USD"},
                "cac": {"type": "number", "description": "Customer acquisition cost in USD"},
                "pricing_tiers": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "price": {"type": "number"},
                            "features": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["name", "price", "features"]
                    }
                },
                "rationale": {"type": "string", "description": "Brief explanation of why these numbers are realistic"}
            },
            "required": ["price_per_month", "initial_users_month1", "monthly_growth_rate", "churn_rate",
                         "monthly_costs", "cac", "pricing_tiers", "rationale"]
        }
    },
    {
        "name": "generate_validation_score",
        "description": "Rate the business idea across 6 dimensions on a 1-10 scale. Be honest and realistic.",
        "input_schema": {
            "type": "object",
            "properties": {
                "market_size": {"type": "integer", "description": "1-10: How large is the addressable market?"},
                "competition": {"type": "integer", "description": "1-10: How favorable is the competitive landscape? (10 = low competition)"},
                "feasibility": {"type": "integer", "description": "1-10: How technically feasible for a solo founder?"},
                "time_to_market": {"type": "integer", "description": "1-10: How quickly can an MVP ship? (10 = very fast)"},
                "revenue_potential": {"type": "integer", "description": "1-10: How strong is the revenue potential?"},
                "defensibility": {"type": "integer", "description": "1-10: How defensible/moat-able is this?"},
                "overall_score": {"type": "number", "description": "Weighted overall score out of 10"},
                "verdict": {"type": "string", "description": "2-3 sentence honest verdict on this idea's viability"},
                "risks": {"type": "array", "items": {"type": "string"}, "description": "Top 3 risks"},
                "next_steps": {"type": "array", "items": {"type": "string"}, "description": "Top 3 recommended next steps"}
            },
            "required": ["market_size", "competition", "feasibility", "time_to_market",
                         "revenue_potential", "defensibility", "overall_score", "verdict", "risks", "next_steps"]
        }
    },
    {
        "name": "generate_marketing_plan",
        "description": "Generate a marketing launch plan with specific channels, tactics, budget breakdown, and timeline.",
        "input_schema": {
            "type": "object",
            "properties": {
                "target_audience": {"type": "string"},
                "positioning": {"type": "string"},
                "channels": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "strategy": {"type": "string"},
                            "budget": {"type": "string"},
                            "expected_roi": {"type": "string"}
                        },
                        "required": ["name", "strategy", "budget", "expected_roi"]
                    }
                },
                "launch_timeline": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "week": {"type": "string"},
                            "action": {"type": "string"}
                        },
                        "required": ["week", "action"]
                    }
                },
                "total_budget": {"type": "string"}
            },
            "required": ["target_audience", "positioning", "channels", "launch_timeline", "total_budget"]
        }
    }
]
