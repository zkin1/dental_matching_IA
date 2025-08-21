const { google } = require('googleapis');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

require('dotenv').config();

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.doc = null;
    this.sheet = null;
    this.initialize();
  }

    async initialize() {
        try {
            console.log('🔑 Inicializando Google Sheets API...');
            
            // Configurar JWT
            const serviceAccountAuth = new JWT({
                email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            // Inicializar documento
            this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
            await this.doc.loadInfo();
            
            // Obtener la primera hoja
            this.sheet = this.doc.sheetsByIndex[0];
            
            console.log('✅ Google Sheets API inicializada');
            console.log(`📋 Hoja: ${this.sheet.title}`);
            
            return true;
        } catch (error) {
            console.error('❌ Error inicializando Google Sheets:', error.message);
            throw error;
        }
    }

    async getPacientes() {
    try {
        if (!this.sheet) {
            await this.initialize();
        }

        console.log('📊 Leyendo datos desde Google Sheets...');
        
        // Obtener todas las filas
        const rows = await this.sheet.getRows();
        console.log(`📥 ${rows.length} filas encontradas en Google Sheets`);

        if (rows.length === 0) {
            return [];
        }

        // Función helper para valores seguros
        const safeValue = (value, defaultValue = null) => {
            if (!value || value.toString().trim() === '') {
                return defaultValue;
            }
            return value.toString().trim();
        };

        const safeNumber = (value, defaultValue = 0) => {
            const num = parseInt(value);
            return isNaN(num) ? defaultValue : num;
        };

        // Mapear los datos del español al inglés esperado por el sistema
        const pacientes = rows.map((row, index) => {
            // Obtener los valores usando los headers en español
            const nombre = this.getFieldValue(row, ['¿Cuál es tu nombre completo?', 'Nombre completo', 'Nombre']);
            const edad = this.getFieldValue(row, ['¿Cuántos años tienes?', 'Edad']);
            const telefono = this.getFieldValue(row, ['¿Cuál es tu número de teléfono (WhatsApp)?', 'Teléfono', 'WhatsApp']);
            const email = this.getFieldValue(row, ['¿Cuál es tu email?', 'Email', 'Correo']);
            const ciudad = this.getFieldValue(row, ['5. ¿En qué ciudad vives?', 'Ciudad']);
            
            // Campos relacionados con el problema dental
            const problemasDientes = this.getFieldValue(row, ['🦷 PROBLEMAS CON MIS DIENTES', 'Problemas dientes']);
            const limpiezaChequeo = this.getFieldValue(row, ['🧽 LIMPIEZA Y CHEQUEO', 'Limpieza']);
            const tieneDiagnostico = this.getFieldValue(row, ['¿Ya tienes un diagnóstico previo?', 'Diagnóstico previo']);
            const tiempoProblema = this.getFieldValue(row, ['8. ¿Hace cuánto tiempo tienes este problema? (Opción múltiple)', 'Tiempo problema']);
            const intensidadMolestia = this.getFieldValue(row, ['9. ¿Qué tan fuerte es tu molestia del 1 al 10?', 'Intensidad molestia']);
            const diasDisponibles = this.getFieldValue(row, ['¿Qué días de la semana puedes asistir a citas?', 'Días disponibles']);
            const horarioDisponible = this.getFieldValue(row, ['¿En qué horario puede tener las citas?', 'Horario disponible']);
            const proximaCita = this.getFieldValue(row, ['¿Qué tan pronto podrías asistir a una primera cita?', 'Próxima cita']);

            console.log(`🔍 Procesando fila ${index + 1}:`);
            console.log(`   - Nombre: "${nombre}"`);
            console.log(`   - Teléfono: "${telefono}"`);
            console.log(`   - Email: "${email}"`);

            // Inferir tipo de tratamiento, complejidad y prioridad
            const sintomasCombinados = [problemasDientes, limpiezaChequeo].filter(Boolean).join(', ');
            const nivelDolor = safeNumber(intensidadMolestia);

            return {
                timestamp: row.get('Marca temporal') || new Date().toISOString(),
                nombre: safeValue(nombre),
                edad: safeNumber(edad),
                telefono: safeValue(telefono),
                email: safeValue(email),
                ciudad: safeValue(ciudad, 'Metropolitana'),
                problemasDientes: safeValue(problemasDientes),
                limpiezaChequeo: safeValue(limpiezaChequeo),
                tieneDiagnostico: safeValue(tieneDiagnostico),
                tiempoProblema: safeValue(tiempoProblema),
                intensidadMolestia: nivelDolor,
                diasDisponibles: safeValue(diasDisponibles),
                horarioDisponible: safeValue(horarioDisponible, 'Cualquier horario'),
                proximaCita: safeValue(proximaCita, 'Esta misma semana'),
                // Campos inferidos
                sintomas_seleccionados: sintomasCombinados ? [sintomasCombinados] : [],
                tipo_tratamiento_inferido: this.inferTreatment(sintomasCombinados),
                complejidad: this.inferComplexity(sintomasCombinados, nivelDolor),
                prioridad: this.calculatePriority(nivelDolor, sintomasCombinados),
                // Campos adicionales del sistema
                estado: 'pendiente',
                fechaRegistro: new Date(),
                estudianteAsignado: null
            };
        });

        // Filtrar pacientes válidos
        const pacientesValidos = pacientes.filter(paciente => {
            const nombreValido = paciente.nombre && paciente.nombre.trim().length > 0;
            const contactoValido = (paciente.telefono && paciente.telefono.trim().length > 0) || 
                                 (paciente.email && paciente.email.trim().length > 0);
            
            console.log(`🔍 Validando paciente: ${paciente.nombre}`);
            console.log(`   - Nombre válido: ${nombreValido}`);
            console.log(`   - Teléfono: "${paciente.telefono}" (válido: ${!!(paciente.telefono && paciente.telefono.trim().length > 0)})`);
            console.log(`   - Email: "${paciente.email}" (válido: ${!!(paciente.email && paciente.email.trim().length > 0)})`);
            console.log(`   - Contacto válido: ${contactoValido}`);
            
            return nombreValido && contactoValido;
        });

        console.log(`✅ ${pacientesValidos.length} pacientes válidos procesados`);
        return pacientesValidos;

    } catch (error) {
        console.error('❌ Error obteniendo pacientes de Google Sheets:', error.message);
        throw error;
    }
}


    getFieldValue(row, possibleKeys) {
        for (const key of possibleKeys) {
            try {
                const value = row.get(key);
                if (value && value.toString().trim().length > 0) {
                    return value.toString().trim();
                }
            } catch (error) {
                // Continuar con el siguiente key si este no existe
                continue;
            }
        }
        return '';
    }


  // Verificar conexión
  async checkConnection() {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      return {
        connected: true,
        sheetInfo: {
          title: response.data.properties?.title,
          lastModified: response.data.properties?.timeZone,
          sheets: response.data.sheets?.length || 0
        }
      };
    } catch (error) {
      console.error('❌ Error verificando conexión:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }

      async getHeaders() {
        try {
            if (!this.sheet) {
                await this.initialize();
            }
            
            await this.sheet.loadHeaderRow();
            console.log('📋 Headers encontrados:', this.sheet.headerValues);
            return this.sheet.headerValues;
        } catch (error) {
            console.error('❌ Error obteniendo headers:', error.message);
            throw error;
        }
    }


  // Leer datos de pacientes desde Google Sheets
  async readPatientsSheet() {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      console.log('📊 Leyendo datos desde Google Sheets...');

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'A:Z', // Leer todas las columnas
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('ℹ️ No se encontraron datos en Google Sheets');
        return [];
      }

      // Primera fila son los headers
      const headers = rows[0];
      const dataRows = rows.slice(1);

      console.log(`📥 ${dataRows.length} filas encontradas en Google Sheets`);

      // Convertir a objetos
      const patients = dataRows.map((row, index) => {
        const patient = {};
        headers.forEach((header, columnIndex) => {
          patient[this.normalizeColumnName(header)] = row[columnIndex] || '';
        });
        
        // Agregar índice de fila para referencia
        patient.sheet_row_index = index + 2; // +2 porque empezamos en fila 2
        
        return this.processPatientData(patient);
      }).filter(patient => this.isValidPatient(patient));

      console.log(`✅ ${patients.length} pacientes válidos procesados`);
      return patients;

    } catch (error) {
      console.error('❌ Error leyendo Google Sheets:', error.message);
      throw new Error(`Error accediendo a Google Sheets: ${error.message}`);
    }
  }

  // Normalizar nombres de columnas
    normalizeColumnName(columnName) {
    const columnMap = {
        // Mapeo exacto según tu Google Sheets
        'Marca temporal': 'timestamp',
        '¿Cuál es tu nombre completo?': 'nombre_completo',
        '¿Cuántos años tienes?': 'edad',
        '¿Cuál es tu número de teléfono (WhatsApp)?': 'telefono',
        '¿Cuál es tu email?': 'email',
        '5. ¿En qué ciudad vives?': 'ciudad',
        'Selecciona todo lo que te pase: (Puedes marcar varias opciones': 'sintomas_seleccionados',
        '🩸 PROBLEMAS EN LAS ENCÍAS': 'problemas_encias',
        '🦷 PROBLEMAS CON MIS DIENTES': 'problemas_dientes',
        '🧽 LIMPIEZA Y CHEQUEO': 'limpieza_chequeo',
        '¿Ya tienes un diagnóstico previo?': 'diagnostico_previo',
        '8. ¿Hace cuánto tiempo tienes este problema? (Opción múltiple)': 'tiempo_problema',
        '9. ¿Qué tan fuerte es tu molestia del 1 al 10?': 'nivel_dolor',
        '¿Qué días de la semana puedes asistir a citas?': 'dias_disponibles',
        '¿En qué horario puede tener las citas?': 'horario_preferencia',
        '¿Qué tan pronto podrías asistir a una primera cita?': 'disponibilidad_cita'
    };

    return columnMap[columnName] || columnName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
    }

  // Procesar datos del paciente
processPatientData(rawData) {
  // Combinar todas las columnas de síntomas
  const allSymptoms = [];
  
  if (rawData.sintomas_seleccionados) {
    allSymptoms.push(...this.parseSyntoms(rawData.sintomas_seleccionados));
  }
  if (rawData.problemas_encias) {
    allSymptoms.push('Problemas en las encías');
  }
  if (rawData.problemas_dientes) {
    allSymptoms.push('Problemas con dientes');
  }
  if (rawData.limpieza_chequeo) {
    allSymptoms.push('Limpieza y chequeo');
  }

  return {
    timestamp: this.parseTimestamp(rawData.timestamp),
    nombre_completo: this.cleanText(rawData.nombre_completo),
    edad: this.parseAge(rawData.edad),
    telefono: this.cleanPhone(rawData.telefono),
    email: this.cleanEmail(rawData.email),
    ciudad: this.mapCity(rawData.ciudad),
    sintomas_seleccionados: JSON.stringify(allSymptoms), // Síntomas combinados
    diagnostico_previo: this.cleanText(rawData.diagnostico_previo),
    tiempo_problema: this.cleanText(rawData.tiempo_problema),
    nivel_dolor: this.parsePainLevel(rawData.nivel_dolor),
    dias_disponibles: this.cleanText(rawData.dias_disponibles),
    horario_preferencia: this.cleanText(rawData.horario_preferencia),
    disponibilidad_cita: this.cleanText(rawData.disponibilidad_cita),
    tipo_tratamiento_inferido: this.inferTreatment(allSymptoms.join(', ')),
    complejidad: this.inferComplexity(allSymptoms.join(', ')),
    prioridad: this.calculatePriority(rawData.nivel_dolor, allSymptoms.join(', ')),
    activo: 1,
    sheet_row_index: rawData.sheet_row_index
  };
}

  // Funciones de procesamiento de datos
  parseTimestamp(timestamp) {
    if (!timestamp) return new Date();
    try {
      return new Date(timestamp);
    } catch {
      return new Date();
    }
  }

  cleanText(text) {
    if (!text) return '';
    return text.toString().trim().substring(0, 255);
  }

  parseAge(age) {
    if (!age) return null;
    const parsed = parseInt(age);
    return (parsed > 0 && parsed < 120) ? parsed : null;
  }

        cleanPhone(phone) {
    if (!phone) return '';
    
    // Limpiar el teléfono eliminando espacios y caracteres especiales
    let cleanedPhone = phone.toString().trim().replace(/\D/g, '');
    
    // Si está vacío después de limpiar, devolver vacío
    if (!cleanedPhone) return '';
    
    // Remover el prefijo +56 si existe
    cleanedPhone = cleanedPhone.replace(/^56/, '');
    
    // Si comienza con 9 y tiene 8 o 9 dígitos, es un celular chileno válido
    if (cleanedPhone.startsWith('9') && cleanedPhone.length >= 8) {
        return cleanedPhone.length === 8 ? '56' + cleanedPhone : cleanedPhone;
    }
    
    // Devolver lo que pudimos limpiar (menos estricto)
    return cleanedPhone;
    }

  cleanEmail(email) {
    if (!email) return '';
    return email.toString().toLowerCase().trim();
  }

  mapCity(city) {
    const cityMap = {
      'santiago': 'Metropolitana',
      'valparaíso': 'Valparaíso',
      'concepción': 'Concepción',
      'región metropolitana': 'Metropolitana',
      'rm': 'Metropolitana'
    };

    const normalized = city?.toLowerCase() || '';
    return cityMap[normalized] || 'Metropolitana';
  }

    parseSyntoms(symptoms) {
    if (!symptoms) return [];
    const symptomList = symptoms.toString().split(',').map(s => s.trim());
    return symptomList.filter(s => s.length > 0);
    }
  parsePainLevel(pain) {
    const level = parseInt(pain);
    return (level >= 0 && level <= 10) ? level : 0;
  }

inferTreatment(symptoms) {
    if (!symptoms) return 'Consulta General';
    
    const symptomsLower = symptoms.toLowerCase();
    
    if (symptomsLower.includes('caries') || symptomsLower.includes('dolor')) {
        return 'Endodoncia';
    } else if (symptomsLower.includes('encías') || symptomsLower.includes('sangrado')) {
        return 'Periodontal';
    } else if (symptomsLower.includes('limpieza') || symptomsLower.includes('sarro')) {
        return 'Destartraje y Pulido';
    } else {
        return 'Consulta General';
    }
}

inferComplexity(symptoms, painLevel) {
    const pain = parseInt(painLevel) || 0;
    
    if (pain >= 8 || (symptoms && symptoms.toLowerCase().includes('urgencia'))) {
        return 'Avanzado';
    } else if (pain >= 5 || (symptoms && symptoms.toLowerCase().includes('moderado'))) {
        return 'Intermedio';
    } else {
        return 'Básico';
    }
}


calculatePriority(painLevel, symptoms) {
    const pain = parseInt(painLevel) || 0;
    const symptomsLower = (symptoms || '').toLowerCase();
    
    if (pain >= 8 || symptomsLower.includes('urgencia')) {
        return 'Muy Alta';
    } else if (pain >= 6 || symptomsLower.includes('severo')) {
        return 'Alta';
    } else if (pain >= 3) {
        return 'Moderada';
    } else {
        return 'Baja';
    }
}

  // Validar que el paciente tenga datos mínimos
    isValidPatient(patient) {
    // Verificar nombre
    const hasName = patient.nombre_completo && 
                    patient.nombre_completo.toString().trim().length > 2;
    
    // Verificar teléfono (más flexible)
    const phoneStr = patient.telefono ? patient.telefono.toString().trim() : '';
    const hasPhone = phoneStr.length >= 8; // Mínimo 8 dígitos para teléfono chileno
    
    // Verificar email
    const emailStr = patient.email ? patient.email.toString().trim() : '';
    const hasEmail = emailStr.length > 0 && emailStr.includes('@');
    
    const hasContact = hasPhone || hasEmail;
    
    console.log(`🔍 Validando paciente: ${patient.nombre_completo || 'Sin nombre'}`);
    console.log(`   - Nombre válido: ${hasName}`);
    console.log(`   - Teléfono: "${phoneStr}" (válido: ${hasPhone})`);
    console.log(`   - Email: "${emailStr}" (válido: ${hasEmail})`);
    console.log(`   - Contacto válido: ${hasContact}`);
    
    return hasName && hasContact;
    }
}

// Singleton instance
const googleSheetsService = new GoogleSheetsService();


module.exports = new GoogleSheetsService();