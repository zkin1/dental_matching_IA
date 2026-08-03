import pandas as pd
import numpy as np
import os
import sys
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder
from sklearn.metrics import accuracy_score, f1_score, classification_report
import warnings

warnings.filterwarnings('ignore')
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_PATH = os.path.join("ml_model", "data", "dataset_triaje_dental_v4.csv")
MODEL_DIR = os.path.join("ml_model", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "modelo_triaje_dental.joblib")

os.makedirs(MODEL_DIR, exist_ok=True)

print("--- 1. Cargando Dataset V4 ---")
if not os.path.exists(DATA_PATH):
    print(f"Error: No se encontró el dataset en {DATA_PATH}")
    sys.exit(1)

df = pd.read_csv(DATA_PATH, keep_default_na=False)

if 'id' in df.columns:
    df.drop('id', axis=1, inplace=True)

X = df.drop('tratamiento_target', axis=1)
y = df['tratamiento_target']

print(f"Características: {list(X.columns)}")
print(f"Clases en dataset: {sorted(y.unique())}")

# 2. Configurando Preprocesamiento
print("\n--- 2. Configurando Preprocesamiento ---")
ordinal_cols = ['movilidad_dental', 'profundidad_lesion']
numeric_cols = ['intensidad_dolor']
nominal_cols = [col for col in X.columns if col not in ordinal_cols + numeric_cols]

# Categorías ordenadas según especificación
movilidad_categories = ['Ninguna', 'Grado I o II (a evaluar)', 'Grado III (severa)']
profundidad_categories = ['N/A', 'No visible pero con molestia', 'Superficial (esmalte)', 'Moderada (dentina)', 'Profunda (cerca de pulpa)', 'Compromete raiz']

preprocessor = ColumnTransformer(
    transformers=[
        ('ordinal', OrdinalEncoder(categories=[movilidad_categories, profundidad_categories]), ordinal_cols),
        ('nominal', OneHotEncoder(sparse_output=False, handle_unknown='ignore'), nominal_cols),
        ('numeric', 'passthrough', numeric_cols)
    ]
)

# 3. División Entrenamiento/Prueba
print("\n--- 3. División de datos (Train/Test) ---")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
print(f"Entrenamiento: {X_train.shape[0]} muestras")
print(f"Prueba: {X_test.shape[0]} muestras")

# 4. Configurando y entrenando el modelo
print("\n--- 4. Entrenando RandomForestClassifier (max_depth=8, min_samples_leaf=8) ---")
# Ponderación clínica de Extracción (peso = 3, los demás = 1)
class_weights = {
    'Limpieza / Profilaxis': 1.0,
    'Tapadera (Resina)': 1.0,
    'Endodoncia': 1.0,
    'Destartraje y Pulido Radicular (Periodontitis)': 1.0,
    'Extraccion': 3.0
}

rf = RandomForestClassifier(
    n_estimators=300,
    max_depth=8,
    min_samples_leaf=8,
    class_weight=class_weights,
    random_state=42,
    n_jobs=-1
)

from sklearn.pipeline import Pipeline
pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', rf)
])

pipeline.fit(X_train, y_train)

# 5. Evaluación
print("\n--- 5. Evaluación del Modelo V4 ---")
y_train_pred = pipeline.predict(X_train)
y_test_pred = pipeline.predict(X_test)

train_acc = accuracy_score(y_train, y_train_pred)
test_acc = accuracy_score(y_test, y_test_pred)
test_f1_macro = f1_score(y_test, y_test_pred, average='macro')

print(f"Accuracy en TRAIN: {train_acc:.4f}")
print(f"Accuracy en TEST:  {test_acc:.4f}")
print(f"F1-Macro en TEST:  {test_f1_macro:.4f}")
print("\nReporte de Clasificación en Conjunto de Prueba:")
print(classification_report(y_test, y_test_pred))

# 6. Guardar Modelo
print(f"\n--- 6. Guardando Pipeline en {MODEL_PATH} ---")
joblib.dump({'pipeline': pipeline}, MODEL_PATH)
print("¡Entrenamiento y guardado completados con éxito!")
