# CampusLens AI — Smart Campus Facility Management & AI-Powered Issue Detection

**CampusLens AI** is an end-to-end, full-stack smart campus infrastructure platform designed for students, faculty, groundskeepers, and university administrators. It streamlines the reporting, categorization, tracking, and resolution of physical campus issues through zero-shot computer vision, persistent relational data logging, and interactive rule-based assistant intelligence.

---

## 🌟 Key Features

1. **AI-Powered Photo Issue Detection**
   - Leverages open-source Hugging Face Transformers (`openai/clip-vit-base-patch32`) for zero-shot image classification.
   - Requires **no external cloud API keys** (OpenAI, Gemini, etc.) and runs locally on CPU/GPU.
   - Human-in-the-loop: predictions are presented as transparent relevance scores with alternative candidates, asking reporters to verify before saving.
   - Supports camera capture, device upload, image preview, and manual reporting fallback.

2. **Real-Time Dynamic Facility Dashboard**
   - Live metrics calculated directly from SQLite records: total reported, pending, in progress, resolved, high-priority, and total campus facilities.
   - Status, priority, and category distribution breakdowns.
   - Real-time audit activity feed logging status transitions.

3. **Issue Tracking & Maintenance Lifecycle**
   - Search by issue ID (`ISS-1001`), title, location, or description.
   - Multi-filter controls: status, category, priority, and sort order (newest/oldest).
   - Detailed modal view with high-resolution image zoom, AI confidence metadata, and timestamped audit logs.
   - Status updates (`Pending` → `In Progress` → `Resolved`) with optional maintenance work notes.

4. **Campus Facilities & Infrastructure Catalog**
   - SQLite-backed inventory of classrooms, laboratories, libraries, washrooms, auditoriums, electrical substations, and plumbing networks.
   - Live open issues counter per facility zone with one-click issue reporting pre-filling the location.

5. **AI Campus Assistant**
   - Chat-style conversational interface querying live SQLite database state without third-party API dependencies.
   - Instant answers for pending counts, urgent/critical hazards, specific ticket lookups (e.g. *"What is the status of ISS-1001?"*), and reporting guides.

6. **Enterprise-Grade Resiliency & Testing**
   - Automatic database migration & startup initialization.
   - Duplicate submission protection within 30 seconds.
   - File validation (JPEG, PNG, WebP ≤ 8 MB) and corrupted file rejection.
   - Comprehensive pytest suite covering API health, statistics calculation, persistence, and assistant queries.

---

## 🏗️ Technology Stack

- **Frontend:**
  - React 18
  - Vite
  - Tailwind CSS
  - Lucide React Icons
  - Native Fetch API
- **Backend:**
  - Python 3.10+ / 3.13
  - FastAPI
  - Uvicorn
  - Pydantic v2
  - Pillow (PIL)
  - Hugging Face Transformers & PyTorch (Lazy loaded for zero-shot CLIP classification)
- **Database:**
  - SQLite (Persistent `campuslens.db` with foreign keys and audit logs)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher) and `npm`
- Python 3.10+ (macOS, Linux, or Windows)

---

### Step 1: Clone or Navigate to the Project

```bash
git clone https://github.com/katelynalmeida/Campus_Lens_AI.git
cd Campus_Lens_AI
```

The repository structure:
```text
CampusLensAI/
├── backend/
│   ├── main.py              # FastAPI application & API routes
│   ├── database.py          # SQLite database connection & schema
│   ├── schemas.py           # Pydantic request and response schemas
│   ├── vision.py            # Lazy zero-shot CLIP classification
│   ├── assistant.py         # Database-connected AI assistant
│   ├── test_backend.py      # Automated test suite
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Backend environment configuration
│   └── uploads/             # Uploaded evidence photos (created at runtime)
├── frontend/
│   ├── src/
│   │   ├── api/client.js    # Centralized API service
│   │   ├── components/      # Reusable UI (Sidebar, Header, Badges, Modals)
│   │   ├── pages/           # Overview, ReportIssue, IssueTracking, Facilities, Assistant, Settings
│   │   ├── App.jsx          # Root application layout
│   │   ├── main.jsx         # Entrypoint
│   │   └── index.css        # Tailwind styling
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
└── README.md
```

---

### Step 2: Configure & Start the Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate

   # Windows
   python -m venv venv
   venv\Scripts\activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. *(Optional)* Configure environment variables:
   ```bash
   cp .env.example .env
   ```

5. Start the FastAPI development server:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8001 --reload
   ```

   - **Backend API:** `http://127.0.0.1:8001`
   - **Interactive Swagger Docs:** `http://127.0.0.1:8001/docs`

   The SQLite database is created and seeded automatically on first startup. Local database files and uploaded evidence images are intentionally excluded from Git.

---

### Step 3: Configure & Start the Frontend

1. Open a **new terminal window** and navigate to the frontend directory:
   ```bash
   cd CampusLensAI/frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

   - **Frontend Web Application:** `http://localhost:5173`

---

## 🧪 Running Automated Tests

Run the backend unit and integration test suite:

```bash
cd backend
# With virtual environment activated:
pytest -v test_backend.py
```

The test suite automatically tests:
- Root and API health endpoints.
- Database startup initialization.
- Dynamic dashboard metrics and distribution math.
- Complete issue lifecycle and persistent storage across database connections.
- 404 responses on missing issue IDs.
- 30-second duplicate submission debounce.
- Rejection of invalid, oversized, or corrupted images.
- Vision pipeline contract and mocked score parsing.
- Rule-based AI assistant answers using live SQLite database facts.
- Facilities listing and open issues count calculation.

To verify frontend build integrity:
```bash
cd frontend
npm run build
```

---

## 🛠️ API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root service health check |
| `GET` | `/api/health` | Database and model status |
| `GET` | `/api/dashboard` | Dynamic dashboard statistics and distribution metrics |
| `GET` | `/api/issues` | List issues (supports `status`, `category`, `priority`, `search`, `sort_by`) |
| `GET` | `/api/issues/{id}` | Retrieve single issue with status audit logs |
| `POST` | `/api/issues` | Create a new maintenance report (validates duplicate debounce) |
| `PATCH` | `/api/issues/{id}` | Update status or priority and append audit note |
| `POST` | `/api/detect-image` | Upload photo for zero-shot CLIP classification |
| `GET` | `/api/vision-status`| Vision model load state (`unloaded`, `loading`, `ready`, `error`) |
| `POST` | `/api/assistant/chat`| Query rule-based assistant backed by live SQLite data |
| `GET` | `/api/facilities` | List campus facilities with active open issue counts |
| `GET` | `/api/facilities/{id}`| Retrieve single facility |
| `POST` | `/api/reset-demo-data`| Reset demonstration facilities and sample tickets |

---

## 🔧 Troubleshooting & Port Conflicts

- **Port 8001 in use:**
  If port 8001 is already bound, find and terminate the occupying process:
  ```bash
  lsof -i :8001
  kill -9 <PID>
  ```
  Alternatively, edit `PORT=8002` in `backend/.env` and `VITE_BACKEND_URL=http://127.0.0.1:8002` in `frontend/.env`.

- **Port 5173 in use:**
  If port 5173 is occupied, Vite will automatically suggest port 5174, or specify `--port 5173`:
  ```bash
  npx vite --port 5173
  ```

- **Vision Model Download:**
  The `openai/clip-vit-base-patch32` model is loaded lazily on the first image detection request or pre-warmed in the background. The model files (~600 MB) are cached locally by Hugging Face in `~/.cache/huggingface/hub`. If working offline, manual issue reporting is immediately supported without throwing errors.

- **Resetting Demo Data:**
  You can restore baseline demo data at any time either via the UI under **Settings & Help → Reset Demo Data**, or via API:
  ```bash
  curl -X POST http://127.0.0.1:8001/api/reset-demo-data
  ```

---

## 📜 License

Created for campus infrastructure modernization and academic demonstrations. Licensed under the MIT License; see [LICENSE](LICENSE).
