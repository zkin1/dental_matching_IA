#!/usr/bin/env python3
"""
Benchmark FASE A: ai_agent (LLM) vs ml_model (RandomForest V4).

- Reutiliza prompts/parsers/LLMClient de ai_agent importando sus modulos.
- Carga el modelo RF V4 directamente desde ml_model/models/modelo_triaje_dental.joblib.
- NO toca SymptomAnalyzer, IntelligentMatchingService, database_schema ni produccion.

Precondiciones:
    - LLM accesible (Ollama local o LLM_API) para ai_agent/llm_client.
    - ml_model/models/modelo_triaje_dental.joblib existente.
    - cases.json autorizado con ground truth a ciegas.

Salida:
    - results/agent_results.csv   (3 corridas por caso)
    - results/model_results.csv   (1 corrida por caso)
    - results/summary.json      (metricas agregadas)
"""

import csv
import json
import os
import statistics
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

# ponytail: Windows console usa cp1252; forzamos utf-8 para evitar fallos con emojis
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BENCH_DIR = Path(__file__).resolve().parent
ROOT_DIR = BENCH_DIR.parent
sys.path.insert(0, str(ROOT_DIR))

# Cargar credenciales del root .env (donde estan LLM_BASE_URL, LLM_API_KEY, LLM_MODEL)
# antes de importar LLMClient, que hace os.getenv con defaults a Ollama.
load_dotenv(ROOT_DIR / ".env")

# ponytail: importar ai_agent como paquete; no duplicamos prompts ni parsers
from ai_agent.llm_client import LLMClient
from ai_agent.prompts import build_system_prompt, build_user_prompt, REQUIRED_FEATURES
from ai_agent.agent import _extract_json, _normalize_pre_categorization

# ml_model
import joblib
import pandas as pd

# ---------------------------------------------------------------------------
# Constants / model metadata
# ---------------------------------------------------------------------------
CASES_PATH = BENCH_DIR / "cases.json"
RESULTS_DIR = BENCH_DIR / "results"
MODEL_PATH = ROOT_DIR / "ml_model" / "models" / "modelo_triaje_dental.joblib"

FEATURE_COLUMNS = [
    "tipo_dolor", "duracion_dolor", "dolor_nocturno", "sensibilidad",
    "hallazgo_visual", "intensidad_dolor", "movilidad_dental",
    "profundidad_lesion", "signos_infeccion", "tratamiento_previo",
    "estado_periodontal", "medicamento_dolor", "alivio_medicamento",
    "dolor_pulsante", "dolor_irradiado", "tiempo_evolucion_dolor",
    "dolor_al_morder", "tiempo_fistula", "tiempo_sintomas_gingivales",
    "sangrado_encias", "mal_aliento", "recesion_encia", "historial_bolsas",
]

AGENT_RUNS = 3

# Precios USD por 1M tokens (input / output). Ollama/local => 0.
PRICES = {
    "qwen2.5:7b": {"input": 0.0, "output": 0.0},
    "llama3.1": {"input": 0.0, "output": 0.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79},  # Groq, ago 2026
}

# ---------------------------------------------------------------------------
# LLM client instrumentado para capturar usage real
# ---------------------------------------------------------------------------
class InstrumentedClient(LLMClient):
    last_usage = None

    def __init__(self, *args, **kwargs):
        # ponytail: reutilizamos inicializacion base; solo forzamos timeout corto
        super().__init__(*args, **kwargs)
        self.client = type(self.client)(base_url=self.base_url, api_key=self.api_key, timeout=30.0)

    def chat(self, system_prompt, user_prompt, temperature=0.2):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        self.last_usage = response.usage
        return response.choices[0].message.content


def check_llm_reachable(base_url):
    """Preflight de 5 segundos para no colgar 21 requests."""
    try:
        httpx.get(f"{base_url.rstrip('/')}/models", timeout=5.0)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_cases():
    with open(CASES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)["cases"]


def load_model():
    data = joblib.load(MODEL_PATH)
    return data["pipeline"]


def token_count_from_usage(usage, text_in, text_out):
    """Devuelve tokens reales si usage los tiene; si no, fallback char/4."""
    real = False
    if usage and getattr(usage, "prompt_tokens", None) and getattr(usage, "completion_tokens", None):
        return usage.prompt_tokens, usage.completion_tokens, True
    return len(text_in) // 4, len(text_out) // 4, False


def estimate_cost(tokens_in, tokens_out, model_name):
    model_name = (model_name or "unknown").lower()
    price = {"input": 0.0, "output": 0.0}
    for key, p in PRICES.items():
        if key in model_name:
            price = p
            break
    return (tokens_in * price["input"] + tokens_out * price["output"]) / 1_000_000


def compare_features(pred, expected):
    correct = 0
    details = {}
    for key in REQUIRED_FEATURES:
        e_val = expected.get(key)
        p_val = pred.get(key)
        # Normalizar ints: ai_agent a veces devuelve int para intensidad_dolor
        if key == "intensidad_dolor":
            try:
                e_val = int(e_val)
                p_val = int(p_val)
            except (TypeError, ValueError):
                pass
        ok = e_val == p_val
        correct += int(ok)
        details[key] = {"expected": e_val, "predicted": p_val, "match": ok}
    return correct, details


def run_agent_case(client, case):
    """Ejecuta una sola llamada al ai_agent."""
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt({"queja": case["question_es"]})

    start = time.perf_counter()
    try:
        raw_text = client.chat(system_prompt, user_prompt)
    except Exception as e:
        return {"error": str(e), "latencia_ms": 0.0, "tokens_in": 0, "tokens_out": 0}
    elapsed_ms = (time.perf_counter() - start) * 1000

    tokens_in, tokens_out, real_tokens = token_count_from_usage(
        client.last_usage, system_prompt + user_prompt, raw_text
    )

    try:
        raw = _extract_json(raw_text)
        pred = _normalize_pre_categorization(raw)
    except Exception as e:
        return {
            "error": f"parse_error: {e}",
            "latencia_ms": round(elapsed_ms, 2),
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "tokens_reales": real_tokens,
            "raw": raw_text,
        }

    correct, details = compare_features(pred, case["ground_truth_features"])
    return {
        "latencia_ms": round(elapsed_ms, 2),
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "tokens_reales": real_tokens,
        "features_correctas": correct,
        "feature_accuracy": round(correct / len(REQUIRED_FEATURES), 4),
        "features_json": pred,
        "details": details,
    }


def run_agent_benchmark(cases, client):
    rows = []
    for case in cases:
        runs = []
        for run in range(1, AGENT_RUNS + 1):
            result = run_agent_case(client, case)
            row = {
                "caso_id": case["id"],
                "disease": case["disease"],
                "run": run,
                "latencia_ms": result.get("latencia_ms", 0.0),
                "tokens_in": result.get("tokens_in", 0),
                "tokens_out": result.get("tokens_out", 0),
                "tokens_reales": result.get("tokens_reales", False),
                "features_correctas": result.get("features_correctas", 0),
                "feature_accuracy": result.get("feature_accuracy", 0.0),
                "features_json": json.dumps(result.get("features_json", {}), ensure_ascii=False) if "features_json" in result else "",
                "error": result.get("error", ""),
            }
            rows.append(row)
            runs.append(result)

        # consistencia entre las 3 corridas
        stable = 0
        for key in REQUIRED_FEATURES:
            vals = [str(r.get("features_json", {}).get(key, "__MISSING__")) for r in runs if "features_json" in r]
            if len(vals) == AGENT_RUNS and len(set(vals)) == 1:
                stable += 1
        # ponytail: agregamos consistencia a la primera fila del caso nada mas
        rows[-AGENT_RUNS]["features_estables"] = stable
        rows[-AGENT_RUNS]["consistencia"] = round(stable / len(REQUIRED_FEATURES), 4)
    return rows


def run_model_benchmark(cases, pipeline):
    rows = []
    for case in cases:
        features = case["ground_truth_features"]
        df = pd.DataFrame([{k: features[k] for k in FEATURE_COLUMNS}])[FEATURE_COLUMNS]

        start = time.perf_counter()
        pred = pipeline.predict(df)[0]
        proba = pipeline.predict_proba(df)[0]
        elapsed_ms = (time.perf_counter() - start) * 1000

        proba_dict = {cls: round(float(p), 4) for cls, p in zip(pipeline.classes_, proba)}
        top_conf = max(proba_dict.values())
        expected = case["expected_treatment"]
        is_derivation = case["is_derivation"]
        acerto = (pred == expected) if not is_derivation else False

        rows.append({
            "caso_id": case["id"],
            "disease": case["disease"],
            "expected_treatment": expected,
            "is_derivation": is_derivation,
            "predicho": pred,
            "acerto": acerto,
            "confianza_top": round(top_conf, 4),
            "latencia_ms": round(elapsed_ms, 2),
            "proba_json": json.dumps(proba_dict, ensure_ascii=False),
        })
    return rows


def write_csv(rows, path, fieldnames):
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def summarize(agent_rows, model_rows, client):
    # Agent metrics
    agent_rows_ok = [r for r in agent_rows if not r.get("error")]
    fa_values = [r["feature_accuracy"] for r in agent_rows_ok]
    lat_values = [r["latencia_ms"] for r in agent_rows_ok]
    cons_values = [r.get("consistencia", 0.0) for r in agent_rows_ok if r.get("run") == 1]
    tokens_in_total = sum(r["tokens_in"] for r in agent_rows_ok)
    tokens_out_total = sum(r["tokens_out"] for r in agent_rows_ok)
    tokens_reales = all(r["tokens_reales"] for r in agent_rows_ok) if agent_rows_ok else False

    # Per-feature accuracy (across all runs)
    # Re-parse features_json from first run per case for per-feature analysis
    per_feature_correct = {k: 0 for k in REQUIRED_FEATURES}
    per_feature_total = {k: 0 for k in REQUIRED_FEATURES}
    for r in agent_rows_ok:
        if r["features_json"]:
            pred = json.loads(r["features_json"])
            case_id = r["caso_id"]
            case = next(c for c in load_cases() if c["id"] == case_id)
            for k in REQUIRED_FEATURES:
                per_feature_total[k] += 1
                if str(pred.get(k)) == str(case["ground_truth_features"].get(k)):
                    per_feature_correct[k] += 1

    per_feature_accuracy = {
        k: round(per_feature_correct[k] / per_feature_total[k], 4) if per_feature_total[k] else 0.0
        for k in REQUIRED_FEATURES
    }

    # Model metrics
    model_rows_ok = [r for r in model_rows if not r.get("error")]
    accuracy = sum(r["acerto"] for r in model_rows_ok) / len(model_rows_ok) if model_rows_ok else 0.0
    acc_by_disease = {}
    for r in model_rows_ok:
        acc_by_disease[r["disease"]] = r["acerto"]
    rf_only = [r for r in model_rows_ok if not r["is_derivation"]]
    accuracy_rf_classes = sum(r["acerto"] for r in rf_only) / len(rf_only) if rf_only else 0.0
    deriv_failures = sum(1 for r in model_rows_ok if r["is_derivation"] and r["acerto"] is False)

    model_cost = 0.0
    agent_cost = estimate_cost(tokens_in_total, tokens_out_total, client.model if client else None)

    summary = {
        "n_casos": len(model_rows_ok),
        "n_corridas_agent": AGENT_RUNS,
        "ai_agent": {
            "feature_accuracy_promedio": round(sum(fa_values) / len(fa_values), 4) if fa_values else 0.0,
            "feature_accuracy_por_feature": per_feature_accuracy,
            "consistencia_promedio": round(sum(cons_values) / len(cons_values), 4) if cons_values else 0.0,
            "latencia_ms_promedio": round(sum(lat_values) / len(lat_values), 2) if lat_values else 0.0,
            "latencia_ms_p50": round(statistics.median(lat_values), 2) if lat_values else 0.0,
            "tokens_in_total": tokens_in_total,
            "tokens_out_total": tokens_out_total,
            "tokens_reales": tokens_reales,
            "costo_estimado_usd": round(agent_cost, 6),
            "errores": len(agent_rows) - len(agent_rows_ok),
        },
        "ml_model": {
            "accuracy": round(accuracy, 4),
            "accuracy_por_enfermedad": acc_by_disease,
            "accuracy_clases_rf": round(accuracy_rf_classes, 4),
            "fallo_derivaciones": deriv_failures,
            "latencia_ms_promedio": round(sum(r["latencia_ms"] for r in model_rows_ok) / len(model_rows_ok), 2) if model_rows_ok else 0.0,
            "costo_estimado_usd": model_cost,
        },
    }
    return summary


def main():
    print("=== Dental Matching Benchmark — Fase A ===")
    print("Cargando casos...")
    cases = load_cases()
    print(f"  Casos: {len(cases)}")

    print("Cargando modelo RF V4...")
    pipeline = load_model()
    print(f"  Clases: {list(pipeline.classes_)}")

    client = None
    agent_rows = []
    print("\nInicializando LLM client (lee ai_agent/.env)...")
    client = InstrumentedClient()
    print(f"  Modelo: {client.model}")
    print(f"  Base URL: {client.base_url}")

    if check_llm_reachable(client.base_url):
        print("\n--- ai_agent benchmark (3 corridas por caso) ---")
        agent_rows = run_agent_benchmark(cases, client)
        print(f"Filas agent: {len(agent_rows)}")
    else:
        print(f"\n[ADVERTENCIA] LLM no alcanzable en {client.base_url} — se omite ai_agent.")
        print("    Para correr ai_agent: inicia Ollama o configura LLM_BASE_URL/LLM_API_KEY.")

    print("\n--- ml_model benchmark (1 corrida por caso) ---")
    model_rows = run_model_benchmark(cases, pipeline)
    print(f"Filas model: {len(model_rows)}")

    print("\n--- Consola / summary ---")
    summary = summarize(agent_rows, model_rows, client)
    print(json.dumps(summary, indent=2, ensure_ascii=False))

    # Write outputs
    print("\n--- Escribiendo resultados ---")
    write_csv(agent_rows, RESULTS_DIR / "agent_results.csv", [
        "caso_id", "disease", "run", "latencia_ms", "tokens_in", "tokens_out",
        "tokens_reales", "features_correctas", "feature_accuracy", "features_estables",
        "consistencia", "features_json", "error",
    ])
    write_csv(model_rows, RESULTS_DIR / "model_results.csv", [
        "caso_id", "disease", "expected_treatment", "is_derivation", "predicho",
        "acerto", "confianza_top", "latencia_ms", "proba_json",
    ])
    with open(RESULTS_DIR / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\nResultados guardados en: {RESULTS_DIR}")

    # Self-check
    if agent_rows:
        assert len(agent_rows) == len(cases) * AGENT_RUNS, f"Esperaba {len(cases) * AGENT_RUNS} filas agent, hay {len(agent_rows)}"
    assert len(model_rows) == len(cases), f"Esperaba {len(cases)} filas model, hay {len(model_rows)}"
    assert (RESULTS_DIR / "summary.json").exists()
    print("[OK] Self-check pasado.")


if __name__ == "__main__":
    main()
