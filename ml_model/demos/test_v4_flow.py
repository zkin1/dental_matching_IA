import sys
import os

# Configurar codificación en Windows
sys.stdout.reconfigure(encoding="utf-8")

# Asegurar path
sys.path.append(os.path.abspath("ml_model"))
from demo_paciente import procesar_formulario, ejemplo_limpieza, ejemplo_extraccion, ejemplo_tapadera, ejemplo_periodontitis

print("--- Ejecutando pruebas sobre procesar_formulario (V4) ---")

# Probar Ejemplo 1: Limpieza
res1 = procesar_formulario(*ejemplo_limpieza)
print("\n[Ejemplo 1 (Limpieza / Profilaxis)]")
print(res1)

# Probar Ejemplo 2: Extracción
res2 = procesar_formulario(*ejemplo_extraccion)
print("\n[Ejemplo 2 (Extraccion)]")
print(res2)

# Probar Ejemplo 3: Tapadera
res3 = procesar_formulario(*ejemplo_tapadera)
print("\n[Ejemplo 3 (Tapadera (Resina))]")
print(res3)

# Probar Ejemplo 4: Periodontitis
res4 = procesar_formulario(*ejemplo_periodontitis)
print("\n[Ejemplo 4 (Periodontitis)]")
print(res4)

# Probar Override de Bandera Roja
# Condiciones para Bandera Roja:
# tipo_dolor != "No tengo dolor"
# hallazgo_visual == "Hinchazón en la encía o la cara"
# signos_infeccion == "Tengo hinchazón fuerte y/o fiebre"
# intensidad_dolor >= 7
ejemplo_bandera_roja = list(ejemplo_extraccion) # Copiar de extracción
ejemplo_bandera_roja[0] = "Me duele solo, sin razón aparente" # tipo_dolor
ejemplo_bandera_roja[4] = "Hinchazón en la encía o la cara" # hallazgo_visual
ejemplo_bandera_roja[5] = 8 # intensidad_dolor
ejemplo_bandera_roja[8] = "Tengo hinchazón fuerte y/o fiebre" # signos_infeccion

res_br = procesar_formulario(*ejemplo_bandera_roja)
print("\n[Caso Especial: Bandera Roja]")
print(res_br)

# --- Caso del Bug Reportado (profundidad_lesion sobrecargado) ---
# Paciente con dolor provocado por frío que se pasa en 1-2 seg (pulpitis reversible),
# sensibilidad solo al frío, no ve nada raro a simple vista, marca
# "No tengo ningún problema como este" en P8.
# Antes del fix: predecía Limpieza (porque N/A aplastaba la evidencia).
# Después del fix: el override convierte N/A -> "No visible pero con molestia"
# porque tiene dolor, y debería predecir Tapadera (Resina).
ejemplo_bug_profundidad = [
    "Me duele solo cuando como o bebo algo frío o caliente",   # P1: dolor provocado
    "Se me pasa al toque (1-2 segundos)",                      # P2: pasa inmediato
    "No",                                                       # P3: sin dolor nocturno
    "Solo al frío",                                             # P4: sensible al frío
    "Nada raro a la vista",                                     # P5: sin hallazgo visual
    3,                                                          # P6: intensidad baja
    "No se mueve nada",                                         # P7: sin movilidad
    "No tengo ningún problema como este",                       # P8: N/A -> override a "No visible pero con molestia"
    "No, nada de eso",                                          # P9: sin infección
    "No, es la primera vez",                                    # P10: sin tratamiento previo
    "Normales",                                                 # P11: encías sanas
    "No he tomado nada",                                        # P12: sin medicamento
    "No aplica (no he tomado medicamentos)",                    # P13: alivio N/A
    "No, es un dolor sordo o constante pero no pulsa",          # P14: no pulsa
    "No, el dolor se queda solo en el diente",                  # P15: no irradiado
    "Menos de 2 días",                                          # P16: reciente
    "No, no me molesta al morder",                              # P17: sin dolor al morder
    "No aplica (no tengo un granito o burbuja)",                # P18: sin fístula
    "No aplica / No tengo molestias en las encías",             # P19: sin síntomas gingivales
    "No, mis encías no sangran",                                # P20: sin sangrado
    "No",                                                       # P21: sin mal aliento
    "No",                                                       # P22: sin recesión
    "No, nunca"                                                 # P23: sin historial bolsas
]

res_bug = procesar_formulario(*ejemplo_bug_profundidad)
print("\n[Caso Bug Fix: Dolor provocado + frío + sin hallazgo + P8 'No tengo problema']")
print(res_bug)

# Aserciones para confirmar que todo es correcto
assert "limpieza" in res1.lower(), f"Ejemplo 1 falló: {res1}"
assert "diente se puede salvar" in res2 or "extraccion" in res2.lower(), f"Ejemplo 2 falló: {res2}"
assert "resina o tapadura" in res3 or "tapadera" in res3.lower(), f"Ejemplo 3 falló: {res3}"
assert "limpieza profunda" in res4 or "periodontitis" in res4.lower(), f"Ejemplo 4 falló: {res4}"
assert "contactar a la clínica de inmediato" in res_br, f"Bandera roja falló: {res_br}"
assert "resina o tapadura" in res_bug.lower() or "tapadera" in res_bug.lower(), \
    f"Bug fix falló — se esperaba Tapadera (Resina) pero se obtuvo: {res_bug}"

print("\n🎉 ¡Todas las pruebas de flujo pasaron exitosamente (incluyendo bug fix)!")
