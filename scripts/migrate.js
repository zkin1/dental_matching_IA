#!/usr/bin/env node

/**
 * SCRIPT DE MIGRACIONES AUTOMÁTICAS
 * Ejecuta las migraciones de base de datos automáticamente
 */

require('dotenv').config();

const { getConnection } = require('../config/database');
const MigrationManager = require('../src/infrastructure/database/migrationManager');
const loggerService = require('../src/infrastructure/logging/logger');

async function runMigrations() {
    console.log('🗄️  Iniciando migraciones de base de datos...\n');

    try {
        // Conectar a la base de datos
        const db = await getConnection();
        console.log('✅ Conexión a base de datos establecida');

        // Inicializar migration manager
        const migrationManager = new MigrationManager(db);
        await migrationManager.initialize();
        console.log('✅ Migration manager inicializado');

        // Obtener estado actual
        const status = await migrationManager.getStatus();
        console.log('\n📊 Estado de migraciones:');
        console.log(`   Total disponibles: ${status.total_available}`);
        console.log(`   Ejecutadas: ${status.executed}`);
        console.log(`   Pendientes: ${status.pending}`);

        if (status.last_executed) {
            console.log(`   Última ejecutada: ${status.last_executed.version} - ${status.last_executed.name}`);
        }

        if (status.pending > 0) {
            console.log('\n🔄 Ejecutando migraciones pendientes...');
            
            // Validar integridad antes de ejecutar
            const integrity = await migrationManager.validateIntegrity();
            if (!integrity.valid) {
                console.warn('⚠️  Problemas de integridad detectados:');
                integrity.issues.forEach(issue => {
                    console.warn(`   - ${issue.type}: ${issue.version} - ${issue.name}`);
                });
            }

            // Ejecutar migraciones
            const result = await migrationManager.migrate();
            
            console.log(`\n✅ Migraciones completadas exitosamente!`);
            console.log(`   Ejecutadas: ${result.executed}`);
            
            result.migrations.forEach(migration => {
                console.log(`   ✓ ${migration.version} - ${migration.name}`);
            });

            // Validar integridad después de ejecutar
            const finalIntegrity = await migrationManager.validateIntegrity();
            if (finalIntegrity.valid) {
                console.log('✅ Integridad de migraciones validada');
            } else {
                console.error('❌ Problemas de integridad después de las migraciones');
                finalIntegrity.issues.forEach(issue => {
                    console.error(`   - ${issue.type}: ${issue.version}`);
                });
            }
        } else {
            console.log('\n✅ No hay migraciones pendientes');
        }

        console.log('\n🎉 Proceso de migraciones completado');
        
    } catch (error) {
        console.error('\n❌ Error durante las migraciones:');
        console.error(`   ${error.message}`);
        
        loggerService.error('Migration script failed', {
            error: error.message,
            stack: error.stack
        });

        process.exit(1);
    }
}

async function showStatus() {
    try {
        const db = await getConnection();
        const migrationManager = new MigrationManager(db);
        await migrationManager.initialize();

        const status = await migrationManager.getStatus();
        
        console.log('📊 Estado de migraciones:');
        console.log(`Total disponibles: ${status.total_available}`);
        console.log(`Ejecutadas: ${status.executed}`);
        console.log(`Pendientes: ${status.pending}`);

        if (status.last_executed) {
            console.log(`Última ejecutada: ${status.last_executed.version} - ${status.last_executed.name}`);
        }

        if (status.pending > 0) {
            console.log('\nMigraciones pendientes:');
            status.pending_migrations.forEach(migration => {
                console.log(`  - ${migration.version} - ${migration.name}`);
            });
        }

    } catch (error) {
        console.error('Error obteniendo estado:', error.message);
        process.exit(1);
    }
}

async function createMigration(name, type = 'sql') {
    try {
        const db = await getConnection();
        const migrationManager = new MigrationManager(db);
        
        const result = await migrationManager.createMigration(name, type);
        
        console.log('✅ Migración creada exitosamente:');
        console.log(`   Archivo: ${result.filename}`);
        console.log(`   Ruta: ${result.path}`);
        console.log(`   Versión: ${result.version}`);

    } catch (error) {
        console.error('Error creando migración:', error.message);
        process.exit(1);
    }
}

async function rollback() {
    try {
        const db = await getConnection();
        const migrationManager = new MigrationManager(db);
        await migrationManager.initialize();

        console.log('🔄 Ejecutando rollback de la última migración...');
        
        const result = await migrationManager.rollback();
        
        if (result.rolled_back) {
            console.log('✅ Rollback ejecutado exitosamente:');
            console.log(`   Migración revertida: ${result.migration.version} - ${result.migration.name}`);
        } else {
            console.log('ℹ️  No hay migraciones para revertir');
        }

    } catch (error) {
        console.error('Error durante rollback:', error.message);
        process.exit(1);
    }
}

// CLI handling
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

switch (command) {
    case 'up':
    case 'migrate':
        runMigrations();
        break;
    
    case 'status':
        showStatus();
        break;
    
    case 'create':
        if (!arg1) {
            console.error('❌ Nombre de migración requerido');
            console.log('Uso: node migrate.js create "nombre_migracion" [sql|js]');
            process.exit(1);
        }
        createMigration(arg1, arg2 || 'sql');
        break;
    
    case 'rollback':
    case 'down':
        rollback();
        break;
    
    default:
        console.log('🗄️  SCRIPT DE MIGRACIONES DE BASE DE DATOS');
        console.log('');
        console.log('Comandos disponibles:');
        console.log('  migrate, up     - Ejecutar migraciones pendientes');
        console.log('  status          - Mostrar estado de migraciones');
        console.log('  create <name>   - Crear nueva migración');
        console.log('  rollback, down  - Revertir última migración');
        console.log('');
        console.log('Ejemplos:');
        console.log('  node migrate.js migrate');
        console.log('  node migrate.js status');
        console.log('  node migrate.js create "add_user_preferences"');
        console.log('  node migrate.js rollback');
        break;
}