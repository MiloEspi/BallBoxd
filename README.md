# BallBoxd
MVP tipo Letterboxd para valorar partidos de futbol (score 0-100, minutes_watched, review opcional).

## Stack
- Backend: Django + Django REST Framework
- Frontend: Next.js (App Router)
- Auth: DRF TokenAuthentication
- DB dev: SQLite

## Estructura
```
/
  api/      # Backend Django
  app/      # Frontend Next.js
```

## Requisitos
- Python 3.11+
- Node.js 18+

## Backend (Django)
```powershell
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py runserver
```

### External data (football-data.org)
Set the token in your shell:
```powershell
$env:FOOTBALL_DATA_TOKEN="your_token_here"
```
Optional tuning:
```
FOOTBALL_DATA_RATE_LIMIT_PER_MINUTE=10
FOOTBALL_DATA_RATE_LIMIT_WINDOW_SECONDS=60
FOOTBALL_DATA_CACHE_SECONDS=600
IMPORT_MATCHES_RANGE_DAYS=0
IMPORT_MATCHES_FREQUENCY_MINUTES=10
IMPORT_MATCHES_WEEKDAY_MINUTES=10
IMPORT_MATCHES_WEEKEND_MINUTES=10
LOG_LEVEL=INFO
```
Import competitions:
```powershell
python manage.py import_leagues
```
Sync matches for a range (global):
```powershell
python manage.py import_fixtures --from 2024-01-01 --to 2024-01-02
```
Poll matches every 10 minutes:
```powershell
python manage.py poll_matches --interval 10
```
Run once (for cron/scheduler):
```powershell
python manage.py poll_matches --once
```

### Free scheduling with cron-job.org (no Render cron/worker)
Render Cron Jobs/Background Workers/Shell are paid. To run the polling loop for free, use an external scheduler that hits protected internal endpoints on your Render web service.

Set an env var on Render:
```
CRON_SECRET=<long_random_secret>
```

Create a cron-job.org job:
- Method: `POST`
- URL: `https://<render-app>.onrender.com/internal/poll-matches`
- Header: `X-CRON-TOKEN: <CRON_SECRET>`
- Schedule: every 10 minutes

Manual test (poll once):
```bash
curl -X POST "https://<render-app>.onrender.com/internal/poll-matches" \
  -H "X-CRON-TOKEN: <CRON_SECRET>"
```
Manual test (fixtures import/backfill):
```bash
curl -X POST "https://<render-app>.onrender.com/internal/import-fixtures" \
  -H "X-CRON-TOKEN: <CRON_SECRET>"
```
Optional params for fixtures import:
```bash
curl -X POST "https://<render-app>.onrender.com/internal/import-fixtures?leagues=39,140&from=2024-01-01&to=2024-01-31" \
  -H "X-CRON-TOKEN: <CRON_SECRET>"
```

### Endpoints principales
- POST `/api/v1/auth/register/`
- POST `/api/v1/auth/token/`
- GET `/api/v1/feed/`
- GET `/api/v1/matches/{id}/`
- POST/PATCH `/api/v1/matches/{id}/rate/`
- GET `/api/v1/profile/{username}/stats/?range=week|month|year`
- GET `/api/v1/profile/{username}/activity/?range=week|month|year`
- GET `/api/v1/profile/{username}/highlights/?range=week|month|year`
- POST/DELETE `/api/v1/teams/{id}/follow/`
- POST/DELETE `/api/v1/users/{id}/follow/`
- GET `/api/v1/me/`

## Frontend (Next.js)
```powershell
cd app
npm install
npm run dev
```

### Configuracion opcional
Si el backend no corre en `http://localhost:8000/api/v1`, setear:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### Demo mode (sin backend)
Para correr solo con mocks locales de Next:
```
NEXT_PUBLIC_DEMO_MODE=true
```
Luego:
```powershell
cd app
npm run dev
```
Credenciales demo:
- camilo / 1234
- alice / 1234
- bob / 1234

## Autenticacion (Token)
1) Registrate o logueate para obtener el token.
2) En el frontend se guarda en `localStorage` y se envia como:
```
Authorization: Token <token>
```

## Seeds
`python manage.py seed` carga usuarios, equipos, torneos, partidos, follows y ratings de ejemplo.

## Deploy en Vercel (demo)
1) Deploy del frontend (carpeta `app/`).
2) En Vercel setear `NEXT_PUBLIC_DEMO_MODE=true`.
3) Deploy. No requiere backend.

## Notas
- CORS habilitado para `http://localhost:3000`.
- SQLite usado solo para desarrollo.
