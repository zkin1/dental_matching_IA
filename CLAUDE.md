# CLAUDE.md

## Descripción

Sistema empresarial de matching entre pacientes y estudiantes de odontología. Recibe síntomas del paciente, infiere tratamiento/urgencia/especialidad, asigna al estudiante compatible (especialidad + horario + clínica) y notifica por email. Backend Node/Express con arquitectura Clean, frontend React/Vite, agente Python (LLM) como motor de triaje en producción y modelo ML RandomForest v4 como referencia en perfeccionamiento.

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
│   ├── core/              # Dominio: entities/ (Assignment, Patient, Student) + ai/SymptomAnalyzer (NLP fallback)
│   ├── application/       # Servicios de caso de uso (Auth/Patient/Student/Assignment/IntelligentMatching) + dtos
│   ├── infrastructure/    # auth, cache, database, health, logging, repositories, security, validation
│   ├── presentation/      # controllers/AuthController + routes (authRoutes, index)
│   ├── shared/            # errors/AppError, middleware (auth, errorHandler, validation), utils (logger, productionLogger, globalLoggerSetup)
│   └── tests/             # unit (cache, scoring, validation) + integration (api) + setup.js
├── routes/                # Rutas legacy (pacientes, estudiantes, asignaciones, matching, dashboard, student)
├── services/              # matchingService, autoNotificationService, emailTemplateService, studentCodeService
├── config/                # database.js (pool mysql2), logger.js, security.js
├── scripts/               # migrate.js, migrate_database.js, create-admin.js, clean-test-data.js, cleanup-tables.js, insert-patient-schedules.js
├── database/              # users_table.sql
├── database_schema.sql    # Dump completo del schema (ai_matching_results, asignaciones, pacientes, estudiantes_odontologia, etc.)
├── client/                # Frontend React/Vite (pages: Login, Dashboard, Patients, Students, Matching, Assignments; components: ErrorBoundary, Layout, Toast; hooks/useAuth; lib/api)
├── ai_agent/              # Servicio Python FastAPI: /pre-categorize (LLM → 23 features V4); motor de triaje en producción
├── ml_model/              # Modelo RandomForest V4 (joblib), dataset, scripts entrenar/generar, demos
├── public/                # Frontend fallback estático (app.js, index.html, styles.css, dashboard-enhanced.css)
├── uploads/               # Archivos subidos (gitignored)
├── logs/                  # Logs Winston (rotación diaria, gitignored)
├── test-results/          # Salida de tests (gitignored)
├── coverage/              # Cobertura de tests (gitignored, actualmente 0%)
├── benchmark/             # Fase A: comparación ai_agent vs ml_model
│   ├── cases.json, requirements.txt, run_benchmark.py
│   └── results/ (agent_results.csv, model_results.csv, summary.json)
├── DatasetDescargado/     # Fuente local del benchmark (extracted_all.jsonl, gitignored)
├── ecosystem.config.js    # PM2 cluster + deploy staging/prod (tiene keys inválidas de PM2)
├── docker-compose.yml     # db (mysql) + app + ai-agent
├── Dockerfile             # Imagen backend
├── nginx.conf             # Reverse proxy prod
├── jest.config.js         # Config tests
├── .env.example / env.example  # Variables de entorno
├── install.sh, migrate.sh, start-dev.sh
└── README.md / CLAUDE.md  # Documentación
```

## Comandos

```bash
# Instalar
npm install
cd client && npm install && cd ..

# Dev (backend + abre browser en :3002)
npm run dev                 # Windows: npm run dev:win (referencia a start-dev.bat que no existe; usar npm run dev)
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
# npm run db:seed           # scripts/seed.js NO existe (comando roto)
# npm run db:reset          # depende de db:seed (comando roto)
npm run db:clean            # limpia datos de test
npm run db:create-admin     # crea usuario admin

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
- **No commitear** `logs/`, `uploads/`, `coverage/`, `test-results/`, `node_modules/`, `client/dist/`, `.env`, `DatasetDescargado/`, `benchmark/results/` (ver `.gitignore`).
- **Frontend** se sirve desde `client/dist` si existe, sino `public/` — no borrar `public/` (fallback).
- **AI Agent** y **ML Model** son servicios Python independientes con su propio `requirements.txt` y venv; no mezclar con deps Node.
- **AI Agent** es el motor de triaje en producción; **ML Model** RF v4 es referencia/objetivo a superar.

## Estado actual

**Funcionando:**
- Backend Express v2.0.0 con arquitectura Clean + rutas legacy montadas.
- Auth JWT (login/refresh) vía `src/presentation/routes/authRoutes.js`.
- CRUD pacientes/estudiantes/asignaciones (legacy + enterprise).
- Matching IA v3.0/v4.0 con scoring por horario, especialidad, urgencia, edad→clínica.
- Notificaciones email automáticas (Gmail) + plantillas (`emailTemplateService`).
- Migraciones automáticas en startup.
- Health checks (DB + cache), métricas de sistema, logging Winston rotativo.
- Frontend React 19 (Login, Dashboard, Patients, Students, Matching, Assignments).
- Docker compose (db + app + ai-agent).
- PM2 ecosystem (cluster, deploy staging/prod).
- AI Agent Python (`ai_agent/`): FastAPI `/pre-categorize` con LLM → 23 features V4. Requiere Ollama/API externa corriendo; elegido como **motor de triaje en producción** mientras se perfecciona el modelo ML.
- ML Model V4 (`ml_model/`): RandomForest entrenado + tests de flujo; referencia y objetivo a superar al agente LLM.

**En progreso / parcial:**
- Integración end-to-end: flujo paciente → `ai_agent` (LLM) → `matchingService` no está cableado todavía; `SymptomAnalyzer` JS local es el fallback si LLM no responde.
- Swagger docs (`/api/docs`) declarado en dependencias pero no verificado montado en `app.js`.
- Tests: config Jest presente, `src/tests/` existe; cobertura reportada **0%** (`coverage/index.html` muestra 0/4849 statements).
- `scripts/seed.js` no existe → `npm run db:seed` y `npm run db:reset` fallan.
- `start-dev.bat` no existe → `npm run dev:win` falla en Windows (usar `npm run dev`).
- `ecosystem.config.js` usa keys inválidas de PM2 (`env_file`, `env_staging`, `health_check_*`, `notify`, `monitoring`).
- Double registro de signal handlers en `server.js` y `src/app.js`.
- Proxy de Vite apunta a `:3000` pero el backend en dev usa `:3002` (vía `.env`).

**TODOs conocidos:**
- Cablear flujo end-to-end: paciente → `ai_agent` (LLM) → `matchingService`.
- Perfeccionar modelo ML V4 para que supere al agente LLM; luego integrarlo como opción principal.
- Verificar/montar Swagger UI en `app.js`.
- Crear `scripts/seed.js` o corregir `npm run db:seed`/`db:reset`.
- Corregir `ecosystem.config.js` (keys inválidas de PM2) y consistencia de puertos dev (Vite proxy vs `.env`).
- Completar suites de tests y hacer que la cobertura real se recoja.
