# Sistema de Matching Dental — v2.0.0

Sistema empresarial para asignar pacientes de odontología a estudiantes de clínica.
Recibe los síntomas del paciente, infiere tratamiento/urgencia/especialidad, asigna al
estudiante compatible (especialidad + horario + clínica) y notifica por email.

## Estado

**En desarrollo** — ago 2026. La funcionalidad core (CRUD, matching, email, auth) está
operativa, pero la integración end-to-end con el agente LLM y el modelo ML aún está en
validación (ver Benchmark Fase A).

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | Node.js + Express (arquitectura Clean + rutas legacy) |
| Frontend | React 19 + Vite 8 |
| Base de datos | MySQL 8.0+ |
| Cache | Redis (opcional, producción) |
| Auth | JWT + bcryptjs |
| Logging | Winston + winston-daily-rotate-file |
| Email | Nodemailer (Gmail SMTP) |
| Proceso | PM2 (cluster mode) |
| Contenedores | Docker + docker-compose |
| AI Agent | Python + FastAPI + LLM configurable (Ollama/API OpenAI-compatible) |
| ML Model | Python + scikit-learn (RandomForest v4) |
| Tests | Jest + supertest |
| Benchmark | Python script para comparar ai_agent vs ml_model |

## Características

- Triaje de síntomas con `SymptomAnalyzer` (NLP local en JS) como motor de producción.
- `ai_agent` (LLM) y `ml_model` (RandomForest v4) como servicios Python independientes
  en validación; aún no cableados al flujo de producción.
- Matching automático v3/v4 por especialidad, horario, urgencia y edad → clínica.
- Frontend React 19 con Login, Dashboard, Patients, Students, Matching y Assignments.
- Notificaciones por email (no WebSocket/tiempo real).
- Autenticación JWT + códigos de acceso para estudiantes.
- Migraciones automáticas en startup, health checks y logging rotativo.

## Estado de componentes

| Componente | Estado | Tecnología | Notas |
|-----------|--------|------------|-------|
| Backend Express | Funcional | Node.js + Express | Arquitectura Clean + rutas legacy montadas en paralelo. |
| Frontend | Funcional | React 19 + Vite 8 | SPA servida desde Express. |
| Auth JWT | Funcional | jsonwebtoken + bcryptjs | Login/refresh implementados. |
| Matching Engine | Funcional | Node.js | `services/matchingService.js` v4. |
| Email | Funcional | Nodemailer | Gmail SMTP. |
| MySQL + migraciones | Funcional | mysql2 | Migraciones automáticas en startup. |
| ai_agent (LLM) | Parcial | Python + FastAPI | Endpoint `/pre-categorize` funciona, pero no está cableado al backend. |
| ml_model (RF v4) | Parcial | Python + scikit-learn | Modelo entrenado; no integrado en runtime de matching. |
| Benchmark Fase A | Completado | Python script | Resultados en `benchmark/results/`. |
| Swagger UI | No montado | swagger-jsdoc/ui | Dependencias declaradas, no instanciadas en `app.js`. |
| Tests Node | Mínimos | Jest + supertest | 4 archivos en `src/tests/`. |
| Tests Python | No hay | — | Solo un `_self_check` en `ai_agent/agent.py`. |
| WebSocket | No existe | — | Notificaciones son por email. |

## Arquitectura

```
                 ┌─────────────────────────────┐
                 │   Frontend (React 19/Vite)  │
                 └──────────────┬──────────────┘
                                │ /api/*
                                ▼
┌───────────────────────────────────────────────────────────────┐
│              Backend Node.js / Express v2.0.0                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  src/ (Clean) + routes/ (legacy compatibilidad)         │  │
│  │  Auth · Patients · Students · Assignments · Matching  │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────┬──────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    MySQL             Redis            AI/ML
    (migraciones    (cache opcional)  ai_agent (Python/FastAPI)
    automáticas)                       │ LLM pre-categoriza
                                       │ 23 features
                                       ▼
                                 ml_model (Python/sklearn)
                                 RandomForest v4
                                 → tratamiento (5 clases)
```

En producción el triaje se hace con `SymptomAnalyzer` (JS local). `ai_agent` y
`ml_model` son servicios independientes que aún no forman parte del pipeline runtime.

## Estructura del repo

```
dental_matching/
├── server.js                  # Entry point: migraciones auto, graceful shutdown
├── src/                       # Arquitectura Clean
│   ├── app.js                 # Express app
│   ├── core/                  # Entidades + SymptomAnalyzer
│   ├── application/           # Casos de uso (Auth, Patient, Student, Assignment, Matching)
│   ├── infrastructure/        # DB, cache, logging, security, repositories
│   ├── presentation/          # Routes + controllers (solo auth implementado en Clean)
│   └── tests/                 # Tests unitarios e integración (mínimos)
├── routes/                    # Rutas legacy (pacientes, estudiantes, asignaciones, matching, dashboard, student)
├── services/                  # matchingService, autoNotificationService, emailTemplateService, studentCodeService
├── client/                    # Frontend React/Vite
├── ai_agent/                  # Python FastAPI — triaje con LLM
├── ml_model/                  # Python — RandomForest v4
├── benchmark/                 # Fase A: comparación ai_agent vs ml_model
├── database_schema.sql        # Schema completo
├── docker-compose.yml         # db + app + ai-agent
├── ecosystem.config.js        # PM2 cluster
├── .env.example / env.example # Variables de entorno
└── README.md / CLAUDE.md      # Documentación
```

## Comandos

### Instalación

```bash
# Backend
npm install

# Frontend
cd client && npm install && cd ..
```

### Desarrollo

```bash
# Backend + abrir navegador en :3002
npm run dev

# Solo backend
npm run dev:server-only

# Frontend aparte (Vite en :5173)
cd client && npm run dev
```

### Tests / lint

```bash
npm test
npm run test:coverage
npm run lint
npm run format
```

> Cobertura real no confirmada; suite actual es mínima.

### Base de datos

```bash
npm run migrate          # migraciones automáticas
npm run db:seed            # datos de prueba
npm run db:reset           # rollback + migrate + seed
npm run db:create-admin    # crea usuario admin
```

### Build y producción

```bash
npm run build              # lint + test
cd client && npm run build # build React → client/dist

# Producción con PM2
npm run prod
npm run logs
npm run restart
npm run stop
```

### Docker

```bash
docker-compose up -d        # db + app + ai-agent
```

### AI Agent y ML Model

```bash
# AI Agent
pip install -r ai_agent/requirements.txt
cd ai_agent && python server.py          # :8001

# ML Model
pip install -r ml_model/requirements.txt
cd ml_model && python scripts/entrenar_modelo_v4.py
```

### Benchmark Fase A

```bash
cd benchmark
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe run_benchmark.py
```

Resultados: `benchmark/results/agent_results.csv`, `model_results.csv`, `summary.json`.
`benchmark/results/` y `DatasetDescargado/` están en `.gitignore` (regenerables).

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar. Las críticas:

| Variable | Propósito |
|----------|-----------|
| `PORT` / `HOST` | Puerto y host del backend |
| `DB_*` | Conexión MySQL |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Firma de tokens |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | TTL access/refresh |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail SMTP (app password) |
| `FRONTEND_URL` | Links en emails |
| `REDIS_*` | Cache opcional (producción) |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | AI Agent |
| `AI_AGENT_PORT` | Puerto del agente Python (default 8001) |

Ver `.env.example` para el listado completo.

## Benchmark Fase A — Resultados

Comparación de `ai_agent` (LLM) vs `ml_model` (RandomForest v4) sobre 7 casos del
`Lines/Open-Domain-Oral-Disease-QA-Dataset`.

| Métrica | ai_agent (LLM) | ml_model (RF v4) |
|---------|---------------|------------------|
| Tarea medida | Extracción de 23 features vs ground truth | Clasificación de tratamiento vs enfermedad |
| Accuracy | 72.05% | 42.86% (3/7) / 75% en clases RF conocidas (3/4) |
| Consistencia | 89.44% entre 3 corridas | Determinístico (100%) |
| Latencia promedio | 3,456 ms (p50: 1,846 ms) | 102.5 ms |
| Latencia total | ~72.6 s (21 llamadas) | ~0.7 s (7 predicciones) |
| Costo estimado | $0.0166 USD (Groq llama-3.3-70b) | $0.00 |
| Fallos en derivaciones (TMJ, maloclusión, cáncer) | — | 3/3 (el RF no tiene esas clases) |

### Hallazgos clave

- **ai_agent**: buen desempeño en features directas (`sensibilidad`, `tratamiento_previo`,
  `medicamento_dolor` = 100%), pero mal en `tipo_dolor` (28.6%) y `historial_bolsas`
  (14.3%). En el caso de cáncer oral sobre-interpreta y alucina enfermedad periodontal.
- **ml_model**: acierta 3 de 4 enfermedades dentro de sus 5 clases (pulpitis,
  periodontal, caries). Falla `pericoronitis` y, por diseño, las 3 derivaciones
  (TMJ, maloclusión, cáncer oral).
- **Set de 7 casos es estadísticamente débil** — resultados orientativos, no concluyentes.

## Problemas conocidos abiertos

- Swagger UI declarado pero no montado (`/api/docs` devuelve 404).
- `ai_agent` y `ml_model` no están cableados al flujo de producción.
- Double registro de signal handlers en `server.js` y `src/app.js`.
- Proxy de Vite apunta a `:3000` pero el backend en dev usa `:3002`.
- Tests Node mínimos; no hay tests Python.
- `ecosystem.config.js` usa keys no válidas de PM2 (`env_file`, `env_staging`).

## Notas

- Código y comentarios en español; nombres de tablas/columnas en español
  (`pacientes`, `estudiantes_odontologia`, `asignaciones`).
- `database_schema.sql` es el schema completo; usar `npm run migrate:create`
  para nuevos cambios de schema, no editarlo a mano.
- `services/matchingService.js` es el corazón del algoritmo de scoring — tocar
  solo entendiendo los pesos y la lógica de solapamiento horario.
- `ai_agent` y `ml_model` tienen sus propios `requirements.txt` y no comparten
  dependencias con Node.

## Documentación

- `README.md` — este archivo (documentación general, estado honesto).
- `CLAUDE.md` — contexto extendido para asistentes AI (stack, estructura, convenciones, reglas).

## Licencia

MIT
