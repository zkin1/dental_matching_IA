/**
 * DENTAL MATCHING - SYSTEM METRICS COLLECTOR
 * Advanced system monitoring and metrics collection
 */

const loggerService = require('../logging/logger');
const EventEmitter = require('events');

class SystemMetrics extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.collectors = new Map();
    this.isRunning = false;
    this.collectInterval = null;
    this.config = {
      interval: parseInt(process.env.METRICS_COLLECTION_INTERVAL) || 30000,
      retention: parseInt(process.env.METRICS_RETENTION_PERIOD) || 86400000, // 24 hours
      maxDataPoints: parseInt(process.env.MAX_METRIC_DATA_POINTS) || 1000
    };
  }

  /**
   * Register a metric collector
   */
  registerCollector(name, collector, options = {}) {
    this.collectors.set(name, {
      name,
      collect: collector,
      interval: options.interval || this.config.interval,
      lastRun: null,
      enabled: options.enabled !== false,
      tags: options.tags || {},
      description: options.description || `Metric collector for ${name}`
    });

    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        dataPoints: [],
        lastValue: null,
        lastUpdated: null,
        statistics: {
          min: null,
          max: null,
          avg: null,
          count: 0
        }
      });
    }

    loggerService.debug('Metric collector registered', {
      name,
      interval: options.interval || this.config.interval,
      enabled: options.enabled !== false
    });
  }

  /**
   * Start metrics collection
   */
  start() {
    if (this.isRunning) {
      loggerService.warn('Metrics collection is already running');
      return;
    }

    this.isRunning = true;
    this.collectInterval = setInterval(async () => {
      await this.collectAllMetrics();
    }, this.config.interval);

    // Initial collection
    this.collectAllMetrics();

    loggerService.info('System metrics collection started', {
      interval: this.config.interval,
      collectors: this.collectors.size,
      retention: this.config.retention
    });

    this.emit('started');
  }

  /**
   * Stop metrics collection
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }

    loggerService.info('System metrics collection stopped');
    this.emit('stopped');
  }

  /**
   * Collect all metrics
   */
  async collectAllMetrics() {
    const collectionPromises = Array.from(this.collectors.values())
      .filter(collector => collector.enabled)
      .map(collector => this.collectMetric(collector.name));

    try {
      await Promise.all(collectionPromises);
      this.cleanupOldDataPoints();
      this.emit('collection_complete');
    } catch (error) {
      loggerService.error('Metrics collection error', {
        error: error.message
      });
    }
  }

  /**
   * Collect a specific metric
   */
  async collectMetric(name) {
    const collector = this.collectors.get(name);
    if (!collector || !collector.enabled) {
      return;
    }

    try {
      const startTime = Date.now();
      const value = await collector.collect();
      const duration = Date.now() - startTime;
      const timestamp = new Date();

      this.addDataPoint(name, value, timestamp, {
        collectionDuration: duration,
        ...collector.tags
      });

      collector.lastRun = timestamp;

      this.emit('metric_collected', {
        name,
        value,
        timestamp,
        duration
      });

    } catch (error) {
      loggerService.error('Metric collection failed', {
        collector: name,
        error: error.message
      });

      this.emit('collection_error', {
        name,
        error: error.message
      });
    }
  }

  /**
   * Add data point to metric
   */
  addDataPoint(name, value, timestamp, metadata = {}) {
    const metric = this.metrics.get(name);
    if (!metric) {
      loggerService.warn('Attempted to add data point to unregistered metric', {
        name
      });
      return;
    }

    const dataPoint = {
      value,
      timestamp,
      metadata
    };

    metric.dataPoints.push(dataPoint);
    metric.lastValue = value;
    metric.lastUpdated = timestamp;

    // Update statistics
    this.updateStatistics(metric);

    // Limit data points
    if (metric.dataPoints.length > this.config.maxDataPoints) {
      metric.dataPoints = metric.dataPoints.slice(-this.config.maxDataPoints);
    }
  }

  /**
   * Update metric statistics
   */
  updateStatistics(metric) {
    if (metric.dataPoints.length === 0) return;

    const values = metric.dataPoints.map(dp => dp.value).filter(v => typeof v === 'number');
    
    if (values.length === 0) return;

    metric.statistics = {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      count: values.length,
      current: metric.lastValue
    };
  }

  /**
   * Clean up old data points
   */
  cleanupOldDataPoints() {
    const cutoffTime = new Date(Date.now() - this.config.retention);
    let totalRemoved = 0;

    for (const [name, metric] of this.metrics) {
      const originalLength = metric.dataPoints.length;
      metric.dataPoints = metric.dataPoints.filter(dp => dp.timestamp > cutoffTime);
      const removed = originalLength - metric.dataPoints.length;
      totalRemoved += removed;

      if (removed > 0) {
        this.updateStatistics(metric);
      }
    }

    if (totalRemoved > 0) {
      loggerService.debug('Cleaned up old metric data points', {
        removed: totalRemoved,
        cutoffTime: cutoffTime.toISOString()
      });
    }
  }

  /**
   * Get metric data
   */
  getMetric(name, options = {}) {
    const metric = this.metrics.get(name);
    if (!metric) {
      return null;
    }

    let dataPoints = metric.dataPoints;

    // Apply time range filter
    if (options.since) {
      const sinceTime = new Date(options.since);
      dataPoints = dataPoints.filter(dp => dp.timestamp >= sinceTime);
    }

    if (options.until) {
      const untilTime = new Date(options.until);
      dataPoints = dataPoints.filter(dp => dp.timestamp <= untilTime);
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      dataPoints = dataPoints.slice(-options.limit);
    }

    return {
      name: metric.name,
      statistics: metric.statistics,
      lastValue: metric.lastValue,
      lastUpdated: metric.lastUpdated,
      dataPoints: options.includeDataPoints !== false ? dataPoints : [],
      totalDataPoints: metric.dataPoints.length
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(options = {}) {
    const metrics = {};
    
    for (const [name] of this.metrics) {
      metrics[name] = this.getMetric(name, options);
    }

    return {
      timestamp: new Date().toISOString(),
      isRunning: this.isRunning,
      config: this.config,
      collectors: Array.from(this.collectors.values()).map(c => ({
        name: c.name,
        enabled: c.enabled,
        lastRun: c.lastRun,
        description: c.description
      })),
      metrics
    };
  }

  /**
   * Get system overview
   */
  getSystemOverview() {
    const overview = {
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
        uptime: process.uptime()
      },
      memory: process.memoryUsage(),
      cpu: {
        usage: process.cpuUsage()
      }
    };

    // Add OS information
    const os = require('os');
    overview.os = {
      hostname: os.hostname(),
      type: os.type(),
      release: os.release(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpus: os.cpus().length
    };

    return overview;
  }

  /**
   * Register default system collectors
   */
  registerDefaultCollectors() {
    // Memory usage collector
    this.registerCollector('memory_usage', () => {
      const memUsage = process.memoryUsage();
      const osMemUsage = require('os');
      
      return {
        process: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        },
        system: {
          total: osMemUsage.totalmem(),
          free: osMemUsage.freemem(),
          used: osMemUsage.totalmem() - osMemUsage.freemem()
        }
      };
    }, {
      description: 'System and process memory usage',
      tags: { category: 'system', type: 'memory' }
    });

    // CPU usage collector
    this.registerCollector('cpu_usage', () => {
      const cpuUsage = process.cpuUsage();
      const loadAvg = require('os').loadavg();
      
      return {
        process: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        system: {
          loadAvg1m: loadAvg[0],
          loadAvg5m: loadAvg[1],
          loadAvg15m: loadAvg[2]
        }
      };
    }, {
      description: 'CPU usage metrics',
      tags: { category: 'system', type: 'cpu' }
    });

    // Event loop lag collector
    this.registerCollector('event_loop_lag', () => {
      return new Promise((resolve) => {
        const start = process.hrtime.bigint();
        setImmediate(() => {
          const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
          resolve(lag);
        });
      });
    }, {
      description: 'Event loop lag measurement',
      tags: { category: 'performance', type: 'event_loop' }
    });

    // Active handles and requests
    this.registerCollector('handles_requests', () => {
      return {
        activeHandles: process._getActiveHandles().length,
        activeRequests: process._getActiveRequests().length
      };
    }, {
      description: 'Active handles and requests count',
      tags: { category: 'system', type: 'resources' }
    });

    // GC statistics (if available)
    try {
      const v8 = require('v8');
      this.registerCollector('gc_stats', () => {
        const heapStats = v8.getHeapStatistics();
        const heapSpaceStats = v8.getHeapSpaceStatistics();
        
        return {
          heap: heapStats,
          spaces: heapSpaceStats.reduce((acc, space) => {
            acc[space.space_name] = space;
            return acc;
          }, {})
        };
      }, {
        description: 'Garbage collection statistics',
        tags: { category: 'performance', type: 'gc' }
      });
    } catch (error) {
      // V8 module not available
    }

    loggerService.info('Default system collectors registered');
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeRange = 3600000) { // Default 1 hour
    const since = new Date(Date.now() - timeRange);
    const summary = {
      timestamp: new Date().toISOString(),
      timeRange: timeRange,
      metrics: {}
    };

    // Key performance metrics
    const keyMetrics = ['memory_usage', 'cpu_usage', 'event_loop_lag'];
    
    for (const metricName of keyMetrics) {
      const metric = this.getMetric(metricName, { since });
      if (metric) {
        summary.metrics[metricName] = {
          current: metric.lastValue,
          statistics: metric.statistics,
          dataPoints: metric.dataPoints.length
        };
      }
    }

    return summary;
  }

  /**
   * Export metrics data
   */
  exportMetrics(format = 'json', options = {}) {
    const data = this.getAllMetrics(options);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        return this.exportToCsv(data);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV format
   */
  exportToCsv(data) {
    const lines = ['timestamp,metric,value,metadata'];
    
    for (const [metricName, metric] of Object.entries(data.metrics)) {
      for (const dataPoint of metric.dataPoints) {
        const timestamp = dataPoint.timestamp.toISOString();
        const value = typeof dataPoint.value === 'object' 
          ? JSON.stringify(dataPoint.value) 
          : dataPoint.value;
        const metadata = JSON.stringify(dataPoint.metadata || {});
        
        lines.push(`${timestamp},${metricName},${value},"${metadata}"`);
      }
    }
    
    return lines.join('\n');
  }
}

// Create singleton instance
const systemMetrics = new SystemMetrics();

module.exports = systemMetrics;