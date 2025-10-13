const axios = require('axios');

// Common axios configuration options
const COMMON_CONFIG = {
    maxRedirects: 3,
    maxContentLength: 50000000, // 50MB limit
    maxBodyLength: 50000000,
};

// Agent configuration factory function
function createAgentConfig(options = {}) {
    const {
        keepAlive = true,
        maxSockets = 5,
        maxFreeSockets = 2,
        timeout = 15000,
        freeSocketTimeout = 30000
    } = options;

    return {
        keepAlive,
        maxSockets,
        maxFreeSockets,
        timeout,
        freeSocketTimeout
    };
}

// Predefined configurations for different use cases
const AXIOS_PRESETS = {
    // Configuration for course data scraping (moderate rate)
    courseData: {
        timeout: 15000,
        ...COMMON_CONFIG,
        httpAgent: new (require('http').Agent)(createAgentConfig({
            maxSockets: 5,
            maxFreeSockets: 2,
            timeout: 15000
        })),
        httpsAgent: new (require('https').Agent)(createAgentConfig({
            maxSockets: 5,
            maxFreeSockets: 2,
            timeout: 15000
        }))
    },

    // Configuration for professor URL lookup (faster rate)
    profUrl: {
        timeout: 10000,
        ...COMMON_CONFIG,
        httpAgent: new (require('http').Agent)(createAgentConfig({
            maxSockets: 10,
            maxFreeSockets: 5,
            timeout: 10000
        })),
        httpsAgent: new (require('https').Agent)(createAgentConfig({
            maxSockets: 10,
            maxFreeSockets: 5,
            timeout: 10000
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
