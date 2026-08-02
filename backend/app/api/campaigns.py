from fastapi import APIRouter

router = APIRouter(prefix="/campaigns", tags=["Campaign History"])

@router.get("/")
def list_campaigns():
    return [
        {
            "id": "c1",
            "title": "NexusAI Launch Post",
            "content_type": "Product Launch",
            "platform": "linkedin",
            "date": "2026-08-01",
            "snippet": "🚀 Launching NexusAI! Say goodbye to manual content creation...",
            "status": "finalised"
        },
        {
            "id": "c2",
            "title": "Founder Journey & Lessons",
            "content_type": "Founder Story",
            "platform": "x",
            "date": "2026-07-28",
            "snippet": "Building a startup is hard enough. Marketing shouldn't feel like...",
            "status": "finalised"
        }
    ]

@router.get("/{campaign_id}")
def get_campaign(campaign_id: str):
    return {
        "id": campaign_id,
        "title": "NexusAI Launch Post",
        "content_type": "Product Launch",
        "platform": "linkedin",
        "content_text": "🚀 Launching NexusAI! Say goodbye to manual content creation.",
        "cta": "Try the interactive demo now"
    }
