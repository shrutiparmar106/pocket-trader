import { apiClient } from '../api/client';
import { AuthService } from './AuthService';
import { tokenStorage } from './TokenStorage';

// App-wide instance wired to the real storage and the configured ApiClient.
export const authService = new AuthService(apiClient, tokenStorage);