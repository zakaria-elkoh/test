# StockFlow — Mini ERP

A full-stack inventory and order management system built with Node.js, Express, PostgreSQL, React, and shadcn/ui.

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Backend  | Node.js · Express · PostgreSQL · JWT      |
| Frontend | React 19 · Vite · shadcn/ui · Tailwind v4 |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally
- npm

---

## 1 — Clone & install

```bash
git clone <repo-url>
cd stockflow

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

---

## 2 — Set up PostgreSQL

Make sure PostgreSQL is running. On macOS with Homebrew:

```bash
brew services start postgresql@16
```

Create the database and the postgres role if they don't exist yet:

```bash
# Create the role (if it doesn't exist)
psql -d postgres -c "CREATE ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'yourpassword';"

# Create the database
psql -U postgres -c "CREATE DATABASE stockflow;"
```

---

## 3 — Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and fill in your values:

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=stockflow
DB_USER=postgres
DB_PASSWORD=yourpassword

JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
```

---

## 4 — Run migrations

This creates all the tables (users, categories, products, clients, orders, order_items, stock_movements):

```bash
cd backend
npm run migrate
```

---

## 5 — Seed the database

Populates the database with demo data — 1 admin, 2 staff users, 5 categories, 15 products, 5 clients, 10 orders, and stock movements:

```bash
npm run seed
```

### Demo credentials

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@stockflow.com    | admin123   |
| Staff | alice@stockflow.com    | staff123   |
| Staff | bob@stockflow.com      | staff123   |

> Admin accounts can delete products and manage users. Staff accounts have read/write access to everything else.

---

## 6 — Start the servers

Open two terminals:

**Terminal 1 — Backend** (runs on port 3001):

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend** (runs on port 5173):

```bash
cd frontend
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project structure

```
stockflow/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/          # DB queries (pg pool)
│   │   ├── middlewares/     # Auth (JWT), error handling
│   │   ├── routes/          # Express routers
│   │   ├── db/
│   │   │   ├── pool.js      # pg Pool instance
│   │   │   ├── migrations/  # SQL schema files
│   │   │   ├── migrate.js   # Migration runner
│   │   │   └── seed.js      # Demo data seeder
│   │   ├── app.js           # Express app setup
│   │   └── index.js         # Entry point
│   └── .env.example
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/      # AppSidebar, SiteHeader, AppLayout
        │   └── ui/          # shadcn/ui components
        ├── hooks/
        │   └── useAuth.js
        ├── lib/
        │   └── api.js       # Axios instance with JWT interceptor
        └── pages/           # One file per module
```

---

## API base URL

The frontend proxies `/api` to `http://localhost:3001` via Vite's dev proxy. No CORS configuration needed during development.
