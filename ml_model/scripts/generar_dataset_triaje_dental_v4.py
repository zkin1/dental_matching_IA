"""
Generador de Dataset Sintético para Triaje Dental (v4)
================================================================================
Cambios respecto a v3, basados en revisión de una estudiante de odontología
y en la clasificación periodontal AAP/EFP 2018 (Tonetti, Greenwell y Kornman,
2018; Jepsen, Caton y cols., 2018):

1. NUEVA CLASE: "Destartraje y Pulido Radicular (Periodontitis)"
   -----------------------------------------------------------
   En v3, un estado_periodontal "avanzado" empujaba casi siempre hacia
   Extraccion. Según la odontóloga, eso es incorrecto: periodontitis
   (incluso avanzada) tiene su propio tratamiento -- destartraje + pulido
   radicular + reevaluación a 3 meses -- distinto de una limpieza simple
   (gingivitis: destartraje + educación + reevaluación a 2 semanas) y
   distinto de una extracción (que debería reservarse para dientes
   estructuralmente no viables: movilidad Grado III, compromiso radicular,
   fractura severa). Ahora hay 5 clases en vez de 4.

   Clínicamente, lo que distingue gingivitis de periodontitis no es el
   dolor (la periodontitis en etapas tempranas casi no duele) sino la
   CRONICIDAD de los síntomas y la pérdida de inserción/movilidad. Por
   eso se agregó tiempo_sintomas_gingivales como variable clave de esta
   clase, y no la intensidad de dolor.

2. MOVILIDAD DENTAL SIMPLIFICADA: la odontóloga señaló que un paciente
   normal SÍ puede notar con confianza una movilidad Grado III ("se mueve
   mucho, como si se fuera a caer"), pero NO puede distinguir Grado I de
   Grado II -- eso lo evalúa el dentista con instrumental. La columna
   pasa de 4 a 3 categorías: "Ninguna", "Grado I o II (a evaluar)",
   "Grado III (severa)".

3. NUEVAS VARIABLES DE DOLOR (feedback directo de la odontóloga):
   - medicamento_dolor / alivio_medicamento: qué tomó y si le sirvió.
   - dolor_pulsante: dolor pulsátil/palpitante es un signo clásico de
     pulpitis irreversible o absceso.
   - dolor_irradiado: a dónde se corre el dolor (oído, cabeza, cuello,
     mandíbula) -- relevante para distinguir causas dentarias de dolor
     referido, y como señal de alerta cuando se combina con infección.
   - tiempo_evolucion_dolor: hace cuánto tiempo tiene el dolor.
   - dolor_al_morder: signo clásico de compromiso periapical.
   - tiempo_fistula: hace cuánto notó la fístula/burbuja, si la tiene.

4. NUEVAS VARIABLES PERIODONTALES (para poder detectar periodontitis con
   preguntas, no solo con un dropdown genérico de "estado_periodontal"):
   - tiempo_sintomas_gingivales: cronicidad (el diferenciador clave).
   - sangrado_encias: si sangra solo al cepillarse o también espontáneo
     (sangrado espontáneo es bandera de periodontitis).
   - mal_aliento: halitosis persistente, síntoma clásico de periodontitis.
   - recesion_encia: signo visible de pérdida de inserción.
   - historial_bolsas: si un dentista ya le mencionó "bolsas periodontales".

Referencia clínica: Tonetti MS, Greenwell H, Kornman KS. Staging and
grading of periodontitis: framework and proposal of a new classification
and case definition. J Periodontol. 2018 (resumen consultado vía fuentes
secundarias en español, SEPA/SAP 2018-2020).

Como en v3, cada variable se muestrea con pesos POR CLASE (no reglas
deterministas ni rangos disjuntos), para mantener el solapamiento real
entre clases. Se agrega un 4% de ruido de etiqueta igual que en v3.
"""
import csv
import random
import os
from collections import Counter

random.seed(42)

# ------------------------------------------------------------------
# Configuración general
# ------------------------------------------------------------------
ROWS_PER_CLASS = 600            # 600 * 5 clases = 3000 filas
LABEL_NOISE_RATE = 0.04

CLASSES = [
    "Limpieza / Profilaxis",
    "Tapadera (Resina)",
    "Endodoncia",
    "Destartraje y Pulido Radicular (Periodontitis)",
    "Extraccion",
]

COLUMNS = [
    "id",
    "tipo_dolor", "duracion_dolor", "dolor_nocturno", "sensibilidad",
    "hallazgo_visual", "intensidad_dolor", "movilidad_dental",
    "profundidad_lesion", "signos_infeccion", "tratamiento_previo",
    "estado_periodontal",
    # nuevas de dolor
    "medicamento_dolor", "alivio_medicamento", "dolor_pulsante",
    "dolor_irradiado", "tiempo_evolucion_dolor", "dolor_al_morder",
    "tiempo_fistula",
    # nuevas periodontales
    "tiempo_sintomas_gingivales", "sangrado_encias", "mal_aliento",
    "recesion_encia", "historial_bolsas",
    "tratamiento_target",
]

# ------------------------------------------------------------------
# WEIGHTS: pesos por clase para cada variable categórica.
# ------------------------------------------------------------------
WEIGHTS = {
    "tipo_dolor": {
        "Limpieza / Profilaxis": {"Sin dolor": 55, "Provocado": 40, "Espontaneo": 5},
        "Tapadera (Resina)":     {"Sin dolor": 5,  "Provocado": 80, "Espontaneo": 15},
        "Endodoncia":            {"Sin dolor": 5,  "Provocado": 35, "Espontaneo": 60},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Sin dolor": 60, "Provocado": 30, "Espontaneo": 10},
        "Extraccion":            {"Sin dolor": 20, "Provocado": 30, "Espontaneo": 50},
    },
    "duracion_dolor": {
        "Limpieza / Profilaxis": {"N/A": 60, "Pasa inmediato": 35, "Persistente": 4, "Constante": 1},
        "Tapadera (Resina)":     {"N/A": 5,  "Pasa inmediato": 75, "Persistente": 15, "Constante": 5},
        "Endodoncia":            {"N/A": 3,  "Pasa inmediato": 7,  "Persistente": 45, "Constante": 45},
        "Destartraje y Pulido Radicular (Periodontitis)": {"N/A": 55, "Pasa inmediato": 25, "Persistente": 15, "Constante": 5},
        "Extraccion":            {"N/A": 15, "Pasa inmediato": 5,  "Persistente": 35, "Constante": 45},
    },
    "dolor_nocturno": {
        "Limpieza / Profilaxis": {"Si": 5,  "No": 95},
        "Tapadera (Resina)":     {"Si": 15, "No": 85},
        "Endodoncia":            {"Si": 80, "No": 20},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Si": 8, "No": 92},
        "Extraccion":            {"Si": 55, "No": 45},
    },
    "sensibilidad": {
        "Limpieza / Profilaxis": {"Ninguno": 90, "Solo frio": 8,  "Frio y Calor": 2},
        "Tapadera (Resina)":     {"Ninguno": 35, "Solo frio": 55, "Frio y Calor": 10},
        "Endodoncia":            {"Ninguno": 10, "Solo frio": 15, "Frio y Calor": 75},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Ninguno": 55, "Solo frio": 35, "Frio y Calor": 10},
        "Extraccion":            {"Ninguno": 35, "Solo frio": 25, "Frio y Calor": 40},
    },
    "hallazgo_visual": {
        "Limpieza / Profilaxis": {"Encias rojas o Sangrado": 85, "Mancha u Hoyo": 5,
                                   "Ninguno": 8, "Diente flojo": 1,
                                   "Diente roto o Fractura": 0.5, "Hinchazon": 0.5},
        "Tapadera (Resina)":     {"Encias rojas o Sangrado": 5, "Mancha u Hoyo": 65,
                                   "Ninguno": 25, "Diente flojo": 1,
                                   "Diente roto o Fractura": 3, "Hinchazon": 1},
        "Endodoncia":            {"Encias rojas o Sangrado": 3, "Mancha u Hoyo": 45,
                                   "Ninguno": 30, "Diente flojo": 2,
                                   "Diente roto o Fractura": 15, "Hinchazon": 5},
        "Destartraje y Pulido Radicular (Periodontitis)": {
                                   "Encias rojas o Sangrado": 70, "Mancha u Hoyo": 5,
                                   "Ninguno": 10, "Diente flojo": 10,
                                   "Diente roto o Fractura": 1, "Hinchazon": 4},
        "Extraccion":            {"Encias rojas o Sangrado": 2, "Mancha u Hoyo": 8,
                                   "Ninguno": 5, "Diente flojo": 30,
                                   "Diente roto o Fractura": 35, "Hinchazon": 20},
    },
    # Simplificado a 3 categorías (feedback: paciente no distingue I de II)
    "movilidad_dental": {
        "Limpieza / Profilaxis": {"Ninguna": 80, "Grado I o II (a evaluar)": 19, "Grado III (severa)": 1},
        "Tapadera (Resina)":     {"Ninguna": 92, "Grado I o II (a evaluar)": 7,  "Grado III (severa)": 1},
        "Endodoncia":            {"Ninguna": 60, "Grado I o II (a evaluar)": 37, "Grado III (severa)": 3},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Ninguna": 40, "Grado I o II (a evaluar)": 55, "Grado III (severa)": 5},
        "Extraccion":            {"Ninguna": 5,  "Grado I o II (a evaluar)": 30, "Grado III (severa)": 65},
    },
    "profundidad_lesion": {
        "Limpieza / Profilaxis": {"N/A": 89, "No visible pero con molestia": 1, "Superficial (esmalte)": 8,
                                   "Moderada (dentina)": 2, "Profunda (cerca de pulpa)": 0,
                                   "Compromete raiz": 0},
        "Tapadera (Resina)":     {"N/A": 1, "No visible pero con molestia": 24, "Superficial (esmalte)": 44,
                                   "Moderada (dentina)": 21, "Profunda (cerca de pulpa)": 9,
                                   "Compromete raiz": 1},
        "Endodoncia":            {"N/A": 1, "No visible pero con molestia": 14, "Superficial (esmalte)": 2,
                                   "Moderada (dentina)": 8, "Profunda (cerca de pulpa)": 50,
                                   "Compromete raiz": 25},
        "Destartraje y Pulido Radicular (Periodontitis)": {
                                   "N/A": 65, "No visible pero con molestia": 15, "Superficial (esmalte)": 10,
                                   "Moderada (dentina)": 8, "Profunda (cerca de pulpa)": 2,
                                   "Compromete raiz": 0},
        "Extraccion":            {"N/A": 2, "No visible pero con molestia": 5, "Superficial (esmalte)": 1,
                                   "Moderada (dentina)": 7, "Profunda (cerca de pulpa)": 30,
                                   "Compromete raiz": 55},
    },
    "signos_infeccion": {
        "Limpieza / Profilaxis": {"Ninguno": 98, "Fistula": 1, "Absceso/Hinchazon con fiebre": 1},
        "Tapadera (Resina)":     {"Ninguno": 95, "Fistula": 3, "Absceso/Hinchazon con fiebre": 2},
        "Endodoncia":            {"Ninguno": 65, "Fistula": 25, "Absceso/Hinchazon con fiebre": 10},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Ninguno": 75, "Fistula": 15, "Absceso/Hinchazon con fiebre": 10},
        "Extraccion":            {"Ninguno": 40, "Fistula": 25, "Absceso/Hinchazon con fiebre": 35},
    },
    "tratamiento_previo": {
        "Limpieza / Profilaxis": {"Ninguno": 85, "Restauracion previa": 15, "Endodoncia previa fallida": 0},
        "Tapadera (Resina)":     {"Ninguno": 70, "Restauracion previa": 28, "Endodoncia previa fallida": 2},
        "Endodoncia":            {"Ninguno": 65, "Restauracion previa": 30, "Endodoncia previa fallida": 5},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Ninguno": 60, "Restauracion previa": 30, "Endodoncia previa fallida": 10},
        "Extraccion":            {"Ninguno": 45, "Restauracion previa": 25, "Endodoncia previa fallida": 30},
    },
    "estado_periodontal": {
        "Limpieza / Profilaxis": {"Sano": 25, "Gingivitis (reversible)": 70,
                                   "Periodontitis leve": 5, "Periodontitis avanzada": 0},
        "Tapadera (Resina)":     {"Sano": 60, "Gingivitis (reversible)": 35,
                                   "Periodontitis leve": 5, "Periodontitis avanzada": 0},
        "Endodoncia":            {"Sano": 45, "Gingivitis (reversible)": 30,
                                   "Periodontitis leve": 20, "Periodontitis avanzada": 5},
        "Destartraje y Pulido Radicular (Periodontitis)": {
                                   "Sano": 0, "Gingivitis (reversible)": 20,
                                   "Periodontitis leve": 45, "Periodontitis avanzada": 35},
        "Extraccion":            {"Sano": 10, "Gingivitis (reversible)": 10,
                                   "Periodontitis leve": 25, "Periodontitis avanzada": 55},
    },
    # --- Nuevas variables de dolor ---
    "medicamento_dolor": {
        "Limpieza / Profilaxis": {"Ninguno": 85, "Analgesico comun": 12, "Antibiotico previo": 1, "Otro": 2},
        "Tapadera (Resina)":     {"Ninguno": 70, "Analgesico comun": 27, "Antibiotico previo": 1, "Otro": 2},
        "Endodoncia":            {"Ninguno": 40, "Analgesico comun": 45, "Antibiotico previo": 10, "Otro": 5},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Ninguno": 75, "Analgesico comun": 15, "Antibiotico previo": 5, "Otro": 5},
        "Extraccion":            {"Ninguno": 30, "Analgesico comun": 35, "Antibiotico previo": 25, "Otro": 10},
    },
    "alivio_medicamento": {
        # Sólo tiene sentido si medicamento_dolor != "Ninguno"; ver sample_row.
        "Limpieza / Profilaxis": {"Si": 60, "Parcialmente": 30, "No": 10},
        "Tapadera (Resina)":     {"Si": 55, "Parcialmente": 35, "No": 10},
        "Endodoncia":            {"Si": 20, "Parcialmente": 40, "No": 40},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Si": 50, "Parcialmente": 35, "No": 15},
        "Extraccion":            {"Si": 10, "Parcialmente": 30, "No": 60},
    },
    "dolor_pulsante": {
        "Limpieza / Profilaxis": {"N/A": 55, "Si": 10, "No": 35},
        "Tapadera (Resina)":     {"N/A": 5,  "Si": 25, "No": 70},
        "Endodoncia":            {"N/A": 5,  "Si": 65, "No": 30},
        "Destartraje y Pulido Radicular (Periodontitis)": {"N/A": 50, "Si": 10, "No": 40},
        "Extraccion":            {"N/A": 15, "Si": 55, "No": 30},
    },
    "dolor_irradiado": {
        "Limpieza / Profilaxis": {"N/A": 55, "No se irradia": 40, "Oido": 1, "Cabeza": 1, "Cuello": 1, "Mandibula": 1, "Varios lugares": 1},
        "Tapadera (Resina)":     {"N/A": 5,  "No se irradia": 85, "Oido": 3, "Cabeza": 3, "Cuello": 1, "Mandibula": 3, "Varios lugares": 0},
        "Endodoncia":            {"N/A": 5,  "No se irradia": 55, "Oido": 20, "Cabeza": 7, "Cuello": 2, "Mandibula": 10, "Varios lugares": 1},
        "Destartraje y Pulido Radicular (Periodontitis)": {"N/A": 50, "No se irradia": 45, "Oido": 1, "Cabeza": 1, "Cuello": 1, "Mandibula": 1, "Varios lugares": 1},
        "Extraccion":            {"N/A": 15, "No se irradia": 30, "Oido": 15, "Cabeza": 10, "Cuello": 8, "Mandibula": 15, "Varios lugares": 7},
    },
    "tiempo_evolucion_dolor": {
        "Limpieza / Profilaxis": {"N/A": 55, "Menos de 2 dias": 25, "Una semana": 15, "Mas de una semana": 5},
        "Tapadera (Resina)":     {"N/A": 5,  "Menos de 2 dias": 40, "Una semana": 40, "Mas de una semana": 15},
        "Endodoncia":            {"N/A": 3,  "Menos de 2 dias": 20, "Una semana": 42, "Mas de una semana": 35},
        "Destartraje y Pulido Radicular (Periodontitis)": {"N/A": 40, "Menos de 2 dias": 10, "Una semana": 20, "Mas de una semana": 30},
        "Extraccion":            {"N/A": 15, "Menos de 2 dias": 15, "Una semana": 30, "Mas de una semana": 40},
    },
    "dolor_al_morder": {
        "Limpieza / Profilaxis": {"Si": 5,  "No": 95},
        "Tapadera (Resina)":     {"Si": 55, "No": 45},
        "Endodoncia":            {"Si": 70, "No": 30},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Si": 20, "No": 80},
        "Extraccion":            {"Si": 65, "No": 35},
    },
    "tiempo_fistula": {
        # Sólo tiene sentido si signos_infeccion == "Fistula"; ver sample_row.
        "Limpieza / Profilaxis": {"Reciente": 50, "Antigua": 50},
        "Tapadera (Resina)":     {"Reciente": 60, "Antigua": 40},
        "Endodoncia":            {"Reciente": 60, "Antigua": 40},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Reciente": 55, "Antigua": 45},
        "Extraccion":            {"Reciente": 35, "Antigua": 65},
    },
    # --- Nuevas variables periodontales ---
    "tiempo_sintomas_gingivales": {
        "Limpieza / Profilaxis": {"N/A": 5, "Menos de 2 semanas": 55, "Semanas a meses": 35, "Mas de 6 meses": 5},
        "Tapadera (Resina)":     {"N/A": 60, "Menos de 2 semanas": 20, "Semanas a meses": 15, "Mas de 6 meses": 5},
        "Endodoncia":            {"N/A": 55, "Menos de 2 semanas": 20, "Semanas a meses": 18, "Mas de 6 meses": 7},
        "Destartraje y Pulido Radicular (Periodontitis)": {"N/A": 5, "Menos de 2 semanas": 10, "Semanas a meses": 35, "Mas de 6 meses": 50},
        "Extraccion":            {"N/A": 20, "Menos de 2 semanas": 10, "Semanas a meses": 25, "Mas de 6 meses": 45},
    },
    "sangrado_encias": {
        "Limpieza / Profilaxis": {"No sangran": 10, "Solo al cepillarme": 75, "Espontaneo": 15},
        "Tapadera (Resina)":     {"No sangran": 70, "Solo al cepillarme": 27, "Espontaneo": 3},
        "Endodoncia":            {"No sangran": 65, "Solo al cepillarme": 25, "Espontaneo": 10},
        "Destartraje y Pulido Radicular (Periodontitis)": {"No sangran": 5, "Solo al cepillarme": 35, "Espontaneo": 60},
        "Extraccion":            {"No sangran": 20, "Solo al cepillarme": 30, "Espontaneo": 50},
    },
    "mal_aliento": {
        "Limpieza / Profilaxis": {"Si": 20, "No": 80},
        "Tapadera (Resina)":     {"Si": 10, "No": 90},
        "Endodoncia":            {"Si": 25, "No": 75},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Si": 75, "No": 25},
        "Extraccion":            {"Si": 55, "No": 45},
    },
    "recesion_encia": {
        "Limpieza / Profilaxis": {"Si": 10, "No": 90},
        "Tapadera (Resina)":     {"Si": 8,  "No": 92},
        "Endodoncia":            {"Si": 15, "No": 85},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Si": 60, "No": 40},
        "Extraccion":            {"Si": 45, "No": 55},
    },
    "historial_bolsas": {
        "Limpieza / Profilaxis": {"Si, me lo han dicho": 5,  "No, nunca": 60, "No lo se": 35},
        "Tapadera (Resina)":     {"Si, me lo han dicho": 3,  "No, nunca": 70, "No lo se": 27},
        "Endodoncia":            {"Si, me lo han dicho": 10, "No, nunca": 55, "No lo se": 35},
        "Destartraje y Pulido Radicular (Periodontitis)": {"Si, me lo han dicho": 45, "No, nunca": 15, "No lo se": 40},
        "Extraccion":            {"Si, me lo han dicho": 35, "No, nunca": 30, "No lo se": 35},
    },
}

# intensidad_dolor: normal truncada [1,10] por clase.
INTENSIDAD_PARAMS = {
    "Limpieza / Profilaxis": (2.0, 1.2),
    "Tapadera (Resina)":     (3.5, 1.8),
    "Endodoncia":            (7.5, 1.8),
    "Destartraje y Pulido Radicular (Periodontitis)": (2.5, 1.5),
    "Extraccion":            (6.5, 2.3),
}

# Columnas condicionales: sólo aplican si otra columna tiene cierto valor.
# Fuera de esa condición, se fuerza a "N/A".
CONDITIONAL_COLUMNS = {
    "alivio_medicamento": ("medicamento_dolor", lambda v: v != "Ninguno"),
    "tiempo_fistula": ("signos_infeccion", lambda v: v == "Fistula"),
}


def sample_categorical(column, clase):
    dist = WEIGHTS[column][clase]
    values = list(dist.keys())
    weights = list(dist.values())
    return random.choices(values, weights=weights, k=1)[0]


def sample_intensidad(clase):
    mean, std = INTENSIDAD_PARAMS[clase]
    val = round(random.gauss(mean, std))
    return max(1, min(10, val))


def sample_row(clase):
    row = {}
    for col in WEIGHTS:
        if col in CONDITIONAL_COLUMNS:
            continue  # se resuelven después, dependen de otra columna
        row[col] = sample_categorical(col, clase)

    for col, (dep_col, condition) in CONDITIONAL_COLUMNS.items():
        if condition(row[dep_col]):
            row[col] = sample_categorical(col, clase)
        else:
            row[col] = "N/A"

    row["intensidad_dolor"] = sample_intensidad(clase)
    row["tratamiento_target"] = clase
    return row


def generate_dataset():
    rows = []
    for clase in CLASSES:
        for _ in range(ROWS_PER_CLASS):
            rows.append(sample_row(clase))

    random.shuffle(rows)

    n_noisy_labels = round(len(rows) * LABEL_NOISE_RATE)
    noisy_indices = random.sample(range(len(rows)), n_noisy_labels)
    for idx in noisy_indices:
        clase_original = rows[idx]["tratamiento_target"]
        otras_clases = [c for c in CLASSES if c != clase_original]
        rows[idx]["tratamiento_target"] = random.choice(otras_clases)

    for i, row in enumerate(rows, start=1):
        row["id"] = i
    return rows


def write_csv(rows, filepath):
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    dataset = generate_dataset()
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_dir, "data")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "dataset_triaje_dental_v4.csv")
    write_csv(dataset, output_path)

    tratamientos = Counter(r["tratamiento_target"] for r in dataset)
    print(f"Dataset generado exitosamente: {output_path}")
    print(f"Total filas: {len(dataset)}")
    print("\nDistribución de clases (post label-noise):")
    for tratamiento, count in sorted(tratamientos.items()):
        pct = count / len(dataset) * 100
        print(f"  {tratamiento}: {count} ({pct:.1f}%)")
