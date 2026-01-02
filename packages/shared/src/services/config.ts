/**
 * API Configuration
 * Platform-agnostic API settings
 */

export const API_CONFIG = {
  // Cloud API (Auth)
  cloudUrl: 'https://cloud.maximus.mn',
  authUrl: 'https://cloud.maximus.mn/api/auth',
  graphqlUrl: 'https://cloud.maximus.mn/graphql',
  
  // 1C ERP API (Products, Customers, etc.)
  erpUrl: 'http://203.21.120.60:8080/maximus_trade/hs',
  
  // Image base URL
  imageBaseUrl: 'https://cloud.maximus.mn',
  
  // Default warehouse
  defaultWarehouseId: '5a811d4a-6dc5-11e6-9c23-3085a97c20be',
  salesWarehouseId: '6b5314d6-5c7e-11ec-9463-44a842251a8a',
};

// Allow runtime configuration override
let runtimeConfig = { ...API_CONFIG };

export function setApiConfig(config: Partial<typeof API_CONFIG>) {
  runtimeConfig = { ...runtimeConfig, ...config };
}

export function getApiConfig() {
  return runtimeConfig;
}
