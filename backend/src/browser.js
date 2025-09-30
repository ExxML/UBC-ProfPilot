// Playwright WebKit browser manager
const { webkit } = require('playwright');
const os = require('os');

// Browser config
const CONFIG = {
  MAX_BROWSERS: 1,  // Single browser instance
  MAX_CONTEXTS_PER_BROWSER: 2,
  MAX_CONTEXT_POOL_SIZE: 1,  // Context pool for reuse
  BROWSER_TIMEOUT: 60000,
  PAGE_TIMEOUT: 60000,
  NAVIGATION_TIMEOUT: 60000,
  IDLE_TIMEOUT: 300000,
  CONTEXT_IDLE_TIMEOUT: 10000,
  MEMORY_PRESSURE_THRESHOLD: 0.6,
  PRELOAD_CONTEXTS: 1,  // Pre-warm a context
};

class BrowserPool {
  constructor() {
    this.lastUsed = new Map();
    this.contextPool = [];  // Pool of reusable contexts
    this.contextLastUsed = new Map();  // Changed from WeakMap to regular Map for proper cleanup
    this.cleanupInterval = null;
    this.isShuttingDown = false;
    this.requestCache = new Map();  // Cache for repeated requests
    this.persistentBrowser = null;  // Single persistent browser
    this.maxCacheSize = 50;  // Strict cache limit
    
    // Start optimization routines
    this.startCleanupRoutine();
    this.preloadResources();
  }

  async getBrowser() {
    if (this.isShuttingDown) {
      throw new Error('Browser pool is shutting down');
    }

    // Return persistent browser if available
    if (this.persistentBrowser) {
      try {
        // Quick health check
        await this.persistentBrowser.version();
        this.lastUsed.set('persistent', Date.now());
        return this.persistentBrowser;
      } catch (error) {
        console.warn('Persistent browser unhealthy, recreating:', error.message);
        this.persistentBrowser = null;
      }
    }

    // Create persistent browser
    const browser = await webkit.launch({
      headless: true,
      timeout: CONFIG.BROWSER_TIMEOUT,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=255'
      }
    });

    this.persistentBrowser = browser;
    this.lastUsed.set('persistent', Date.now());
    
    // Set up browser-level optimizations
    browser.on('disconnected', () => {
      console.log('Browser disconnected, clearing persistent reference');
      this.persistentBrowser = null;
    });
    
    return browser;
  }

  async createContext(browser) {
        // Try to reuse context from pool first
    if (this.contextPool.length > 0) {
      const context = this.contextPool.pop();
      try {
        // Quick health check - try to access pages and verify context is usable
        const pages = await context.pages();
        
        // Additional check to ensure we can create a new page
        const testPage = await context.newPage();
        await testPage.close();
        
        this.contextLastUsed.set(context, Date.now());
        return this.wrapContextForReuse(context);
      } catch (error) {
        // Context is dead, continue to create new one
        console.warn('Pooled context unhealthy, creating new:', error.message);
        // Clean up dead context references
        this.contextLastUsed.delete(context);
        // Try to properly close the unhealthy context
        try {
          await context.close();
        } catch (closeError) {
          // Ignore close errors for unhealthy contexts
        }
      }
    }

    const context = await browser.newContext({
      // Minimal context configuration for maximum performance
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',  // Shorter UA
      viewport: { width: 1024, height: 576 },  // Smaller viewport
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      reducedMotion: 'reduce',
      forcedColors: 'none',
      colorScheme: 'light',
      permissions: [],  // Block all permissions
      httpCredentials: undefined,
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      acceptDownloads: false,
      strictSelectors: false,
      javaScriptEnabled: true,  // Keep JS for scraping
      offline: false,
      timezoneId: undefined,  // Use system timezone
      locale: undefined,  // Use system locale
      extraHTTPHeaders: {
        'Accept': 'text/html',  // Minimal accept header
        'Accept-Language': 'en',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        'DNT': '1'
      }
    });

    // Ultra-aggressive resource blocking
    await context.route('**/*', (route) => {
      const request = route.request();
      const type = request.resourceType();
      const url = request.url();
      
      try {
        const hostname = new URL(url).hostname;
        const isRateMyProf = /(^|\.)ratemyprofessors\.com$/i.test(hostname);
        
        // Immediate abort for non-essential domains
        if (!isRateMyProf) {
          return route.abort('blockedbyclient');
        }
        
        // Block ALL non-essential resource types
        if (['image', 'stylesheet', 'font', 'media', 'websocket', 'manifest', 'eventsource', 'other'].includes(type)) {
          return route.abort('blockedbyclient');
        }
        
        // Block analytics, ads, tracking - expanded list
        const blockPatterns = [
          'analytics', 'tracking', 'ads', 'facebook', 'google-analytics', 'doubleclick',
          'googlesyndication', 'googletagmanager', 'hotjar', 'mixpanel', 'segment',
          'amplitude', 'intercom', 'zendesk', 'twitter', 'linkedin', 'pinterest',
          'instagram', 'tiktok', 'snapchat', 'reddit', 'youtube', 'vimeo',
          'cloudflare', 'jsdelivr', 'cdnjs', 'unpkg', 'bootstrapcdn'
        ];
        
        if (blockPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
          return route.abort('blockedbyclient');
        }
        
        // Cache simple GET requests with size limit
        if (request.method() === 'GET' && type === 'document') {
          const cacheKey = url;
          if (this.requestCache.has(cacheKey)) {
            const cached = this.requestCache.get(cacheKey);
            return route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: cached
            });
          }
        }
        
        route.continue();
      } catch (error) {
        route.abort('blockedbyclient');
      }
    });

    // Add response caching for repeated requests with strict limits
    context.on('response', async (response) => {
      try {
        if (response.request().method() === 'GET' && 
            response.status() === 200 && 
            response.headers()['content-type']?.includes('text/html')) {
          const body = await response.text();
          if (body.length < 50000) {  // Only cache small responses
            this.requestCache.set(response.url(), body);
            // Enforce strict cache size limit
            if (this.requestCache.size > this.maxCacheSize) {
              // Remove oldest entries (FIFO)
              const keysToRemove = Array.from(this.requestCache.keys()).slice(0, this.requestCache.size - this.maxCacheSize + 10);
              keysToRemove.forEach(key => this.requestCache.delete(key));
            }
          }
        }
      } catch (error) {
        // Ignore caching errors
      }
    });

    this.contextLastUsed.set(context, Date.now());
    return this.wrapContextForReuse(context);
  }

  wrapContextForReuse(context) {
    // Override close method to return context to pool instead of destroying
    const originalClose = context.close.bind(context);
    const pool = this;
    
    context.close = async function() {
      try {
        // Clear pages but keep context alive
        const pages = await this.pages();
        await Promise.all(pages.map(page => {
          return page.close().catch(error => {
            // Ignore errors from pages that are already closed
            if (!error.message.includes('Target page, context or browser has been closed')) {
              console.warn('Error closing page:', error.message);
            }
          });
        }));
        
        // Verify context is still healthy before returning to pool
        try {
          await this.pages(); // Health check
          
          // Return to pool if there's space and not shutting down
          if (pool.contextPool.length < CONFIG.MAX_CONTEXT_POOL_SIZE && !pool.isShuttingDown) {
            pool.contextPool.push(this);
            pool.contextLastUsed.set(this, Date.now());
            return;
          }
        } catch (healthError) {
          // Context is no longer healthy, don't return to pool
          console.warn('Context unhealthy, not returning to pool:', healthError.message);
          // Clean up from tracking
          pool.contextLastUsed.delete(this);
        }
      } catch (error) {
        console.warn('Error preparing context for reuse:', error.message);
        // Clean up from tracking on error
        pool.contextLastUsed.delete(this);
      }
      
      // Actually close if can't reuse
      pool.contextLastUsed.delete(this);
      return originalClose();
    };

    return context;
  }

  getBrowserId(browser) {
    if (browser === this.persistentBrowser) return 'persistent';
    return null;
  }

  async preloadResources() {
    // Pre-warm contexts for immediate availability
    if (CONFIG.PRELOAD_CONTEXTS > 0) {
      try {
        const browser = await this.getBrowser();
        for (let i = 0; i < CONFIG.PRELOAD_CONTEXTS; i++) {
          const context = await this.createContext(browser);
          await context.close(); // This will add it to the pool
        }
        console.log(`Pre-warmed ${CONFIG.PRELOAD_CONTEXTS} contexts`);
      } catch (error) {
        console.warn('Failed to preload contexts:', error.message);
      }
    }
  }

  startCleanupRoutine() {
    this.cleanupInterval = setInterval(async () => {
      if (this.isShuttingDown) return;
      
      try {
        const now = Date.now();
        
        // Enhanced memory pressure monitoring
        let isHighMemory = false;
        try {
          const memUsage = process.memoryUsage();
          const totalMem = os.totalmem();
          const memRatio = memUsage.rss / totalMem;
          isHighMemory = memRatio > CONFIG.MEMORY_PRESSURE_THRESHOLD;
        } catch (_) {}

        // Clean up old contexts from pool
        const contextsToRemove = [];
        for (let i = 0; i < this.contextPool.length; i++) {
          const context = this.contextPool[i];
          const lastUsed = this.contextLastUsed.get(context) || 0;
          const idleTime = isHighMemory ? CONFIG.CONTEXT_IDLE_TIMEOUT / 2 : CONFIG.CONTEXT_IDLE_TIMEOUT;
          
          if ((now - lastUsed) > idleTime) {
            contextsToRemove.push(i);
          }
        }
        
        // Remove old contexts (in reverse order to maintain indices)
        for (let i = contextsToRemove.length - 1; i >= 0; i--) {
          const index = contextsToRemove[i];
          const context = this.contextPool[index];
          try {
            const pages = await context.pages();
            await Promise.all(pages.map(page => page.close().catch(() => {})));
            await context.close();
            this.contextPool.splice(index, 1);
            this.contextLastUsed.delete(context);
          } catch (error) {
            // Context already closed, just remove from pool
            this.contextPool.splice(index, 1);
            this.contextLastUsed.delete(context);
          }
        }

        // Perform health check on persistent browser
        if (this.persistentBrowser) {
          try {
            await this.persistentBrowser.version();
            // Browser is healthy, do nothing
          } catch (error) {
            console.warn('Persistent browser unhealthy, recreating:', error.message);
            try {
              await this.persistentBrowser.close();
            } catch (closeError) {
              // Pass
            }
            this.persistentBrowser = null;
            this.lastUsed.delete('persistent');
          }
        }

        // Memory pressure response
        if (isHighMemory) {
          console.log(`High memory usage detected: ${(memRatio * 100).toFixed(1)}%`);
        }

      } catch (error) {
        console.error('Error in cleanup routine:', error.message);
      }
    }, 10000); // Run cleanup every 10 seconds
  }

  async closeAll() {
    this.isShuttingDown = true;

    // Clear intervals immediately
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const closePromises = [];

    // Close all contexts in pool with timeout protection
    for (const context of this.contextPool) {
      closePromises.push(
        (async () => {
          try {
            // Add timeout to prevent hanging
            await Promise.race([
              (async () => {
                const pages = await context.pages();
                await Promise.all(pages.map(page => page.close().catch(() => {})));
                await context.close();
                this.contextLastUsed.delete(context);
              })(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Context close timeout')), 5000)
              )
            ]);
          } catch (error) {
            console.warn('Error closing pooled context:', error.message);
            this.contextLastUsed.delete(context);
          }
        })()
      );
    }

    // Close persistent browser with timeout protection
    if (this.persistentBrowser) {
      closePromises.push(
        Promise.race([
          this.persistentBrowser.close().catch(error =>
            console.error('Error closing persistent browser:', error.message)
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Browser close timeout')), 10000)
          )
        ])
      );
    }

    // Use allSettled with overall timeout to prevent indefinite hanging
    await Promise.race([
      Promise.allSettled(closePromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Browser cleanup timeout')), 25000)
      )
    ]);

    // Clear all data structures
    this.lastUsed.clear();
    this.contextPool.length = 0;
    this.contextLastUsed.clear();
    this.requestCache.clear();
    this.persistentBrowser = null;

    console.log('All browsers and contexts closed successfully');
  }

  async closePersistentBrowser() {
    if (this.persistentBrowser) {
      try {
        console.log('Closing persistent browser...');
        await Promise.race([
          this.persistentBrowser.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Persistent browser close timeout')), 10000)
          )
        ]);
        this.persistentBrowser = null;
        this.lastUsed.delete('persistent');
        console.log('Persistent browser closed successfully');
      } catch (error) {
        console.error('Error closing persistent browser:', error.message);
        // Clear the reference even if close failed
        this.persistentBrowser = null;
        this.lastUsed.delete('persistent');
        throw error;
      }
    } else {
      console.log('No persistent browser to close');
    }
  }

  getStats() {
    const memUsage = process.memoryUsage();
    return {
      totalBrowsers: (this.persistentBrowser ? 1 : 0),
      totalContexts: 0,
      pooledContexts: this.contextPool.length,
      cacheSize: this.requestCache.size,
      memoryUsage: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      persistentBrowser: this.persistentBrowser ? {
        lastUsed: this.lastUsed.get('persistent') || 0,
        isConnected: !this.persistentBrowser.disconnected
      } : null,
      browsersInfo: []
    };
  }
}

// Global browser pool instance
const browserPool = new BrowserPool();

// Public API functions
async function getBrowser() {
  return browserPool.getBrowser();
}

async function createContext(browser) {
  return browserPool.createContext(browser);
}

async function createPage(context) {
  const page = await context.newPage();
  
  // Page optimizations
  await page.setDefaultTimeout(CONFIG.PAGE_TIMEOUT);
  await page.setDefaultNavigationTimeout(CONFIG.NAVIGATION_TIMEOUT);
  
  // Disable unnecessary features
  await page.setViewportSize({ width: 426, height: 240 });
  
  return page;
}

async function navigate(page, url) {
  try {
    // Ultra-fast navigation with minimal waiting
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded', // Don't wait for all resources
      timeout: CONFIG.NAVIGATION_TIMEOUT
    });
    
    // Immediately stop loading to prevent additional resources
    await page.evaluate(() => {
      if (window.stop) window.stop();
    });
    
    return response;
  } catch (error) {
    if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
      // Try to use the page anyway if we have some content
      try {
        await page.evaluate(() => document.readyState);
        return null; // Navigation partially succeeded
      } catch (evalError) {
        throw error; // Page is really broken
      }
    }
    throw error;
  }
}

async function closeBrowser() {
  await browserPool.closeAll();
}

async function closePersistentBrowser() {
  await browserPool.closePersistentBrowser();
}

function getBrowserStats() {
  return browserPool.getStats();
}

module.exports = {
  getBrowser,
  createContext,
  createPage,
  navigate,
  closeBrowser,
  closePersistentBrowser,
  getBrowserStats,
  CONFIG
};
