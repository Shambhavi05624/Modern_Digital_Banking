const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getHeaders = (isUpload = false, isForm = false) => {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  
  if (isUpload) {
    return headers;
  }
  
  if (isForm) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

export const api = {
  async get(endpoint: string) {
    try {
      const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      const response = await fetch(url, { 
        headers: getHeaders(),
        mode: 'cors'
      });
      
      if (response.status === 401) {
        this.handleUnauthorized();
        return;
      }

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = responseData.detail || `Server error: ${response.status}`;
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
      }
      return responseData;
    } catch (error: any) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error(`Connection Error: Backend unreachable at ${API_BASE_URL}`);
      }
      throw error;
    }
  },

  async post(endpoint: string, data: any, options: { isUpload?: boolean, isForm?: boolean } = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      
      let body;
      if (options.isUpload) {
        body = data;
      } else if (options.isForm) {
        body = new URLSearchParams(data).toString();
      } else {
        body = JSON.stringify(data);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(options.isUpload, options.isForm),
        body,
        mode: 'cors'
      });

      if (response.status === 401 && endpoint !== '/auth/login') {
        this.handleUnauthorized();
        return;
      }

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = responseData.detail || `Server error: ${response.status}`;
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
      }
      return responseData;
    } catch (error: any) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error(`Connection Error: Backend unreachable at ${API_BASE_URL}`);
      }
      throw error;
    }
  },

  async put(endpoint: string, data: any) {
    try {
      const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
        mode: 'cors'
      });

      if (response.status === 401) {
        this.handleUnauthorized();
        return;
      }

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.detail || `Server error: ${response.status}`);
      }
      return responseData;
    } catch (error: any) {
      throw error;
    }
  },

  async delete(endpoint: string) {
    try {
      const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(),
        mode: 'cors'
      });

      if (response.status === 401) {
        this.handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const responseData = await response.json().catch(() => ({}));
        throw new Error(responseData.detail || `Server error: ${response.status}`);
      }
      return { success: true };
    } catch (error: any) {
      throw error;
    }
  },

  handleUnauthorized() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_name');
    window.location.href = '/#/login';
    setTimeout(() => window.location.reload(), 100);
  }
};