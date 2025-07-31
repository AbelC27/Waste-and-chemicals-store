from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel
from datetime import datetime, date, timedelta
import json
import logging

# --- Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
load_dotenv()
app = FastAPI(title="Waste & Chemical Management API", version="1.1.1")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Supabase Clients ---
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)
supabase_auth: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")
)

# --- Pydantic Models ---
class WasteCreate(BaseModel):
    name: str; category: str; quantity: float
    collection_date: Optional[str] = None
    status: str = "pending"; location: Optional[str] = None

class WasteUpdate(BaseModel):
    name: Optional[str] = None; category: Optional[str] = None
    quantity: Optional[float] = None; collection_date: Optional[str] = None
    status: Optional[str] = None; location: Optional[str] = None

class ChemicalCreate(BaseModel):
    name: str; category: str; quantity: float
    expiration_date: Optional[str] = None; location: Optional[str] = None
    sds_link: Optional[str] = None; reorder_level: Optional[float] = None

class ChemicalUpdate(BaseModel):
    name: Optional[str] = None; category: Optional[str] = None
    quantity: Optional[float] = None; expiration_date: Optional[str] = None
    location: Optional[str] = None; sds_link: Optional[str] = None
    reorder_level: Optional[float] = None

# --- Helper Functions ---
async def log_activity(user, action: str, details: dict):
    try:
        supabase.table("activity_log").insert({
            "user_id": user.id,
            "user_email": user.email,
            "action": action,
            "details": details
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")

# --- Authentication ---
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase_auth.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

# --- API Endpoints ---

@app.get("/api/notifications")
async def get_notifications(current_user=Depends(get_current_user)):
    notifications = []
    thirty_days_from_now = (datetime.now() + timedelta(days=30)).date()
    expiring_res = supabase.table("chemical").select("*").lte("expiration_date", str(thirty_days_from_now)).execute()
    if expiring_res.data:
        for item in expiring_res.data:
            notifications.append({"id": f"exp-{item['id']}", "type": "expiring", "message": f"'{item['name']}' is expiring soon.", "link": f"/chemicals?search={item['name']}"})
    low_stock_res = supabase.table("chemical").select("*").not_.is_("reorder_level", "null").execute()
    if low_stock_res.data:
        for item in low_stock_res.data:
            if item['quantity'] <= item['reorder_level']:
                notifications.append({"id": f"low-{item['id']}", "type": "low_stock", "message": f"'{item['name']}' is low on stock.", "link": f"/chemicals?search={item['name']}"})
    pending_res = supabase.table("waste").select("*").eq("status", "pending").execute()
    if pending_res.data:
        for item in pending_res.data:
             notifications.append({"id": f"pending-{item['id']}", "type": "pending_waste", "message": f"'{item['name']}' is pending collection.", "link": f"/waste?search={item['name']}"})
    return notifications

@app.get("/api/activity-log")
async def get_activity_log(current_user=Depends(get_current_user), limit: int = 50):
    response = supabase.table("activity_log").select("*").order("created_at", desc=True).limit(limit).execute()
    return response.data

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user=Depends(get_current_user)):
    waste_response = supabase.table("waste").select("id", count="exact").execute()
    chemical_response = supabase.table("chemical").select("id", count="exact").execute()
    thirty_days_from_now = (datetime.now() + timedelta(days=30)).date()
    expiring_chemicals = supabase.table("chemical").select("*").lte("expiration_date", str(thirty_days_from_now)).execute()
    pending_waste = supabase.table("waste").select("*").eq("status", "pending").execute()
    return {"total_waste": waste_response.count or 0, "total_chemicals": chemical_response.count or 0, "expiring_chemicals": len(expiring_chemicals.data or []), "pending_waste": len(pending_waste.data or [])}

@app.get("/api/waste")
async def get_waste(category: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None, current_user=Depends(get_current_user)):
    query = supabase.table("waste").select("*")
    if category: query = query.eq("category", category)
    if status: query = query.eq("status", status)
    if search: query = query.ilike("name", f"%{search}%")
    response = query.order("created_at", desc=True).execute()
    return response.data or []

@app.post("/api/waste")
async def create_waste(waste: WasteCreate, current_user=Depends(get_current_user)):
    waste_data = waste.dict()
    waste_data["user_id"] = current_user.id
    response = supabase.table("waste").insert(waste_data).execute()
    await log_activity(current_user, "Created Waste", {"name": waste.name, "id": response.data[0]['id']})
    return response.data[0]

@app.put("/api/waste/{waste_id}")
async def update_waste(waste_id: str, waste: WasteUpdate, current_user=Depends(get_current_user)):
    waste_data = {k: v for k, v in waste.dict().items() if v is not None}
    
    # --- THIS IS THE FIX for the Waste endpoint ---
    # If the date field is an empty string, convert it to None so the DB can store it as NULL.
    if waste_data.get("collection_date") == "":
        waste_data["collection_date"] = None

    response = supabase.table("waste").update(waste_data).eq("id", waste_id).execute()
    await log_activity(current_user, "Updated Waste", {"name": waste.name or response.data[0]['name'], "id": waste_id})
    return response.data[0]

@app.delete("/api/waste/{waste_id}")
async def delete_waste(waste_id: str, current_user=Depends(get_current_user)):
    item_to_delete = supabase.table("waste").select("name").eq("id", waste_id).single().execute()
    supabase.table("waste").delete().eq("id", waste_id).execute()
    await log_activity(current_user, "Deleted Waste", {"name": item_to_delete.data['name'], "id": waste_id})
    return {"message": "Waste deleted successfully"}

@app.get("/api/chemicals")
async def get_chemicals(category: Optional[str] = None, search: Optional[str] = None, expiring_soon: Optional[bool] = None, current_user=Depends(get_current_user)):
    query = supabase.table("chemical").select("*")
    if category: query = query.eq("category", category)
    if search: query = query.ilike("name", f"%{search}%")
    if expiring_soon:
        thirty_days_from_now = (datetime.now() + timedelta(days=30)).date()
        query = query.lte("expiration_date", str(thirty_days_from_now))
    response = query.order("created_at", desc=True).execute()
    return response.data or []

@app.post("/api/chemicals")
async def create_chemical(chemical: ChemicalCreate, current_user=Depends(get_current_user)):
    chemical_data = chemical.dict()
    chemical_data["user_id"] = current_user.id
    response = supabase.table("chemical").insert(chemical_data).execute()
    await log_activity(current_user, "Created Chemical", {"name": chemical.name, "id": response.data[0]['id']})
    return response.data[0]

@app.put("/api/chemicals/{chemical_id}")
async def update_chemical(chemical_id: str, chemical: ChemicalUpdate, current_user=Depends(get_current_user)):
    chemical_data = {k: v for k, v in chemical.dict().items() if v is not None}

    # --- THIS IS THE FIX for the Chemical endpoint ---
    # If the date field is an empty string, convert it to None so the DB can store it as NULL.
    if chemical_data.get("expiration_date") == "":
        chemical_data["expiration_date"] = None

    response = supabase.table("chemical").update(chemical_data).eq("id", chemical_id).execute()
    await log_activity(current_user, "Updated Chemical", {"name": chemical.name or response.data[0]['name'], "id": chemical_id})
    return response.data[0]

@app.delete("/api/chemicals/{chemical_id}")
async def delete_chemical(chemical_id: str, current_user=Depends(get_current_user)):
    item_to_delete = supabase.table("chemical").select("name").eq("id", chemical_id).single().execute()
    supabase.table("chemical").delete().eq("id", chemical_id).execute()
    await log_activity(current_user, "Deleted Chemical", {"name": item_to_delete.data['name'], "id": chemical_id})
    return {"message": "Chemical deleted successfully"}