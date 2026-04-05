# TraderPro

Minimalistic Fintech PWA — Stocks, ETFs, Crypto & Commodities.  
Design inspired by Trade Republic. Built with React + FastAPI.

---

## Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Frontend | React 18 + Vite + Tailwind  |
| Charts   | Recharts                    |
| Icons    | Lucide React                |
| Backend  | FastAPI + yfinance (Python) |
| Auth/DB  | Supabase                    |
| Deploy   | Vercel (FE) + Render (BE)   |

---

## Local Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set ALLOWED_ORIGINS=http://localhost:5173

uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### 2. Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Edit .env:
#   VITE_API_URL=http://localhost:8000
#   VITE_SUPABASE_URL=https://xxx.supabase.co
#   VITE_SUPABASE_ANON_KEY=your-key

npm run dev
# → http://localhost:5173
```

### 3. iPhone im lokalen Netzwerk testen

Vite läuft mit `host: true`, also erscheint deine lokale IP im Terminal.  
Öffne `http://192.168.x.x:5173` auf dem iPhone — fertig.

---

## Supabase Setup

1. Gehe auf [supabase.com](https://supabase.com) → neues Projekt erstellen (kostenlos)
2. SQL Editor → New Query → Inhalt von `supabase/schema.sql` einfügen → Run
3. Settings → API → `URL` und `anon public key` kopieren → in `frontend/.env`
4. Authentication → Providers → Email aktivieren

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm install -g vercel
vercel
# → Folge dem Wizard, Root Directory = frontend/
# → Env-Variablen in Vercel Dashboard setzen
```

### Backend → Render.com

1. [render.com](https://render.com) → New Web Service → GitHub Repo verbinden
2. Root Directory: `backend`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Env var `ALLOWED_ORIGINS` = deine Vercel-URL (z.B. `https://mein-ticker.vercel.app`)
6. Plan: Free

---

## Features

- **Suche** — Aktien, ETFs, Krypto, Rohstoffe, Indizes (via Yahoo Finance)
- **Charts** — 1T / 1W / 1M / 1J / 5J / 10J / 15J / MAX, grün/rot je nach Trend
- **Watchlist** — geräteübergreifend via Supabase (Auth erforderlich)
- **Dark/Light Mode** — System-Default + manueller Toggle
- **PWA** — Installierbar auf dem iPhone via Safari → "Zum Home-Bildschirm"

---

## API Endpoints

```
GET /health
GET /api/search?q=apple
GET /api/quote/AAPL
GET /api/history/AAPL?period=1Y   # 1D 1W 1M 1Y 5Y 10Y 15Y MAX
```
