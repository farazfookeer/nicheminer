# Reddit Pain Point Agent

An agentic application that autonomously scrapes Reddit for pain points in a user-specified niche, then generates business ideas with cost estimates and marketing strategies.

## Tech Stack

- **Backend**: Python + FastAPI + httpx + Anthropic SDK
- **Agent**: Raw Anthropic tool-use loop (no framework)
- **Reddit**: Public JSON endpoints (no auth)
- **Frontend**: React + TypeScript + Tailwind (dark brutalist aesthetic)
- **Streaming**: Server-Sent Events (SSE)

## Commands

```bash
# Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm run dev

# Type check frontend
cd frontend && npx tsc --noEmit
```

## Environment Variables

`.env` in project root:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Architecture

Claude has 4 tools: `find_subreddits`, `scrape_posts`, `scrape_comments`, `save_pain_points`. It autonomously decides search strategy and stops when it has 3+ pain point clusters. Safety valve at 15 tool calls max.

SSE events: `status` (agent activity), `pain_point` (found a cluster), `result` (final JSON with business ideas), `done`.
