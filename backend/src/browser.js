// Optimized Playwright WebKit browser manager
const { webkit } = require('playwright');

// Configuration for browser pool and optimization
const CONFIG = {
  MAX_BROWSERS: parseInt(process.env.MAX_BROWSERS) || 2,  // Maximum number of browser instances
  MAX_CONTEXTS_PER_BROWSER: parseInt(process.env.MAX_CONTEXTS_PER_BROWSER) || 10,  // Maximum contexts per browser
  BROWSER_TIMEOUT: parseInt(process.env.BROWSER_TIMEOUT) || 30000,  // Browser operation timeout (30s)
  PAGE_TIMEOUT: parseInt(process.env.PAGE_TIMEOUT) || 15000,  // Page operation timeout (15s)
  IDLE_TIMEOUT: parseInt(process.env.IDLE_TIMEOUT) || 300000,  // Close idle browsers after 5 minutes
  MEMORY_PRESSURE_THRESHOLD: parseFloat(process.env.MEMORY_PRESSURE_THRESHOLD) || 0.8  // Memory pressure threshold
};

class BrowserPool {
  constructor() {
    this.browsers = new Map();
    this.contextCounts = new Map();
    this.lastUsed = new Map();
    this.cleanupInterval = null;
    this.isShuttingDown = false;
    
    // Start cleanup routine
    this.startCleanupRoutine();
  }

  async getBrowser() {
    if (this.isShuttingDown) {
      throw new Error('Browser pool is shutting down');
    }

    // Try to reuse existing browser with available context slots
    for (const [browserId, browser] of this.browsers) {
      const contextCount = this.contextCounts.get(browserId) || 0;
      if (contextCount < CONFIG.MAX_CONTEXTS_PER_BROWSER) {
        this.lastUsed.set(browserId, Date.now());
        return browser;
      }
    }

    // Create new browser if under limit
    if (this.browsers.size < CONFIG.MAX_BROWSERS) {
      const browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const browser = await webkit.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-back-forward-cache',
          '--disable-component-extensions-with-background-pages',
          '--memory-pressure-off'
        ],
        timeout: CONFIG.BROWSER_TIMEOUT
      });

      this.browsers.set(browserId, browser);
      this.contextCounts.set(browserId, 0);
      this.lastUsed.set(browserId, Date.now());
      
      return browser;
    }

    // If at limit, wait briefly for a context to free up, then reuse least busy browser
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let leastBusyBrowser = null;
    let minContexts = Infinity;
    
    for (const [browserId, browser] of this.browsers) {
      const contextCount = this.contextCounts.get(browserId) || 0;
      if (contextCount < minContexts) {
        minContexts = contextCount;
        leastBusyBrowser = browser;
      }
    }
    
    return leastBusyBrowser;
  }

  async createOptimizedContext(browser) {
    const browserId = this.getBrowserId(browser);
    if (browserId) {
      const currentCount = this.contextCounts.get(browserId) || 0;
      this.contextCounts.set(browserId, currentCount + 1);
    }

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      reducedMotion: 'reduce',
      forcedColors: 'none',
      colorScheme: 'light',
      timezoneId: 'America/Vancouver',
      locale: 'en-US',
      permissions: [],  // Block all permissions
      httpCredentials: undefined,
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      acceptDownloads: false,
      strictSelectors: false,
      timeout: CONFIG.PAGE_TIMEOUT
    });

    // Enhanced resource blocking for maximum efficiency
    await context.route('**/*', (route) => {
      const request = route.request();
      const type = request.resourceType();
      const url = request.url();
      
      try {
        const hostname = new URL(url).hostname;
        const isRateMyProf = /(^|\.)ratemyprofessors\.com$/i.test(hostname);
        
        // Block external domains entirely
        if (!isRateMyProf) {
          return route.abort('blockedbyclient');
        }
        
        // Block resource-heavy content types
        if (['image', 'stylesheet', 'font', 'media', 'websocket', 'manifest', 'eventsource'].includes(type)) {
          return route.abort('blockedbyclient');
        }
        
        // Block specific analytics and tracking
        if (url.includes('analytics') || url.includes('tracking') || url.includes('ads') || 
            url.includes('facebook') || url.includes('google-analytics') || url.includes('doubleclick')) {
          return route.abort('blockedbyclient');
        }
        
        route.continue();
      } catch (error) {
        route.abort('blockedbyclient');
      }
    });

    // Add context cleanup tracking
    const originalClose = context.close.bind(context);
    context.close = async () => {
      if (browserId) {
        const currentCount = this.contextCounts.get(browserId) || 0;
        this.contextCounts.set(browserId, Math.max(0, currentCount - 1));
      }
      return originalClose();
    };

    return context;
  }

  getBrowserId(browser) {
    for (const [browserId, b] of this.browsers) {
      if (b === browser) return browserId;
    }
    return null;
  }

  startCleanupRoutine() {
    this.cleanupInterval = setInterval(async () => {
      if (this.isShuttingDown) return;
      
      const now = Date.now();
      const browsersToClose = [];
      
      for (const [browserId, browser] of this.browsers) {
        const lastUsedTime = this.lastUsed.get(browserId) || 0;
        const contextCount = this.contextCounts.get(browserId) || 0;
        
        // Close idle browsers with no active contexts
        if (contextCount === 0 && (now - lastUsedTime) > CONFIG.IDLE_TIMEOUT) {
          browsersToClose.push(browserId);
        }
      }
      
      // Close idle browsers
      for (const browserId of browsersToClose) {
        try {
          const browser = this.browsers.get(browserId);
          if (browser) {
            await browser.close();
            this.browsers.delete(browserId);
            this.contextCounts.delete(browserId);
            this.lastUsed.delete(browserId);
            console.log(`Closed idle browser: ${browserId}`);
          }
        } catch (error) {
          console.error(`Error closing idle browser ${browserId}:`, error.message);
        }
      }
    }, 60000); // Run cleanup every minute
  }

  async closeAll() {
    this.isShuttingDown = true;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    const closePromises = [];
    for (const [browserId, browser] of this.browsers) {
      closePromises.push(
        browser.close().catch(error => 
          console.error(`Error closing browser ${browserId}:`, error.message)
        )
      );
    }
    
    await Promise.allSettled(closePromises);
    
    this.browsers.clear();
    this.contextCounts.clear();
    this.lastUsed.clear();
    
    console.log('All browsers closed successfully');
  }

  getStats() {
    return {
      totalBrowsers: this.browsers.size,
      totalContexts: Array.from(this.contextCounts.values()).reduce((sum, count) => sum + count, 0),
      browsersInfo: Array.from(this.browsers.keys()).map(browserId => ({
        id: browserId,
        contexts: this.contextCounts.get(browserId) || 0,
        lastUsed: this.lastUsed.get(browserId) || 0
      }))
    };
  }
}

// Global browser pool instance
const browserPool = new BrowserPool();

// Public API functions
async function getBrowser() {
  return browserPool.getBrowser();
}

async function createOptimizedContext(browser) {
  return browserPool.createOptimizedContext(browser);
}

async function closeBrowser() {
  await browserPool.closeAll();
}

function getBrowserStats() {
  return browserPool.getStats();
}

// Graceful shutdown handlers
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Closing browsers gracefully...`);
  try {
    await browserPool.closeAll();
    console.log('Browser cleanup completed');
  } catch (error) {
    console.error('Error during browser cleanup:', error.message);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await browserPool.closeAll();
  process.exit(1);
});
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  await browserPool.closeAll();
  process.exit(1);
});

module.exports = { 
  getBrowser, 
  createOptimizedContext, 
  closeBrowser, 
  getBrowserStats,
  CONFIG 
};


