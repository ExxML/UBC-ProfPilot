// Memory monitoring utility for Step 1 operations
const os = require('os');

/**
 * Check if current memory usage exceeds the specified limit in MB
 * @param {number} limitMB - Memory limit in megabytes
 * @returns {boolean} - true if memory usage exceeds the limit
 */
function checkMemoryUsage(limitMB) {
    try {
        const memUsage = process.memoryUsage();
        const memoryUsageMB = memUsage.rss / (1024 * 1024); // Convert bytes to MB

        console.log(`Current memory usage: ${memoryUsageMB.toFixed(2)} MB`);

        if (memoryUsageMB > limitMB) {
            console.warn(`Memory usage (${memoryUsageMB.toFixed(2)} MB) exceeds limit (${limitMB} MB)`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking memory usage:', error.message);
        return false;
    }
}

/**
 * Get current memory usage in MB
 * @returns {number} - Memory usage in megabytes
 */
function getMemoryUsageMB() {
    try {
        const memUsage = process.memoryUsage();
        return memUsage.rss / (1024 * 1024); // Convert bytes to MB
    } catch (error) {
        console.error('Error getting memory usage:', error.message);
        return 0;
    }
}

module.exports = {
    checkMemoryUsage,
    getMemoryUsageMB
};
