# Sistema de Matching Dental — v2.0.0

Sistema empresarial para asignar pacientes de odontología a estudiantes de clínica.
Recibe los síntomas del paciente, infiere tratamiento/urgencia/especialidad, asigna al
estudiante compatible (especialidad + horario + clínica) y notifica por email.

## Estado actual

**En desarrollo** — ago 2026. La funcionalidad core (CRUD, matching, email, auth) está
operativa. El pipeline de triaje con IA/ML está en **validación activa**: se entrena un
modelo RandomForest v4 con un dataset sintético de 3.000 casos, se compara contra el
agente LLM en el benchmark Fase A, y se ejecutan self-checks del agente y flujos de
prueba del modelo. Aún no está cableado end-to-end al backend de producción.

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
| Tests | Jest + supertest (Node); scripts Python + self-checks (AI/ML) |
| Benchmark | Python script para comparar `ai_agent` vs `ml_model` |

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
| ai_agent (LLM) | Parcial | Python + FastAPI | Endpoint `/pre-categorize` funciona; self-check en `agent.py`; no cableado al backend. |
| ml_model (RF v4) | Parcial | Python + scikit-learn | Modelo entrenado con dataset sintético v4; tests de flujo en `demos/test_v4_flow.py`; no integrado en runtime de matching. |
| Benchmark Fase A | Completado | Python script | Resultados en `benchmark/results/`. |
| Swagger UI | No montado | swagger-jsdoc/ui | Dependencias declaradas, no instanciadas en `app.js`. |
| Tests Node | Mínimos | Jest + supertest | 4 archivos en `src/tests/`. |
| Tests Python | Self-checks / flujos | Scripts Python | `agent.py::_self_check`, `demos/test_v4_flow.py`, entrenamiento con train/test split. |
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
│   ├── agent.py               # Pre-categorización + parser JSON + self-check
│   ├── llm_client.py          # Cliente LLM genérico (Ollama/OpenAI-compatible)
│   ├── prompts.py             # Prompts y schema de 23 features
│   ├── server.py              # FastAPI /pre-categorize + /health
│   └── requirements.txt
├── ml_model/                  # Python — RandomForest v4
│   ├── data/
│   │   └── dataset_triaje_dental_v4.csv   # Dataset sintético (3.000 filas, 23 features, 5 clases)
│   ├── models/
│   │   └── modelo_triaje_dental.joblib    # Pipeline entrenado (RF v4)
│   ├── scripts/
│   │   ├── generar_dataset_triaje_dental_v4.py   # Generador sintético
│   │   └── entrenar_modelo_v4.py               # Entrenamiento + evaluación
│   ├── demos/
│   │   ├── demo_paciente.py           # Wrapper con red flags y overrides
│   │   ├── test_app.py                # Demo simple
│   │   └── test_v4_flow.py            # Flujos de prueba con aserciones
│   └── requirements.txt
├── benchmark/                 # Fase A: comparación ai_agent vs ml_model
│   ├── cases.json             # 7 casos de prueba con ground truth
│   ├── run_benchmark.py       # Script de benchmark
│   └── results/               # CSV + JSON de resultados
├── database_schema.sql        # Schema completo
├── docker-compose.yml         # db + app + ai-agent
├── ecosystem.config.js        # PM2 cluster
├── .env.example / env.example # Variables de entorno
└── README.md / CLAUDE.md      # Documentación
```

## Dataset del modelo ML v4

El modelo RandomForest v4 se entrena con un **dataset sintético generado por script**:

- **Archivo**: `ml_model/data/dataset_triaje_dental_v4.csv`
- **Generador**: `ml_model/scripts/generar_dataset_triaje_dental_v4.py`
- **Tamaño**: 3.000 filas (600 por clase)
- **Clases**: 5 tratamientos
  - `Limpieza / Profilaxis`
  - `Tapadera (Resina)`
  - `Endodoncia`
  - `Destartraje y Pulido Radicular (Periodontitis)`
  - `Extraccion`
- **Features**: 23 variables categóricas/ordinales/numericas derivadas de revisión clínica:
  - Dolor: `tipo_dolor`, `duracion_dolor`, `dolor_nocturno`, `sensibilidad`, `intensidad_dolor`, `dolor_pulsante`, `dolor_irradiado`, `tiempo_evolucion_dolor`, `dolor_al_morder`
  - Hallazgos: `hallazgo_visual`, `movilidad_dental`, `profundidad_lesion`, `signos_infeccion`, `tiempo_fistula`
  - Historia: `tratamiento_previo`, `medicamento_dolor`, `alivio_medicamento`
  - Periodontal: `estado_periodontal`, `tiempo_sintomas_gingivales`, `sangrado_encias`, `mal_aliento`, `recesion_encia`, `historial_bolsas`
- **Ruido**: 4% de etiquetas invertidas para simular inconsistencia real.
- **Split**: 80% entrenamiento / 20% prueba (stratify, random_state=42).
- **Modelo**: RandomForestClassifier (`n_estimators=300`, `max_depth=8`, `min_samples_leaf=8`, class_weight con peso 3 para `Extraccion`).
- **Preprocesamiento**: `OrdinalEncoder` para `movilidad_dental` y `profundidad_lesion`, `OneHotEncoder` para nominales, passthrough para `intensidad_dolor`.

> **Nota**: El dataset es sintético y no representa datos reales de pacientes. Sirve para validar la arquitectura de features y el modelo v4. El benchmark Fase A se ejecuta sobre casos reales de un dataset externo (ver abajo).

## Tests del modelo y el agente

### Tests del modelo ML v4

Ejecutar el entrenamiento genera métricas de train/test en consola:

```bash
pip install -r ml_model/requirements.txt
cd ml_model
python scripts/entrenar_modelo_v4.py
```

El script reporta:
- `Accuracy en TRAIN`
- `Accuracy en TEST`
- `F1-Macro en TEST`
- Reporte de clasificación por clase en TEST.

### Flujos de prueba del modelo

```bash
cd ml_model
python demos/test_v4_flow.py
```

Valida 5 escenarios con aserciones:
1. Limpieza / Profilaxis
2. Extracción
3. Tapadera (Resina)
4. Periodontitis
5. Bandera roja (derivación urgente)
6. Bug fix de `profundidad_lesion` N/A → override a "No visible pero con molestia"

### Self-check del agente IA

```bash
cd ai_agent
python agent.py
```

Valida el parser JSON y la normalización de `intensidad_dolor` con un mock del LLM
(sin llamada de red).

### Benchmark Fase A

```bash
cd benchmark
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe run_benchmark.py
```

Resultados: `benchmark/results/agent_results.csv`, `model_results.csv`, `summary.json`.
`benchmark/results/` y `DatasetDescargado/` están en `.gitignore` (regenerables).

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
# Node
npm test
npm run test:coverage
npm run lint
npm run format

# Python self-check (agente)
cd ai_agent && python agent.py

# Python flujos del modelo
cd ml_model && python demos/test_v4_flow.py

# Python entrenamiento + evaluación
cd ml_model && python scripts/entrenar_modelo_v4.py
```

> Cobertura real de Node no confirmada; suite actual es mínima.

### Base de datos

```bash
npm run migrate          # migraciones automáticas
npm run db:seed          # datos de prueba
npm run db:reset         # rollback + migrate + seed
npm run db:create-admin  # crea usuario admin
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
- Tests Node mínimos; tests Python son self-checks y flujos, no suite formal.
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
- El dataset ML v4 es sintético; los resultados del benchmark Fase A usan un
  dataset externo de 7 casos de enfermedades orales.

## Documentación

- `README.md` — este archivo (documentación general, estado honesto, tests y dataset).
- `CLAUDE.md` — contexto extendido para asistentes AI (stack, estructura, convenciones, reglas).

## Licencia

MIT
