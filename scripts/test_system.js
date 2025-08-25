const { getConnection } = require('../config/database');

/**
 * Script de pruebas profesionales para el Sistema Dental Matching
 * Versión: 2.0.0
 * Fecha: 2024
 */

class SystemTester {
    constructor() {
        this.connection = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    async runAllTests() {
        console.log('🧪 Iniciando pruebas profesionales del sistema Dental Matching...');
        console.log('==============================================================');
        
        try {
            const db = await getConnection();
            this.connection = await db.getConnection();
            
            const tests = [
                { name: 'Conexión a base de datos', method: this.testDatabaseConnection.bind(this) },
                { name: 'Estructura de tablas', method: this.testTableStructure.bind(this) },
                { name: 'Integridad de datos', method: this.testDataIntegrity.bind(this) },
                { name: 'Rendimiento del sistema', method: this.testPerformance.bind(this) }
            ];

            for (const test of tests) {
                await this.runTest(test.name, test.method);
            }

            this.printSummary();
            
        } catch (error) {
            console.error('❌ Error durante las pruebas:', error);
            throw error;
        } finally {
            if (this.connection) {
                this.connection.release();
            }
        }
    }

    async runTest(testName, testMethod) {
        console.log(`\n🔍 Ejecutando: ${testName}`);
        console.log('─'.repeat(50));
        
        try {
            await testMethod();
            this.testResults.passed++;
            console.log(`✅ ${testName}: PASÓ`);
        } catch (error) {
            this.testResults.failed++;
            console.log(`❌ ${testName}: FALLÓ - ${error.message}`);
        }
        
        this.testResults.total++;
    }

    async testDatabaseConnection() {
        try {
            const [result] = await this.connection.execute('SELECT 1 as test');
            if (result[0].test !== 1) {
                throw new Error('Consulta de prueba falló');
            }
            console.log('✅ Conexión a base de datos exitosa');
        } catch (error) {
            throw new Error(`Error de conexión: ${error.message}`);
        }
    }

    async testTableStructure() {
        try {
            const requiredTables = [
                'pacientes', 'estudiantes_odontologia', 'asignaciones', 
                'codigos_acceso', 'citas', 'seguimiento_tratamiento',
                'notificaciones_email', 'configuracion_sistema', 'logs_sistema',
                'especialidades_estudiante', 'requerimientos_paciente', 
                'asignaciones_horario', 'disponibilidad_estudiante'
            ];

            // Usar SHOW TABLES en lugar de information_schema para mayor compatibilidad
            const [tables] = await this.connection.execute('SHOW TABLES');
            
            const existingTables = tables.map(t => Object.values(t)[0]);
            console.log('📋 Tablas encontradas en la base de datos:');
            existingTables.forEach(table => console.log(`   - ${table}`));
            
            const missingTables = requiredTables.filter(t => !existingTables.includes(t));
            
            if (missingTables.length > 0) {
                throw new Error(`Tablas faltantes: ${missingTables.join(', ')}`);
            }
            
            console.log(`✅ Todas las ${requiredTables.length} tablas están presentes`);
            
            // Verificar estructura de tabla asignaciones
            try {
                const [columns] = await this.connection.execute('SHOW COLUMNS FROM asignaciones');
                const columnNames = columns.map(c => c.Field);
                
                const requiredColumns = [
                    'id', 'id_paciente', 'id_estudiante', 'estado', 'fecha_asignacion'
                ];
                
                const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));
                if (missingColumns.length > 0) {
                    console.log(`⚠️ Columnas faltantes en asignaciones: ${missingColumns.join(', ')}`);
                } else {
                    console.log('✅ Estructura de tabla asignaciones correcta');
                }
            } catch (error) {
                console.log(`⚠️ No se pudo verificar estructura de asignaciones: ${error.message}`);
            }
            
        } catch (error) {
            throw new Error(`Error en estructura de tablas: ${error.message}`);
        }
    }

    async testDataIntegrity() {
        try {
            // Verificar integridad referencial básica
            let integrityChecks = 0;
            let passedChecks = 0;
            
            // Verificar que hay datos en las tablas principales
            try {
                const [pacientesCount] = await this.connection.execute('SELECT COUNT(*) as total FROM pacientes');
                if (pacientesCount[0].total > 0) {
                    console.log(`✅ Pacientes encontrados: ${pacientesCount[0].total}`);
                    passedChecks++;
                } else {
                    console.log('⚠️ No hay pacientes en la base de datos');
                }
                integrityChecks++;
            } catch (error) {
                console.log(`⚠️ No se pudo verificar pacientes: ${error.message}`);
            }
            
            try {
                const [estudiantesCount] = await this.connection.execute('SELECT COUNT(*) as total FROM estudiantes_odontologia');
                if (estudiantesCount[0].total > 0) {
                    console.log(`✅ Estudiantes encontrados: ${estudiantesCount[0].total}`);
                    passedChecks++;
                } else {
                    console.log('⚠️ No hay estudiantes en la base de datos');
                }
                integrityChecks++;
            } catch (error) {
                console.log(`⚠️ No se pudo verificar estudiantes: ${error.message}`);
            }
            
            try {
                const [asignacionesCount] = await this.connection.execute('SELECT COUNT(*) as total FROM asignaciones');
                if (asignacionesCount[0].total > 0) {
                    console.log(`✅ Asignaciones encontradas: ${asignacionesCount[0].total}`);
                    passedChecks++;
                } else {
                    console.log('⚠️ No hay asignaciones en la base de datos');
                }
                integrityChecks++;
            } catch (error) {
                console.log(`⚠️ No se pudo verificar asignaciones: ${error.message}`);
            }
            
            // Verificar integridad referencial si hay datos
            if (passedChecks > 0) {
                try {
                    const [orphanedAssignments] = await this.connection.execute(`
                        SELECT COUNT(*) as count
                        FROM asignaciones a
                        LEFT JOIN pacientes p ON a.id_paciente = p.id
                        LEFT JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
                        WHERE p.id IS NULL OR e.id IS NULL
                    `);
                    
                    if (orphanedAssignments[0].count > 0) {
                        console.log(`⚠️ ${orphanedAssignments[0].count} asignaciones huérfanas encontradas`);
                    } else {
                        console.log('✅ Integridad referencial verificada');
                        passedChecks++;
                    }
                    integrityChecks++;
                } catch (error) {
                    console.log(`⚠️ No se pudo verificar integridad referencial: ${error.message}`);
                }
            }
            
            if (integrityChecks > 0) {
                const successRate = (passedChecks / integrityChecks) * 100;
                if (successRate >= 75) {
                    console.log(`✅ Integridad de datos verificada (${successRate.toFixed(1)}% de éxito)`);
                } else {
                    throw new Error(`Baja integridad de datos (${successRate.toFixed(1)}% de éxito)`);
                }
            }
            
        } catch (error) {
            throw new Error(`Error en integridad de datos: ${error.message}`);
        }
    }

    async testPerformance() {
        try {
            // Probar rendimiento de consultas básicas
            const startTime = Date.now();
            
            await this.connection.execute(`
                SELECT COUNT(*) as total
                FROM pacientes p
                JOIN asignaciones a ON p.id = a.id_paciente
                JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
                WHERE p.activo = TRUE AND a.estado = 'asignado'
            `);
            
            const queryTime = Date.now() - startTime;
            
            if (queryTime > 2000) { // Más de 2 segundos
                throw new Error(`Consulta muy lenta: ${queryTime}ms`);
            } else if (queryTime > 1000) { // Más de 1 segundo
                console.log(`⚠️ Consulta lenta: ${queryTime}ms`);
            } else {
                console.log(`✅ Rendimiento aceptable: ${queryTime}ms`);
            }
            
            // Probar consulta simple
            const simpleStartTime = Date.now();
            await this.connection.execute('SELECT COUNT(*) as total FROM pacientes');
            const simpleQueryTime = Date.now() - simpleStartTime;
            
            if (simpleQueryTime > 500) {
                console.log(`⚠️ Consulta simple lenta: ${simpleQueryTime}ms`);
            } else {
                console.log(`✅ Consulta simple rápida: ${simpleQueryTime}ms`);
            }
            
        } catch (error) {
            throw new Error(`Error en prueba de rendimiento: ${error.message}`);
        }
    }

    printSummary() {
        console.log('\n📊 RESUMEN DE PRUEBAS');
        console.log('='.repeat(50));
        console.log(`✅ PASARON: ${this.testResults.passed}`);
        console.log(`❌ FALLARON: ${this.testResults.failed}`);
        console.log(`📋 TOTAL: ${this.testResults.total}`);
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(`📈 TASA DE ÉXITO: ${successRate}%`);
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!');
            console.log('🚀 El sistema está listo para producción');
        } else if (this.testResults.failed <= 1) {
            console.log('\n⚠️ La mayoría de las pruebas pasaron');
            console.log('🔧 Revisa los errores menores antes de continuar');
        } else {
            console.log('\n❌ Varias pruebas fallaron');
            console.log('🔧 Revisa los errores antes de continuar');
        }
    }
}

// Función principal de pruebas
async function testSystem() {
    const tester = new SystemTester();
    await tester.runAllTests();
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
    testSystem()
        .then(() => {
            console.log('\n✅ Pruebas completadas');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Error en las pruebas:', error);
            process.exit(1);
        });
}

module.exports = { testSystem, SystemTester };
