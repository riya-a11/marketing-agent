from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import supabase
import logging

logger = logging.getLogger("auth")

router = APIRouter(prefix="/auth", tags=["Auth"])

class AuthRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
def signup(req: AuthRequest):
    if not supabase:
        return {"message": "User registered (offline mode)", "user": {"email": req.email, "id": "mock-uuid"}}
    
    try:
        res = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password
        })
        return {"message": "User registered successfully", "user": res.user}
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
def login(req: AuthRequest):
    if not supabase:
        return {"token": "mock-jwt-token", "user": {"email": req.email, "id": "mock-uuid"}}
        
    try:
        res = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        return {"token": res.session.access_token, "user": res.user}
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
