import client from './client';
import type { AuthUser } from '../types';

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await client.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

export async function getMyFlags(): Promise<import('../types').FeatureFlags> {
  const res = await client.get<import('../types').FeatureFlags>('/auth/me/flags');
  return res.data;
}
