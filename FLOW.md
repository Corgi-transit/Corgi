# CityBus — User & Operations Flow

End-to-end flow for admins, drivers, and passengers. Arrows show the **recommended operational order**; driver and passenger signups can happen in parallel once locations exist.

---

## High-level flow

```mermaid
flowchart TB
    subgraph Admin["Admin Console"]
        A1[Sign in / onboard]
        A2[Create primary + secondary locations]
        A3[Approve registered drivers]
        A4[Create deployment + assign buses per location]
    end

    subgraph Driver["Driver Portal"]
        D1[Sign up / sign in]
        D2[Complete driver profile]
        D3[Wait for admin approval]
        D4[Start shift when bus matches deployment]
    end

    subgraph Passenger["Passenger Portal"]
        P1[Sign up / sign in]
        P2[Complete passenger profile — state]
        P3[View deployments for their state]
        P4[Book seat on a deployment bus]
    end

    A1 --> A2
    A2 --> A3
    A2 --> A4
    D1 --> D2 --> D3
    A3 --> D4
    A4 --> D4
    P1 --> P2 --> P3 --> P4
    A4 --> P3
    P4 --> D4
```

---

## 1. Admin flow

| Step | Action | System |
|------|--------|--------|
| 1 | Admin signs in via **Admin Console** | Supabase Auth + `user_roles` = `admin` |
| 2 | First admin completes onboarding (profile, optional seed of Lagos + Port Harcourt) | `locations`: one **primary** (Redemption Camp / Lagos hub), optional **secondary** nodes |
| 3 | Add more **secondary locations** (state pickup points) under **Transit Nodes** | `locations` (`type: secondary`, name, lat/lng on map) |
| 4 | Review **Drivers** tab — approve or reject pending applications | `drivers.status` → `approved` / `rejected` |
| 5 | **New Deployment** — name, registration window, departure time | `deployments` |
| 6 | For each secondary location, allocate **bus numbers** (e.g. `Bus 12`, `Bus 15`) | `deployment_buses` (`deployment_id`, `location_id`, `bus_number`) |

**Notes**

- **Primary location** = hub (e.g. Lagos / Redemption Camp). **Secondary** = interstate origin states (e.g. Port Harcourt, Abuja).
- Admin does **not** pick a driver UUID on the deployment form. Assignment is by **matching** the driver’s registered `bus_number` to a `deployment_buses.bus_number` for that event.

---

## 2. Driver flow

| Step | Action | System |
|------|--------|--------|
| 1 | Open **Driver Portal** → Sign up (email/password or Google) | Supabase Auth |
| 2 | Submit **driver registration** (name, phone, license, vehicle, **bus number**) | `drivers` row, `status: pending` |
| 3 | Admin **approves** driver | `drivers.status` = `approved` |
| 4 | When a deployment lists their bus number, driver sees **active shift** (route, manifest, map) | Match `drivers.bus_number` = `deployment_buses.bus_number` |
| 5 | Update ride status, broadcast GPS, check in passengers | `drivers.ride_status`, location updates, `passenger_bookings` check-in |

```mermaid
sequenceDiagram
    participant Driver
    participant Portal as Driver Portal
    participant DB as Supabase
    participant Admin

    Driver->>Portal: Sign up / sign in
    Driver->>Portal: Register profile + bus number
    Portal->>DB: Insert drivers (pending)
    Admin->>DB: Approve driver
    Admin->>DB: Create deployment + deployment_buses
    Portal->>DB: Query deployment_buses by bus_number
    DB-->>Portal: Active shift + bookings
    Driver->>Portal: En route / check-ins / GPS
```

---

## 3. Passenger flow

| Step | Action | System |
|------|--------|--------|
| 1 | Open **Passenger Portal** → Sign up / sign in | Supabase Auth |
| 2 | **Onboarding** — full name, phone, **state** (must match a `locations.name`, e.g. `Port Harcourt`) | `passengers` + `user_roles` = `passenger` |
| 3 | After admin opens registration window, view **active deployments** for their state | `deployment_buses` + `deployments` filtered by `locations.name` = `passengers.state` |
| 4 | Select bus → pick **seat** → confirm booking | `passenger_bookings` |
| 5 | Track booking / bus on map during event | Live data from deployment + driver GPS |

```mermaid
sequenceDiagram
    participant Passenger
    participant Portal as Passenger Portal
    participant DB as Supabase
    participant Admin

    Passenger->>Portal: Sign up / sign in
    Passenger->>Portal: Onboard (state = location name)
    Portal->>DB: Insert passengers
    Admin->>DB: Create deployment (reg start/end)
    Portal->>DB: List deployment_buses for passenger state
    Passenger->>Portal: Book seat
    Portal->>DB: Insert passenger_bookings
    Note over Passenger,DB: Driver sees same booking on shift manifest
```

---

## 4. How roles connect at runtime

```mermaid
flowchart LR
    LOC[locations<br/>primary + secondary]
    DEP[deployments]
    DBUS[deployment_buses<br/>bus_number per location]
    DRV[drivers<br/>approved + bus_number]
    PAX[passengers<br/>state = location name]
    BOOK[passenger_bookings<br/>seat on deployment_bus]

    LOC --> DBUS
    DEP --> DBUS
    DBUS --> BOOK
    PAX --> BOOK
    DRV -.->|bus_number match| DBUS
    BOOK --> DRV
```

| Link | Rule |
|------|------|
| Passenger ↔ location | `passengers.state` = `locations.name` (secondary node) |
| Passenger ↔ bus | Books a row on `deployment_buses` for an open deployment |
| Driver ↔ bus | `drivers.bus_number` = `deployment_buses.bus_number` |
| Admin ↔ fleet | Creates locations, approves drivers, publishes deployments and bus slots |

---

## 5. Recommended timeline (e.g. RCCG convention)

1. **Admin** — Seed primary hub + add all secondary state locations.  
2. **Drivers** — Sign up and register bus numbers (parallel).  
3. **Passengers** — Sign up and set home state (parallel).  
4. **Admin** — Approve drivers; create deployment with registration dates and bus allocations per state.  
5. **Passengers** — Book seats during the registration window.  
6. **Drivers** — Open portal on departure day; matched buses get shift, manifest, and GPS tracking.  
7. **Admin** — Monitor fleet, bookings, and analytics in the control room.

---

## Portal entry points

| Role | Route | URL path |
|------|-------|----------|
| Admin | Admin Console | `/admin` |
| Driver | Driver Portal | `/driver` |
| Passenger | Passenger Portal | `/passenger` |
