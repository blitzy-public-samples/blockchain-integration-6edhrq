import axios, { AxiosInstance } from 'axios';
import { getAuthToken } from 'frontend/src/utils/auth';

const API_BASE_URL: string = process.env.REACT_APP_API_BASE_URL || 'https://api.example.com';

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
  });

  instance.interceptors.request.use(async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // HUMAN ASSISTANCE NEEDED
      // Add error handling logic here, such as refreshing tokens on 401 errors
      // or showing appropriate error messages to the user
      return Promise.reject(error);
    }
  );

  return instance;
};

export const getVaults = async (): Promise<Vault[]> => {
  const api = createApiInstance();
  const response = await api.get('/vaults');
  return response.data;
};

export const createTransaction = async (transactionData: TransactionRequest): Promise<Transaction> => {
  const api = createApiInstance();
  const response = await api.post('/transactions', transactionData);
  return response.data;
};

export const getSignatureStatus = async (signatureId: string): Promise<SignatureStatus> => {
  const api = createApiInstance();
  const response = await api.get(`/signatures/${signatureId}`);
  return response.data;
};

// HUMAN ASSISTANCE NEEDED
// Consider adding error handling and type definitions for Vault, Transaction, TransactionRequest, and SignatureStatus
// Also, consider implementing retry logic for failed requests and adding request cancellation support