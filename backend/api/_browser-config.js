// Optimized browser configuration for Vercel serverless functions
const { webkit } = require('playwright');

// Simple browser manager for serverless environment
class ServerlessBrowserManager {
    constructor() {
        this.browser = null;
    }

    async getBrowser() {
        if (!this.browser) {
            this.browser = await webkit.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
        }
        return this.browser;
    }

    async getPage() {
        const browser = await this.getBrowser();
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });
        const page = await context.newPage();
        
        // Set timeouts appropriate for serverless
        page.setDefaultTimeout(25000);
        page.setDefaultNavigationTimeout(25000);
        
        return { page, context };
    }

    async closePage(page, context) {
        try {
            if (page) await page.close();
            if (context) await context.close();
        } catch (error) {
            console.warn('Error closing page/context:', error.message);
        }
    }

    async close() {
        if (this.browser) {
            try {
                await this.browser.close();
                this.browser = null;
            } catch (error) {
                console.warn('Error closing browser:', error.message);
            }
        }
    }
}

// Export singleton instance
module.exports = new ServerlessBrowserManager();
