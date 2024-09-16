import { createApiInstance } from 'frontend/src/services/api';
import { setItem, getItem, removeItem } from 'frontend/src/utils/storage';

export async function login(username: string, password: string): Promise<boolean> {
  const api = createApiInstance();
  try {
    const response = await api.post('/auth/login', { username, password });
    if (response.data && response.data.token) {
      setItem('jwt_token', response.data.token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
}

export function logout(): void {
  removeItem('jwt_token');
  // HUMAN ASSISTANCE NEEDED
  // Additional steps might be needed to clear user-related data from application state
  // This depends on how the application state is managed (e.g., Redux, Context API)
  // Example: dispatch(clearUserData());
}

export function isAuthenticated(): boolean {
  const token = getItem('jwt_token');
  if (!token) return false;

  // HUMAN ASSISTANCE NEEDED
  // Optionally verify token expiration
  // This would require parsing the JWT and checking its expiration claim
  // Example implementation:
  // try {
  //   const decodedToken = jwt_decode(token);
  //   return decodedToken.exp > Date.now() / 1000;
  // } catch (error) {
  //   return false;
  // }

  return true;
}