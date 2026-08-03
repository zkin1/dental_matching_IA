# CLAUDE.md

## Descripción

Sistema empresarial de matching entre pacientes y estudiantes de odontología. Recibe síntomas del paciente, infiere tratamiento/urgencia/especialidad, asigna al estudiante compatible (especialidad + horario + clínica) y notifica por email. Backend Node/Express con arquitectura Clean, frontend React/Vite, agente Python (LLM) para triaje y modelo ML RandomForest para predicción de tratamiento.

## Stack

| Capa | Tech | Versión |
|------|------|---------|
| Backend | Node.js + Express | Express 4.19, Node >=18 |
| Frontend | React + Vite | React 19.2, Vite 8 |
| DB | MySQL | 8.0 (docker) / 9.2 (dump) |
| Cache | Redis (ioredis) | opcional, solo prod |
| Auth | JWT (jsonwebtoken) + bcryptjs | - |
| Validación | Joi + express-validator | - |
| Logging | Winston + winston-daily-rotate-file | - |
| Email | nodemailer (Gmail SMTP) | - |
| Docs API | swagger-jsdoc + swagger-ui-express | - |
| Proceso | PM2 (ecosystem.config.js) | cluster mode |
| AI Agent | Python + FastAPI + LLM (Ollama/OpenAI-compatible) | puerto 8001 |
| ML Model | Python + scikit-learn (RandomForest) | V4, joblib |
| Tests | Jest + supertest | 29.7 |
| Lint | ESLint 8 + Prettier 3 | - |
| Hooks | Husky | - |

## Estructura

```
dental_matching/
├── server.js              # Entry: arranca app, migraciones auto, graceful shutdown
├── src/
│   ├── app.js             # Express app: middleware security/rate/log, monta rutas
│   ├── core/              # Dominio: entidades + ai/SymptomAnalyzer (NLP síntomas→tratamiento)
│   ├── application/       # Servicios de caso de uso (Auth/Patient/Student/Assignment/IntelligentMatching) + dtos
│   ├── infrastructure/    # auth, cache, database, health, logging, repositories, security, validation
│   ├── presentation/      # controllers + routes (authRoutes, index)
│   ├── shared/            # errors, middleware (errorHandler), utils (logger)
│   └── tests/             # tests unit/integration
├── routes/                # Rutas legacy (pacientes, estudiantes, asignaciones, matching, dashboard, student)
├── services/              # matchingService (IA v3.0/v4.0 scoring), autoNotificationService, emailTemplateService, studentCodeService
├── config/                # database.js (pool mysql2), logger.js, security.js
├── scripts/               # migrate.js, seed.js, create-admin.js, clean-test-data.js, insert-patient-schedules.js
├── database/              # users_table.sql
├── database_schema.sql    # Dump completo del schema (ai_matching_results, asignaciones, pacientes, estudiantes_odontologia, etc.)
├── client/                # Frontend React/Vite (pages: Login, Dashboard, Patients, Students, Matching, Assignments)
├── ai_agent/              # Servicio Python FastAPI: /pre-categorize (LLM → 23 features V4)
├── ml_model/              # Modelo RandomForest V4 (joblib), dataset, scripts entrenar/generar, demos Gradio
├── public/                # Frontend fallback estático
├── uploads/               # Archivos subidos
├── logs/                  # Logs Winston (rotación diaria)
├── test-results/          # Salida de tests
├── ecosystem.config.js    # PM2 cluster + deploy staging/prod
├── docker-compose.yml     # db (mysql) + app + ai-agent
├── Dockerfile             # Imagen backend
├── nginx.conf             # Reverse proxy prod
├── jest.config.js         # Config tests
├── .env.example / env.example  # Variables de entorno
└── start-dev.sh / install.sh / migrate.sh
```

## Comandos

```bash
# Instalar
npm install
cd client && npm install && cd ..

# Dev (backend + abre browser en :3002)
npm run dev                 # Windows: npm run dev:win
npm run dev:server-only     # solo backend (nodemon)
cd client && npm run dev    # frontend Vite aparte

# Tests
npm test                    # jest
npm run test:watch
npm run test:coverage
npm run test:unit
npm run test:integration

# Lint/format
npm run lint
npm run lint:fix
npm run format

# DB
npm run migrate             # aplica migraciones pendientes
npm run migrate:status
npm run migrate:create
npm run migrate:rollback
npm run db:seed
npm run db:reset            # rollback + migrate + seed
npm run db:clean            # limpia datos de test
npm run db:create-admin

# Build / validate
npm run build              # lint + test
npm run validate           # lint + coverage
cd client && npm run build # build frontend → client/dist (servido por Express)

# Producción (PM2)
npm run prod               # pm2 start ecosystem.config.js --env production
npm run stop
npm run restart
npm run logs

# Docker
docker-compose up -d       # db + app + ai-agent

# AI Agent (Python)
cd ai_agent && pip install -r requirements.txt
python server.py           # :8001, requiere Ollama o LLM_API externa

# ML Model
cd ml_model && pip install -r requirements.txt
python scripts/entrenar_modelo_v4.py    # reentrena
```

## Variables de entorno

| Variable | Para qué |
|----------|----------|
| `NODE_ENV` | development/production/staging |
| `PORT` | Puerto backend (default 3000) |
| `HOST` | Host bind (default localhost) |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | Conexión MySQL |
| `DB_CONNECTION_LIMIT` | Tamaño del pool (default 20) |
| `DB_SSL` `DB_SSL_REJECT_UNAUTHORIZED` | SSL a DB (prod) |
| `JWT_SECRET` `JWT_REFRESH_SECRET` | Firmas de tokens (cambiar en prod) |
| `JWT_EXPIRES_IN` `JWT_REFRESH_EXPIRES_IN` | TTL access/refresh (24h / 7d) |
| `EMAIL_SERVICE` `EMAIL_USER` `EMAIL_PASS` | Gmail SMTP (app-password) |
| `ADMIN_EMAIL` | Destinatario de notificaciones admin |
| `FRONTEND_URL` | Base URL para links en emails |
| `REDIS_ENABLED` `REDIS_HOST` `REDIS_PORT` `REDIS_PASSWORD` `REDIS_DB` | Cache (opcional, prod) |
| `LOG_LEVEL` | info/debug/warn/error |
| `LOG_DIR` | Directorio de logs |
| `LLM_BASE_URL` `LLM_API_KEY` `LLM_MODEL` | AI Agent: endpoint LLM (Ollama o API OpenAI-compatible) |
| `AI_AGENT_PORT` | Puerto agente Python (default 8001) |
| `SERVER_TIMEOUT` | Timeout HTTP server (default 30000ms) |
| `JSON_LIMIT` | Límite body JSON (default 10mb) |

## Convenciones

- **Arquitectura Clean**: `core` (dominio) → `application` (casos de uso) → `infrastructure` (repositorios/servicios) → `presentation` (controllers/routes). Dependencias apuntan hacia adentro.
- **Rutas legacy** (`routes/`) conviven con `src/presentation/routes/` por compatibilidad; ambas montadas en `app.js`.
- **Servicio unificado DB**: `config/database.js` (pool mysql2 con promesas). Usar `getConnection()` / `databaseService.middleware()`.
- **Naming**: archivos JS en camelCase, clases PascalCase (`AdvancedMatchingService`), servicios singleton `require(...)`.
- **Errores**: `shared/middleware/errorHandler.js` centralizado + `shared/errors/` para clases tipadas. Todo endpoint responde `{ success, message, data }` o `{ success: false, error }`.
- **Validación**: Joi para schemas de servicio, express-validator en rutas; input sanitizer global en `app.js`.
- **Seguridad**: Helmet + CORS config en `infrastructure/security/securityConfig.js`; rate limiters por endpoint (`standardLimiter`, `authLimiter`, `matchingLimiter`, `strictLimiter`).
- **Logging**: Winston con request ID por request; `infrastructure/logging/logger.js`. No usar `console.log` en prod (patch `productionLogger`).
- **Migraciones**: `scripts/migrate.js` + `src/infrastructure/database/migrationManager.js`; se ejecutan automáticamente al arrancar `server.js`.
- **Frontend**: React 19 + React Router 7, páginas en `client/src/pages`, hooks en `client/src/hooks`, build a `client/dist` servido por Express (SPA catch-all).
- **Comentarios**: código en español; nombres de tablas/columnas en español (`pacientes`, `estudiantes_odontologia`, `asignaciones`).
- **Tests**: Jest, patrón `*.test.js` en `src/tests/`, supertest para integración.

## Reglas/restricciones

- **NO tocar** `services/matchingService.js` sin entender el algoritmo de scoring v4.0 (pesos: horario 30%, especialidad, urgencia, etc.). Es el corazón del negocio y tiene lógica de solapamiento horario paciente-estudiante (mín 50%).
- **NO tocar** `database_schema.sql` directamente para cambios de schema → usar migraciones (`npm run migrate:create`).
- **NO hardcodear** secrets en `.env` commiteado; usar `.env.example` como plantilla.
- **Frágil**: `src/app.js` referencia `databaseService` antes de su require (lazy init) — mantener orden de requires.
- **Frágil**: `server.js` maneja `unhandledRejection` de Redis como no-fatal (no apaga el server); no cambiar ese comportamiento o Redis caído tirará el server.
- **Frágil**: matching legacy (`routes/matching.js`) tiene rate limiter propio con `max: 10000` en dev — no bajar en prod.
- **Dependencia externa crítica**: Ollama (o LLM API) debe estar corriendo para que el AI Agent funcione; sin él, `ai_agent` falla pero el backend Node sigue operativo (matching usa `SymptomAnalyzer` local como fallback).
- **Dependencia externa crítica**: MySQL debe estar up antes del backend; migraciones auto-corren en startup pero no crean la DB (`DB_NAME` debe existir).
- **No commitear** `logs/`, `uploads/`, `coverage/`, `test-results/`, `node_modules/`, `client/dist/`, `.env` (ver `.gitignore`).
- **Frontend** se sirve desde `client/dist` si existe, sino `public/` — no borrar `public/` (fallback).
- **AI Agent** y **ML Model** son servicios Python independientes con su propio `requirements.txt` y venv; no mezclar con deps Node.

## Estado actual

**Funcionando:**
- Backend Express v2.0.0 con arquitectura Clean + rutas legacy montadas.
- Auth JWT (login/refresh) vía `src/presentation/routes/authRoutes.js`.
- CRUD pacientes/estudiantes/asignaciones (legacy + enterprise).
- Matching IA v3.0/v4.0 con scoring por horario, especialidad, urgencia, edad→clínica.
- `SymptomAnalyzer` local (NLP basado en patrones) como fallback sin LLM.
- Notificaciones email automáticas (Gmail) + plantillas (`emailTemplateService`).
- Migraciones automáticas en startup.
- Health checks (DB + cache), métricas de sistema, logging Winston rotativo.
- Frontend React 19 (Login, Dashboard, Patients, Students, Matching, Assignments).
- Docker compose (db + app + ai-agent).
- PM2 ecosystem (cluster, deploy staging/prod).

**En progreso / parcial:**
- AI Agent Python (`ai_agent/`): FastAPI `/pre-categorize` con LLM → 23 features V4. Requiere Ollama/API externa corriendo; integración con backend Node no está cableada end-to-end (servicio existe pero flujo paciente→agent→ML→matching es manual).
- ML Model V4 (`ml_model/`): RandomForest entrenado + demos Gradio; no integrado en pipeline de matching en runtime (matching usa `SymptomAnalyzer` JS local, no el modelo Python).
- Swagger docs (`/api/docs`) declarado en dependencias pero no verificado montado en `app.js`.
- Tests: config Jest presente, `src/tests/` existe; cobertura real del código legacy/enterprise no confirmada.

**TODOs conocidos:**
- Cablear flujo end-to-end: paciente → ai_agent (LLM) → ml_model (predicción) → matchingService.
- Integrar modelo Python V4 en el matching en lugar de (o junto a) `SymptomAnalyzer` JS.
- Verificar/montar Swagger UI en `app.js`.
- Confirmar cobertura de tests y completar suites faltantes.
- `FRONTEND_URL` en `.env.example` apunta a :3000 pero `dev` arranca backend en :3002 — revisar consistencia de puertos en dev.