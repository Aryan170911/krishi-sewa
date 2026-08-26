"""
Krishi Sewa Foundation - Python Flask Backend for StackHost
Mirrors Node server/server.js API, serves frontend static at same port.
Run: python api.py  (or python server/app.py)
StackHost: python:3.11-slim, pip install -r requirements.txt, start: python api.py
"""
import os
import json
import random
import string
import time
import logging
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
try:
    from dotenv import load_dotenv
    load_dotenv()
except: pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "krishi-sewa-frontend")
DATA_DIR = os.path.join(BASE_DIR, "server", "data")
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")
PRODUCTS_FILE = os.path.join(DATA_DIR, "products.json")

app = Flask(__name__, static_folder=FRONTEND_DIR)
# CORS - allow all in dev, restrict via CORS_ORIGIN env in prod
cors_origin = os.environ.get("CORS_ORIGIN", "*")
if cors_origin == "*":
    CORS(app)
else:
    CORS(app, origins=cors_origin.split(","), supports_credentials=True)

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("krishi")

# Simple in-memory rate limit for orders (10/min per IP)
_rate_store = {}
def check_rate_limit(ip, max_req=10, window=60):
    now = time.time()
    lst = _rate_store.get(ip, [])
    lst = [t for t in lst if now - t < window]
    if len(lst) >= max_req:
        return False
    lst.append(now)
    _rate_store[ip] = lst
    return True

@app.before_request
def before_request_log():
    g.start_time = time.time()
    logger.info(f"{request.method} {request.path} from {request.remote_addr}")

@app.after_request
def add_security_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "SAMEORIGIN"
    resp.headers["X-XSS-Protection"] = "1; mode=block"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Allow Tailwind CDN and Google Fonts
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "API endpoint not found"}), 404
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"500 {request.path}: {e}")
    return jsonify({"error": "Internal server error"}), 500

# ============ Seed Data (same as server/data.js) ============
seed_products = [
  {
    "id": 1,
    "name": "Heirloom Tomato Seeds",
    "description": "Premium heritage variety 'Crimson Cushion' tomatoes. These seeds produce large, flavorful fruits perfect for fresh eating, canning, and sauces. Non-GMO, open-pollinated, and sourced from our partner seed banks.",
    "shortDescription": "Variety: Crimson Cushion • Approx. 50 seeds",
    "price": 350,
    "originalPrice": 450,
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXhpA6l71qyyoxfQpdrqhLwZvle4foCTrFy5L4478wmEE5FUmhmeeKyf1jwNSm5Qf9IJgkQ1IzduXhPqPDXWSo2CALP5cSxgNfH5wfTsmaotvt_nxZGiBtLP4y7zEHlTG93dGHz8qWGEY_4xEZwe13xve889LSj-UiqAZSVD97PaAhOQ",
    "category": "seeds",
    "tags": ["heirloom", "organic", "non-gmo"],
    "inStock": True,
    "rating": 4.8,
    "reviewCount": 124,
    "specifications": {
      "Seed Count": "Approx. 50 seeds",
      "Variety": "Crimson Cushion",
      "Type": "Indeterminate",
      "Days to Maturity": "80-85 days",
      "Sun Requirement": "Full sun (6-8 hours)",
      "Planting Depth": "1/4 inch",
      "Spacing": "24-36 inches",
      "Certification": "Non-GMO, Open Pollinated"
    },
    "reviews": [
      {"id": 1, "author": "Ramesh K.", "rating": 5, "date": "2024-10-15", "text": "Excellent germination rate! Nearly 95% of seeds sprouted within a week. The tomatoes are delicious."},
      {"id": 2, "author": "Priya S.", "rating": 4, "date": "2024-09-28", "text": "Good quality seeds. Plants are healthy and producing well. Fast delivery too."},
      {"id": 3, "author": "Arjun P.", "rating": 5, "date": "2024-09-10", "text": "Best heirloom tomatoes I've grown. Rich flavor, beautiful color. Will order again."}
    ]
  },
  {
    "id": 2,
    "name": "Heritage Marigold Seeds",
    "description": "Vibrant heritage marigold variety that acts as a natural pest repellent in your garden. These bright orange and gold flowers not only beautify your space but also protect neighboring plants from nematodes and other pests.",
    "shortDescription": "Natural Pest Repellent • Approx. 100 seeds",
    "price": 150,
    "originalPrice": 180,
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuAAv9l5YKQK7aiMu_5m8C6g5MafSEAiPwFXlvIG8FzAt7zyM-HtASNCtbCbPNRq7JHsBjXstZ1fzLdzXOz-UsIcXAQFHp_AaXnApVERt_mYHk5P0t8OUg08d1DCgyXWOp_BUsLQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    "category": "seeds",
    "tags": ["companion planting", "pest control", "pollinator friendly"],
    "inStock": True,
    "rating": 4.6,
    "reviewCount": 89,
    "specifications": {
      "Seed Count": "Approx. 100 seeds",
      "Variety": "African Marigold (Tagetes erecta)",
      "Flower Color": "Orange & Gold",
      "Height": "24-36 inches",
      "Bloom Time": "Summer to Frost",
      "Sun Requirement": "Full sun",
      "Spacing": "10-12 inches",
      "Special Feature": "Natural nematode repellent"
    },
    "reviews": [
      {"id": 1, "author": "Sunita M.", "rating": 5, "date": "2024-10-05", "text": "Planted these around my vegetable garden - noticeably fewer pests this season!"},
      {"id": 2, "author": "Vikram R.", "rating": 4, "date": "2024-08-20", "text": "Beautiful flowers, great germination. Attracts lots of bees and butterflies."}
    ]
  },
  {
    "id": 3,
    "name": "Premium Wheat Seeds (10kg)",
    "description": "High-yield wheat variety developed for Indian climatic conditions. Excellent disease resistance and adaptability. Each 10kg bag covers approximately 0.4 hectares.",
    "shortDescription": "High Yield • Disease Resistant • 10kg Bag",
    "price": 600,
    "originalPrice": 720,
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuBuWfjWr0p5XkK1rHLLnTdxUDbYf9ayByiYPyjBZSVjMOrBETL5wVjPWTeraHHQq3KI7QOLZBfFAsfhcT0gPrEVSEhehtC8frutSK3EDnUjBnay621C29bEQjr8loouTvCKmhDcB2Hf3ARHy2QR2UYWq8OdX9HMF-DKN2OhTKpYVlwob-A8MH_P-2_1vk4EUTTMsGJJbUczKUMg-lUXBU87mQ4mml0IVjYZoDUKFVhRJfU6ZJcnrchh7Q",
    "category": "seeds",
    "tags": ["staple crop", "high yield", "disease resistant"],
    "inStock": True,
    "rating": 4.7,
    "reviewCount": 203,
    "specifications": {
      "Weight": "10 kg",
      "Coverage": "~0.4 hectares",
      "Variety": "HD-3086 (High Yield)",
      "Sowing Season": "Rabi (Oct-Dec)",
      "Yield Potential": "55-65 quintals/hectare",
      "Disease Resistance": "Rust, Blight, Smut",
      "Protein Content": "12-13%",
      "Certification": "ICAR Certified"
    },
    "reviews": [
      {"id": 1, "author": "Harpreet S.", "rating": 5, "date": "2024-11-02", "text": "Best wheat seeds I've used in 15 years of farming. Uniform germination, excellent tillering."},
      {"id": 2, "author": "Gurpreet K.", "rating": 5, "date": "2024-10-28", "text": "Got 62 quintals per hectare this season. Highly recommended for Punjab region."}
    ]
  },
  {
    "id": 4,
    "name": "Organic Fertilizer Mix (5kg)",
    "description": "Balanced organic fertilizer blend enriched with neem cake, vermicompost, and rock phosphate. Improves soil health naturally without chemical buildup. Safe for all crops including vegetables, fruits, and grains.",
    "shortDescription": "Neem Cake + Vermicompost + Rock Phosphate • 5kg",
    "price": 450,
    "originalPrice": 520,
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDwDvtdaTBWDNX2UfJ3-AqZRWrs0pDe1ji98caQB_eJydHiNKE1rNm_ubLD7GjzOVJoiP3f7WbYcbSdIBvlTkEnMpKQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    "category": "fertilizers",
    "tags": ["organic", "soil health", "neem cake"],
    "inStock": True,
    "rating": 4.9,
    "reviewCount": 156,
    "specifications": {
      "Weight": "5 kg",
      "Composition": "Neem Cake (40%), Vermicompost (35%), Rock Phosphate (25%)",
      "NPK Ratio": "4-2-3 (approx.)",
      "Application": "2-3 kg per 100 sq ft",
      "Suitable For": "All crops - vegetables, fruits, grains, flowers",
      "Certification": "NPOP Organic Certified",
      "Shelf Life": "12 months from manufacture",
      "Packaging": "Moisture-proof recyclable bag"
    },
    "reviews": [
      {"id": 1, "author": "Meera D.", "rating": 5, "date": "2024-10-18", "text": "Soil texture improved dramatically. My vegetable yield increased by 30% this season."},
      {"id": 2, "author": "Rajesh K.", "rating": 5, "date": "2024-09-25", "text": "No chemical smell, earthy fragrance. Plants look healthier within 2 weeks of application."}
    ]
  },
  {
    "id": 5,
    "name": "Stainless Steel Hand Trowel",
    "description": "Ergonomic stainless steel hand trowel with comfortable wooden handle. Rust-resistant, durable, and designed for precision work in tight spaces. Perfect for transplanting, weeding, and soil preparation.",
    "shortDescription": "Ergonomic Wooden Handle • Rust-Resistant • Lifetime Warranty",
    "price": 380,
    "originalPrice": 450,
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuAAv9l5YKQK7aiMu_5m8C6g5MafSEAiPwFXlvIG8FzAt7zyM-HtASNCtbCbPNRq7JHsBjXstZ1fzLdzXOz-UsIcXAQFHp_AaXnApVERt_mYHk5P0t8OUg08d1DCgyXWOp_BUsLQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    "category": "tools",
    "tags": ["hand tool", "stainless steel", "ergonomic"],
    "inStock": True,
    "rating": 4.8,
    "reviewCount": 67,
    "specifications": {
      "Material": "304 Stainless Steel Blade, Sustainable Hardwood Handle",
      "Blade Length": "6 inches",
      "Total Length": "11.5 inches",
      "Weight": "280g",
      "Handle Type": "Ergonomic D-grip",
      "Warranty": "Lifetime against manufacturing defects",
      "Care": "Wipe clean after use, oil wooden handle annually"
    },
    "reviews": [
      {"id": 1, "author": "Kavya N.", "rating": 5, "date": "2024-10-10", "text": "Perfect balance and weight. The wooden handle feels great even after hours of use."},
      {"id": 2, "author": "Amit P.", "rating": 4, "date": "2024-09-15", "text": "High quality steel, no rust after months of use. Slightly pricey but worth it."}
    ]
  },
  {
    "id": 6,
    "name": "Drip Irrigation Kit (100m)",
    "description": "Complete drip irrigation system for up to 100 sq meters. Includes main line, drippers, connectors, stakes, and timer. Saves up to 70% water compared to flood irrigation. Easy DIY installation.",
    "shortDescription": "Water Saving 70% • 100m Coverage • Includes Timer",
    "price": 2200,
    "originalPrice": 2800,
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDwDvtdaTBWDNX2UfJ3-AqZRWrs0pDe1ji98caQB_eJydHiNKE1rNm_ubLD7GjzOVJoiP3f7WbYcbSdIBvlTkEnMpKQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    "category": "tools",
    "tags": ["irrigation", "water saving", "diy kit"],
    "inStock": True,
    "rating": 4.5,
    "reviewCount": 92,
    "specifications": {
      "Coverage Area": "Up to 100 sq meters",
      "Main Pipe": "16mm LDPE, 50m",
      "Drippers": "20pcs (4 L/h pressure compensating)",
      "Connectors": "Tees, elbows, end caps, joiners",
      "Stakes": "20pcs plastic stakes",
      "Timer": "Battery-operated digital timer included",
      "Filter": "120 mesh screen filter",
      "Pressure Range": "1-3 bar",
      "Water Saving": "Up to 70% vs flood irrigation"
    },
    "reviews": [
      {"id": 1, "author": "Suresh R.", "rating": 5, "date": "2024-10-22", "text": "Installed in 2 hours. Water bill dropped 60%. Timer works perfectly. Great value."},
      {"id": 2, "author": "Lakshmi T.", "rating": 4, "date": "2024-09-30", "text": "Good kit for small farm. Instructions clear. Need better quality stakes though."}
    ]
  }
]

categories = [
  {"id": "all", "name": "All Products", "icon": "grid_view"},
  {"id": "seeds", "name": "Seeds", "icon": "grass", "count": 3},
  {"id": "fertilizers", "name": "Fertilizers", "icon": "eco", "count": 1},
  {"id": "tools", "name": "Tools & Equipment", "icon": "build", "count": 2}
]

events = [
  {
    "id": 1,
    "title": "Organic Farming Workshop",
    "date": "November 15, 2024",
    "time": "9:00 AM - 4:00 PM",
    "location": "Krishi Vigyan Kendra, Pune",
    "description": "Learn sustainable organic farming techniques from experts. Hands-on training in composting, natural pest management, and soil health improvement.",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXhpA6l71qyyoxfQpdrqhLwZvle4foCTrFy5L4478wmEE5FUmhmeeKyf1jwNSm5Qf9IJgkQ1IzduXhPqPDXWSo2CALP5cSxgNfH5wfTsmaotvt_nxZGiBtLP4y7zEHlTG93dGHz8qWGEY_4xEZwe13xve889LSj-UiqAZSVD97PaAhOQ",
    "registered": 45,
    "capacity": 60,
    "type": "workshop"
  },
  {
    "id": 2,
    "title": "Seed Festival & Exchange",
    "date": "December 8, 2024",
    "time": "10:00 AM - 6:00 PM",
    "location": "Agrinagar Community Ground, Maharashtra",
    "description": "Annual celebration of seed diversity. Exchange heirloom varieties, attend talks by seed savers, and discover rare indigenous crops.",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuAAv9l5YKQK7aiMu_5m8C6g5MafSEAiPwFXlvIG8FzAt7zyM-HtASNCtbCbPNRq7JHsBjXstZ1fzLdzXOz-UsIcXAQFHp_AaXnApVERt_mYHk5P0t8OUg08d1DCgyXWOp_BUsLQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    "registered": 120,
    "capacity": 200,
    "type": "festival"
  }
]

indianStates = [
  {"code": "UP", "name": "Uttar Pradesh"},
  {"code": "MH", "name": "Maharashtra"},
  {"code": "KA", "name": "Karnataka"},
  {"code": "PB", "name": "Punjab"},
  {"code": "TN", "name": "Tamil Nadu"},
  {"code": "GJ", "name": "Gujarat"},
  {"code": "WB", "name": "West Bengal"},
  {"code": "RJ", "name": "Rajasthan"},
  {"code": "MP", "name": "Madhya Pradesh"},
  {"code": "HR", "name": "Haryana"}
]

districtsByState = {
  "UP": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Saharanpur"],
  "MH": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Amravati", "Kolhapur", "Sangli", "Satara"],
  "KA": ["Bengaluru", "Mysuru", "Hubli-Dharwad", "Mangaluru", "Belagavi", "Kalaburagi", "Davanagere", "Ballari", "Vijayapura", "Shivamogga"],
  "PB": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Firozpur", "Batala", "Pathankot", "Moga"],
  "TN": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Vellore", "Erode", "Thoothukudi"],
  "GJ": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Navsari"],
  "WB": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Malda", "Bardhaman", "Berhampore", "Kharagpur", "Haldia"],
  "RJ": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Udaipur", "Ajmer", "Bhilwara", "Alwar", "Bharatpur", "Sikar"],
  "MP": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
  "HR": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"]
}

# ============ Persistence Helpers ============
os.makedirs(DATA_DIR, exist_ok=True)

def load_products():
    if os.path.exists(PRODUCTS_FILE):
        try:
            with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except: pass
    # seed
    save_products(seed_products)
    return [dict(p) for p in seed_products]

def save_products(products):
    try:
        with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
            json.dump(products, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Failed to save products: {e}")

def load_orders():
    if not os.path.exists(ORDERS_FILE):
        with open(ORDERS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
        return []
    try:
        with open(ORDERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_orders(orders):
    try:
        with open(ORDERS_FILE, "w", encoding="utf-8") as f:
            json.dump(orders, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Failed to save orders: {e}")

products = load_products()

AUDIT_FILE = os.path.join(DATA_DIR, "audit.json")
def load_audit():
    if not os.path.exists(AUDIT_FILE):
        with open(AUDIT_FILE, "w", encoding="utf-8") as f: json.dump([], f)
        return []
    try:
        with open(AUDIT_FILE, "r", encoding="utf-8") as f: return json.load(f)
    except: return []
def log_audit(action, details, ip=""):
    try:
        logs = load_audit()
        logs.append({"timestamp": datetime.now(timezone.utc).isoformat(), "action": action, "details": details, "ip": ip, "user": os.environ.get("ADMIN_USER","admin")})
        if len(logs) > 200: logs = logs[-200:]
        with open(AUDIT_FILE, "w", encoding="utf-8") as f: json.dump(logs, f, indent=2, ensure_ascii=False)
    except Exception as e: logger.error(f"Audit log failed: {e}")

def generate_order_id():
    return "#KS-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def calculate_total(items):
    subtotal = sum(i["price"] * i["quantity"] for i in items)
    discount = 200 if subtotal > 1000 else 0
    shipping = 0 if subtotal > 2000 else 60
    total = subtotal - discount + shipping
    return subtotal, discount, shipping, total

# ============ API Routes ============
@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "message": "Krishi Sewa Python API running",
        "version": "1.0.0",
        "env": os.environ.get("FLASK_ENV", "production"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "products": len(products),
        "orders": len(load_orders())
    })

@app.route("/api")
def api_root():
    return jsonify({
        "name": "Krishi Sewa Foundation API",
        "version": "1.0.0",
        "endpoints": ["/api/health","/api/products","/api/categories","/api/events","/api/orders","/api/admin/stats","/admin"]
    })

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    if not check_rate_limit(request.remote_addr or "login", max_req=5, window=60):
        return jsonify({"error": "Too many login attempts, try again later"}), 429
    data = request.get_json() or {}
    admin_user = os.environ.get("ADMIN_USER", "admin")
    admin_pass = os.environ.get("ADMIN_PASS", "admin123")
    admin_token = os.environ.get("ADMIN_TOKEN", "krishi-admin-token-2026")
    if data.get("username") == admin_user and data.get("password") == admin_pass:
        logger.info(f"Admin login success from {request.remote_addr}")
        return jsonify({"token": admin_token, "username": admin_user})
    logger.warning(f"Admin login failed from {request.remote_addr} user={data.get('username')}")
    return jsonify({"error": "Invalid credentials. Try admin / admin123"}), 401

@app.route("/api/admin/audit")
def admin_audit():
    logs = load_audit()
    return jsonify(list(reversed(logs[-50:])))

@app.route("/api/admin/stats")
def admin_stats():
    orders = load_orders()
    total_revenue = sum(o.get("total", 0) for o in orders)
    return jsonify({
        "totalProducts": len(products),
        "totalOrders": len(orders),
        "pendingOrders": len([o for o in orders if o.get("status") == "processing"]),
        "shippedOrders": len([o for o in orders if o.get("status") == "shipped"]),
        "deliveredOrders": len([o for o in orders if o.get("status") == "delivered"]),
        "totalRevenue": total_revenue,
        "inStockProducts": len([p for p in products if p.get("inStock")]),
        "outOfStockProducts": len([p for p in products if not p.get("inStock")])
    })

@app.route("/api/products")
def get_products():
    result = list(products)
    category = request.args.get("category")
    search = request.args.get("search", "").lower()
    priceRange = request.args.get("priceRange")
    sortBy = request.args.get("sortBy")
    if category and category != "all":
        result = [p for p in result if p.get("category") == category]
    if search:
        result = [p for p in result if search in p.get("name","").lower() or search in p.get("description","").lower() or any(search in t.lower() for t in p.get("tags", []))]
    if priceRange and priceRange != "all":
        if priceRange == "under500": result = [p for p in result if p.get("price",0) < 500]
        elif priceRange == "500-1000": result = [p for p in result if 500 <= p.get("price",0) <= 1000]
        elif priceRange == "1000-2000": result = [p for p in result if 1000 <= p.get("price",0) <= 2000]
        elif priceRange == "over2000": result = [p for p in result if p.get("price",0) > 2000]
    if sortBy == "price-low": result.sort(key=lambda x: x.get("price",0))
    elif sortBy == "price-high": result.sort(key=lambda x: x.get("price",0), reverse=True)
    elif sortBy == "rating": result.sort(key=lambda x: x.get("rating",0), reverse=True)
    elif sortBy == "newest": result.sort(key=lambda x: x.get("id",0), reverse=True)
    return jsonify(result)

@app.route("/api/products/<int:pid>")
def get_product(pid):
    prod = next((p for p in products if p.get("id") == pid), None)
    if not prod: return jsonify({"error": "Product not found"}), 404
    return jsonify(prod)

@app.route("/api/products", methods=["POST"])
def create_product():
    data = request.get_json() or {}
    if not data.get("name") or data.get("price") is None:
        return jsonify({"error": "name and price required"}), 400
    new_id = max([p.get("id",0) for p in products], default=0) + 1
    new_prod = {
        "id": new_id,
        "name": data.get("name"),
        "description": data.get("description",""),
        "shortDescription": data.get("shortDescription",""),
        "price": float(data.get("price")),
        "originalPrice": float(data.get("originalPrice", data.get("price"))),
        "image": data.get("image","https://via.placeholder.com/400x300?text=No+Image"),
        "category": data.get("category","seeds"),
        "tags": data.get("tags",[]),
        "inStock": bool(data.get("inStock", True)),
        "rating": float(data.get("rating",4.5)),
        "reviewCount": int(data.get("reviewCount",0)),
        "specifications": data.get("specifications",{}),
        "reviews": []
    }
    products.append(new_prod)
    save_products(products)
    log_audit("product:create", {"id": new_id, "name": new_prod["name"]}, request.remote_addr or "")
    return jsonify(new_prod), 201

@app.route("/api/products/<int:pid>", methods=["PUT"])
def update_product(pid):
    prod = next((p for p in products if p.get("id")==pid), None)
    if not prod: return jsonify({"error":"Product not found"}),404
    data = request.get_json() or {}
    for k,v in data.items():
        if k=="id": continue
        prod[k]=v
    if "price" in data: prod["price"]=float(data["price"])
    if "originalPrice" in data: prod["originalPrice"]=float(data["originalPrice"])
    save_products(products)
    log_audit("product:update", {"id": pid, "name": prod.get("name")}, request.remote_addr or "")
    return jsonify(prod)

@app.route("/api/products/<int:pid>", methods=["DELETE"])
def delete_product(pid):
    global products
    idx = next((i for i,p in enumerate(products) if p.get("id")==pid), -1)
    if idx==-1: return jsonify({"error":"Product not found"}),404
    removed = products.pop(idx)
    save_products(products)
    log_audit("product:delete", {"id": pid, "name": removed.get("name")}, request.remote_addr or "")
    return jsonify({"message":"Deleted","product":removed})

@app.route("/api/products/<int:pid>/stock", methods=["PATCH"])
def toggle_stock(pid):
    prod = next((p for p in products if p.get("id")==pid), None)
    if not prod: return jsonify({"error":"Product not found"}),404
    data = request.get_json() or {}
    prod["inStock"] = bool(data.get("inStock"))
    save_products(products)
    log_audit("product:stock", {"id": pid, "inStock": prod["inStock"]}, request.remote_addr or "")
    return jsonify(prod)

@app.route("/api/categories")
def get_categories():
    return jsonify(categories)

@app.route("/api/events")
def get_events():
    return jsonify(events)

@app.route("/api/states")
def get_states():
    return jsonify(indianStates)

@app.route("/api/states/<code>/districts")
def get_districts(code):
    code = code.upper()
    d = districtsByState.get(code)
    if not d: return jsonify({"error":"State not found"}),404
    return jsonify(d)

@app.route("/api/orders")
def get_orders():
    return jsonify(load_orders())

@app.route("/api/orders/<path:oid>")
def get_order(oid):
    import urllib.parse
    oid = urllib.parse.unquote(oid)
    orders = load_orders()
    for o in orders:
        if o.get("id")==oid or o.get("id")=="#"+oid or o.get("id","").replace("#","")==oid.replace("#",""):
            return jsonify(o)
    return jsonify({"error":"Order not found"}),404

@app.route("/api/orders", methods=["POST"])
def create_order():
    # Rate limit: 10 orders/min per IP
    if not check_rate_limit(request.remote_addr or "unknown", max_req=10, window=60):
        return jsonify({"error":"Too many order attempts, please wait"}), 429
    data = request.get_json() or {}
    items = data.get("items")
    address = data.get("address")
    paymentMethod = data.get("paymentMethod")
    if not items or not isinstance(items, list) or len(items)==0:
        return jsonify({"error":"Items array required"}),400
    if len(items) > 20:
        return jsonify({"error":"Too many items (max 20)"}),400
    if not address or not all(k in address for k in ["fullName","phone","address","state","district","pincode"]):
        return jsonify({"error":"Complete billing address required"}),400
    if not paymentMethod:
        return jsonify({"error":"paymentMethod required"}),400
    # Validate phone/pincode/state/district/payment
    import re
    phone = re.sub(r"\D", "", str(address.get("phone","")))
    if not re.fullmatch(r"\d{10}", phone):
        return jsonify({"error":"Phone must be 10 digits"}),400
    if not re.fullmatch(r"\d{6}", str(address.get("pincode",""))):
        return jsonify({"error":"Pincode must be 6 digits"}),400
    if address.get("state") not in districtsByState:
        return jsonify({"error":"Invalid state code"}),400
    if address.get("district") not in districtsByState.get(address.get("state"), []):
        return jsonify({"error":"Invalid district for state"}),400
    if paymentMethod not in ["upi","card","netbanking","cod"]:
        return jsonify({"error":"Invalid paymentMethod"}),400
    enriched=[]
    for it in items:
        pid = int(it.get("id"))
        prod = next((p for p in products if p.get("id")==pid), None)
        if not prod: return jsonify({"error": f"Product id {pid} not found"}),400
        if not prod.get("inStock"): return jsonify({"error": f"Product {prod.get('name')} is out of stock"}),400
        qty = int(it.get("quantity",1))
        if qty<=0: return jsonify({"error": f"Invalid quantity for product {pid}"}),400
        enriched.append({"id":prod["id"],"name":prod["name"],"price":prod["price"],"quantity":qty,"image":prod["image"]})
    subtotal,discount,shipping,total = calculate_total(enriched)
    order = {
        "id": generate_order_id(),
        "date": datetime.now(timezone.utc).isoformat(),
        "items": enriched,
        "subtotal": subtotal,
        "discount": discount,
        "shipping": shipping,
        "total": total,
        "address": address,
        "paymentMethod": paymentMethod,
        "status": "processing"
    }
    orders = load_orders()
    orders.append(order)
    save_orders(orders)
    return jsonify(order), 201

@app.route("/api/orders/<path:oid>/status", methods=["PUT"])
def update_order_status(oid):
    import urllib.parse
    oid = urllib.parse.unquote(oid)
    data = request.get_json() or {}
    status = data.get("status")
    if status not in ["processing","shipped","delivered","cancelled"]:
        return jsonify({"error":"status must be one of processing, shipped, delivered, cancelled"}),400
    orders = load_orders()
    for o in orders:
        if o.get("id")==oid or o.get("id")=="#"+oid or o.get("id","").replace("#","")==oid.replace("#",""):
            o["status"]=status
            save_orders(orders)
            log_audit("order:status", {"id": oid, "status": status}, request.remote_addr or "")
            return jsonify(o)
    return jsonify({"error":"Order not found"}),404

@app.route("/api/orders/<path:oid>", methods=["DELETE"])
def delete_order(oid):
    import urllib.parse
    oid = urllib.parse.unquote(oid)
    orders = load_orders()
    initial=len(orders)
    orders=[o for o in orders if not (o.get("id")==oid or o.get("id")=="#"+oid or o.get("id","").replace("#","")==oid.replace("#",""))]
    if len(orders)==initial: return jsonify({"error":"Order not found"}),404
    save_orders(orders)
    log_audit("order:delete", {"id": oid}, request.remote_addr or "")
    return jsonify({"message":"Order deleted"})

@app.route("/admin")
def admin_page():
    return send_from_directory(FRONTEND_DIR, "admin.html")

# Serve static frontend - must be last
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    # API 404 handled earlier, this is for frontend
    if path.startswith("api/"):
        return jsonify({"error":"API endpoint not found"}),404
    # try serve file
    full_path = os.path.join(FRONTEND_DIR, path)
    if path and os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(FRONTEND_DIR, path)
    # SPA fallback
    return send_from_directory(FRONTEND_DIR, "index.html")

if __name__ == "__main__":
    # StackHost sets PORT=8000 or 10000; fallback 8000 for nginx proxy (was 3000)
    port = int(os.environ.get("PORT", 8000))
    print(f"🌱 Krishi Sewa Python API running at http://localhost:{port}", flush=True)
    print(f"   Frontend: http://localhost:{port}/", flush=True)
    print(f"   Admin: http://localhost:{port}/admin", flush=True)
    print(f"   API health: http://localhost:{port}/api/health", flush=True)
    app.run(host="0.0.0.0", port=port, debug=False)
