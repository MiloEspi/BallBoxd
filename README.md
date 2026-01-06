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
IMPORT_MATCHES_RANGE_DAYS=0
IMPORT_MATCHES_FREQUENCY_MINUTES=60
IMPORT_MATCHES_WEEKDAY_MINUTES=180
IMPORT_MATCHES_WEEKEND_MINUTES=60
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
