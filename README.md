# 🚌 CityBus — Smart Transit & Fleet Management System

A lightweight, modern, and highly deployable smart-transit platform designed for small-to-medium municipalities, university campuses, and private shuttle networks. Powered by real-time geolocation tracking, secure role-based access control, and a sleek user experience.

---

## 🚀 Key Portals & Features

CityBus provides a seamless experience customized for three distinct user groups:

### 📍 Passenger Portal
* **Live Bus Tracking:** Real-time bus location updates on an interactive, fluid map powered by **Leaflet**.
* **Route & Stops:** Beautiful visualization of active routes, nearest stops, and ETA calculations.
* **Onboarding & Info:** Clear, responsive user interface to choose routes and view schedule details.

### 🧭 Driver Portal
* **Shift Deployment:** Easy driver authentication and assignment to active bus numbers and shifts.
* **Real-time Geolocation Broadcast:** Periodic GPS synchronization using high-accuracy browser geolocation APIs.
* **Passenger Counters:** Intuitive controls to log passenger boarding and alighting in real-time, feeding back into analytics.

### 📊 Admin Console
* **Fleet Control Room:** Global map visualization tracking all active drivers, bus deployments, and routes.
* **Role & User Management:** Secure onboarding of drivers, assigning user roles (`admin`, `driver`, `passenger`).
* **Live Analytics:** Real-time metrics on total passengers, active buses, and peak transit hours.
* **Global System Settings:** Easily update municipal announcements, operational parameters, and custom map regions.

---

## 🛠 Tech Stack

* **Frontend:** React 19 + TypeScript + Vite (Optimized production builds and high-speed development)
* **Styling & Animations:** Tailwind CSS (v4) + Radix UI + Framer Motion (Glassmorphism, sleek transitions, accessible components)
* **Maps & Geolocation:** Leaflet + React-Leaflet
* **Backend & Database:** **Supabase** (Serverless PostgreSQL)
  * **Auth:** Built-in secure authentication.
  * **Realtime:** Real-time location broadcasting via WebSockets.
  * **Database Security:** Strict Row Level Security (RLS) policies protecting user, driver, and location records.
  * **Auto-generated APIs:** Instant REST endpoints generated via PostgREST.

---

## 🔧 Getting Started

Follow these steps to get a local copy of CityBus up and running:

### 1. Prerequisites
Ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [npm](https://www.npmjs.com/) (installed automatically with Node)
* [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local database management)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/CityBus.git
cd CityBus
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment Variables
Duplicate the `.env.example` file and rename it to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

### 5. Setup the Database Schema
If you are using the Supabase CLI, you can apply migrations locally or link them to your cloud instance:
```bash
# Link your project
supabase link --project-ref your-project-id

# Push the migrations to your project
supabase db push
```
*(All SQL migration scripts are located in the [supabase/migrations](file:///c:/Users/josep/Desktop/CityBus/supabase/migrations) directory.)*

### 6. Run the Application
Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to the local address (typically `http://localhost:5173`).

---

## ▲ Deploy on Vercel

CityBus is a Vite SPA and deploys to [Vercel](https://vercel.com) with zero extra config beyond environment variables.

### 1. Import the repository
1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo.
2. Vercel detects **Vite** automatically (`vercel.json` sets `outputDirectory` to `dist`).

### 2. Environment variables
In the project **Settings → Environment Variables**, add (for Production, Preview, and Development):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon / publishable key |

Redeploy after saving variables.

### 3. Supabase Auth URLs
In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs** (add each you use):
  - `https://your-app.vercel.app`
  - `https://your-app.vercel.app/**`
  - `https://your-app.vercel.app/admin-console`
  - `http://localhost:5173` (local dev)
  - `http://localhost:5173/**`

Routes use clean paths (`/admin-console`, `/driver-portal`, `/passenger-portal`). `vercel.json` rewrites all paths to `index.html` for the SPA.

### 4. Deploy
Push to `main` or click **Deploy** in Vercel. Each push triggers a preview; production uses your production domain.

---

## 📐 System Architecture

For a comprehensive breakdown of our technical architecture, database schemas, API contracts, and go-to-market strategies, please review our [System Architecture & Business Design Specification](file:///c:/Users/josep/Desktop/CityBus/System_Architecture_Design.md).

---

## 🔒 Security & Row Level Security (RLS)

All database operations are heavily guarded by PostgreSQL RLS policies defined in the migrations.
* **Drivers:** Can only update their *own* location details and active deployments.
* **Passengers/Public:** Read-only access to active deployment lists and driver locations for live map tracking.
* **Admins:** Full write/read privileges to settings, role lists, and deployments.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
