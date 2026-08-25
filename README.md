# KisanSetu 🌾

> AI-powered agricultural market-linkage & price-discovery platform for farmers, FPOs, and buyers.

**Hackathon Prototype — 50% Feature Depth**

---

## Features

| Module | Status | Notes |
|--------|--------|-------|
| Auth + Role-based Profiles | ✅ Real | Email/password, role selection |
| Price Discovery Dashboard | ✅ Real | Seeded data, 14-day chart |
| AI Sell/Hold Advisory | ✅ Real | Moving-average heuristic |
| Lot Creation & Management | ✅ Real | Photos, status tracking |
| Buyer Browse + Match Score | ✅ Real | Weighted heuristic matching |
| Offers + Negotiation | ✅ Real | Accept/Counter/Reject flow |
| Digital Contracts | ✅ Real | Auto-generated on accept |
| Logistics Directory | ✅ Real | Seeded per district |
| Payment Tracking | ✅ Real | Mock confirmation, ledger |
| Trust Ledger (hash-chain) | ✅ Real | SHA-256 append-only |
| User Profile + Trust Score | ✅ Real | Gauge display |
| Grievance Filing | ✅ Real | Evidence upload |
| Admin Dashboard | ✅ Real | KPIs, user management |
| Chat Assistant (WA stub) | ✅ Stub | In-app WhatsApp preview |
| FPO Pool Management | ✅ Real | Group lot aggregation |

---

## Tech Stack

- **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (Postgres, Auth, Storage, RLS)
- **Charts**: Recharts
- **Auth**: Supabase Auth (email/password)
- **Deploy**: Vercel + Supabase Cloud

---

## Prerequisites

- Node.js 18+ 
- npm 9+
- A [Supabase](https://supabase.com) account (free tier works)

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/KisanSetu.git
cd KisanSetu
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your keys
3. Go to **Storage** → create two buckets:
   - `lot-photos` (private)
   - `kyc-docs` (private)
4. Go to **SQL Editor** → run `supabase/schema.sql`
5. Then run `supabase/seed.sql`

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Seed Demo Data

```bash
npm run seed
```

This creates 10 farmers, 5 buyers, 1 FPO admin, 1 admin, and 15 lots.

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Credentials

After running `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| 🌾 Farmer | farmer1@kisansetu.demo | Demo@1234 |
| 🏭 Buyer | buyer1@kisansetu.demo | Demo@1234 |
| 🤝 FPO Admin | fpo1@kisansetu.demo | Demo@1234 |
| 👑 Admin | admin@kisansetu.demo | Demo@1234 |

---

## GitHub Setup

```bash
# Initialize and push to GitHub
git init
git add .
git commit -m "feat: KisanSetu hackathon prototype v1"

# Create repo (requires GitHub CLI)
gh auth login
gh repo create KisanSetu --public --source=. --push

# Or manually create on github.com and:
git remote add origin https://github.com/YOUR_USERNAME/KisanSetu.git
git push -u origin main
```

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add env vars when prompted, or in Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Phase 2 Roadmap

- [ ] Real WhatsApp Business Cloud API integration
- [ ] ARIMA/Prophet ML forecasting model
- [ ] Live mandi price scraping (eNAM API)
- [ ] Real payment gateway (Razorpay / UPI)
- [ ] Logistics partner live booking
- [ ] Flutter Android app on same Supabase backend
- [ ] Multilingual UI (Hindi, Marathi, Gujarati)

---

## Architecture

```
app/
├── (auth)/           # login, signup, onboarding
├── dashboard/        # farmer/FPO home
├── prices/           # price discovery + AI advisory
├── lots/             # lot CRUD
├── buyer/browse/     # buyer marketplace
├── offers/           # offer management
├── contracts/        # contract + payment
├── grievances/       # dispute filing
├── profile/          # user profile + trust ledger
├── admin/            # KPIs, users, grievances
└── api/
    ├── forecast-price/   # AI sell/hold heuristic
    ├── match-score/      # buyer-lot matching
    ├── ledger-write/     # trust ledger (SHA-256 chain)
    └── whatsapp-webhook/ # WA bot stub
```

---

*Built for Smart India Hackathon 2025 — Problem Statement 26132*
