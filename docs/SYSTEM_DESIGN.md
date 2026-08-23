# ORQEN — System Architecture & Technical Design Specification

---

## 1. Executive Architecture Overview

ORQEN is an enterprise-grade residential operations platform built to solve asynchronous communication gaps and SLA tracking failures in apartment society maintenance. The system is designed with a **reliability-first, backend-authoritative architecture** ensuring data correctness, transactional state transitions, immutable auditability, and out-of-band communication resilience.

```mermaid
graph TB
    subgraph ClientLayer["1. Presentation & Client Layer"]
        RP["Resident Portal (React 18 + TS)"]
        AP["Admin Operations Desk (React 18 + TS)"]
    end

    subgraph GatewayLayer["2. Security & Route Gateway"]
        AUTH["JWT Bearer Authentication Middleware"]
        RBAC["Role-Based Access Control (Admin / Resident)"]
        VAL["Zod Request Schema Validator"]
        IDEM["Idempotency Key Verification Engine"]
    end

    subgraph ServiceLayer["3. Core Domain & Business Logic"]
        SM["Complaint State Machine Engine"]
        SLA["Frozen SLA Engine & Overdue Calculator"]
        REC["Recurrence Analytics Engine"]
        NOTIF["Notice Scheduler & Expiry Monitor"]
        AUDIT["Append-Only Audit Trail Service"]
    end

    subgraph DataLayer["4. Persistence & Storage Layer"]
        PG[("Neon Cloud PostgreSQL Engine")]
        FS["File System Evidence Storage (/uploads)"]
    end

    subgraph QueueLayer["5. Asynchronous Delivery Worker"]
        NQ["Notifications Queue Table"]
        WORKER["Background Queue Worker (3s interval)"]
        RESEND["Resend REST API Gateway (HTTPS Port 443)"]
    end

    RP -->|HTTPS / REST API| AUTH
    AP -->|HTTPS / REST API| AUTH
    AUTH --> RBAC --> VAL --> IDEM
    IDEM --> SM & SLA & REC & NOTIF & AUDIT
    SM & SLA & REC & NOTIF & AUDIT -->|Connection Pool Queries| PG
    SM -->|Store File Reference| FS
    SM & NOTIF -->|Insert Event| NQ
    WORKER -->|Poll PENDING| NQ
    WORKER -->|Dispatch Email| RESEND
```

---

## 2. Database Schema & Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ COMPLAINTS : "files (resident)"
    CATEGORIES ||--o{ COMPLAINTS : "classifies"
    COMPLAINTS ||--o{ COMPLAINT_STATUS_HISTORY : "tracks lifecycle"
    USERS ||--o{ COMPLAINT_STATUS_HISTORY : "actor (admin/resident)"
    USERS ||--o{ NOTICES : "publishes (admin)"
    NOTICES ||--o{ USER_NOTICE_READS : "acknowledges"
    USERS ||--o{ USER_NOTICE_READS : "reads"
    USERS ||--o{ NOTIFICATIONS : "receives"

    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role "ADMIN | RESIDENT"
        varchar flat_number
        varchar phone
        varchar occupancy_type "OWNER | TENANT"
        varchar document_type "AADHAAR | RENT_AGREEMENT | SALE_DEED"
        varchar document_reference
        boolean is_verified
        timestamp created_at
        timestamp updated_at
    }

    CATEGORIES {
        uuid id PK
        varchar name UK
        integer default_sla_hours
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    COMPLAINTS {
        uuid id PK
        uuid resident_id FK
        uuid category_id FK
        text description
        varchar flat_number
        varchar priority "LOW | MEDIUM | HIGH"
        varchar current_status "OPEN | IN_PROGRESS | RESOLVED"
        timestamp due_at "FROZEN SLA TARGET"
        varchar photo_reference
        varchar idempotency_key UK
        timestamp resolved_at
        timestamp created_at
        timestamp updated_at
    }

    COMPLAINT_STATUS_HISTORY {
        uuid id PK
        uuid complaint_id FK
        varchar from_status
        varchar to_status
        uuid actor_id FK
        text note
        timestamp created_at
    }

    NOTICES {
        uuid id PK
        varchar title
        text content
        boolean is_important
        uuid created_by FK
        timestamp start_time
        timestamp end_time
        varchar approx_duration
        varchar status "ACTIVE | EXPIRED"
        timestamp created_at
        timestamp updated_at
    }

    USER_NOTICE_READS {
        uuid id PK
        uuid notice_id FK
        uuid user_id FK
        timestamp read_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid recipient_id FK
        varchar type
        varchar entity_type
        uuid entity_id
        varchar status "PENDING | SENT | FAILED"
        integer attempts
        text last_error
        timestamp created_at
        timestamp sent_at
    }
```

---

## 3. Complaint Lifecycle & State Machine

The complaint state machine enforces strict, non-reversible transitions:

```mermaid
stateDiagram-v2
    [*] --> OPEN : Resident creates complaint (due_at calculated and frozen)
    OPEN --> IN_PROGRESS : Admin assigns work (Audit log recorded)
    OPEN --> RESOLVED : Immediate quick resolution
    IN_PROGRESS --> RESOLVED : Vendor completes maintenance (Terminal)
    RESOLVED --> [*] : Locked record

    note right of RESOLVED
        RESOLVED is strictly terminal.
        Reopening is disallowed to guarantee
        uncompromised vendor SLA analytics.
    end note
```

### Transition Matrix

| From Status | To Status | Allowed Actor | Trigger Action | Required Fields |
| :--- | :--- | :--- | :--- | :--- |
| `[None]` | `OPEN` | Resident | Files Complaint | `category_id`, `description`, `flat_number` |
| `OPEN` | `IN_PROGRESS` | Admin | Work Acknowledged | `note` (Audit Trail) |
| `OPEN` | `RESOLVED` | Admin | Quick Fix Completed | `note` (Audit Trail), sets `resolved_at` |
| `IN_PROGRESS` | `RESOLVED` | Admin | Task Completed | `note` (Audit Trail), sets `resolved_at` |
| `RESOLVED` | *Any* | *None* | **Prohibited** | Throws `400 INVALID_STATUS_TRANSITION` |

---

## 4. Frozen SLA & Dynamic Overdue Calculation

### Mathematical Model
Upon complaint submission at time $t_{\text{created}}$, the target resolution deadline $t_{\text{due}}$ is computed and frozen permanently:

$$t_{\text{due}} = t_{\text{created}} + \Delta t_{\text{category\_SLA}}$$

### Overdue Determination Logic
The overdue condition is evaluated dynamically across all query execution paths:

$$\text{is\_overdue}(C) = \begin{cases} 
\text{true} & \text{if } C.\text{status} \neq \text{'RESOLVED'} \land \text{now}() > C.\text{due\_at} \\
\text{false} & \text{otherwise}
\end{cases}$$

---

## 5. Sequence Diagram: Complaint Lifecycle & Real-Time Sync

```mermaid
sequenceDiagram
    autonumber
    actor Resident as Resident User
    participant FE as React Frontend (Vite)
    participant API as Express API Gateway
    participant DB as Neon PostgreSQL
    participant Worker as Out-of-Band Queue Worker
    participant Resend as Resend API Gateway (HTTPS)
    actor Admin as Committee Admin

    Resident->>FE: Fills Complaint Form + Attaches Photo Evidence
    FE->>API: POST /api/complaints (with X-Idempotency-Key)
    API->>DB: Check Idempotency Key
    API->>DB: Calculate Frozen due_at & INSERT INTO complaints
    API->>DB: INSERT initial status history (OPEN)
    API->>DB: INSERT PENDING notification event
    DB-->>API: Transaction Committed
    API-->>FE: HTTP 201 Created
    FE-->>Resident: Displays Active Ticket on Dashboard

    Admin->>FE: Opens Admin Operations Desk
    FE->>API: GET /api/complaints
    API->>DB: Query complaints with dynamic overdue calculation
    DB-->>API: Return maintenance records
    API-->>FE: Display Triage Queue with Overdue & Recurrence Badges

    Admin->>FE: Updates Status to IN_PROGRESS (Note: "Plumber Assigned")
    FE->>API: PATCH /api/complaints/:id/status
    API->>DB: BEGIN Transaction
    API->>DB: UPDATE complaints SET current_status = 'IN_PROGRESS'
    API->>DB: INSERT INTO complaint_status_history
    API->>DB: INSERT INTO notifications (Recipient = Resident)
    API->>DB: COMMIT Transaction
    API-->>FE: HTTP 200 OK

    Worker->>DB: Poll PENDING notifications
    Worker->>Resend: POST /emails ("Complaint #ID in Progress")
    Resend-->>Worker: 200 OK (id: msg_xxx)
    Worker->>DB: UPDATE notifications SET status = 'SENT'
```

---

## 6. Recurrence Detection Engine

To identify structural or persistent infrastructure defects, the platform computes repeat occurrences:

$$\text{Recurrence Count} = \sum \mathbf{1}_{\{ c \in \text{Complaints} \mid c.\text{flat} = F \land c.\text{category} = K \land c.\text{created\_at} \ge (\text{now}() - 30\text{ days}) \}}$$

When $\text{Recurrence Count} \ge 3$, the system raises a high-visibility **Recurrence Alert Badge** on the Admin Operations Desk to trigger root-cause preventive maintenance.

---

## 7. Role-Based Access Control (RBAC) Matrix

| Endpoint / Operation | Resident (Verified) | Resident (Unverified) | Committee Admin |
| :--- | :---: | :---: | :---: |
| `POST /api/complaints` | ✅ Allowed | ❌ Restricted (Must verify) | ❌ Restricted |
| `GET /api/complaints` | ✅ Own records only | ❌ Restricted | ✅ All Society Records |
| `PATCH /api/complaints/:id/status` | ❌ Restricted | ❌ Restricted | ✅ Allowed |
| `PATCH /api/complaints/:id/priority` | ❌ Restricted | ❌ Restricted | ✅ Allowed |
| `GET /api/auth/residents` | ❌ Restricted | ❌ Restricted | ✅ Allowed |
| `PATCH /api/auth/residents/:id/verify` | ❌ Restricted | ❌ Restricted | ✅ Allowed |
| `POST /api/notices` | ❌ Restricted | ❌ Restricted | ✅ Allowed |
| `GET /api/notices` | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `POST /api/notices/:id/acknowledge` | ✅ Allowed | ✅ Allowed | ✅ Allowed |

---

## 8. Out-of-Band Notification Architecture

1. **Transactional Insertion**: Notification records are inserted as `PENDING` within the primary database transaction.
2. **Decoupled Execution**: Dedicated background worker runs every 3 seconds to drain pending notifications.
3. **Fault Tolerance & Exponential Retries**: Transient API delivery failures increment the `attempts` counter up to 3 times before marking status `FAILED`, ensuring core operations APIs are never blocked.
