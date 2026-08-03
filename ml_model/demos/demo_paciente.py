import gradio as gr
import pandas as pd
import joblib

# Mapeos de paciente a modelo (V4)
map_tipo_dolor = {
    "No tengo dolor": "Sin dolor",
    "Me duele solo cuando como o bebo algo frío o caliente": "Provocado",
    "Me duele solo, sin razón aparente": "Espontaneo"
}

map_duracion_dolor = {
    "No aplica (no tengo dolor)": "N/A",
    "Se me pasa al toque (1-2 segundos)": "Pasa inmediato",
    "Dura varios minutos": "Persistente",
    "Es un dolor que no se me quita": "Constante"
}

map_dolor_nocturno = {
    "Sí": "Si",
    "No": "No"
}

map_sensibilidad = {
    "A nada en particular": "Ninguno",
    "Solo al frío": "Solo frio",
    "Al frío y al calor": "Frio y Calor"
}

map_hallazgo_visual = {
    "Encías rojas o que sangran al cepillarme": "Encias rojas o Sangrado",
    "Una mancha oscura o un hoyito": "Mancha u Hoyo",
    "Nada raro a la vista": "Ninguno",
    "Siento que el diente se mueve": "Diente flojo",
    "El diente está roto o quebrado": "Diente roto o Fractura",
    "Hinchazón en la encía o la cara": "Hinchazon"
}

# Simplificado a 3 categorías en V4
map_movilidad = {
    "No se mueve nada": "Ninguna",
    "Siento que se mueve un poco (leve o moderado)": "Grado I o II (a evaluar)",
    "Se mueve mucho, como si se fuera a caer (grave)": "Grado III (severa)"
}

map_profundidad = {
    "No tengo ningún problema como este": "N/A",
    "No veo nada raro, pero sí tengo molestia": "No visible pero con molestia",
    "Algo leve, superficial": "Superficial (esmalte)",
    "Moderado": "Moderada (dentina)",
    "Siento que es profundo, cerca del nervio": "Profunda (cerca de pulpa)",
    "Siento que es muy grave": "Compromete raiz"
}

map_infeccion = {
    "No, nada de eso": "Ninguno",
    "Veo un granito o burbuja en la encía": "Fistula",
    "Tengo hinchazón fuerte y/o fiebre": "Absceso/Hinchazon con fiebre"
}

map_tratamiento = {
    "No, es la primera vez": "Ninguno",
    "Sí, tuvo un empaste o resina": "Restauracion previa",
    "Sí, tuvo un tratamiento de conducto y sigue doliendo": "Endodoncia previa fallida"
}

map_periodontal = {
    "Normales": "Sano",
    "Un poco rojas o sangran a veces": "Gingivitis (reversible)",
    "Inflamadas y la encía se ha 'bajado'": "Periodontitis leve",
    "Muy inflamadas, mal aliento persistente, dientes que se sienten flojos": "Periodontitis avanzada"
}

# Mapeos de las 12 nuevas preguntas (V4)
map_medicamento = {
    "No he tomado nada": "Ninguno",
    "Sí, un analgésico o antiinflamatorio común (ej. Paracetamol, Ibuprofeno)": "Analgesico comun",
    "Sí, un antibiótico (ej. Amoxicilina)": "Antibiotico previo",
    "Sí, otro tipo de medicamento": "Otro"
}

map_alivio = {
    "No aplica (no he tomado medicamentos)": "N/A",
    "Sí, se me quita por completo": "Si",
    "Sólo se me quita un poco o por un rato": "Parcialmente",
    "No me hace ningún efecto": "No"
}

map_pulsante = {
    "No aplica (no tengo dolor)": "N/A",
    "Sí, siento como latidos o pulsaciones en el diente": "Si",
    "No, es un dolor sordo o constante pero no pulsa": "No"
}

map_irradiado = {
    "No aplica (no tengo dolor)": "N/A",
    "No, el dolor se queda solo en el diente": "No se irradia",
    "Sí, se me corre hacia el oído": "Oido",
    "Sí, se me corre hacia la cabeza": "Cabeza",
    "Sí, se me corre hacia el cuello": "Cuello",
    "Sí, se me corre hacia la mandíbula": "Mandibula",
    "Sí, se me corre a varias de estas zonas": "Varios lugares"
}

map_tiempo_dolor_evo = {
    "No aplica (no tengo dolor)": "N/A",
    "Menos de 2 días": "Menos de 2 dias",
    "Alrededor de una semana": "Una semana",
    "Más de una semana": "Mas de una semana"
}

map_morder = {
    "Sí, me duele al morder o masticar": "Si",
    "No, no me molesta al morder": "No"
}

map_tiempo_fistula = {
    "No aplica (no tengo un granito o burbuja)": "N/A",
    "Es reciente (apareció hace pocos días)": "Reciente",
    "Es antigua (la tengo hace semanas o va y viene)": "Antigua"
}

map_tiempo_gingival = {
    "No aplica / No tengo molestias en las encías": "N/A",
    "Menos de 2 semanas": "Menos de 2 semanas",
    "De varias semanas a meses": "Semanas a meses",
    "Más de 6 meses": "Mas de 6 meses"
}

map_sangrado = {
    "No, mis encías no sangran": "No sangran",
    "Sí, pero solo cuando me cepillo o uso hilo dental": "Solo al cepillarme",
    "Sí, a veces sangran solas (sin cepillarme, por ejemplo al dormir)": "Espontaneo"
}

map_aliento = {
    "Sí, siento mal aliento constante o mal sabor de boca": "Si",
    "No": "No"
}

map_recesion = {
    "Sí, siento o veo que mis dientes se ven más largos o la encía se ha encogido": "Si",
    "No": "No"
}

map_bolsas = {
    "Sí, un dentista me ha dicho antes que tengo 'bolsas periodontales'": "Si, me lo han dicho",
    "No, nunca": "No, nunca",
    "No lo sé": "No lo se"
}

# Traducción de resultados (5 clases en V4)
map_clases_salida = {
    "Limpieza / Profilaxis": "Podrías necesitar una limpieza dental",
    "Tapadera (Resina)": "Podrías necesitar una resina o tapadura",
    "Endodoncia": "Podrías necesitar un tratamiento de conducto (endodoncia)",
    "Destartraje y Pulido Radicular (Periodontitis)": "Podrías necesitar un tratamiento de limpieza profunda para tus encías",
    "Extraccion": "Es importante que un dentista evalúe si el diente se puede salvar"
}

# Columnas en el orden exacto esperado por el modelo
feature_columns = [
    'tipo_dolor', 'duracion_dolor', 'dolor_nocturno', 'sensibilidad', 
    'hallazgo_visual', 'intensidad_dolor', 'movilidad_dental', 
    'profundidad_lesion', 'signos_infeccion', 'tratamiento_previo', 
    'estado_periodontal', 'medicamento_dolor', 'alivio_medicamento', 
    'dolor_pulsante', 'dolor_irradiado', 'tiempo_evolucion_dolor', 
    'dolor_al_morder', 'tiempo_fistula', 'tiempo_sintomas_gingivales', 
    'sangrado_encias', 'mal_aliento', 'recesion_encia', 'historial_bolsas'
]

modelo_path = "ml_model/models/modelo_triaje_dental.joblib"
model_data = None

def get_model():
    global model_data
    if model_data is None:
        model_data = joblib.load(modelo_path)
    return model_data

def procesar_formulario(p1_tipo, p2_duracion, p3_nocturno, p4_sensibilidad, p5_visual,
                        p6_intensidad, p7_movilidad, p8_profundidad, p9_infeccion,
                        p10_tratamiento, p11_periodontal,
                        p12_med, p13_alivio, p14_pulsa, p15_irradiado, p16_tiempo_dolor,
                        p17_morder, p18_fistula, p19_gingival, p20_sangrado, p21_aliento,
                        p22_recesion, p23_bolsas):
    
    val_tipo_dolor = map_tipo_dolor[p1_tipo]
    val_hallazgo_visual = map_hallazgo_visual[p5_visual]
    val_signos_infeccion = map_infeccion[p9_infeccion]

    # --- IMPLEMENTACIÓN DE OVERRIDE DE "BANDERA ROJA" (Confirmada por odontóloga) ---
    if (val_hallazgo_visual == "Hinchazon" and 
        val_signos_infeccion == "Absceso/Hinchazon con fiebre" and 
        val_tipo_dolor != "Sin dolor" and 
        p6_intensidad >= 7):
        
        resultado_html = """
        <div style='padding: 20px; border-radius: 10px; background-color: #fef2f2; border: 1px solid #fecaca; margin-top: 20px;'>
            <h2 style='color: #991b1b; margin-top: 0; font-size: 20px;'>⚠️ Te recomendamos contactar a la clínica de inmediato para una evaluación.</h2>
            <p style='color: #7f1d1d; font-size: 15px; margin-bottom: 0;'>
                <strong>Motivo clínico:</strong> La combinación de dolor de alta intensidad, hinchazón visible en la encía/cara y fiebre es un signo de alerta grave que requiere atención odontológica de emergencia.
            </p>
        </div>
        """
        return resultado_html

    # Lógica condicional para las variables de dolor
    if val_tipo_dolor == "Sin dolor":
        val_duracion = "N/A"
        val_pulsa = "N/A"
        val_irradiado = "N/A"
        val_tiempo_dolor = "N/A"
    else:
        val_duracion = map_duracion_dolor[p2_duracion]
        val_pulsa = map_pulsante[p14_pulsa]
        val_irradiado = map_irradiado[p15_irradiado]
        val_tiempo_dolor = map_tiempo_dolor_evo[p16_tiempo_dolor]

    # Lógica condicional para medicamento y alivio
    val_med = map_medicamento[p12_med]
    if val_med == "Ninguno":
        val_alivio = "N/A"
    else:
        val_alivio = map_alivio[p13_alivio]

    # Lógica condicional para fistula y su tiempo
    if val_signos_infeccion != "Fistula":
        val_fistula = "N/A"
    else:
        val_fistula = map_tiempo_fistula[p18_fistula]

    # Lógica condicional para profundidad_lesion
    val_profundidad = map_profundidad[p8_profundidad]
    if val_profundidad == "N/A":
        if val_tipo_dolor != "Sin dolor" or val_hallazgo_visual != "Ninguno":
            val_profundidad = "No visible pero con molestia"

    # Crear el diccionario de datos mapeados
    input_data = {
        'tipo_dolor': [val_tipo_dolor],
        'duracion_dolor': [val_duracion],
        'dolor_nocturno': [map_dolor_nocturno[p3_nocturno]],
        'sensibilidad': [map_sensibilidad[p4_sensibilidad]],
        'hallazgo_visual': [val_hallazgo_visual],
        'intensidad_dolor': [p6_intensidad],
        'movilidad_dental': [map_movilidad[p7_movilidad]],
        'profundidad_lesion': [val_profundidad],
        'signos_infeccion': [val_signos_infeccion],
        'tratamiento_previo': [map_tratamiento[p10_tratamiento]],
        'estado_periodontal': [map_periodontal[p11_periodontal]],
        'medicamento_dolor': [val_med],
        'alivio_medicamento': [val_alivio],
        'dolor_pulsante': [val_pulsa],
        'dolor_irradiado': [val_irradiado],
        'tiempo_evolucion_dolor': [val_tiempo_dolor],
        'dolor_al_morder': [map_morder[p17_morder]],
        'tiempo_fistula': [val_fistula],
        'tiempo_sintomas_gingivales': [map_tiempo_gingival[p19_gingival]],
        'sangrado_encias': [map_sangrado[p20_sangrado]],
        'mal_aliento': [map_aliento[p21_aliento]],
        'recesion_encia': [map_recesion[p22_recesion]],
        'historial_bolsas': [map_bolsas[p23_bolsas]]
    }
    
    md = get_model()
    pipe = md['pipeline']
    df = pd.DataFrame(input_data)[feature_columns]
    
    pred_class_tecnica = pipe.predict(df)[0]
    probs = pipe.predict_proba(df)[0]
    
    clase_amigable = map_clases_salida.get(pred_class_tecnica, pred_class_tecnica)
    
    sorted_probs = sorted(probs, reverse=True)
    diff = sorted_probs[0] - sorted_probs[1]
    diff_pct = diff * 100
    
    if diff_pct > 40:
        confianza_msg = "Esto es bastante claro según lo que nos cuentas."
    elif diff_pct > 20:
        confianza_msg = "Esto es lo más probable, pero el dentista confirmará en tu cita."
    else:
        confianza_msg = "Tu caso tiene varias posibilidades y conviene que te vea un dentista pronto para aclararlo."
        
    resultado_html = f"""
    <div style='padding: 20px; border-radius: 10px; background-color: #f0fdf4; border: 1px solid #bbf7d0;'>
        <h2 style='color: #166534; margin-top: 0;'>{clase_amigable}</h2>
        <p style='color: #15803d; font-size: 16px;'>{confianza_msg}</p>
    </div>
    <div style='margin-top: 20px; padding: 15px; border-radius: 8px; background-color: #fffbeb; border: 1px solid #fde68a;'>
        <p style='color: #92400e; font-size: 14px; margin: 0;'>
            <strong>⚠️ Nota importante:</strong> Esto es solo una orientación inicial para tu cita, no un diagnóstico. 
            El tratamiento final lo decide tu dentista después de revisarte en persona.
        </p>
    </div>
    """
    
    return resultado_html

with gr.Blocks(title="Cuéntanos qué sientes 🦷") as demo:
    gr.Markdown("# Cuéntanos qué sientes 🦷")
    gr.Markdown("Por favor, responde estas preguntas para orientarte mejor antes de tu cita con el odontólogo.")
    
    with gr.Column(elem_id="formulario"):
        
        with gr.Group():
            gr.Markdown("### 🦷 Sección 1: Dolor y Sensibilidad")
            p1 = gr.Radio(choices=list(map_tipo_dolor.keys()), label="1. ¿Cómo describirías tu dolor?", value="No tengo dolor")
            p2 = gr.Radio(choices=list(map_duracion_dolor.keys()), label="2. Cuando te duele, ¿cuánto dura el dolor?", value="No aplica (no tengo dolor)")
            p3 = gr.Radio(choices=list(map_dolor_nocturno.keys()), label="3. ¿El dolor te despierta en la noche o empeora al acostarte?", value="No")
            p4 = gr.Radio(choices=list(map_sensibilidad.keys()), label="4. ¿A qué es sensible tu diente?", value="A nada en particular")
            p6 = gr.Slider(minimum=1, maximum=10, step=1, label="6. En una escala del 1 al 10, ¿qué tan fuerte es el dolor? (1 = muy leve, 10 = insoportable)", value=1)
            
            # Nuevas preguntas de dolor (V4)
            p14 = gr.Radio(choices=list(map_pulsante.keys()), label="14. ¿Sientes que el dolor palpita o pulsa?", value="No aplica (no tengo dolor)")
            p15 = gr.Dropdown(choices=list(map_irradiado.keys()), label="15. ¿El dolor se corre o viaja a otras partes de tu cara/cabeza?", value="No aplica (no tengo dolor)")
            p16 = gr.Radio(choices=list(map_tiempo_dolor_evo.keys()), label="16. ¿Hace cuánto tiempo tienes este dolor?", value="No aplica (no tengo dolor)")
            p17 = gr.Radio(choices=list(map_morder.keys()), label="17. ¿Te molesta o duele cuando muerdes o masticas comida?", value="No, no me molesta al morder")

        with gr.Group():
            gr.Markdown("### 🔍 Sección 2: Aspecto Visual e Infección")
            p5 = gr.Dropdown(choices=list(map_hallazgo_visual.keys()), label="5. ¿Notas algo raro al mirarte o tocarte el diente/encía?", value="Nada raro a la vista")
            p9 = gr.Radio(choices=list(map_infeccion.keys()), label="9. ¿Tienes hinchazón fuerte con fiebre, o ves como un granito/burbuja en la encía?", value="No, nada de eso")
            
            # Nueva de infección (V4)
            p18 = gr.Radio(choices=list(map_tiempo_fistula.keys()), label="18. Si ves un granito/burbuja en la encía, ¿hace cuánto tiempo apareció?", value="No aplica (no tengo un granito o burbuja)")

        with gr.Group():
            gr.Markdown("### 💊 Sección 3: Medicamentos y Antecedentes")
            p10 = gr.Radio(choices=list(map_tratamiento.keys()), label="10. ¿Este diente ya tuvo algún tratamiento antes?", value="No, es la primera vez")
            
            # Nuevas de medicamentos (V4)
            p12 = gr.Radio(choices=list(map_medicamento.keys()), label="12. ¿Has tomado algún medicamento para calmar el dolor?", value="No he tomado nada")
            p13 = gr.Radio(choices=list(map_alivio.keys()), label="13. Si tomaste medicamentos, ¿te calmaron el dolor?", value="No aplica (no he tomado medicamentos)")

        with gr.Group():
            gr.Markdown("### 🩸 Sección 4: Encías y Movilidad")
            p7 = gr.Radio(choices=list(map_movilidad.keys()), label="7. ¿Sientes que el diente se mueve?", value="No se mueve nada")
            p8 = gr.Dropdown(choices=list(map_profundidad.keys()), label="8. ¿Qué tan grave sientes tú que es el problema?", value="No tengo ningún problema como este")
            p11 = gr.Radio(choices=list(map_periodontal.keys()), label="11. ¿Cómo están tus encías en general?", value="Normales")
            
            # Nuevas periodontales (V4)
            p19 = gr.Radio(choices=list(map_tiempo_gingival.keys()), label="19. Si tienes molestias en las encías, ¿hace cuánto tiempo comenzaron?", value="No aplica / No tengo molestias en las encías")
            p20 = gr.Radio(choices=list(map_sangrado.keys()), label="20. ¿Tus encías sangran al cepillarte o de forma espontánea?", value="No, mis encías no sangran")
            p21 = gr.Radio(choices=list(map_aliento.keys()), label="21. ¿Sientes mal aliento o mal sabor de boca de manera persistente?", value="No")
            p22 = gr.Radio(choices=list(map_recesion.keys()), label="22. ¿Sientes que tus encías se han encogido o tus dientes se ven más largos?", value="No")
            p23 = gr.Radio(choices=list(map_bolsas.keys()), label="23. ¿Te ha comentado algún dentista anteriormente que tienes 'bolsas en las encías' (bolsas periodontales)?", value="No, nunca")

    # --- Lógica de dinamismo de visibilidad ---
    def actualizar_visibilidad_dolor(p1_val):
        vis = p1_val != "No tengo dolor"
        return [
            gr.update(visible=vis),  # p2
            gr.update(visible=vis),  # p14
            gr.update(visible=vis),  # p15
            gr.update(visible=vis)   # p16
        ]
    p1.change(fn=actualizar_visibilidad_dolor, inputs=p1, outputs=[p2, p14, p15, p16])

    def actualizar_visibilidad_alivio(p12_val):
        return gr.update(visible=(p12_val != "No he tomado nada"))
    p12.change(fn=actualizar_visibilidad_alivio, inputs=p12, outputs=p13)

    def actualizar_visibilidad_fistula(p9_val):
        return gr.update(visible=(p9_val == "Veo un granito o burbuja en la encía"))
    p9.change(fn=actualizar_visibilidad_fistula, inputs=p9, outputs=p18)
        
    btn_submit = gr.Button("Ver mi orientación", variant="primary", size="lg")
    resultado_ui = gr.HTML()
    
    inputs_list = [
        p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11,
        p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23
    ]
    
    btn_submit.click(fn=procesar_formulario, inputs=inputs_list, outputs=resultado_ui)
    
    gr.Markdown("---")
    gr.Markdown("### Probar con un ejemplo:")
    
    # Ejemplos actualizados para V4
    ejemplo_limpieza = [
        "Me duele solo cuando como o bebo algo frío o caliente",
        "Se me pasa al toque (1-2 segundos)",
        "No",
        "Solo al frío",
        "Encías rojas o que sangran al cepillarme",
        3,
        "No se mueve nada",
        "No tengo ningún problema como este",
        "No, nada de eso",
        "No, es la primera vez",
        "Un poco rojas o sangran a veces",
        "No he tomado nada",
        "No aplica (no he tomado medicamentos)",
        "No, es un dolor sordo o constante pero no pulsa",
        "No, el dolor se queda solo en el diente",
        "Menos de 2 días",
        "No, no me molesta al morder",
        "No aplica (no tengo un granito o burbuja)",
        "Menos de 2 semanas",
        "Sí, pero solo cuando me cepillo o uso hilo dental",
        "No",
        "No",
        "No, nunca"
    ]
    
    ejemplo_extraccion = [
        "Me duele solo, sin razón aparente",
        "Es un dolor que no se me quita",
        "Sí",
        "Al frío y al calor",
        "El diente está roto o quebrado",
        9,
        "Se mueve mucho, como si se fuera a caer (grave)",
        "Siento que es muy grave",
        "Tengo hinchazón fuerte y/o fiebre",
        "Sí, tuvo un empaste o resina",
        "Muy inflamadas, mal aliento persistente, dientes que se sienten flojos",
        "Sí, un analgésico o antiinflamatorio común (ej. Paracetamol, Ibuprofeno)",
        "No me hace ningún efecto",
        "Sí, siento como latidos o pulsaciones en el diente",
        "Sí, se me corre hacia la mandíbula",
        "Más de una semana",
        "Sí, me duele al morder o masticar",
        "No aplica (no tengo un granito o burbuja)",
        "Más de 6 meses",
        "Sí, a veces sangran solas (sin cepillarme, por ejemplo al dormir)",
        "Sí, siento mal aliento constante o mal sabor de boca",
        "Sí, siento o veo que mis dientes se ven más largos o la encía se ha encogido",
        "Sí, un dentista me ha dicho antes que tengo 'bolsas periodontales'"
    ]
    
    ejemplo_tapadera = [
        "Me duele solo cuando como o bebo algo frío o caliente",
        "Se me pasa al toque (1-2 segundos)",
        "No",
        "Solo al frío",
        "Una mancha oscura o un hoyito",
        4,
        "No se mueve nada",
        "Algo leve, superficial",
        "No, nada de eso",
        "No, es la primera vez",
        "Normales",
        "No he tomado nada",
        "No aplica (no he tomado medicamentos)",
        "No, es un dolor sordo o constante pero no pulsa",
        "No, el dolor se queda solo en el diente",
        "Alrededor de una semana",
        "No, no me molesta al morder",
        "No aplica (no tengo un granito o burbuja)",
        "No aplica / No tengo molestias en las encías",
        "No, mis encías no sangran",
        "No",
        "No",
        "No, nunca"
    ]
    
    ejemplo_periodontitis = [
        "No tengo dolor",
        "No aplica (no tengo dolor)",
        "No",
        "A nada en particular",
        "Encías rojas o que sangran al cepillarme",
        1,
        "Siento que se mueve un poco (leve o moderado)",
        "No tengo ningún problema como este",
        "No, nada de eso",
        "No, es la primera vez",
        "Inflamadas y la encía se ha 'bajado'",
        "No he tomado nada",
        "No aplica (no he tomado medicamentos)",
        "No aplica (no tengo dolor)",
        "No aplica (no tengo dolor)",
        "No aplica (no tengo dolor)",
        "No, no me molesta al morder",
        "No aplica (no tengo un granito o burbuja)",
        "Más de 6 meses",
        "Sí, a veces sangran solas (sin cepillarme, por ejemplo al dormir)",
        "Sí, siento mal aliento constante o mal sabor de boca",
        "Sí, siento o veo que mis dientes se ven más largos o la encía se ha encogido",
        "Sí, un dentista me ha dicho antes que tengo 'bolsas periodontales'"
    ]
    
    gr.Examples(
        examples=[ejemplo_limpieza, ejemplo_extraccion, ejemplo_tapadera, ejemplo_periodontitis],
        inputs=inputs_list,
        outputs=resultado_ui,
        fn=procesar_formulario,
        run_on_click=True,
        label="Cargar caso de paciente:"
    )

if __name__ == "__main__":
    demo.launch(theme=gr.themes.Soft())
