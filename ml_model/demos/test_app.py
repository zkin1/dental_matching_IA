import gradio as gr
import pandas as pd
import joblib

# Opciones de las 11 features clásicas
opciones_tipo_dolor = ["Sin dolor", "Provocado", "Espontaneo"]
opciones_duracion_dolor = ["N/A", "Pasa inmediato", "Persistente", "Constante"]
opciones_dolor_nocturno = ["Si", "No"]
opciones_sensibilidad = ["Ninguno", "Solo frio", "Frio y Calor"]
opciones_hallazgo_visual = [
    "Encias rojas o Sangrado", "Mancha u Hoyo", "Ninguno", "Diente flojo",
    "Diente roto o Fractura", "Hinchazon"
]
opciones_movilidad_dental = ["Ninguna", "Grado I o II (a evaluar)", "Grado III (severa)"]
opciones_profundidad_lesion = [
    "N/A", "No visible pero con molestia", "Superficial (esmalte)",
    "Moderada (dentina)", "Profunda (cerca de pulpa)", "Compromete raiz"
]
opciones_signos_infeccion = ["Ninguno", "Fistula", "Absceso/Hinchazon con fiebre"]
opciones_tratamiento_previo = ["Ninguno", "Restauracion previa", "Endodoncia previa fallida"]
opciones_estado_periodontal = [
    "Sano", "Gingivitis (reversible)", "Periodontitis leve", "Periodontitis avanzada"
]

# Opciones de las 12 features adicionales del V4
opciones_medicamento_dolor = ["Ninguno", "Analgesico comun", "Antibiotico previo", "Otro"]
opciones_alivio_medicamento = ["N/A", "Si", "Parcialmente", "No"]
opciones_dolor_pulsante = ["N/A", "Si", "No"]
opciones_dolor_irradiado = [
    "N/A", "No se irradia", "Oido", "Cabeza", "Cuello", "Mandibula", "Varios lugares"
]
opciones_tiempo_evolucion_dolor = ["N/A", "Menos de 2 dias", "Una semana", "Mas de una semana"]
opciones_dolor_al_morder = ["Si", "No"]
opciones_tiempo_fistula = ["N/A", "Reciente", "Antigua"]
opciones_tiempo_sintomas_gingivales = [
    "N/A", "Menos de 2 semanas", "Semanas a meses", "Mas de 6 meses"
]
opciones_sangrado_encias = ["No sangran", "Solo al cepillarme", "Espontaneo"]
opciones_mal_aliento = ["Si", "No"]
opciones_recesion_encia = ["Si", "No"]
opciones_historial_bolsas = ["Si, me lo han dicho", "No, nunca", "No lo se"]

# Columnas en el orden exacto esperado por el modelo V4
feature_columns = [
    'tipo_dolor', 'duracion_dolor', 'dolor_nocturno', 'sensibilidad',
    'hallazgo_visual', 'intensidad_dolor', 'movilidad_dental',
    'profundidad_lesion', 'signos_infeccion', 'tratamiento_previo',
    'estado_periodontal', 'medicamento_dolor', 'alivio_medicamento',
    'dolor_pulsante', 'dolor_irradiado', 'tiempo_evolucion_dolor',
    'dolor_al_morder', 'tiempo_fistula', 'tiempo_sintomas_gingivales',
    'sangrado_encias', 'mal_aliento', 'recesion_encia', 'historial_bolsas'
]

# Cachear la carga del modelo
modelo_path = "ml_model/models/modelo_triaje_dental.joblib"
model_data = None


def get_model():
    global model_data
    if model_data is None:
        model_data = joblib.load(modelo_path)
    return model_data


def predecir(tipo_dolor, duracion_dolor, dolor_nocturno, sensibilidad,
             hallazgo_visual, intensidad_dolor, movilidad_dental,
             profundidad_lesion, signos_infeccion, tratamiento_previo,
             estado_periodontal, medicamento_dolor, alivio_medicamento,
             dolor_pulsante, dolor_irradiado, tiempo_evolucion_dolor,
             dolor_al_morder, tiempo_fistula, tiempo_sintomas_gingivales,
             sangrado_encias, mal_aliento, recesion_encia, historial_bolsas):

    md = get_model()
    pipe = md['pipeline']
    classes = pipe.classes_

    input_data = {
        'tipo_dolor': [tipo_dolor],
        'duracion_dolor': [duracion_dolor],
        'dolor_nocturno': [dolor_nocturno],
        'sensibilidad': [sensibilidad],
        'hallazgo_visual': [hallazgo_visual],
        'intensidad_dolor': [intensidad_dolor],
        'movilidad_dental': [movilidad_dental],
        'profundidad_lesion': [profundidad_lesion],
        'signos_infeccion': [signos_infeccion],
        'tratamiento_previo': [tratamiento_previo],
        'estado_periodontal': [estado_periodontal],
        'medicamento_dolor': [medicamento_dolor],
        'alivio_medicamento': [alivio_medicamento],
        'dolor_pulsante': [dolor_pulsante],
        'dolor_irradiado': [dolor_irradiado],
        'tiempo_evolucion_dolor': [tiempo_evolucion_dolor],
        'dolor_al_morder': [dolor_al_morder],
        'tiempo_fistula': [tiempo_fistula],
        'tiempo_sintomas_gingivales': [tiempo_sintomas_gingivales],
        'sangrado_encias': [sangrado_encias],
        'mal_aliento': [mal_aliento],
        'recesion_encia': [recesion_encia],
        'historial_bolsas': [historial_bolsas]
    }

    df = pd.DataFrame(input_data)[feature_columns]

    pred_class = pipe.predict(df)[0]
    probs = pipe.predict_proba(df)[0]

    prob_dict = {classes[i]: float(probs[i]) for i in range(len(classes))}

    sorted_probs = sorted(probs, reverse=True)
    warning_text = ""
    if len(sorted_probs) >= 2:
        diff = sorted_probs[0] - sorted_probs[1]
        if diff <= 0.21:
            sorted_classes = sorted(prob_dict.items(), key=lambda item: item[1], reverse=True)
            clase1 = sorted_classes[0][0]
            clase2 = sorted_classes[1][0]
            warning_text = f"<h3>⚠️ Caso límite - diferencia entre {clase1} y {clase2} es baja, se recomienda evaluación presencial prioritaria</h3>"

    return pred_class, prob_dict, warning_text


# Interfaz Gradio
with gr.Blocks(title="Prueba Modelo de Triaje Dental V4") as demo:
    gr.Markdown("# 🦷 Prueba Local del Modelo de Triaje Dental V4")
    gr.Markdown("Ingresa los síntomas del paciente para ver la predicción y las probabilidades.")

    with gr.Row():
        with gr.Column():
            tipo_dolor_in = gr.Dropdown(choices=opciones_tipo_dolor, label="tipo_dolor", value="Sin dolor")
            duracion_dolor_in = gr.Dropdown(choices=opciones_duracion_dolor, label="duracion_dolor", value="N/A")
            dolor_nocturno_in = gr.Dropdown(choices=opciones_dolor_nocturno, label="dolor_nocturno", value="No")
            sensibilidad_in = gr.Dropdown(choices=opciones_sensibilidad, label="sensibilidad", value="Ninguno")
            hallazgo_visual_in = gr.Dropdown(choices=opciones_hallazgo_visual, label="hallazgo_visual", value="Ninguno")
            intensidad_dolor_in = gr.Slider(minimum=1, maximum=10, step=1, label="intensidad_dolor", value=1)
        with gr.Column():
            movilidad_dental_in = gr.Dropdown(choices=opciones_movilidad_dental, label="movilidad_dental", value="Ninguna")
            profundidad_lesion_in = gr.Dropdown(choices=opciones_profundidad_lesion, label="profundidad_lesion", value="N/A")
            signos_infeccion_in = gr.Dropdown(choices=opciones_signos_infeccion, label="signos_infeccion", value="Ninguno")
            tratamiento_previo_in = gr.Dropdown(choices=opciones_tratamiento_previo, label="tratamiento_previo", value="Ninguno")
            estado_periodontal_in = gr.Dropdown(choices=opciones_estado_periodontal, label="estado_periodontal", value="Sano")

    with gr.Row():
        with gr.Column():
            medicamento_dolor_in = gr.Dropdown(choices=opciones_medicamento_dolor, label="medicamento_dolor", value="Ninguno")
            alivio_medicamento_in = gr.Dropdown(choices=opciones_alivio_medicamento, label="alivio_medicamento", value="N/A")
            dolor_pulsante_in = gr.Dropdown(choices=opciones_dolor_pulsante, label="dolor_pulsante", value="N/A")
            dolor_irradiado_in = gr.Dropdown(choices=opciones_dolor_irradiado, label="dolor_irradiado", value="N/A")
            tiempo_evolucion_dolor_in = gr.Dropdown(choices=opciones_tiempo_evolucion_dolor, label="tiempo_evolucion_dolor", value="N/A")
            dolor_al_morder_in = gr.Dropdown(choices=opciones_dolor_al_morder, label="dolor_al_morder", value="No")
        with gr.Column():
            tiempo_fistula_in = gr.Dropdown(choices=opciones_tiempo_fistula, label="tiempo_fistula", value="N/A")
            tiempo_sintomas_gingivales_in = gr.Dropdown(choices=opciones_tiempo_sintomas_gingivales, label="tiempo_sintomas_gingivales", value="N/A")
            sangrado_encias_in = gr.Dropdown(choices=opciones_sangrado_encias, label="sangrado_encias", value="No sangran")
            mal_aliento_in = gr.Dropdown(choices=opciones_mal_aliento, label="mal_aliento", value="No")
            recesion_encia_in = gr.Dropdown(choices=opciones_recesion_encia, label="recesion_encia", value="No")
            historial_bolsas_in = gr.Dropdown(choices=opciones_historial_bolsas, label="historial_bolsas", value="No, nunca")

    btn = gr.Button("Predecir tratamiento", variant="primary")

    with gr.Row():
        with gr.Column():
            pred_out = gr.Textbox(label="Clase Predicha")
            warning_out = gr.HTML()
        with gr.Column():
            prob_out = gr.Label(label="Probabilidades", num_top_classes=4)

    inputs = [
        tipo_dolor_in, duracion_dolor_in, dolor_nocturno_in, sensibilidad_in,
        hallazgo_visual_in, intensidad_dolor_in, movilidad_dental_in,
        profundidad_lesion_in, signos_infeccion_in, tratamiento_previo_in,
        estado_periodontal_in, medicamento_dolor_in, alivio_medicamento_in,
        dolor_pulsante_in, dolor_irradiado_in, tiempo_evolucion_dolor_in,
        dolor_al_morder_in, tiempo_fistula_in, tiempo_sintomas_gingivales_in,
        sangrado_encias_in, mal_aliento_in, recesion_encia_in, historial_bolsas_in
    ]
    outputs = [pred_out, prob_out, warning_out]

    btn.click(fn=predecir, inputs=inputs, outputs=outputs)

    gr.Markdown("### Ejemplos Rápidos")
    gr.Examples(
        examples=[
            [
                "Provocado", "N/A", "No", "Ninguno", "Encias rojas o Sangrado", 4,
                "Ninguna", "N/A", "Ninguno", "Ninguno", "Gingivitis (reversible)",
                "Ninguno", "N/A", "N/A", "N/A", "N/A", "No", "N/A", "N/A",
                "Solo al cepillarme", "Si", "No", "No, nunca"
            ],
            [
                "Espontaneo", "N/A", "Si", "Ninguno", "Diente roto o Fractura", 9,
                "Grado I o II (a evaluar)", "Compromete raiz", "Absceso/Hinchazon con fiebre",
                "Restauracion previa", "Periodontitis leve",
                "Analgesico comun", "Parcialmente", "Si", "Cabeza", "Mas de una semana",
                "Si", "Reciente", "Semanas a meses", "Espontaneo", "Si", "Si", "Si, me lo han dicho"
            ],
            [
                "Espontaneo", "Persistente", "No", "Frio y Calor", "Ninguno", 10,
                "Grado I o II (a evaluar)", "Profunda (cerca de pulpa)", "Fistula", "Ninguno",
                "Periodontitis leve", "Ninguno", "N/A", "N/A", "No se irradia", "Una semana",
                "No", "Antigua", "Mas de 6 meses", "No sangran", "No", "No", "No, nunca"
            ]
        ],
        inputs=inputs,
        outputs=outputs,
        fn=predecir,
        run_on_click=True
    )

if __name__ == "__main__":
    demo.launch()
