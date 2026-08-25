# Vin eRetail — Omnichannel OMS & WMS Clone

A full-stack clone of the Vin eRetail (Vinculum) omnichannel retail console — built with
**React + TypeScript + Vite + Tailwind** on the frontend and an **Express + MongoDB**
backend. Includes the verified eRetail UI shell (blue header, dark icon rail with flyout
mega-menus), all Fulfillment sub-modules, Master/Procurement/Sales/Inventory/CRM/Reports
screens, and an exclusive **Fulfillment Control Tower** dashboard.

> 🧸 **New here or non-technical?** Read [**GUIDE.md**](./GUIDE.md) — a super-simple,
> kid-friendly walkthrough that explains every term and every section in plain English.

---

## 1. Run locally in VS Code

### Prerequisites
- [Node.js 18+](https://nodejs.org) (Node 20 recommended — see `.nvmrc`)
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) database
  (optional — the app runs on an in-memory store if you skip this)

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Create your env file and fill in your MongoDB URI
cp .env.example .env
#    then edit .env  (see "Environment variables" below)

# 3. Start BOTH the frontend (Vite) and the API server (Express) together
npm run dev
```
- Frontend dev server: **http://localhost:5173**
- API server:          **http://localhost:3002** (Vite proxies `/api` → this automatically)

> Prefer two terminals? Run `vite` in one and `npm run dev:server` in another.

### Login
The local replica uses mock authentication and does not include live-demo credentials.
Enter any non-empty username and password to access the local console.

---

## 2. Environment variables

Copy `.env.example` → `.env` and set these:

| Variable | Description |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string. Leave blank to use the in-memory fallback. |
| `MONGODB_DB` | Database name (default `eretail`). |
| `PORT` | API port (default `3002`; Render sets this automatically). |

> `.env` is git-ignored. Never commit real secrets.

### Database collections (auto-created)
On first connect, the app **automatically creates and seeds** these MongoDB collections:
`skus`, `partners`, `sale_orders`, `purchase_orders`, `grn`, `inventory`,
`stock_transfers`, `returns`, `fulfillment_orders`, `picklists`, `shipments`,
`generic_records`. No manual schema step needed.

📖 For a full walkthrough of creating the MongoDB database and accessing it as an **admin**
(via the Atlas dashboard, MongoDB Compass, or the VS Code MongoDB extension), see
[**db/DATABASE_SETUP.md**](./db/DATABASE_SETUP.md).

---

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Vin eRetail clone"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

---

## 4. Deploy on Render

This app runs as a **single Node web service** (Express serves both the API and the
built React app).

### Option A — Blueprint (uses `render.yaml`)
1. Push the repo to GitHub (step 3).
2. In Render: **New + → Blueprint** → connect your repo.
3. Render reads `render.yaml`, runs the build, and starts the server.
4. Add your secret env vars in the Render dashboard (they are marked `sync:false`).

### Option B — Manual Web Service
1. In Render: **New + → Web Service** → connect your repo.
2. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. Add the environment variables from the table above.
4. Deploy. Render gives you a public `https://<your-app>.onrender.com` URL.

> The server listens on `process.env.PORT` (Render provides it), falling back to `3002`
> locally.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Both Vite and the Express API server (recommended) |
| `npm run dev:server` | Express API server only |
| `npm run dev:all` | Alias for `npm run dev` |
| `npm run build` | Type-check + build the frontend into `dist/` |
| `npm start` | Production: serve `dist/` + API via Express |
| `npm run lint` | Run ESLint |

---

## Project structure
```
api/            Serverless-style API handlers (also mounted by Express)
  mongo.js      MongoDB data layer (find/insert/update/remove) + in-memory fallback
  seed.js       Sample data used to seed MongoDB / the in-memory store
  *.js          One file per resource (skus, sale-orders, fulfillment, …)
src/
  eretail/      Verified eRetail shell, menus, Fulfillment modules, Control Tower
  pages/        Master / Procurement / Sales / Inventory / CRM / Reports screens
  components/   Shared UI (Modal, DataTable, etc.)
  context/      Auth context
server.js       Express server (API + static frontend) — entry point for Render
render.yaml     Render Blueprint
```

## Tech
React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Express 4 · MongoDB · lucide-react
