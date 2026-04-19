# Smart-Logistics-
Container transport platform connecting cargo agents with truck owners in Dar es Salaam, Tanzania
# 🚛 SMART LOGISTICS LOG — BACKEND API

**Mfumo wa usimamizi wa usafirishaji wa makontena — Dar es Salaam**

---

## ⚡ KUANZISHA MARA YA KWANZA

```bash
# 1. Sakinisha vifaa
npm install

# 2. Tengeneza .env file
cp .env.example .env

# 3. Anzisha server
node server.js
```

Server itaanza kwenye: `http://localhost:3000`

---

## 📡 API ENDPOINTS — MWONGOZO WA KUTUMIA

### 🔐 AUTH — Usajili na Kuingia

#### Sajili Akaunti Mpya (Agent)
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Sado Faraji",
  "phone": "0712345678",
  "password": "neno-siri-langu",
  "role": "agent"
}
```

#### Sajili Akaunti (Truck Owner + Gari)
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Hassan Musa",
  "phone": "0756789012",
  "password": "neno-siri-langu",
  "role": "truck_owner",
  "truckDetails": {
    "plate": "T 123 AAA",
    "type": ["20ft", "40ft"],
    "driverName": "Hassan Musa",
    "insuranceExpiry": "2025-12-31"
  }
}
```

#### Ingia
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "0712345678",
  "password": "neno-siri-langu"
}
```
Jibu litakupa `token` — tumia kwa requests zote za baadaye.

---

### 📦 JOBS — Kazi za Usafirishaji

#### Tuma Kazi Mpya (Agent)
```http
POST /api/jobs
Authorization: Bearer {token}
Content-Type: application/json

{
  "origin": "African ICD",
  "destinationId": 7,
  "containerType": "20ft",
  "timing": "HARAKA",
  "clientType": "KATI",
  "notes": "Geti la nyuma la kiwanda"
}
```

**Timing options:** `HARAKA` | `USIKU` | `KESHO`
**ClientType:** `MPYA` | `KATI` | `KUBWA`

#### Tazama Kazi Zinazopatikana (Driver)
```http
GET /api/jobs/open
Authorization: Bearer {token}
```

#### Kubali Kazi (Driver)
```http
POST /api/jobs/{jobId}/accept
Authorization: Bearer {token}
Content-Type: application/json

{
  "truckId": "truck-uuid-hapa"
}
```

#### Sasisha Hali ya Kazi (Driver)
```http
PATCH /api/jobs/{jobId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "BANDARINI",
  "lat": -6.8235,
  "lng": 39.2695
}
```

**Status flow:**
```
IMEPEWA → BANDARINI → IMEPAKIWA → NJIANI → IMEKAMILIKA
```

---

### 🚛 TRUCKS — Magari

#### Sasisha Hali ya Gari
```http
PATCH /api/trucks/{truckId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "WAZI",
  "location": "Magomeni"
}
```

**Status options:** `WAZI` | `FOLENI` | `HAIFANYI`

#### Tuma GPS Location
```http
PATCH /api/trucks/{truckId}/location
Authorization: Bearer {token}
Content-Type: application/json

{
  "lat": -6.8235,
  "lng": 39.2695
}
```

---

### 💰 PRICING — Bei za Sasa

#### Bei Zote
```http
GET /api/pricing
Authorization: Bearer {token}
```

#### Bei ya Route Maalum
```http
GET /api/pricing/7?containerType=40ft&clientType=KUBWA
Authorization: Bearer {token}
```

---

### ⭐ RATINGS

#### Toa Rating
```http
POST /api/ratings
Authorization: Bearer {token}
Content-Type: application/json

{
  "jobId": "job-uuid-hapa",
  "toUserId": "driver-uuid-hapa",
  "toTruckId": "truck-uuid-hapa",
  "rating": 5,
  "comment": "Alifika kwa wakati, mzigo salama",
  "categories": {
    "onTime": true,
    "safeDelivery": true,
    "goodCommunication": true
  }
}
```

---

## 📊 DESTINATION IDs (Pricing Database)

| ID | Destination | Bei ya Msingi | Tier |
|----|-------------|---------------|------|
| 1  | Temeke | 470,000 | 1 |
| 2  | Buguruni | 470,000 | 1 |
| 3  | Ilala | 500,000 | 1 |
| 4  | Magomeni / Sinza | 500,000 | 1 |
| 5  | Kariakoo 🌙 | 550,000 | 2 |
| 6  | Morocco / Ali Hassan Mwinyi | 550,000 | 2 |
| 7  | Msasani | 550,000 | 2 |
| 8  | Mbezi Beach | 600,000 | 2 |
| 9  | Salasala / IPTL | 650,000 | 3 |
| 10 | Visiga Industrial | 650,000 | 3 |
| 11 | Lake Steel | 700,000 | 3 |
| 12 | Kibaha Kati | 850,000 | 4 |
| 13 | Kibaha Mbali | 1,000,000 | 4 |

🌙 = Delivery ya usiku tu (8PM–5AM)

---

## 🗂️ MUUNDO WA DATA (Database)

Data inahifadhiwa kwenye `db/data.json` (JSON database).

**Tables:**
- `users` — Agents na Truck Owners
- `trucks` — Magari yaliyosajiliwa
- `jobs` — Kazi zote
- `job_assignments` — Uhusiano wa kazi na magari
- `ratings` — Maoni ya trips
- `tracking` — Historia ya GPS
- `pricing` — Bei za routes (hazibadiliki bila admin)

---

## 🚀 DEPLOY (Kuweka Mtandaoni)

### Option 1: Railway (Rahisi na Haraka)
```bash
# 1. Nenda railway.app
# 2. Connect GitHub repo yako
# 3. Weka PORT=3000 kwenye environment variables
# 4. Deploy!
```

### Option 2: Render.com
```bash
# Build Command: npm install
# Start Command: node server.js
```

### Option 3: VPS (kama DigitalOcean)
```bash
# Install Node.js kwenye server
# Clone repo
# npm install && node server.js
# Tumia PM2 kwa production:
npm install -g pm2
pm2 start server.js --name "smart-logistics"
pm2 save
```

---

## 🔧 HATUA ZINAZOFUATA (v2.0)

- [ ] SMS notifications (Africa's Talking API — Tanzania)
- [ ] Push notifications (Firebase)
- [ ] Real-time updates (Socket.io)
- [ ] Admin dashboard
- [ ] M-Pesa integration (malipo)
- [ ] PostgreSQL (badala ya JSON file)

---

*Smart Logistics Log — Iliyojengwa bandarini, kwa walioifanya kazi bandarini.*

