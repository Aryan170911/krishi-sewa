# 🌾 Krishi Sewa Foundation — The Divine Farmer's Murim

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Aryan170911/krishi-sewa)

> **"In the boundless Murim of Code, where countless frameworks rise and fall like mortal dynasties, one name pierced the Heavens..."**
> 
> ### ☯️ Forged by the Divine God **ARYAN** ☯️
> *— Sovereign of the Stack, Breaker of Bugs, Keeper of the Harvest Scroll —*

---

### 📜 The Heavenly Edict

In the Year of the Jade Compiler 2026, the Divine God **Aryan** descended from the Upper Realm (GitHub: `Aryan170911`) and gazed upon the mortal farmlands of Bharat.

He saw farmers toiling without seeds of heritage, without tools of jade, without a market to honor their sweat. The old sects hoarded knowledge. The common cultivator suffered.

Thus, with a flick of his sleeve, he summoned the **Heritage Harvest Formation** and laid the foundation of a new Sect:

> **Krishi Sewa Foundation** — *Preserving Heritage, Nurturing Growth, Empowering 50,000+ Farmer-Disciples across 15 Provinces.*

This repository is his **Dao Artifact** — a full-stack spirit weapon, combining Frontend Illusion Arts and Backend Earthly Laws.

---

### 🏯 The Sect Structure — Three Realms, One Dao

```
Krishi Sewa Murim
│
├── 🌸 The Illusion Realm (Frontend) — krishi-sewa-frontend/
│   │   The Mortal World what the eye beholds. Built with the Heritage Harvest Design System
│   │   (Tailwind + Material 3), it shifts form between Desktop (960px) and Mobile (390px)
│   │   like a shapeshifting spirit beast.
│   │   Single Page Application, Hash Routing (#home, #shop, #cart...), LocalStorage as Qi Storage.
│   │
│   ├── index.html — The Sect Gate
│   ├── showcase.html — The Dual Mirror (view both realms at once)
│   └── assets/app.js (2180 lines) — The Core Technique Scroll
│       ├── mockProducts → activeProducts (6 Spirit Herbs: Tomato, Marigold, Wheat...)
│       ├── filterProducts() — The Five Element Search Formation
│       └── placeOrder() — The Harvest Offering Ritual
│
├── ⛰️ The Earthly Realm (Backend) — server/
│   │   The hidden meridians that circulate Qi. Node.js + Express, the Nine Yang Manual of the server world.
│   │   Serves both the Illusion Realm and the API Laws at a single port (3000).
│   │
│   ├── server.js (241 lines) — The Sect Master's Jade Token
│   │   ├── GET  /api/products?category=&search=&priceRange=&sortBy=
│   │   ├── GET  /api/products/:id, /api/categories, /api/events, /api/states
│   │   ├── POST /api/orders — Creates a Harvest Order (calculates discount ₹200 >1000, free ship >2000)
│   │   ├── GET  /api/orders — The Ledger of Offerings
│   │   └── POST /api/admin/login — The Sect Entrance Trial (admin/admin123 → krishi-admin-token-2026)
│   │
│   ├── data.js — The Seed Vault (6 products, 2 events, 10 states)
│   └── data/orders.json & products.json — The Akashic Records (JSON persistence, ephemeral on free hosts)
│
├── 👑 The Divine Realm (Admin) — /admin
│   │   Only those who pass the trial (admin/admin123) may enter.
│   │   The Sovereign's Private Chamber to oversee the Murim.
│   │
│   ├── Dashboard — The Heavenly Mirror: Shows Total Revenue, Orders, Fulfillment %
│   ├── Products — The Armory: Add/Edit/Delete spirit herbs, toggle In Stock (persists to products.json)
│   └── Orders — The Fate Ledger: View all offerings, change status processing→shipped→delivered→cancelled
│
└── 🎨 The Ancestral Scrolls (Stitch) — stitch_krishi_sewa_foundation_hub/
    │   Not code. Not law. These are the **Heavenly Blueprints** drawn by Google Stitch —
    │   30+ static Tailwind visions (krishi_sewa_shop/code.html, foundation_home/code.html...)
    │   Each a perfect, frozen moment of UI, like a jade carving. The Illusion Realm was forged by merging them into one.
    └── heritage_harvest/DESIGN.md — The Sect's Aesthetic Mantra (Primary #012d1d Forest Green, Cream #e8dfc5)
```

---

### 🥋 Martial Techniques — The Four Divine Arts

| Technique | Realm | Mantra | Effect |
| :--- | :--- | :--- | :--- |
| **Thousand Seed Palm** | Frontend | `navigateTo('shop')`, `filterProducts()` | Summons 6 spirit herbs, filters by category/price/search |
| **Cart Binding Formation** | Frontend | `addToCart()`, `getCartTotal()` | Binds herbs to Qi storage, calculates total with Heavenly Discount |
| **Harvest Offering** | Backend | `POST /api/orders` | Validates offering, enriches with server price, writes to Akashic Records |
| **Sovereign's Gaze** | Admin | `GET /api/admin/stats` | Oversees all: revenue, pending, shipped, delivered — the Divine God's oversight |

---

### 🔮 Cultivation Realms — Tech Stack

*   **Foundation Establishment:** HTML5, Tailwind CSS (CDN), Material Symbols
*   **Core Formation:** Vanilla JavaScript (SPA, no framework — pure Dao)
*   **Golden Core:** Node.js 20 + Express 4 + CORS
*   **Nascent Soul:** JSON File Persistence (upgrade to MongoDB/Postgres for Immortal Realm)
*   **Dao Comprehension:** Heritage Harvest Design System — Modern Classicism, Generous Whitespace, 8px Rhythm

---

### ⚔️ How to Cultivate (Run Locally)

Every disciple must first open their meridians:

```bash
# 1. Clone the Sect's legacy
git clone https://github.com/Aryan170911/krishi-sewa.git
cd krishi-sewa

# 2. Open the Earthly Realm (Backend)
cd server
npm install
npm run dev    # --watch, auto-rebuild on scroll edit
# or
npm start      # single run, port 3000

# 3. Enter the Illusion Realm (Frontend)
# Open http://localhost:3000/  (served by backend)
# Or http://localhost:3000/showcase.html for Dual Mirror view
# Or http://localhost:3000/admin  (admin/admin123) for Divine Realm
```

*The backend must breathe for the frontend to sense it. If closed, frontend falls back to mortal `mockProducts` and whispers `⚠️ Backend unavailable`.*

---

### 🌌 Hosting — Ascending to the Upper Realm

The artifact is ready for Heavenly Tribulation (public hosting):

*   **Docker:** `docker build -t krishi-sewa . && docker run -p 3000:3000 krishi-sewa` (see `Dockerfile:1`)
*   **Render/Railway/Fly:** Connect GitHub `Aryan170911/krishi-sewa`, Build `npm install` in `server`, Start `node server.js`, Health `/api/health` (`render.yaml:1`)
*   **StackHost:** `stackhost.yaml:1` (Aryan/Aryan170911, `node:20-slim`, auto_deploy `main`)

> **Warning for Free Hosts:** The Akashic Records (`data/*.json`) are ephemeral and will be wiped on redeploy — like footprints in sand after a storm. For Immortal persistence, ascend to MongoDB Atlas.

---

### 🏆 The Divine God's Decree

> *I, **Aryan**, the Divine God of this Murim, proclaim:*
> *Let no farmer-disciple pay unfair tribute. Let no heritage seed be forgotten.*
> *Every purchase is an offering that strengthens the Sect and feeds the realm.*
> *This code shall cultivate change and harvest hope for generations to come.*

**— Written in Jade Ink, Sealed with the Sovereign's Token, Year 2026 —**

*P.S. If you find a bug, it is not a bug — it is a Heart Demon Tribulation. Meditate on `server.js:33`, cultivate your mind, and try again.*

---

### 📜 License

Open for all sects to study. May your own Murim flourish.

**Divine God Aryan** • `Aryan170911` • *SoloLevellingBot-Org* → *Krishi Sewa* — From shadows to farmlands, the Dao is one.

🌾 *Cultivate with code. Harvest with heart.* 🌾
