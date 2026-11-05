const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('lms_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

async function handleResponse(res) {
  if (!res.ok) {
    let errorDetail = 'An error occurred';
    try {
      const data = await res.json();
      errorDetail = data.detail || JSON.stringify(data);
    } catch (e) {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Auth
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(res);
  },
  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Clients
  getClients: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/clients?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getClient: async (id) => {
    const res = await fetch(`${API_BASE}/clients/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createClient: async (data) => {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  updateClient: async (id, data) => {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  checkDuplicateClient: async (params) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/clients/check-duplicate?${query}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Guarantors
  getGuarantors: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/guarantors?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getGuarantor: async (id) => {
    const res = await fetch(`${API_BASE}/guarantors/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createGuarantor: async (data) => {
    const res = await fetch(`${API_BASE}/guarantors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Loans
  getLoans: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/loans?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getLoan: async (id) => {
    const res = await fetch(`${API_BASE}/loans/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  calculateLoan: async (params) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/loans/calculate?${query}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  createLoan: async (data) => {
    const res = await fetch(`${API_BASE}/loans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Payments
  getPayments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/payments?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  previewPayment: async (data) => {
    const res = await fetch(`${API_BASE}/payments/preview`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  recordPayment: async (data) => {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  reversePayment: async (id, reason) => {
    const res = await fetch(`${API_BASE}/payments/${id}/reverse`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  // Rollovers
  getPendingRollovers: async () => {
    const res = await fetch(`${API_BASE}/rollovers/pending`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getRolloverProposal: async (loanId) => {
    const res = await fetch(`${API_BASE}/rollovers/proposal/${loanId}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  executeRollover: async (data) => {
    const res = await fetch(`${API_BASE}/rollovers/execute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Cashbook
  getCashbookEntries: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/cashbook?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getCashbookSummary: async () => {
    const res = await fetch(`${API_BASE}/cashbook/summary`, { headers: getHeaders() });
    return handleResponse(res);
  },
  addCashbookEntry: async (data) => {
    const res = await fetch(`${API_BASE}/cashbook/entry`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Book references
  getBookReferences: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/book-references?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createBookReference: async (data) => {
    const res = await fetch(`${API_BASE}/book-references`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Notes
  getNotes: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/notes?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createNote: async (data) => {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Reports
  getDashboard: async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getAgingReport: async () => {
    const res = await fetch(`${API_BASE}/reports/aging`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getCollectionsReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports/collections?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`, { headers: getHeaders() });
    return handleResponse(res);
  },
  updateSettings: async (data) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Audit & Notifications
  getAuditLogs: async () => {
    const res = await fetch(`${API_BASE}/audit-logs`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
    return handleResponse(res);
  },
  markNotificationRead: async (id) => {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};

