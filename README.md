# ORQEN — Society Maintenance & Operations Tracker

> A production-grade, reliability-first residential maintenance & society management platform engineered for transaction-safe lifecycle transitions, frozen SLA calculations, append-only audit histories, out-of-band notification processing, and resident verification.

---

## 🔑 Administrative Access & Evaluator Credentials

> [!IMPORTANT]
> **Primary Administrator Account (Ready to Sign In)**
> - **Portal URL**: `http://localhost:3000`
> - **Email**: `testingrequiredapp@gmail.com`
> - **Password**: `Password123!`
> - **Role**: `Society Management Committee Administrator`
> - **Permissions**: Full Operations & Triage, Resident Verification, Notice Publishing, Category SLA Management, System Analytics

| User Type | Email | Password | Flat Number | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Committee Admin** | `testingrequiredapp@gmail.com` | `Password123!` | `ADMIN-OFFICE` | **Full Admin Control** |
| **Resident (Self-Register)** | *Any email* (OTP verification supported) | *User-defined* | *Any Flat (e.g. A-302, B-704)* | **Resident Portal** |

---

## 🏗 System Architecture & End-to-End Flow

```mermaid
flowchart TD
    subgraph Client_Layer["🖥️ Frontend Client Layer (React 18 + Vite + TypeScript)"]
        A1["Resident Portal<br/>• File Maintenance Issue<br/>• Upload Photo/PDF Evidence<br/>• Live Timeline Tracking<br/>• Society Notice Carousel"]
        A2["Admin Operations Desk<br/>• Real-Time Queue & Filters<br/>• State Machine Status Updates<br/>• Resident Directory & Proof Verification<br/>• Notice Publishing & Broadcasts"]
    end

    subgraph Security_Layer["🛡️ Security & Route Layer (Express + TypeScript)"]
        B1["JWT Bearer Authentication"]
        B2["Role-Based Access Control (RBAC Middleware)"]
        B3["Zod Schema Validation & Idempotency Key Guard"]
    end

    subgraph Domain_Layer["⚙️ Domain Engine & Business Logic"]
        C1["State Machine Engine (OPEN ➔ IN_PROGRESS ➔ RESOLVED)"]
        C2["SLA Engine (Frozen due_at & Dynamic Overdue Calculation)"]
        C3["Recurrence Detection Engine (3+ tickets in 30 days)"]
        C4["Notice Scheduler & Auto-Expiry Engine"]
        C5["Append-Only Audit History Logger"]
    end

    subgraph Persistence_Layer["🗄️ Database & Storage Layer"]
        D1[("PostgreSQL Database<br/>• users, complaints, categories<br/>• complaint_status_history<br/>• notices, notifications")]
        D2["Static Evidence Storage (/uploads proxy)"]
    end

    subgraph Out_Of_Band["📬 Out-Of-Band Worker & Delivery Layer"]
        E1["Async Notification Worker"]
        E2["Gmail SMTP / Resend Gateway (Email Broadcasts)"]
    end

    Client_Layer -->|REST APIs via JWT| Security_Layer
    Security_Layer --> Domain_Layer
    Domain_Layer -->|Transactional Pool Queries| Persistence_Layer
    Domain_Layer -->|Queue Events| Out_Of_Band
    Out_Of_Band -->|Email Updates| Client_Layer
```

---

## 🌟 Key Features & Capabilities

### 1. 🎫 Complaint Lifecycle & Append-Only Audit Trail
- **Strict State Transitions**: Governed by a server-side state machine:
  $$\text{OPEN} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{RESOLVED}$$
- **Terminal Resolution**: `RESOLVED` is strictly terminal to preserve vendor SLA accuracy and clean historical audit logs.
- **Append-Only History**: Every status transition records timestamp, administrator identity, and mandatory audit notes.

```mermaid
stateDiagram-v2
    [*] --> OPEN : Resident Files Complaint
    OPEN --> IN_PROGRESS : Admin Triages / Assigns Work
    OPEN --> RESOLVED : Immediate Quick Fix
    IN_PROGRESS --> RESOLVED : Vendor Completes Task (Terminal)
    RESOLVED --> [*] : Locked (Spawns New Ticket if Reoccurring)
```

### 2. ⏱ Frozen SLA Targets & Dynamic Overdue Tracking
- **Deterministic Deadline**: `due_at` is permanently calculated and frozen upon complaint creation based on the category's agreed `default_sla_hours`:
  $$\text{due\_at} = \text{created\_at} + \text{category.default\_sla\_hours}$$
- **Dynamic Overdue Engine**: Overdue flags are never stored as stale boolean columns; they are computed dynamically:
  $$\text{is\_overdue} = (\text{current\_status} \neq \text{'RESOLVED'}) \land (\text{now}() > \text{due\_at})$$

### 3. 👥 Resident Onboarding & Flat Document Verification
- **Aadhaar / Utility Proof Upload**: Residents upload proof documents (PNG, JPG, or PDF) during registration.
- **Dedicated Resident Directory**: Admins view unverified resident cards, inspect proof in a full-screen interactive lightbox/PDF reader, and approve or decline with a single click.
- **Live Counter Badge**: Real-time counter badge on the Admin navigation bar displays pending resident verification counts.

### 4. 📢 Society Notices Broadcast Carousel
- **Auto-Rotating Carousel**: Featured announcements rotate automatically with smooth fade animations and hover-to-pause capabilities.
- **Timeframe & Duration Estimation**: Displays maintenance windows (e.g. `10:00 AM – 02:00 PM (Approx. 4 hrs)`).
- **Instant Email Dispatch**: Important announcements trigger asynchronous email notifications to all verified residents.

### 5. 🔁 Recurrence Intelligence
- **Automatic Repeat Problem Detection**: Detects if $\ge 3$ complaints are filed for the same flat and category within a rolling 30-day window, raising a visual alert for root-cause maintenance inspection.

### 6. 📐 Smart Auto-Positioning Dropdowns
- **Adaptive Viewport Clamping**: Dropdowns dynamically calculate screen space and flip upwards (`placement-up`) when near the bottom of the viewport, eliminating unnecessary page scroll.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Vanilla CSS Design System, Custom SVG Icons |
| **Backend** | Node.js, Express, TypeScript, Zod, JWT, bcryptjs, Multer |
| **Database** | PostgreSQL (`pg` driver with in-memory resilient fallback) |
| **Notifications** | Nodemailer (Gmail SMTP) & Resend API with async background queuing |
| **Testing** | Vitest, Supertest |

---

## 🚀 Installation & Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/ishashwatt/ORQEN-Society-Maintenance-Tracker.git
cd ORQEN-Society-Maintenance-Tracker

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/orqen_db
JWT_SECRET=your_jwt_secret_key_here
UPLOAD_DIR=./uploads

# SMTP Configuration (Optional for email dispatches)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Launch Development Servers
```bash
# Terminal 1: Start Backend Server
cd backend
npm run dev

# Terminal 2: Start Frontend Web Application
cd frontend
npm run dev
```

The web application will be accessible at `http://localhost:3000` (proxied to API on port `5000`).

---

## 🗄️ Database Management & Reset

| Command | Working Directory | Description |
| :--- | :--- | :--- |
| `npm run db:clean` | `backend/` | Safely purges test complaints, notices, notifications, and non-admin users for a fresh production demo |
| `npm run build` | `backend/` | Compiles TypeScript backend into production JavaScript in `dist/` |
| `npm run build` | `frontend/` | Bundles and optimizes frontend single-page application into `dist/` |

---

## 📄 License
This project is proprietary and confidential. Built for society management & operations tracking.
