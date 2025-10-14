const axios = require('axios');

const COMMON_CONFIG = {
    maxRedirects: 3,
    maxContentLength: 50000000, // 50MB limit
    maxBodyLength: 50000000,
    decompress: true,
    validateStatus: (status) => status < 500, // Accept all responses < 500 to avoid retries
    httpVersion: '2.0', // Enable HTTP/2 support if available
};

// Agent configuration factory function
function createAgentConfig(options = {}) {
    const {
        keepAlive = true,
        maxSockets = 50,
        maxFreeSockets = 10,
        timeout = 10000,
        freeSocketTimeout = 15000,
        keepAliveMsecs = 1000,
        scheduling = 'lifo' // LIFO scheduling for better socket reuse
    } = options;

    return {
        keepAlive,
        maxSockets,
        maxFreeSockets,
        timeout,
        freeSocketTimeout,
        keepAliveMsecs,
        scheduling
    };
}

// Predefined configurations for different use cases
const AXIOS_PRESETS = {
    // Configuration for course data scraping (optimized for high concurrency)
    courseData: {
        timeout: 10000,
        ...COMMON_CONFIG,
        httpAgent: new (require('http').Agent)(createAgentConfig({
            maxSockets: 50,
            maxFreeSockets: 10,
            timeout: 10000
        })),
        httpsAgent: new (require('https').Agent)(createAgentConfig({
            maxSockets: 50,
            maxFreeSockets: 10,
            timeout: 10000
        }))
    },

    // Configuration for professor URL lookup (optimized for speed)
    profUrl: {
        timeout: 8000,
        ...COMMON_CONFIG,
        httpAgent: new (require('http').Agent)(createAgentConfig({
            maxSockets: 100,
            maxFreeSockets: 20,
            timeout: 8000
        })),
        httpsAgent: new (require('https').Agent)(createAgentConfig({
            maxSockets: 100,
            maxFreeSockets: 20,
            timeout: 8000
        }))
    }
};

// Function to create axios instance with preset configuration
function createAxiosInstance(preset = 'courseData') {
    const config = AXIOS_PRESETS[preset] || AXIOS_PRESETS.courseData;
    return axios.create(config);
}

module.exports = {
    createAxiosInstance,
    AXIOS_PRESETS
};
