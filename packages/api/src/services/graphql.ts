/**
 * GraphQL API Client
 * For authentication only
 */

import { getApiConfig, getToken } from '../config';

// ============ Types ============

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  login: {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: {
      id: string;
      name: string;
      email: string;
    };
    erp_details?: {
      routeId: string;
      warehouses: Array<{
        id: string;
        name: string;
        isDefault: boolean;
      }>;
      priceTypeId: string;
    };
  };
}

export interface MeResponse {
  me: {
    id: string;
    name: string;
    email: string;
  };
}

// ============ GraphQL Queries/Mutations ============

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      access_token
      token_type
      expires_in
      user {
        id
        name
        email
      }
      erp_details {
        routeId
        warehouses {
          id
          name
          isDefault
        }
        priceTypeId
      }
    }
  }
`;

const LOGOUT_MUTATION = `
  mutation Logout {
    logout {
      status
      message
    }
  }
`;

const ME_QUERY = `
  query Me {
    me {
      id
      name
      email
    }
  }
`;

// ============ Client Class ============

export class GraphQLClient {
  private url: string;
  
  constructor() {
    const config = getApiConfig();
    this.url = config.graphqlUrl;
  }

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const token = getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL Error: ${response.status} ${response.statusText}`);
    }

    const json: GraphQLResponse<T> = await response.json();

    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message);
    }

    if (!json.data) {
      throw new Error('No data returned');
    }

    return json.data;
  }

  // ============ Auth Methods ============

  async login(email: string, password: string): Promise<LoginResponse['login']> {
    const data = await this.query<LoginResponse>(LOGIN_MUTATION, {
      input: { email, password },
    });
    return data.login;
  }

  async logout(): Promise<void> {
    await this.query(LOGOUT_MUTATION);
  }

  async me(): Promise<MeResponse['me']> {
    const data = await this.query<MeResponse>(ME_QUERY);
    return data.me;
  }
}

// ============ Singleton Instance ============

let graphqlClient: GraphQLClient | null = null;

export function getGraphQLClient(): GraphQLClient {
  if (!graphqlClient) {
    graphqlClient = new GraphQLClient();
  }
  return graphqlClient;
}

export function resetGraphQLClient() {
  graphqlClient = null;
}

export default GraphQLClient;
