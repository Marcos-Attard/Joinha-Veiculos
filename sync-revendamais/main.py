import os
import requests
import xmltodict

from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from supabase import create_client

load_dotenv()

REVENDAMAIS_XML_URL = os.getenv("REVENDAMAIS_XML_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SYNC_INTERVAL_MINUTES = int(os.getenv("SYNC_INTERVAL_MINUTES", "5"))
API_KEY = os.getenv("API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="Sync Revenda Mais")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def to_text(value):
    if value is None:
        return None
    return str(value).strip()


def to_int(value):
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).replace(",", ".")))
    except:
        return None


def to_float(value):
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except:
        return None


def ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def extract_images(ad):
    images = ad.get("IMAGES", {})
    urls = []

    if isinstance(images, dict):
        urls = ensure_list(images.get("IMAGE_URL"))

    return [url for url in urls if url]


def extract_images_large(ad):
    images = ad.get("IMAGES_LARGE", {})
    urls = []

    if isinstance(images, dict):
        urls = ensure_list(images.get("IMAGE_URL_LARGE"))

    return [url for url in urls if url]


def find_ads(parsed):
    """
    Procura os veículos no XML.
    No Revenda Mais, normalmente vem como ADS > AD.
    """

    if isinstance(parsed, dict):
        if "ADS" in parsed and isinstance(parsed["ADS"], dict):
            ads = parsed["ADS"].get("AD")
            return ensure_list(ads)

        if "AD" in parsed:
            return ensure_list(parsed["AD"])

        for value in parsed.values():
            found = find_ads(value)
            if found:
                return found

    return []


def normalize_ad(ad):
    external_id = to_text(ad.get("ID"))

    if not external_id:
        return None

    return {
        "external_id": external_id,
        "source": "revendamais",

        "title": to_text(ad.get("TITLE")),
        "category": to_text(ad.get("CATEGORY")),
        "description": to_text(ad.get("DESCRIPTION")),

        "make": to_text(ad.get("MAKE")),
        "model": to_text(ad.get("MODEL")),
        "base_model": to_text(ad.get("BASE_MODEL")),

        "year": to_int(ad.get("YEAR")),
        "fabric_year": to_int(ad.get("FABRIC_YEAR")),

        "condition": to_text(ad.get("CONDITION")),
        "mileage": to_int(ad.get("MILEAGE")),
        "fuel": to_text(ad.get("FUEL")),
        "gear": to_text(ad.get("GEAR")),
        "motor": to_text(ad.get("MOTOR")),
        "doors": to_int(ad.get("DOORS")),
        "color": to_text(ad.get("COLOR")),

        "price": to_float(ad.get("PRICE")),
        "promotion_price": to_float(ad.get("PROMOTION_PRICE")),
        "fipe_code": to_text(ad.get("FIPE")),
        "fipe_value": to_float(ad.get("VALOR_FIPE")),

        "plate": to_text(ad.get("PLATE")),
        "chassi": to_text(ad.get("CHASSI")),

        "seller": to_text(ad.get("SELLER")),
        "phone": to_text(ad.get("PHONE")),
        "cnpj": to_text(ad.get("CNPJ")),

        "city": to_text(ad.get("LOCATION_CITY")),
        "state": to_text(ad.get("LOCATION_STATE")),
        "neighborhood": to_text(ad.get("NEIGHBORHOOD")),
        "street": to_text(ad.get("STREET")),
        "number": to_text(ad.get("NUMBER")),
        "zip_code": to_text(ad.get("ZIP_CODE")),

        "images": extract_images(ad),
        "images_large": extract_images_large(ad),

        "video": to_text(ad.get("VIDEO")),

        "available": True,

        "xml_date": to_text(ad.get("DATE")),
        "last_update_xml": to_text(ad.get("LAST_UPDATE")),

        "updated_at": now_iso(),
        "last_seen_at": now_iso(),

        "raw": ad
    }


def sync_revendamais():
    print("Iniciando sincronização Revenda Mais...")

    response = requests.get(REVENDAMAIS_XML_URL, timeout=30)
    response.raise_for_status()

    parsed = xmltodict.parse(response.text)
    ads = find_ads(parsed)

    print(f"Veículos encontrados no XML: {len(ads)}")

    if len(ads) == 0:
        return {
            "success": False,
            "message": "Nenhum veículo encontrado no XML. Nada foi alterado.",
            "updated": 0,
            "unavailable": 0
        }

    seen_ids = []

    for ad in ads:
        vehicle = normalize_ad(ad)

        if not vehicle:
            continue

        seen_ids.append(vehicle["external_id"])

        supabase.table("vehicles").upsert(
            vehicle,
            on_conflict="external_id"
        ).execute()

    existing = supabase.table("vehicles") \
        .select("external_id") \
        .eq("source", "revendamais") \
        .execute()

    existing_ids = [item["external_id"] for item in existing.data]

    missing_ids = list(set(existing_ids) - set(seen_ids))

    for missing_id in missing_ids:
        supabase.table("vehicles") \
            .update({
                "available": False,
                "updated_at": now_iso()
            }) \
            .eq("external_id", missing_id) \
            .execute()

    print("Sincronização finalizada.")

    return {
        "success": True,
        "updated": len(seen_ids),
        "unavailable": len(missing_ids)
    }


def check_api_key(x_api_key):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")


@app.get("/")
def home():
    return {
        "status": "online",
        "service": "sync-revendamais"
    }


@app.post("/sync")
def sync_now(x_api_key: str | None = Header(default=None)):
    check_api_key(x_api_key)
    return sync_revendamais()


@app.get("/vehicles/search")
def search_vehicles(
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    year: int | None = Query(default=None),
    color: str | None = Query(default=None),
    gear: str | None = Query(default=None),
    fuel: str | None = Query(default=None),
    plate_final: str | None = Query(default=None),
    max_price: float | None = Query(default=None),
    min_price: float | None = Query(default=None),
    limit: int = Query(default=10),
    offset: int = Query(default=0),
    x_api_key: str | None = Header(default=None)
):
    check_api_key(x_api_key)

    query = supabase.table("vehicles") \
        .select("*") \
        .eq("source", "revendamais") \
        .eq("available", True)

    if category:
        query = query.ilike("category", f"%{category}%")
    if year:
        query = query.eq("year", year)
    if color:
        query = query.ilike("color", f"%{color}%")
    if gear:
        query = query.ilike("gear", f"%{gear}%")
    if fuel:
        query = query.ilike("fuel", f"%{fuel}%")
    if plate_final:
        query = query.ilike("plate", f"%{plate_final}")
    if max_price:
        query = query.lte("price", max_price)
    if min_price:
        query = query.gte("price", min_price)

    result = query.limit(100).execute()
    vehicles = result.data or []

    if q:
        q_lower = q.lower()

        def match(vehicle):
            text = " ".join([
                str(vehicle.get("title") or ""),
                str(vehicle.get("make") or ""),
                str(vehicle.get("model") or ""),
                str(vehicle.get("base_model") or ""),
                str(vehicle.get("description") or ""),
                str(vehicle.get("fuel") or ""),
                str(vehicle.get("gear") or ""),
                str(vehicle.get("color") or "")
            ]).lower()

            words = q_lower.split()
            return all(word in text for word in words)

        vehicles = [v for v in vehicles if match(v)]

    total = len(vehicles)
    page_slice = vehicles[offset : offset + limit]
    has_more = offset + limit < total
    next_offset = offset + limit if has_more else None

    # Transform results to include only requested fields
    allowed_fields = [
        "external_id", "title", "make", "model", "base_model", "year",
        "fabric_year", "mileage", "fuel", "gear", "motor", "color",
        "price", "promotion_price", "fipe_value", "description",
        "images", "images_large", "available"
    ]
    
    page = []
    for v in page_slice:
        filtered_v = {field: v.get(field) for field in allowed_fields}
        page.append(filtered_v)

    return {
        "count": len(page),
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
        "vehicles": page
    }


scheduler = BackgroundScheduler()


@app.on_event("startup")
def start_scheduler():
    scheduler.add_job(
        sync_revendamais,
        "interval",
        minutes=SYNC_INTERVAL_MINUTES,
        id="sync_revendamais",
        replace_existing=True
    )

    scheduler.start()
    print(f"Sincronizador automático iniciado a cada {SYNC_INTERVAL_MINUTES} minutos.")