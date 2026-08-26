# Krishi Sewa - Backend API

Express.js backend that replaces the frontend mock data (`krishi-sewa-frontend/assets/app.js:11`) with real API endpoints. Frontend automatically syncs on `init()` via `syncFromBackend()` and falls back to mocks if API unavailable.

## Run

```bash
cd server
npm install
npm start          # http://localhost:3000
# or
PORT=3001 npm start # if 3000 is busy
npm run dev        # with --watch (auto-reload)
```

Frontend is served statically at `http://localhost:3000/` from `../krishi-sewa-frontend`. No separate dev server needed. Or open `../krishi-sewa-frontend/index.html` directly — it will try `http://localhost:3000/api`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/products?category=seeds&search=tomato&priceRange=under500&sortBy=price-low` | Filtered products (mirrors `filterProducts:322` logic) |
| GET | `/api/products/:id` | Single product |
| GET | `/api/categories` | Categories (`mockCategories:211`) |
| GET | `/api/events` | Events (`mockEvents:218`) |
| GET | `/api/states` | Indian states |
| GET | `/api/states/:code/districts` | Districts by state |
| GET | `/api/orders` | All orders (persisted in `data/orders.json`) |
| GET | `/api/orders/:id` | Single order (`#KS-XXXXXX` - encoded) |
| POST | `/api/orders` | Create order |

### POST /api/orders example

```json
{
  "items": [{ "id": 1, "quantity": 2 }, { "id": 4, "quantity": 1 }],
  "address": {
    "fullName": "Ramesh Kumar",
    "phone": "9876543210",
    "address": "Village Road",
    "address2": "Near Temple",
    "state": "MH",
    "district": "Pune",
    "pincode": "411001"
  },
  "paymentMethod": "cod"
}
```
Response `201`:
```json
{
  "id": "#KS-QO7532",
  "date": "2026-08-26T13:16:39.619Z",
  "items": [{ "id":1, "name":"Heirloom Tomato Seeds", "price":350, "quantity":2, "image":"..." }],
  "subtotal": 1150,
  "discount": 200,
  "shipping": 60,
  "total": 1010,
  "address": { ... },
  "paymentMethod": "cod",
  "status": "processing"
}
```
Pricing logic same as frontend `getCartTotal:285`: discount ₹200 if subtotal >1000, free shipping if >2000 else ₹60.

## Persistence

Orders are stored in `data/orders.json` (JSON file, created automatically). No DB setup required. Replace with SQLite/MongoDB by editing `loadOrders()/saveOrders()` in `server.js`.

## Frontend Integration

`krishi-sewa-frontend/assets/app.js`:

- `API_BASE` auto-detects `localhost:3000` vs same-origin `/api`
- `activeProducts/activeCategories/activeEvents` replace `mockProducts` etc.
- `getProductById:384` and `filterProducts:388` use `activeProducts`
- `placeOrder:1988` is now `async` and does `apiPost("/orders")` when `apiAvailable`
- `syncFromBackend()` runs on `init:2139` and re-renders

If API down, frontend shows toast "using mock fallback" and works offline (localStorage).

## Stitch Folder

`stitch_krishi_sewa_foundation_hub/` is **not** backend/frontend. It contains Google Stitch AI design mockups (each `code.html` is a static Tailwind prototype for one screen, e.g. `krishi_sewa_shop/code.html`, `krishi_sewa_foundation_home/code.html`). Used as design reference to build the unified `assets/app.js` SPA.

## Tech

- Node 24, Express 4, CORS
- ESM (`"type": "module"` in `package.json`)
