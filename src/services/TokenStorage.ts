
import * as Keychain from 'react-native-keychain';
import type { AuthTokens } from '../api/ApiClient';

const SERVICE_NAME = 'com.pockettrader.auth';

export class TokenStorage {
  async saveTokens(tokens: AuthTokens): Promise<void> {
    await Keychain.setGenericPassword(
      'pocket-trader',
      JSON.stringify(tokens),
      { service: SERVICE_NAME },
    );
  }

  async getTokens(): Promise<AuthTokens | null> {
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });

    if (!credentials) {
      return null;
    }

    try {
      return JSON.parse(credentials.password) as AuthTokens;
    } catch {
      await this.clearTokens();
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: SERVICE_NAME,
    });
  }
}

export const tokenStorage = new TokenStorage();
