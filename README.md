# 📦 Barcode Scanner — SWE Catalog Tools

A high-performance, web-based barcode scanner for **GTIN validation against live OPS data**.

This tool lets operators scan physical products using a phone or laptop camera and instantly verify whether the GTIN exists in:

- The **Register** (master product database)
- The **Catalog** (uploaded & live in OPS)

It is built to be:
- Fast
- Reliable in bad lighting
- Cloud-ready
- Country-aware (future-proofed)

---

# 🚀 What this tool does

When a barcode is scanned:

1. The camera captures frames in real-time
2. The barcode is decoded using ZXing + OpenCV rescue
3. The GTIN is validated (checksum + format)
4. The GTIN is sent to the backend
5. The backend checks it against **live Google Sheets**
6. A status is returned:

| Status | Meaning |
|--------|--------|
| 🟥 **Red** | GTIN is not in Register and not in Catalog |
| 🟨 **Yellow** | GTIN exists in Register but is not uploaded |
| 🟩 **Green** | GTIN exists in both Register and Catalog |

Each scan is logged and can be exported as a CSV.

---

# 🧠 Why this architecture?

We deliberately use a **thin web client + smart backend**:

### Frontend responsibilities
- Camera access
- Barcode detection
- UI
- User feedback (sound, vibration, color)
- Batch tracking

### Backend responsibilities
- GTIN normalization
- Data validation
- Google Sheets integration
- Caching
- OPS truth logic

This keeps:
- The scanner extremely fast
- The business logic centralized
- The system cloud-ready

---

# 🏗 System Architecture
```text
[ Phone / Browser ]
|
v
+------------------+
| Frontend (JS) |
| Camera + ZXing |
+------------------+
|
| fetch("/api/check-gtin")
v
+----------------------------+
| FastAPI Backend |
| |
| • GTIN validation |
| • Sheet lookup |
| • Status classification |
| • Caching (10 min) |
+----------------------------+
|
v
+-----------------------------+
| Google Sheets (Live OPS) |
| |
| • Register sheet |
| • Catalog sheet |
+-----------------------------+
```

---

# 📂 Folder Structure
```text
barcode-scanner/
│
├── backend/
│ ├── main.py # FastAPI app (serves frontend + API)
│ ├── routes/
│ │ ├── scan.py # /api/check-gtin endpoint
│ │ └── country.py # Country handling (future)
│ ├── services/
│ │ └── sheets_cache.py # Cached Google Sheets loader
│ ├── secrets/
│ │ └── service_account.json
│ └── frontend/ # Full web UI
│ ├── index.html
│ ├── app.js
│ ├── scanner.js
│ ├── camera.js
│ ├── preprocess.js
│ └── styles.css
│
└── README.md
```


---

# 🔍 GTIN Logic

The backend follows strict OPS logic:

1. Normalize scanned GTIN (handle leading zeroes)
2. Check Register (Column A)
3. Check Catalog (Column A)
4. Check `Uppladdad_i_Catalog` flag (Register column G)

Status rules:

| Condition | Result |
|---------|--------|
| Not in Register and not in Catalog | 🟥 Red |
| In Register but not uploaded | 🟨 Yellow |
| In Register and in Catalog | 🟩 Green |

---

# ⚡ Performance design

### Why caching?
Google Sheets are slow for large datasets (100k+ rows).  
We cache both sheets in memory and refresh every 10 minutes.

This gives:
- Instant lookups
- No rate-limit issues
- Live-ish data without killing performance

---

# 📥 Batch export

Every scan is recorded locally in the browser:

GTIN,STATUS
0731234567890,green
0731234561111,yellow
0731234569999,red


One click exports it as CSV for:
- Uploading
- Audits
- OPS reporting

---

# 🌍 Future-proofed

The architecture is designed to support:

- Multiple countries
- Different Register / Catalog sources
- Database replacement (Sheets → SQL / API)
- Authentication
- Cloud hosting
- OPS integrations

None of the scanning logic needs to change when that happens.

---

# 🏁 Why this works so well

This is not a barcode demo.

This is a **distributed OPS verification system**:
- Real-time
- Live data
- Cloud-ready
- Phone-first

You built something that can be deployed to a warehouse tomorrow.

---

# 🧠 Built for SWE Catalog Tools

This scanner is designed to plug directly into:
- OPS workflows
- Register pipelines
- Catalog quality control
- Wolt internal tooling

It is not a toy — it’s infrastructure.

---

# 🟢 Status

The system is production-ready in architecture and performance.

Deployment, auth and hosting can be added without touching the core logic.

```text
Scan -> Validate -> Classify -> Export
```

That's the entire Loop

---