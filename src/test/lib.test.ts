import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SpeckleAuthClient } from '../lib';

describe('SpeckleAuthClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should initialize with personal access token', () => {
    const client = new SpeckleAuthClient({
      token: 'test-token',
    });
    expect(client.token).toBe('test-token');
  });

  test('should initialize with application credentials', () => {
    const client = new SpeckleAuthClient({
      clientId: 'test-client',
      clientSecret: 'test-secret',
    });
    expect(client.token).toBeUndefined();
  });

  test('should logout and clear storage for app auth', async () => {
    const client = new SpeckleAuthClient({
      clientId: 'test-client',
      clientSecret: 'test-secret',
    });
    localStorage.setItem('speckle:auth:token', 'test');
    await client.logout();
    expect(localStorage.getItem('speckle:auth:token')).toBeNull();
  });

  test('should return the user if login was successful', async () => {
    const client = new SpeckleAuthClient({
      clientId: 'test-client',
      clientSecret: 'test-secret',
    });

    vi.spyOn(client, 'user').mockResolvedValue({
      id: 'test-id',
      email: 'john@google.com',
      name: 'John Doe',
      avatar: 'https://avatar.com',
      bio: 'Some bio',
      company: 'Some company',
    });

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?access_code=test-code' },
    });

    localStorage.setItem('speckle:auth:challenge', 'some challenge');
    const user = await client.login();

    expect(user).toBeDefined();
  });
});
