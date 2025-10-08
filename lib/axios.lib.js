const axios = require("axios");

// Create axios instance with default config
const axiosInstance = axios.create({
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Log outgoing requests in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Axios Request] ${config.method.toUpperCase()} ${config.url}`
      );
      if (config.data) {
        console.log(`[Axios Request Data]`, config.data);
      }
    }

    // Add timestamp to requests
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    console.error("[Axios Request Error]", error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Axios Response] ${response.config.method.toUpperCase()} ${
          response.config.url
        } - ${response.status} (${duration}ms)`
      );
    }

    return response;
  },
  (error) => {
    // Enhanced error handling
    if (error.response) {
      // Server responded with error status
      const { status, data, config } = error.response;
      const duration = new Date() - config.metadata.startTime;

      console.error(
        `[Axios Response Error] ${config.method.toUpperCase()} ${
          config.url
        } - ${status} (${duration}ms)`,
        {
          status,
          data,
          url: config.url,
        }
      );

      // Normalize error response
      const normalizedError = new Error(
        data?.message || data?.error || `HTTP ${status} Error`
      );
      normalizedError.status = status;
      normalizedError.data = data;
      normalizedError.isAxiosError = true;

      return Promise.reject(normalizedError);
    } else if (error.request) {
      // Request made but no response received
      console.error("[Axios No Response]", {
        url: error.config?.url,
        method: error.config?.method,
        message: error.message,
      });

      const normalizedError = new Error(
        "No response received from server. Please check your connection."
      );
      normalizedError.status = 503;
      normalizedError.isAxiosError = true;
      normalizedError.isNetworkError = true;

      return Promise.reject(normalizedError);
    } else {
      // Error setting up request
      console.error("[Axios Request Setup Error]", error);

      const normalizedError = new Error(
        error.message || "Error setting up request"
      );
      normalizedError.status = 500;
      normalizedError.isAxiosError = true;

      return Promise.reject(normalizedError);
    }
  }
);

module.exports = axiosInstance;
