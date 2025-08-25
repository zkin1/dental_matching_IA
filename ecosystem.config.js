/**
 * Configuración profesional del ecosistema PM2 para Dental Matching
 * Versión: 2.0.0
 * Fecha: 2024
 */

module.exports = {
  apps: [
    {
      name: 'dental-matching-api',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Configuración de monitoreo y logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Configuración de reinicio automático
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Configuración de health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Configuración de timeouts
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Variables de entorno específicas
      env_file: '.env',
      
      // Configuración de clustering
      instance_var: 'INSTANCE_ID',
      
      // Configuración de logs
      merge_logs: true,
      log_type: 'json',
      
      // Configuración de monitoreo
      pmx: true,
      
      // Configuración de notificaciones
      notify: true,
      
      // Configuración de reinicio en caso de error
      max_restarts: 10,
      min_uptime: '10s',
      
      // Configuración de cron para reinicio programado
      cron_restart: '0 2 * * *', // Reinicio diario a las 2 AM
      
      // Configuración de variables de entorno adicionales
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        DEBUG: 'dental-matching:*'
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        DEBUG: 'dental-matching:info'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DEBUG: false
      }
    }
  ],

  // Configuración de deploy
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/dental_matching.git',
      path: '/var/www/dental_matching',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    
    staging: {
      user: 'deploy',
      host: 'your-staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/dental_matching.git',
      path: '/var/www/dental_matching-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    }
  },

  // Configuración de monitoreo
  monitoring: {
    // Configuración de métricas
    metrics: {
      enabled: true,
      interval: 5000
    },
    
    // Configuración de alertas
    alerts: {
      enabled: true,
      cpu_threshold: 80,
      memory_threshold: 80,
      disk_threshold: 90
    }
  }
};
