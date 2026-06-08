# CityBus: System Architecture & Business Design

## 1. System Architecture Design

**High-Level Architecture**
CityBus uses a **Serverless BaaS** architecture built on Supabase (PostgreSQL), serving three distinct client surfaces: a React web application for passengers and administrators, and a React Native mobile app for drivers.

**Frontend — Web (Admin & Passenger)**
- **Framework:** React 19 built with Vite
- **Styling:** Tailwind CSS v4 with Radix UI primitives
- **Mapping:** Leaflet with Google Maps tile layer for live fleet tracking and location pinpointing
- **State:** React local state with Supabase Realtime subscriptions for live driver positions

**Frontend — Mobile (Driver App)**
- **Framework:** Expo SDK 54 with React Native 0.81.5
- **Navigation:** React Navigation v7 (native stack + bottom tabs)
- **Maps:** Custom Leaflet-based map component via WebView
- **Key Libraries:** expo-location (GPS), expo-splash-screen, expo-font ~14.0.12, @react-native-async-storage, @supabase/supabase-js

**Backend & Database**
- **Platform:** Supabase — PostgreSQL database, Auth, Realtime, Row Level Security, and Edge Functions
- **APIs:** PostgREST auto-generated REST endpoints gated by RLS policies
- **Edge Functions (Deno):** `init-payment`, `verify-payment`, `paystack-webhook` for Paystack credit purchases
- **RPC Functions:** `deduct_credits`, `list_admins`, `list_pending_admin_invites`, `invite_admin_by_email`, `remove_admin_by_email`, `remove_admin_invite`, `claim_admin_invite`

**Hosting & Deployment**
- **Web:** Vercel (configured via `vercel.json`)
- **Mobile:** EAS (Expo Application Services) cloud builds — preview APK and production AAB
- **Backend:** Supabase cloud (project: `ajgjktshqkbajtreeyyr`)

**Secure Communication**
- All communication over HTTPS
- JWT tokens issued by Supabase Auth passed as `Authorization: Bearer` headers
- PostgreSQL RLS enforces per-role data isolation — passengers see only their own data, drivers see only their own profile and shifts, admins have full read/write access
- Credit balance mutations go exclusively through Edge Functions (service role) — the client never writes directly to credit balances

---

## 2. Database Schema

**`auth.users`** — Managed by Supabase Auth. Identity, sessions, and user metadata (full_name, phone, onboarded flag).

**`user_roles`** — Maps auth UIDs to roles: `admin`, `driver`, `passenger`. Used by RLS policies for permission checks.

**`drivers`** — Driver profiles linked to auth.users.
- `id` UUID (FK to auth.users)
- `full_name`, `email`, `phone`, `license_number`
- `bus_number`, `vehicle_type`, `vehicle_capacity`, `vehicle_plate`
- `status` ENUM: `pending`, `approved`, `rejected`
- `ride_status` ENUM: `idle`, `enroute`, `returning`, `completed`
- `latitude`, `longitude` — live GPS coordinates updated by the driver app
- `active_deployment_id` — FK to current deployment
- `location_id` — FK to assigned state/location (optional, set on approval)

**`locations`** — Transit nodes at three levels:
- `type` ENUM: `primary` (Lagos base), `secondary` (state-level pickup points), `sub-secondary` (specific terminals within a state)
- `parent_id` UUID — FK to parent location (used by sub-secondary to link to its state)
- `latitude`, `longitude` — pinned coordinates

**`deployments`** — Transit events (e.g. RCCG Convention 2026).
- `name`, `departure_time`, `registration_start`, `registration_end`

**`deployment_buses`** — Junction table assigning buses to specific locations within a deployment.
- `deployment_id` FK, `location_id` FK, `bus_number`

**`passenger_bookings`** — Seat reservations by passengers.
- `deployment_bus_id` FK, `passenger_id` FK
- `seat_number`, `checked_in` BOOLEAN

**`passengers`** — Passenger profiles.
- `full_name`, `email`, `phone`
- `credits` INTEGER — current credit balance (default 0)

**`credit_transactions`** — Immutable audit log of every credit movement.
- `type` ENUM: `purchase`, `deduction`, `refund`, `manual`
- `amount` (positive = added, negative = removed)
- `naira_paid` — kobo paid to Paystack
- `paystack_reference` — Paystack transaction ID

**`settings`** — Key-value store for global config (e.g. `total_buses`).

**`sos_alerts`** — SOS signals raised by drivers from the app.

**`admin_invites`** — Pending admin invitations by email.

---

## 3. Key Flows

**Driver Onboarding & Approval**
Driver registers via the mobile app (phone OTP → profile form). Status starts as `pending`. Admin reviews in the Drivers Registry, clicks Approve, and optionally assigns the driver to a state location. Driver app detects the `approved` status and grants access to the main dashboard.

**Deployment & Booking**
Admin creates a deployment event with departure time and booking window. Buses are assigned to secondary or sub-secondary locations. Passengers browse active deployments, select a location and seat, and spend 1 credit to book. Drivers see their assigned shift in the Shift tab and slide to start the journey. Passengers are checked in via the driver's passenger manifest.

**Live Tracking**
Driver app publishes GPS coordinates to `drivers.latitude/longitude` on a timed interval while a shift is active. The admin Live Fleet Map and passenger-facing map subscribe to these updates via Supabase Realtime.

**Credit Purchase**
1. Passenger selects a package (₦2,000–₦20,000) and taps Pay
2. `init-payment` Edge Function initialises a Paystack transaction
3. Passenger completes payment on Paystack hosted page
4. Paystack redirects back with `?reference=xxx&paystack_credits=N`
5. `verify-payment` Edge Function confirms with Paystack server-to-server
6. On success, credits are added to `passengers.credits` and logged to `credit_transactions`

**Credit Deduction**
The `deduct_credits(passenger_id, amount)` RPC runs atomically — checks balance first, deducts only if sufficient, returns false otherwise. Prevents double-spending under concurrent requests.

---

## 4. Transit Node Hierarchy

Locations follow a three-tier structure:
- **Primary** — The admin base (Lagos). One per system, cannot be deleted.
- **Secondary** — State-level nodes (Rivers, Oyo, Ondo, etc.). Buses are dispatched from Lagos to these states.
- **Sub-secondary** — Specific terminals or pickup points within a state (e.g. Port Harcourt Terminal within Rivers). Linked to their parent secondary location via `parent_id`. Deployments can assign buses directly to sub-locations.

---

## 5. Mobile App Build Configuration

- **EAS Project:** `corgi-driver` (ID: `10690062-aeb7-488e-987f-6f9b9819fe8a`)
- **Bundle ID:** `com.corgi.driver`
- **Build profiles:**
  - `development` — dev client APK for internal testing
  - `preview` — standalone APK for internal distribution
  - `production` — AAB for Play Store submission
- **Environment variables** (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`) are baked into the build via `eas.json` env config and EAS Secrets
- **New Architecture** (`newArchEnabled: true`) is enabled — requires expo-font pinned to `~14.0.12` to avoid native module version mismatch

---

## 6. Business Design

**Market**
CityBus is purpose-built for large-scale religious and community transit events in Nigeria — primarily RCCG conventions and similar gatherings where thousands of passengers need coordinated bus transport from multiple states to a central destination.

**Monetisation**
Passengers pre-purchase credits with Naira via Paystack. 1 credit = ₦1,000. Credits are spent to reserve seats on deployments. The operator (event organiser) controls the fleet, deploys buses, and manages drivers through the admin console.

**Competitive Advantage**
- Fully serverless — zero infrastructure to maintain, deployable in days
- Three-surface architecture (admin web, passenger web, driver mobile) from a single Supabase backend
- Real-time fleet visibility for both admins and passengers
- Atomic credit system with full audit trail prevents revenue leakage
- Sub-location support allows fine-grained bus assignments within a state
