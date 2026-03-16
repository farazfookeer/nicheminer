from pydantic import BaseModel, Field


class DiscoverRequest(BaseModel):
    niche: str
    target_pain_points: int = Field(default=3, ge=1, le=10)


class BuildIdeaRequest(BaseModel):
    idea_name: str
    idea_description: str
    target_pain_point: str
    niche: str


class RefineRequest(BaseModel):
    idea_name: str
    idea_description: str
    target_pain_point: str
    niche: str
    feedback: str
    current_build: dict
