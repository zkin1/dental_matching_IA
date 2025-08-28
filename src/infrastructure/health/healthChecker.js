/**
 * DENTAL MATCHING - HEALTH CHECK SYSTEM
 * Comprehensive application health monitoring
 */

const loggerService = require('../logging/logger');

class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.lastResults = new Map();
    this.config = {
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
      retries: parseInt(process.env.HEALTH_CHECK_RETRIES) || 3
    };
    this.monitoring = false;
  }

  /**
   * Register a health check
   */
  register(name, checkFunction, options = {}) {
    const check = {
      name,
      check: checkFunction,
      timeout: options.timeout || this.config.timeout,
      critical: options.critical !== false, // Default to critical
      tags: options.tags || [],
      description: options.description || `Health check for ${name}`,
      retries: options.retries || this.config.retries,
      lastRun: null,
      lastResult: null,
      consecutiveFailures: 0
    };

    this.checks.set(name, check);
    
    loggerService.info('Health check registered', {
      name,
      critical: check.critical,
      timeout: check.timeout,
      description: check.description
    });
  }

  /**
   * Run a single health check
   */
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    let result = {
      name,
      status: 'unknown',
      message: '',
      data: null,
      duration: 0,
      timestamp: new Date().toISOString(),
      critical: check.critical
    };

    try {
      // Execute check with timeout
      const checkResult = await this.executeWithTimeout(check.check, check.timeout);
      const duration = Date.now() - startTime;

      result = {
        ...result,
        status: checkResult.status || 'healthy',
        message: checkResult.message || 'Check passed',
        data: checkResult.data || null,
        duration,
        error: null
      };

      check.consecutiveFailures = 0;
      
      loggerService.debug('Health check completed', {
        name,
        status: result.status,
        duration,
        critical: check.critical
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      check.consecutiveFailures++;

      result = {
        ...result,
        status: 'unhealthy',
        message: error.message || 'Health check failed',
        duration,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.constructor.name
        }
      };

      loggerService.error('Health check failed', {
        name,
        error: error.message,
        duration,
        consecutiveFailures: check.consecutiveFailures,
        critical: check.critical
      });
    }

    check.lastRun = new Date();
    check.lastResult = result;
    this.lastResults.set(name, result);

    return result;
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      duration: 0,
      checks: {},
      summary: {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        critical_failures: 0
      }
    };

    const startTime = Date.now();
    const checkPromises = Array.from(this.checks.keys()).map(async (name) => {
      try {
        const result = await this.runCheck(name);
        return { name, result };
      } catch (error) {
        return {
          name,
          result: {
            name,
            status: 'unhealthy',
            message: error.message,
            duration: 0,
            timestamp: new Date().toISOString(),
            critical: this.checks.get(name).critical,
            error: {
              message: error.message,
              type: error.constructor.name
            }
          }
        };
      }
    });

    try {
      const checkResults = await Promise.all(checkPromises);
      
      for (const { name, result } of checkResults) {
        results.checks[name] = result;
        results.summary.total++;

        if (result.status === 'healthy') {
          results.summary.healthy++;
        } else {
          results.summary.unhealthy++;
          
          if (result.critical) {
            results.summary.critical_failures++;
            results.status = 'unhealthy';
          }
        }
      }

      results.duration = Date.now() - startTime;

      // Log overall health status
      loggerService.logHealthCheck(results.status, {
        total: results.summary.total,
        healthy: results.summary.healthy,
        unhealthy: results.summary.unhealthy,
        criticalFailures: results.summary.critical_failures,
        duration: results.duration
      });

    } catch (error) {
      results.status = 'unhealthy';
      results.duration = Date.now() - startTime;
      results.error = error.message;

      loggerService.error('Health check execution failed', {
        error: error.message,
        duration: results.duration
      });
    }

    return results;
  }

  /**
   * Get current health status
   */
  async getStatus() {
    return await this.runAllChecks();
  }

  /**
   * Get detailed health report
   */
  getDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        registered: this.checks.size,
        monitoring: this.monitoring
      }
    };

    for (const [name, check] of this.checks) {
      report.checks[name] = {
        name: check.name,
        description: check.description,
        critical: check.critical,
        tags: check.tags,
        timeout: check.timeout,
        lastRun: check.lastRun,
        lastResult: check.lastResult,
        consecutiveFailures: check.consecutiveFailures
      };
    }

    return report;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    if (this.monitoring) {
      loggerService.warn('Health monitoring is already running');
      return;
    }

    this.monitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runAllChecks();
      } catch (error) {
        loggerService.error('Health monitoring cycle failed', {
          error: error.message
        });
      }
    }, this.config.interval);

    loggerService.info('Health monitoring started', {
      interval: this.config.interval,
      registeredChecks: this.checks.size
    });
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (!this.monitoring) {
      return;
    }

    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    loggerService.info('Health monitoring stopped');
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Express middleware for health check endpoint
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const health = await this.getStatus();
        const statusCode = health.status === 'healthy' ? 200 : 503;

        res.status(statusCode).json({
          success: health.status === 'healthy',
          ...health
        });
      } catch (error) {
        loggerService.error('Health check middleware error', {
          error: error.message,
          path: req.path
        });

        res.status(503).json({
          success: false,
          status: 'unhealthy',
          message: 'Health check system error',
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Detailed health check endpoint middleware
   */
  detailedMiddleware() {
    return (req, res, next) => {
      try {
        const report = this.getDetailedReport();
        res.json({
          success: true,
          ...report
        });
      } catch (error) {
        loggerService.error('Detailed health check error', {
          error: error.message
        });

        res.status(500).json({
          success: false,
          message: 'Failed to generate health report',
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Register default system health checks
   */
  registerDefaultChecks() {
    // Memory usage check
    this.register('memory', async () => {
      const memoryUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      const data = {
        process: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        system: {
          total: Math.round(totalMemory / 1024 / 1024),
          free: Math.round(freeMemory / 1024 / 1024),
          used: Math.round(usedMemory / 1024 / 1024),
          usagePercent: Math.round(memoryUsagePercent)
        }
      };

      return {
        status: memoryUsagePercent > 90 ? 'unhealthy' : 'healthy',
        message: `Memory usage: ${data.system.usagePercent}%`,
        data
      };
    }, {
      critical: true,
      description: 'System and process memory usage monitoring'
    });

    // CPU usage check  
    this.register('cpu', async () => {
      const cpus = require('os').cpus();
      const loadAvg = require('os').loadavg();
      
      const data = {
        cores: cpus.length,
        loadAverage: {
          '1m': Math.round(loadAvg[0] * 100) / 100,
          '5m': Math.round(loadAvg[1] * 100) / 100,
          '15m': Math.round(loadAvg[2] * 100) / 100
        },
        usage: Math.round((loadAvg[0] / cpus.length) * 100)
      };

      return {
        status: data.usage > 90 ? 'unhealthy' : 'healthy',
        message: `CPU usage: ${data.usage}%`,
        data
      };
    }, {
      critical: true,
      description: 'CPU usage and load average monitoring'
    });

    // Disk usage check
    this.register('disk', async () => {
      const fs = require('fs').promises;
      const path = require('path');
      
      try {
        const stats = await fs.statfs(process.cwd());
        const total = stats.bavail * stats.bsize;
        const free = stats.bavail * stats.bsize;
        const used = total - free;
        const usagePercent = (used / total) * 100;

        const data = {
          total: Math.round(total / 1024 / 1024 / 1024), // GB
          free: Math.round(free / 1024 / 1024 / 1024),
          used: Math.round(used / 1024 / 1024 / 1024),
          usagePercent: Math.round(usagePercent)
        };

        return {
          status: usagePercent > 90 ? 'unhealthy' : 'healthy',
          message: `Disk usage: ${data.usagePercent}%`,
          data
        };
      } catch (error) {
        return {
          status: 'healthy',
          message: 'Disk check not available on this system',
          data: null
        };
      }
    }, {
      critical: false,
      description: 'Disk space usage monitoring'
    });

    // Process uptime check
    this.register('uptime', async () => {
      const uptime = process.uptime();
      const systemUptime = require('os').uptime();
      
      const data = {
        process: {
          seconds: Math.round(uptime),
          human: this.formatUptime(uptime)
        },
        system: {
          seconds: Math.round(systemUptime),
          human: this.formatUptime(systemUptime)
        }
      };

      return {
        status: 'healthy',
        message: `Process uptime: ${data.process.human}`,
        data
      };
    }, {
      critical: false,
      description: 'Process and system uptime monitoring'
    });

    loggerService.info('Default health checks registered', {
      checks: ['memory', 'cpu', 'disk', 'uptime']
    });
  }

  /**
   * Format uptime in human readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
  }
}

// Create singleton instance
const healthChecker = new HealthChecker();

module.exports = healthChecker;