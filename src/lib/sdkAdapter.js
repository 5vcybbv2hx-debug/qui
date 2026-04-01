/**
 * Stable SDK Adapter Layer
 * Public interface for Base44 SDK operations.
 * Encapsulates all SDK imports and provides a clean, versioned API.
 * This layer isolates the app from internal SDK changes.
 */

import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

/**
 * Public Auth API
 */
export const authAPI = {
  /**
   * Get current authenticated user
   * @returns {Promise<User|null>} User object or null if not authenticated
   * @throws {Object} Error object with status and message
   */
  async getCurrentUser() {
    return base44.auth.me();
  },

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    return base44.auth.isAuthenticated();
  },

  /**
   * Redirect to login page
   * @param {string} nextUrl - URL to redirect to after login
   */
  redirectToLogin(nextUrl = window.location.href) {
    return base44.auth.redirectToLogin(nextUrl);
  },

  /**
   * Logout and optionally redirect
   * @param {string} redirectUrl - URL to redirect to after logout
   */
  logout(redirectUrl = null) {
    return base44.auth.logout(redirectUrl);
  },

  /**
   * Update current user data
   * @param {Object} data - User data to update
   * @returns {Promise<User>}
   */
  async updateMe(data) {
    return base44.auth.updateMe(data);
  }
};

/**
 * Public Entities API
 */
export const entitiesAPI = {
  /**
   * List entities
   * @param {string} entityName
   * @param {string} sort - Sort field (e.g., '-created_date')
   * @param {number} limit - Max items
   * @returns {Promise<Array>}
   */
  async list(entityName, sort = '', limit = 50) {
    const entity = base44.entities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    return entity.list(sort, limit);
  },

  /**
   * Filter entities
   * @param {string} entityName
   * @param {Object} query - Filter object
   * @param {string} sort
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async filter(entityName, query = {}, sort = '', limit = 50) {
    const entity = base44.entities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    return entity.filter(query, sort, limit);
  },

  /**
   * Get single entity
   * @param {string} entityName
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async get(entityName, id) {
    const entity = base44.entities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    return entity.get(id);
  },

  /**
   * Create entity
   * @param {string} entityName
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(entityName, data) {
    const entity = base44.entities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    return entity.create(data);
  },

  /**
   * Update entity
   * @param {string} entityName
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(entityName, id, data) {
    const entity = base44.entities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    return entity.update(id, data);
  },

  /**
   * Delete entity
   * @param {string} entityName
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(entityName, id) {
    const entity = base44.entities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    return entity.delete(id);
  },

  /**
   * Get entity schema
   * @param {string} entityName
   * @returns {Promise<Object>}
   */
  async getSchema(entityName) {
    const entity = base44.entities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    return entity.schema();
  },

  /**
   * Subscribe to entity changes
   * @param {string} entityName
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(entityName, callback) {
    const entity = base44.entities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    return entity.subscribe(callback);
  }
};

/**
 * Public Functions API
 */
export const functionsAPI = {
  /**
   * Invoke backend function
   * @param {string} functionName
   * @param {Object} payload
   * @returns {Promise<*>} Function response data
   */
  async invoke(functionName, payload = {}) {
    return base44.functions.invoke(functionName, payload);
  }
};

/**
 * Public App API
 */
export const appAPI = {
  getAppId() {
    return appParams.appId;
  },

  getToken() {
    return appParams.token;
  },

  getBaseUrl() {
    return appParams.appBaseUrl;
  }
};

/**
 * Fetch app public settings via stable HTTP layer
 * No internal SDK imports here – uses standard fetch API
 * @param {string} appId
 * @param {string} token
 * @returns {Promise<Object>} Public settings object
 */
export async function fetchAppPublicSettings(appId, token) {
  const headers = {
    'X-App-Id': appId,
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/apps/public/prod/public-settings/by-id/${appId}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
}

export default {
  authAPI,
  entitiesAPI,
  functionsAPI,
  appAPI,
  fetchAppPublicSettings
};