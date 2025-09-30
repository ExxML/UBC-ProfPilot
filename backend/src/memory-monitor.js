// Memory monitoring utility for course and prof search Step

/**
 * Check if current memory usage exceeds the specified limit in MB
 * @param {number} limitMB - Memory limit in megabytes
 * @returns {boolean} - true if memory usage exceeds the limit
 */
function checkMemoryUsage(limitMB) {
    try {
        const memUsage = process.memoryUsage();

        // Calculate comprehensive memory usage including:
        // - RSS (Resident Set Size) - memory held in RAM
        // - External memory - C++ objects bound to JavaScript objects
        // - Heap memory (used and total)
        const rssMB = memUsage.rss / (1024 * 1024);
        const externalMB = memUsage.external / (1024 * 1024);
        const heapUsedMB = memUsage.heapUsed / (1024 * 1024);
        const heapTotalMB = memUsage.heapTotal / (1024 * 1024);

        // Use the highest value among RSS, external, and heap usage as the estimate
        const memoryUsageMB = Math.max(rssMB, externalMB, heapUsedMB, heapTotalMB);

        console.log(`Memory usage details:`);
        console.log(`  RSS: ${rssMB.toFixed(2)} MB`);
        console.log(`  External: ${externalMB.toFixed(2)} MB`);
        console.log(`  Heap Used: ${heapUsedMB.toFixed(2)} MB`);
        console.log(`  Heap Total: ${heapTotalMB.toFixed(2)} MB`);
        console.log(`  Estimated total: ${memoryUsageMB.toFixed(2)} MB`);

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

module.exports = {
    checkMemoryUsage
};
