const config = {
    // Uses the environment variable if available (Cloud), otherwise defaults to localhost (Local)
    API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8080'
};

export default config;
