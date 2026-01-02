/**
 * API Configuration
 */

export interface ApiConfig {
  graphqlUrl: string;
  erpBaseUrl: string;
  erpUsername: string;
  erpPassword: string;
}

// Default config (can be overridden)
let config: ApiConfig = {
  graphqlUrl: 'https://cloud.maximus.mn/graphql',
  erpBaseUrl: 'http://203.21.120.60:8080/maximus_trade/hs',
  erpUsername: 'TestAPI',
  erpPassword: 'jI9da0zu',
};

export function setApiConfig(newConfig: Partial<ApiConfig>) {
  config = { ...config, ...newConfig };
}

export function getApiConfig(): ApiConfig {
  return config;
}

// Token management
let tokenGetter: (() => string | null) | null = null;

export function setTokenGetter(getter: () => string | null) {
  tokenGetter = getter;
}

export function getToken(): string | null {
  return tokenGetter ? tokenGetter() : null;
}

// ERP Auth header
export function getErpAuthHeader(): string {
  const { erpUsername, erpPassword } = config;
  if (typeof btoa !== 'undefined') {
    return `Basic ${btoa(`${erpUsername}:${erpPassword}`)}`;
  }
  // Node.js / React Native
  return `Basic ${Buffer.from(`${erpUsername}:${erpPassword}`).toString('base64')}`;
}

export default {
  setApiConfig,
  getApiConfig,
  setTokenGetter,
  getToken,
  getErpAuthHeader,
};
