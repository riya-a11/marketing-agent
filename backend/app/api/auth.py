from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Auth"])

class AuthRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
def signup(req: AuthRequest):
    return {"message": "User registered successfully", "user": {"email": req.email, "id": "mock-uuid"}}

@router.post("/login")
def login(req: AuthRequest):
    return {"token": "mock-jwt-token", "user": {"email": req.email, "id": "mock-uuid"}}
