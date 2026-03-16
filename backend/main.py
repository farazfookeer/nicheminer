import json
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

from models import DiscoverRequest, BuildIdeaRequest, RefineRequest
from agent import discover, build_idea, refine_idea, request_cancel

app = FastAPI(title="NicheMiner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _sse_stream(gen_fn):
    async def event_stream():
        async for event in gen_fn():
            yield f"event: {event['event']}\ndata: {event['data']}\n\n"
        yield "event: done\ndata: {}\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/discover")
async def discover_endpoint(request: DiscoverRequest):
    return _sse_stream(lambda: discover(request.niche, request.target_pain_points))


@app.post("/api/build")
async def build_endpoint(request: BuildIdeaRequest):
    analysis_id = str(uuid.uuid4())
    async def gen():
        yield {"event": "analysis_id", "data": json.dumps(analysis_id)}
        async for event in build_idea(request.idea_name, request.idea_description,
                                       request.target_pain_point, request.niche, analysis_id):
            yield event
    return _sse_stream(gen)


@app.post("/api/refine")
async def refine_endpoint(request: RefineRequest):
    analysis_id = str(uuid.uuid4())
    async def gen():
        yield {"event": "analysis_id", "data": json.dumps(analysis_id)}
        async for event in refine_idea(request.idea_name, request.idea_description,
                                        request.target_pain_point, request.niche,
                                        request.feedback, request.current_build, analysis_id):
            yield event
    return _sse_stream(gen)


@app.post("/api/cancel/{analysis_id}")
async def cancel(analysis_id: str):
    request_cancel(analysis_id)
    return JSONResponse({"status": "cancelling"})
