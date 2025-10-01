// Playwright WebKit browser manager
const { webkit } = require('playwright');

// Single persistent browser config
const CONFIG = {
  MAX_CONTEXT_POOL_SIZE: 3,  // Context pool for reuse
  BROWSER_TIMEOUT: 180000,
  PAGE_TIMEOUT: 180000,
  NAVIGATION_TIMEOUT: 180000,
  PRELOAD_CONTEXTS: 1,  // Pre-warm a context
};

// Helper function to safely close resources by checking if they're already closed first
async function safeClose(resource, resourceName = 'resource') {
  try {
    // Check if the resource is already closed before attempting to close it
    let isClosed = false;

    // Check browser connection status to determine if closed
    if (typeof resource.isConnected === 'function') {
      isClosed = !resource.isConnected();
    }

    // Only close if not already closed
    if (!isClosed) {
      await resource.close();
    }
  } catch (error) {
    if (error.message.includes('Target page, context or browser has been closed')) {
      // Pass - ignore this error as it's expected when resources are already closed
    } else {
      console.warn(`Error closing ${resourceName}:`, error.message);
    }
  }
}

class BrowserPool {
  constructor() {
    this.lastUsed = new Map();
    this.contextPool = [];  // Pool of reusable contexts
    this.cleanupInterval = null;
    this.isShuttingDown = false;
    this.persistentBrowser = null;  // Single persistent browser

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
        await safeClose(testPage, 'test page');
        
        return this.wrapContextForReuse(context);
      } catch (error) {
        // Context is dead, continue to create new one
        console.warn('Pooled context unhealthy, creating new:', error.message);
        // Clean up dead context references
        // Try to properly close the unhealthy context
        await safeClose(context, 'unhealthy context');
      }
    }

    const context = await browser.newContext({
      // Minimal context configuration for maximum performance
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',  // Shorter UA
      viewport: { width: 426, height: 240 },  // Smaller viewport
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

    // Resource blocking
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
        
        // Block all non-essential resource types
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
        
        route.continue();
      } catch (error) {
        route.abort('blockedbyclient');
      }
    });


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
        await Promise.all(pages.map(page => safeClose(page, 'page')));
        
        // Verify context is still healthy before returning to pool
        try {
          await this.pages(); // Health check
          
          // Return to pool if there's space and not shutting down
          if (pool.contextPool.length < CONFIG.MAX_CONTEXT_POOL_SIZE && !pool.isShuttingDown) {
            pool.contextPool.push(this);
            return;
          }
        } catch (healthError) {
          // Context is no longer healthy, don't return to pool
          console.warn('Context unhealthy, not returning to pool:', healthError.message);
        }
      } catch (error) {
        console.warn('Error preparing context for reuse:', error.message);
      }
      
      // Close if can't reuse
      return originalClose();
    };

    return context;
  }

  async preloadResources() {
    // Pre-warm contexts for immediate availability
    if (CONFIG.PRELOAD_CONTEXTS > 0) {
      try {
        const browser = await this.getBrowser();
        for (let i = 0; i < CONFIG.PRELOAD_CONTEXTS; i++) {
          const context = await this.createContext(browser);
          await safeClose(context, 'preload context'); // This will add it to the pool
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
        // Perform health check on persistent browser
        if (this.persistentBrowser) {
          try {
            await this.persistentBrowser.version();
            // Browser is healthy, do nothing
          } catch (error) {
            console.warn('Persistent browser unhealthy, recreating:', error.message);
            await safeClose(this.persistentBrowser, 'persistent browser');
            this.persistentBrowser = null;
            this.lastUsed.delete('persistent');
          }
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
                await Promise.all(pages.map(page => safeClose(page, 'page')));
                await safeClose(context, 'context');
              })(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Context close timeout')), 5000)
              )
            ]);
          } catch (error) {
            console.warn('Error closing pooled context:', error.message);
          }
        })()
      );
    }

    // Close persistent browser with timeout protection
    if (this.persistentBrowser) {
      closePromises.push(
        Promise.race([
          safeClose(this.persistentBrowser, 'persistent browser'),
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
    this.persistentBrowser = null;

    console.log('All browsers and contexts closed successfully');
  }

  async closePersistentBrowser() {
    if (this.persistentBrowser) {
      try {
        console.log('Closing persistent browser...');
        await Promise.race([
          safeClose(this.persistentBrowser, 'persistent browser'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Persistent browser close timeout')), 10000)
          )
        ]);
        this.persistentBrowser = null;
        this.lastUsed.delete('persistent');
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

module.exports = {
  getBrowser,
  createContext,
  createPage,
  navigate,
  closeBrowser,
  closePersistentBrowser,
  safeClose,
  CONFIG
};
