const { getConnection } = require('../config/database');

async function insertPatientSchedules() {
    console.log('🕒 Insertando preferencias de horario para pacientes...');
    
    try {
        const db = await getConnection();
        
        // Primero obtener todos los pacientes activos sin horarios
        const [patients] = await db.query(`
            SELECT id, nombre_completo, edad, fecha_nacimiento 
            FROM pacientes 
            WHERE activo = TRUE 
            AND (preferencias_horario IS NULL OR preferencias_horario = '')
            LIMIT 50
        `);

        console.log(`📋 Pacientes encontrados: ${patients.length}`);

        if (patients.length === 0) {
            console.log('✅ Todos los pacientes ya tienen horarios asignados');
            return;
        }

        // Generar diferentes preferencias de horario realistas
        const horarioTemplates = [
            // Pacientes que prefieren mañana
            {
                diasDisponibles: ["lunes", "martes", "miercoles", "jueves", "viernes"],
                horariosPreferidos: ["08:00-12:00"],
                flexibilidad: "media",
                observaciones: "Prefiere horarios de mañana"
            },
            // Pacientes que prefieren tarde
            {
                diasDisponibles: ["lunes", "martes", "miercoles", "jueves", "viernes"],
                horariosPreferidos: ["14:00-18:00"],
                flexibilidad: "alta",
                observaciones: "Disponible en horarios de tarde"
            },
            // Pacientes con horario flexible
            {
                diasDisponibles: ["lunes", "miercoles", "viernes"],
                horariosPreferidos: ["08:00-12:00", "14:00-16:00"],
                flexibilidad: "alta",
                observaciones: "Horario muy flexible"
            },
            // Estudiantes (horario limitado)
            {
                diasDisponibles: ["martes", "jueves"],
                horariosPreferidos: ["16:00-18:00"],
                flexibilidad: "baja",
                observaciones: "Estudiante - disponibilidad limitada"
            },
            // Trabajadores (solo tardes y fines de semana)
            {
                diasDisponibles: ["lunes", "miercoles", "viernes"],
                horariosPreferidos: ["18:00-20:00"],
                flexibilidad: "baja",
                observaciones: "Trabajador - solo después de las 6pm"
            },
            // Personas mayores (prefieren mañana)
            {
                diasDisponibles: ["lunes", "martes", "miercoles", "jueves"],
                horariosPreferidos: ["08:00-11:00"],
                flexibilidad: "media",
                observaciones: "Prefiere horarios tempranos"
            },
            // Padres de familia (horario escolar)
            {
                diasDisponibles: ["martes", "jueves", "viernes"],
                horariosPreferidos: ["09:00-11:00", "14:00-15:00"],
                flexibilidad: "media",
                observaciones: "Disponible durante horario escolar"
            },
            // Personas con trabajo flexible
            {
                diasDisponibles: ["lunes", "miercoles", "viernes"],
                horariosPreferidos: ["10:00-12:00", "15:00-17:00"],
                flexibilidad: "alta",
                observaciones: "Trabajo flexible"
            }
        ];

        let updated = 0;

        // Actualizar cada paciente con horarios aleatorios pero realistas
        for (const patient of patients) {
            // Seleccionar template basado en edad para mayor realismo
            let templateIndex;
            if (patient.edad <= 25) {
                // Jóvenes/estudiantes - horarios más limitados
                templateIndex = Math.random() < 0.6 ? 3 : Math.floor(Math.random() * horarioTemplates.length);
            } else if (patient.edad >= 60) {
                // Adultos mayores - prefieren mañanas
                templateIndex = Math.random() < 0.7 ? 5 : 0;
            } else if (patient.edad >= 30 && patient.edad <= 50) {
                // Adultos trabajadores - más limitado
                templateIndex = Math.random() < 0.5 ? 4 : 7;
            } else {
                // Otros - horario aleatorio
                templateIndex = Math.floor(Math.random() * horarioTemplates.length);
            }

            const horarioBase = horarioTemplates[templateIndex];
            
            // Añadir algo de variación al template
            const preferenciasHorario = {
                ...horarioBase,
                prioridad: patient.edad <= 18 ? "alta" : (Math.random() < 0.3 ? "alta" : "normal"),
                requiereAcompanante: patient.edad <= 18 || patient.edad >= 70,
                fechaPreferida: null // Se puede asignar dinámicamente
            };

            // Actualizar el paciente
            await db.query(`
                UPDATE pacientes 
                SET preferencias_horario = ? 
                WHERE id = ?
            `, [JSON.stringify(preferenciasHorario), patient.id]);

            updated++;
            console.log(`✅ ${patient.nombre_completo} (${patient.edad} años) - Horario: ${preferenciasHorario.observaciones}`);
        }

        console.log(`\n🎉 COMPLETADO: ${updated} pacientes actualizados con preferencias de horario`);
        console.log('🚀 Sistema IA v2.1 listo para funcionar al 100%');

        // Verificar algunos registros actualizados
        const [verificacion] = await db.query(`
            SELECT 
                nombre_completo, 
                edad,
                JSON_UNQUOTE(JSON_EXTRACT(preferencias_horario, '$.observaciones')) as observaciones,
                JSON_UNQUOTE(JSON_EXTRACT(preferencias_horario, '$.flexibilidad')) as flexibilidad
            FROM pacientes 
            WHERE preferencias_horario IS NOT NULL 
            AND preferencias_horario != ''
            LIMIT 5
        `);

        console.log('\n📊 MUESTRA DE REGISTROS INSERTADOS:');
        verificacion.forEach(p => {
            console.log(`  - ${p.nombre_completo} (${p.edad} años): ${p.observaciones} [${p.flexibilidad}]`);
        });

    } catch (error) {
        console.error('❌ Error insertando horarios de pacientes:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    insertPatientSchedules()
        .then(() => {
            console.log('\n✅ Proceso completado exitosamente');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error en el proceso:', error);
            process.exit(1);
        });
}

module.exports = { insertPatientSchedules };