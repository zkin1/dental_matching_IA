/**
 * Configuración de PM2 para Dental Matching System
 * Gestión de procesos en producción
 */

module.exports = {
  apps: [{
    name: 'dental-matching',
    script: 'server.js',
    instances: 'max', // Usar todos los CPUs disponibles
    exec_mode: 'cluster',
    
    // Configuración de entorno
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Configuración de logs
    log_file: './logs/pm2.log',
    out_file: './logs/pm2-out.log',
    error_file: './logs/pm2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configuración de monitoreo
    watch: false, // Deshabilitar en producción
    ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
    
    // Configuración de reinicio
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // Configuración de timeouts
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Configuración de variables de entorno
    env_file: '.env',
    
    // Configuración de health check
    health_check_grace_period: 3000,
    
    // Configuración de clustering
    instance_var: 'INSTANCE_ID',
    
    // Configuración de logs
    merge_logs: true,
    
    // Configuración de signals
    kill_timeout: 5000,
    
    // Configuración de autorestart
    autorestart: true,
    
    // Configuración de cron
    cron_restart: '0 2 * * *', // Reiniciar a las 2 AM diariamente
    
    // Configuración de variables específicas
    node_args: '--max-old-space-size=1024',
    
    // Configuración de PM2
    pmx: true,
    
    // Configuración de monitoreo
    monitor: true,
    
    // Configuración de logs de PM2
    pm2_log_path: './logs',
    pm2_log_type: 'json',
    
    // Configuración de variables de entorno adicionales
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    },
    
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },
    
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'warn'
    }
  }],
  
  // Configuración de deploy
  deploy: {
    production: {
      user: 'node',
      host: 'your-production-host.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/dental_matching.git',
      path: '/var/www/dental_matching',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/dental_matching'
    },
    
    staging: {
      user: 'node',
      host: 'your-staging-host.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/dental_matching.git',
      path: '/var/www/dental_matching-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': 'mkdir -p /var/www/dental_matching-staging'
    }
  }
};
