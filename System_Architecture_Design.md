# CityBus: System Architecture & Business Design

## 1. System Architecture Design

**High-Level Architecture & Layered Design Patterns**
The CityBus application utilizes a modern **Serverless Monolith** approach, heavily relying on Backend-as-a-Service (BaaS) for its core infrastructure to enable rapid development, scalability, and maintainability.

*   **Frontend (Client Layer):**
    *   **Framework:** React 19 built with Vite for optimized development and production builds.
    *   **Styling:** Tailwind CSS (v4) coupled with Radix UI primitives for accessible, responsive, and consistent UI components.
    *   **Mapping:** Leaflet for real-time geolocation tracking and route visualization.
    *   **State Management:** React Context API and local state, integrated directly with Supabase real-time subscriptions.
*   **Backend & Database Layer:**
    *   **Platform:** Supabase (Serverless infrastructure based on PostgreSQL).
    *   **APIs:** PostgREST provides auto-generated, instant RESTful APIs directly from the database schema.
    *   **Real-time:** Supabase Realtime for broadcasting database changes (e.g., live bus tracking) via WebSockets.
*   **Hosting & Deployment:**
    *   **Frontend:** Can be hosted on modern edge networks like Vercel or Netlify.
    *   **Backend:** Hosted on Supabase cloud.
*   **Secure Communication:**
    *   All client-server communication occurs over secure HTTPS.
    *   Data access is heavily guarded by PostgreSQL **Row Level Security (RLS)** policies. This ensures that users (passengers, drivers, administrators) can only read, insert, or modify data corresponding to their specific role and authorization level.

## 2. Database Schema Specification

The data model is built on **PostgreSQL** and focuses on tracking buses (deployments), driver assignments, real-time locations, and passenger analytics.

**Main Entities & Collections:**

*   **`users` (managed by Supabase Auth):** Handles identity, passwords, and sessions.
*   **`roles` / `user_roles`:** Maps `auth.users` to specific system roles (`admin`, `driver`, `passenger`).
*   **`drivers`:** Contains driver-specific metadata, linking back to `auth.users`. Key fields: `id` (UUID, Primary Key), `bus_number` (String), `current_location_lat` (Float), `current_location_lng` (Float).
*   **`locations`:** Stores bus stops and route waypoints. Key fields: `id` (UUID), `name` (String), `lat` (Float), `lng` (Float), `type` (Enum: stop, waypoint).
*   **`deployments`:** Tracks the assignment of a driver and a bus to a specific shift or route. Key fields: `id` (UUID), `driver_id` (FK to `drivers`), `start_time` (Timestamp), `end_time` (Timestamp), `status` (Enum: active, completed).
*   **`passengers`:** Logs passenger events (boarding/alighting) for analytics. Key fields: `id` (UUID), `deployment_id` (FK), `timestamp` (Timestamp), `action` (Enum: board, alight), `location_id` (FK to `locations`).
*   **`settings`:** Global application configurations managed by administrators.

**Data Types & Constraints:**
*   **Keys:** `UUIDv4` is used for all primary keys to ensure global uniqueness and prevent ID enumeration.
*   **Relationships:**
    *   1-to-1 between `auth.users` and `drivers`.
    *   1-to-Many between `drivers` and `deployments`.
    *   1-to-Many between `deployments` and `passengers`.
*   **Integrity:** Relational constraints (Foreign Keys) with `ON DELETE CASCADE` where appropriate, ensuring orphan records are prevented. Transactional consistency is guaranteed by PostgreSQL's ACID compliance.

## 3. API Routing Contracts

Because CityBus uses Supabase, traditional custom backend route handlers are replaced by **PostgREST endpoints**. The API is a direct reflection of the database schema, gated by Row Level Security (RLS).

**Authentication Gates:**
*   **Method:** JWT (JSON Web Tokens) issued by Supabase Auth.
*   **Flow:** The client obtains a JWT upon login and passes it in the `Authorization: Bearer <token>` header for all API requests. PostgreSQL RLS policies intercept every request to validate permissions before executing the query.

**Crucial REST Endpoints:**

1.  **Driver Location Update (Live Tracking)**
    *   **Endpoint:** `PATCH /rest/v1/drivers?id=eq.{driver_id}`
    *   **Request Method:** `PATCH`
    *   **Payload:** `{ "current_location_lat": 40.7128, "current_location_lng": -74.0060 }`
    *   **Auth Gate:** JWT required. RLS ensures only the currently authenticated driver can update their own row.
    *   **Response:** `204 No Content` (Success) or `401/403` (Unauthorized).

2.  **Fetch Active Deployments (For Passengers/Admins)**
    *   **Endpoint:** `GET /rest/v1/deployments?status=eq.active&select=*,drivers(bus_number,current_location_lat,current_location_lng)`
    *   **Request Method:** `GET`
    *   **Auth Gate:** JWT required for admins, potentially anonymous/public access with an API Key for read-only passenger apps.
    *   **Response:** `200 OK`
        ```json
        [
          {
            "id": "uuid",
            "start_time": "2026-05-19T08:00:00Z",
            "drivers": {
               "bus_number": "Route 42",
               "current_location_lat": 40.7128,
               "current_location_lng": -74.0060
            }
          }
        ]
        ```

3.  **Log Passenger Boarding**
    *   **Endpoint:** `POST /rest/v1/passengers`
    *   **Request Method:** `POST`
    *   **Payload:** `{ "deployment_id": "uuid", "action": "board", "location_id": "uuid" }`
    *   **Auth Gate:** JWT required (Driver or Admin role).
    *   **Response:** `201 Created`

## 4. Business Design & Go-To-Market

**Market Positioning & Target Demographic:**
CityBus is positioned as a lightweight, highly deployable smart-transit solution designed for **small to medium-sized municipalities, university campuses, and private corporate shuttle fleets**. Unlike heavy, expensive legacy civic systems, CityBus offers a modern, real-time experience out-of-the-box with minimal infrastructure overhead.

**Initial Target Customers & Distribution Channels:**
*   **Target:** Local city transit authorities managing fleets of 10-100 buses, universities with campus shuttles.
*   **Channels:** Direct B2B sales, responding to municipal RFPs (Request for Proposals), and partnerships with local government IT consultants.

**Monetization Strategy:**
*   **SaaS Tiered Model (B2B):**
    *   *Base Tier:* Monthly subscription fee per active bus/driver for core tracking and basic analytics.
    *   *Enterprise Tier:* Advanced predictive routing, robust passenger analytics dashboards, API access for third-party integrations, and white-labeling the passenger app.
*   **Implementation & Support:** One-time onboarding/setup fees and ongoing SLA-based technical support contracts.

**Unique Competitive Advantage:**
*   **Agility & Speed:** Using a Serverless/BaaS architecture allows CityBus to be deployed in days rather than months.
*   **Cost-Effective:** Zero hardware servers to maintain; the municipal client only pays for actual usage (bandwidth/database reads), making it highly attractive for budget-constrained local governments.
*   **Modern UX:** Leveraging React and Leaflet provides an intuitive, smooth interface that legacy civic alternatives simply do not match, improving both driver adoption and administrative oversight.
