#!/usr/bin/env node

/**
 * SCRIPT PARA CREAR USUARIO ADMINISTRADOR
 * Este script crea el usuario administrador del sistema de forma manual
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { getConnection } = require('../config/database');

async function createAdminUser() {
    console.log('🔧 Creando usuario administrador...');
    
    try {
        const db = await getConnection();
        
        // Verificar si ya existe un admin
        const [existingAdmin] = await db.query(`
            SELECT id FROM users 
            WHERE role = 'admin' AND email = 'admin@dentalmatching.com'
            LIMIT 1
        `);
        
        if (existingAdmin.length > 0) {
            console.log('⚠️  Usuario administrador ya existe');
            console.log('📧 Email: admin@dentalmatching.com');
            return;
        }
        
        // Hash de la contraseña por defecto
        const defaultPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        
        // Insertar usuario administrador
        await db.query(`
            INSERT INTO users (email, password, nombre_completo, role, permissions, status, email_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'admin@dentalmatching.com',
            hashedPassword,
            'Administrador Sistema',
            'admin', 
            JSON.stringify(["read", "write", "delete", "manage_users", "manage_system"]),
            'active',
            true
        ]);
        
        console.log('✅ Usuario administrador creado exitosamente');
        console.log('📧 Email: admin@dentalmatching.com');
        console.log('🔑 Contraseña temporal: admin123');
        console.log('⚠️  IMPORTANTE: Cambia esta contraseña en el primer login');
        
    } catch (error) {
        console.error('❌ Error creando usuario administrador:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createAdminUser()
        .then(() => {
            console.log('✅ Proceso completado');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

module.exports = { createAdminUser };