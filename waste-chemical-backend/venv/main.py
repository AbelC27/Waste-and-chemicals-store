from fastapi import FastAPI, Depends, HTTPException, Header, status
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
app = FastAPI(title="Waste & Chemical Management API", version="1.2.0")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Supabase Clients ---
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
supabase_auth: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

# --- Pydantic Models ---
class WasteCreate(BaseModel):
    name: str; category: str; quantity: float
    collection_date: Optional[str] = None; status: str = "pending"; location: Optional[str] = None
    certificate_file_path: Optional[str] = None

class WasteUpdate(BaseModel):
    name: Optional[str] = None; category: Optional[str] = None; quantity: Optional[float] = None
    collection_date: Optional[str] = None; status: Optional[str] = None; location: Optional[str] = None
    certificate_file_path: Optional[str] = None

class ChemicalCreate(BaseModel):
    name: str; category: str; quantity: float
    expiration_date: Optional[str] = None; location: Optional[str] = None
    sds_link: Optional[str] = None; reorder_level: Optional[float] = None
    sds_file_path: Optional[str] = None

class ChemicalUpdate(BaseModel):
    name: Optional[str] = None; category: Optional[str] = None; quantity: Optional[float] = None
    expiration_date: Optional[str] = None; location: Optional[str] = None
    sds_link: Optional[str] = None; reorder_level: Optional[float] = None
    sds_file_path: Optional[str] = None

class UserUpdate(BaseModel):
    role_id: str

class SignedURLRequest(BaseModel):
    file_name: str
    bucket: str

# --- Helper Functions ---
async def log_activity(user, action: str, details: dict):
    try:
        supabase.table("activity_log").insert({"user_id": user.id, "user_email": user.email, "action": action, "details": details}).execute()
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")

# --- Authentication & Authorization ---
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase_auth.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_response.user
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_permission(permission: str):
    async def permission_checker(user=Depends(get_current_user)):
        try:
            # 1. Get user's role_id from their profile
            profile_res = supabase.table("user_profiles").select("role_id").eq("id", user.id).single().execute()
            if not profile_res.data or not profile_res.data.get("role_id"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no assigned role.")
            role_id = profile_res.data["role_id"]

            # 2. Check if that role has the required permission
            permission_res = supabase.table("role_permissions").select("*, permissions(name)").eq("role_id", role_id).eq("permissions.name", permission).execute()
            if not permission_res.data:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Missing required permission: {permission}")
            
            return True # Permission granted
        except Exception as e:
            logger.error(f"Permission check failed for user {user.id} on permission '{permission}': {e}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")
    return permission_checker

# --- API Endpoints ---

@app.get("/api/user/profile")
async def get_user_profile(user=Depends(get_current_user)):
    # Fetches user profile, role, and all their permissions
    profile_res = supabase.table("user_profiles").select("*, roles(name)").eq("id", user.id).single().execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    role_id = profile_res.data.get("role_id")
    permissions_res = supabase.table("role_permissions").select("permissions(name)").eq("role_id", role_id).execute()
    
    profile_res.data["permissions"] = [p['permissions']['name'] for p in permissions_res.data]
    return profile_res.data

@app.get("/api/admin/users", dependencies=[Depends(require_permission("admin:manage_users"))])
async def get_all_users():
    response = supabase.table("user_profiles").select("id, email, roles(id, name)").execute()
    return response.data

@app.put("/api/admin/users/{user_id}", dependencies=[Depends(require_permission("admin:manage_users"))])
async def update_user_role(user_id: str, user_update: UserUpdate, user=Depends(get_current_user)):
    response = supabase.table("user_profiles").update({"role_id": user_update.role_id}).eq("id", user_id).execute()
    await log_activity(user, "Updated User Role", {"target_user_id": user_id, "new_role_id": user_update.role_id})
    return response.data[0]

@app.get("/api/admin/roles", dependencies=[Depends(require_permission("admin:manage_users"))])
async def get_all_roles():
    response = supabase.table("roles").select("*").execute()
    return response.data

@app.post("/api/storage/upload-url")
async def create_upload_url(request: SignedURLRequest, user=Depends(get_current_user)):
    try:
        # Supabase Python library currently doesn't support creating signed upload URLs directly.
        # We will construct the path and let the frontend upload with its anon key, relying on RLS policies.
        # For production, a more secure method would be a Supabase Edge Function.
        file_path = f"{user.id}/{datetime.now().timestamp()}-{request.file_name}"
        return {"path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notifications", dependencies=[Depends(require_permission("waste:read")), Depends(require_permission("chemicals:read"))])
async def get_notifications(user=Depends(get_current_user)):
    # ... (This endpoint remains the same as before)
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

@app.get("/api/activity-log", dependencies=[Depends(require_permission("admin:manage_users"))])
async def get_activity_log(limit: int = 50):
    response = supabase.table("activity_log").select("*").order("created_at", desc=True).limit(limit).execute()
    return response.data

@app.get("/api/waste", dependencies=[Depends(require_permission("waste:read"))])
async def get_waste(category: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None):
    query = supabase.table("waste").select("*")
    if category: query = query.eq("category", category)
    if status: query = query.eq("status", status)
    if search: query = query.ilike("name", f"%{search}%")
    response = query.order("created_at", desc=True).execute()
    return response.data or []

@app.post("/api/waste", dependencies=[Depends(require_permission("waste:create"))])
async def create_waste(waste: WasteCreate, user=Depends(get_current_user)):
    waste_data = waste.dict()
    waste_data["user_id"] = user.id
    response = supabase.table("waste").insert(waste_data).execute()
    await log_activity(user, "Created Waste", {"name": waste.name, "id": response.data[0]['id']})
    return response.data[0]

@app.put("/api/waste/{waste_id}", dependencies=[Depends(require_permission("waste:update"))])
async def update_waste(waste_id: str, waste: WasteUpdate, user=Depends(get_current_user)):
    waste_data = {k: v for k, v in waste.dict().items() if v is not None}
    if waste_data.get("collection_date") == "": waste_data["collection_date"] = None
    response = supabase.table("waste").update(waste_data).eq("id", waste_id).execute()
    await log_activity(user, "Updated Waste", {"name": waste.name or response.data[0]['name'], "id": waste_id})
    return response.data[0]

@app.delete("/api/waste/{waste_id}", dependencies=[Depends(require_permission("waste:delete"))])
async def delete_waste(waste_id: str, user=Depends(get_current_user)):
    item_to_delete = supabase.table("waste").select("name").eq("id", waste_id).single().execute()
    supabase.table("waste").delete().eq("id", waste_id).execute()
    await log_activity(user, "Deleted Waste", {"name": item_to_delete.data['name'], "id": waste_id})
    return {"message": "Waste deleted successfully"}

@app.get("/api/chemicals", dependencies=[Depends(require_permission("chemicals:read"))])
async def get_chemicals(category: Optional[str] = None, search: Optional[str] = None, expiring_soon: Optional[bool] = None):
    query = supabase.table("chemical").select("*")
    if category: query = query.eq("category", category)
    if search: query = query.ilike("name", f"%{search}%")
    if expiring_soon:
        thirty_days_from_now = (datetime.now() + timedelta(days=30)).date()
        query = query.lte("expiration_date", str(thirty_days_from_now))
    response = query.order("created_at", desc=True).execute()
    return response.data or []

@app.post("/api/chemicals", dependencies=[Depends(require_permission("chemicals:create"))])
async def create_chemical(chemical: ChemicalCreate, user=Depends(get_current_user)):
    chemical_data = chemical.dict()
    chemical_data["user_id"] = user.id
    response = supabase.table("chemical").insert(chemical_data).execute()
    await log_activity(user, "Created Chemical", {"name": chemical.name, "id": response.data[0]['id']})
    return response.data[0]

@app.put("/api/chemicals/{chemical_id}", dependencies=[Depends(require_permission("chemicals:update"))])
async def update_chemical(chemical_id: str, chemical: ChemicalUpdate, user=Depends(get_current_user)):
    chemical_data = {k: v for k, v in chemical.dict().items() if v is not None}
    if chemical_data.get("expiration_date") == "": chemical_data["expiration_date"] = None
    response = supabase.table("chemical").update(chemical_data).eq("id", chemical_id).execute()
    await log_activity(user, "Updated Chemical", {"name": chemical.name or response.data[0]['name'], "id": chemical_id})
    return response.data[0]

@app.delete("/api/chemicals/{chemical_id}", dependencies=[Depends(require_permission("chemicals:delete"))])
async def delete_chemical(chemical_id: str, user=Depends(get_current_user)):
    item_to_delete = supabase.table("chemical").select("name").eq("id", chemical_id).single().execute()
    supabase.table("chemical").delete().eq("id", chemical_id).execute()
    await log_activity(user, "Deleted Chemical", {"name": item_to_delete.data['name'], "id": chemical_id})
    return {"message": "Chemical deleted successfully"}

# Dashboard endpoint does not need specific permissions beyond being logged in
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    # ... (This endpoint remains the same as before)
    waste_response = supabase.table("waste").select("id", count="exact").execute()
    chemical_response = supabase.table("chemical").select("id", count="exact").execute()
    thirty_days_from_now = (datetime.now() + timedelta(days=30)).date()
    expiring_chemicals = supabase.table("chemical").select("*").lte("expiration_date", str(thirty_days_from_now)).execute()
    pending_waste = supabase.table("waste").select("*").eq("status", "pending").execute()
    return {"total_waste": waste_response.count or 0, "total_chemicals": chemical_response.count or 0, "expiring_chemicals": len(expiring_chemicals.data or []), "pending_waste": len(pending_waste.data or [])}