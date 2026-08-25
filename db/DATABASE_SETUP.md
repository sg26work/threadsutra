# 🗄️ Database Setup & Admin Access Guide (MongoDB)

This project uses **MongoDB** — a document database. Data is stored in **collections**
(like tables) made of **documents** (like rows, written as JSON objects).

> 💡 **Zero-setup mode:** If you don't set a database URL, the app automatically uses a
> built-in **in-memory store** with the same seed data. Everything works instantly. When
> you add a real MongoDB URL, it switches over automatically — no code changes.

This guide shows: (1) how to set up MongoDB, and (2) how to access it as an **admin**.

---

## PART 1 — Create your MongoDB database (free, ~5 min)

### Step 1: Make a free MongoDB Atlas account
1. Go to **https://www.mongodb.com/cloud/atlas** and sign up (free).
2. Create a **free M0 cluster** (pick a cloud region near you).

### Step 2: Create a database user
1. Left sidebar → **Database Access** → **Add New Database User**.
2. Choose **Password** auth. Set a username and password.
   *(Example password used in this project: `globalsdmills2026` — use your own!)*
3. Give it the **Read and write to any database** role. Save. 🔐

### Step 3: Allow network access
1. Left sidebar → **Network Access** → **Add IP Address**.
2. Click **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.
   *(For production, restrict this to your server's IP.)*

### Step 4: Get your connection string (URI)
1. Click **Connect** on your cluster → **Drivers**.
2. Copy the URI. It looks like:
   ```
   mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Replace `YOUR_PASSWORD` with your real password.

### Step 5: Put the URI into your project
In VS Code, copy `.env.example` → `.env`:
```bash
cp .env.example .env
```
Then edit `.env`:
```
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=eretail
PORT=3002
```

### Step 6: Seed the data
The app **auto-seeds** on first run (creates all 12 collections + starter data).
Or do it manually:
```bash
npm run seed          # insert seed data if empty
npm run seed -- --reset   # wipe & reseed everything
```
Then start the app:
```bash
npm run dev:all
```

**Collections created:** `skus`, `partners`, `sale_orders`, `purchase_orders`, `grn`,
`inventory`, `stock_transfers`, `returns`, `fulfillment_orders`, `picklists`,
`shipments`, `generic_records` (plus `_counters` for auto-increment ids).

---

## PART 2 — Access the database as an ADMIN

### ✅ Way 1: MongoDB Atlas Dashboard (easiest — no coding)
- In Atlas, click **Browse Collections** on your cluster.
- You'll see all collections. Click any to **view / edit / add / delete** documents. 📝
- Use the **Filter** bar to search, e.g. `{ "status": "Pending" }`.

👉 This makes YOU the full admin — view and change anything.

### ✅ Way 2: MongoDB Compass (free desktop app — recommended)
1. Download **MongoDB Compass** from mongodb.com/products/compass.
2. Paste your `MONGODB_URI` and click **Connect**.
3. Browse collections visually, edit documents, run queries, see charts. 🖥️

### ✅ Way 3: Inside VS Code (MongoDB extension)
1. In VS Code → **Extensions** → install **"MongoDB for VS Code"** (by MongoDB).
2. Click the leaf 🍃 icon → **Add Connection** → paste your `MONGODB_URI`.
3. Browse collections and run **playground** queries right inside VS Code.

### ✅ Way 4: mongosh (command line, for pros)
```bash
mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/eretail" --username YOUR_USERNAME
```
Then:
```js
show collections
db.skus.find()
db.fulfillment_orders.find({ status: "Pending" })
```

---

## 🔑 Who is the "admin"?
- **You** are the admin — you own the Atlas project and hold the database **username +
  password** (inside `MONGODB_URI`). Anyone with that URI has full control.
- The local mock login is just the app's front door, not the database admin. It does not
  contain or require live-demo credentials.

---

## 🧠 Handy admin query cheat-sheet (mongosh / Compass filter)

| I want to... | Query |
|---|---|
| See all products | `db.skus.find()` |
| See pending orders | `db.fulfillment_orders.find({ status: "Pending" })` |
| Count orders per status | `db.fulfillment_orders.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])` |
| Add a product | `db.skus.insertOne({ id: 99, sku_code: "NEW-01", name: "My Item", uom: "PCS", mrp: 999 })` |
| Update an order | `db.fulfillment_orders.updateOne({ order_no: "WO500123" }, { $set: { status: "Allocated" } })` |
| Delete a document | `db.returns.deleteOne({ id: 5 })` |
| Low stock items | `db.inventory.find({ available: { $lt: 20 } })` |

---

## ⚠️ Safety rules for admins
1. **Never share your `MONGODB_URI`** — it contains the password. 🔐
2. **Never commit `.env`** — it's already blocked by `.gitignore`. ✅
3. `deleteMany` / `--reset` are permanent. Double-check before running! ⚠️
4. In Atlas you can enable automated **Backups** for safety.

---

## 🆘 Common problems
| Problem | Fix |
|---|---|
| App shows no data | Check `MONGODB_URI` in `.env`. If blank, it uses the in-memory store (still works). |
| "Authentication failed" | Wrong username/password in the URI, or the DB user lacks read/write. |
| "IP not whitelisted" | In Atlas → Network Access → allow your IP (or `0.0.0.0/0`). |
| Collections empty | Run `npm run seed` (app also auto-seeds on first start). |

That's it — you're now the MongoDB admin! 🎉
