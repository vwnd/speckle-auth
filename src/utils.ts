export interface User {
  avatar: string;
  id: string;
  email: string;
  name: string;
  bio: string;
  company: string;
}

interface BaseOptions {
  serverUrl?: string;
}

export interface PersonalAccessTokenOptions extends BaseOptions {
  token: string;
}

export interface ApplicationOptions extends BaseOptions {
  clientId: string;
  clientSecret: string;
}

export class SpeckleAuthClient {
  private readonly serverUrl: string;
  private token?: string;
  private readonly authType: 'pat' | 'app';

  private readonly clientId?: string;
  private readonly clientSecret?: string;

  constructor(options: PersonalAccessTokenOptions | ApplicationOptions) {
    this.serverUrl = options.serverUrl || 'https://app.speckle.systems';
    if (this.isPersonalAccessTokenOptions(options)) {
      this.token = options.token;
      this.authType = 'pat';
    } else {
      this.clientId = options.clientId;
      this.clientSecret = options.clientSecret;
      this.authType = 'app';
    }
  }

  async user(): Promise<User | null> {
    this.tryRestoreSession();

    if (!this.token) {
      return null;
    }

    const response = await fetch(`${this.serverUrl}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `#graphql
          {
            activeUser {
              avatar
              id
              email
              name
              bio
              company
              verified
              profiles
              role
              createdAt
            }
          }
        `,
      }),
    });

    const data = await response.json();
    const user = {
      ...data.data.activeUser,
    };
    return user as User;
  }

  async login() {
    if (this.authType === 'pat') {
      return await this.user();
    }

    const storedChallenge = localStorage.getItem('speckle:auth:challenge');
    const accessCode = window.location.search.split('access_code=')[1];
    if (storedChallenge && accessCode) {
      await this.handleRedirect(accessCode, storedChallenge);
      return await this.user();
    }

    const challenge =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    localStorage.setItem('speckle:auth:challenge', challenge);

    window.location.href = `${this.serverUrl}/authn/verify/${this.clientId}/${challenge}`;
    return null;
  }

  private async handleRedirect(accessCode: string, challenge: string) {
    if (!this.clientId || !this.clientSecret) {
      return;
    }

    const res = await fetch(`${this.serverUrl}/auth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessCode: accessCode,
        appId: this.clientId,
        appSecret: this.clientSecret,
        challenge: challenge,
      }),
    });

    const data = await res.json();

    if (data.token) {
      localStorage.removeItem('speckle:auth:challenge');
      localStorage.setItem('speckle:auth:token', data.token);
      localStorage.setItem('speckle:auth:refresh-token', data.refreshToken);

      this.token = data.token;
    }
  }

  async logout() {
    this.token = undefined;
    localStorage.removeItem('speckle:auth:token');
    localStorage.removeItem('speckle:auth:refresh-token');
    localStorage.removeItem('speckle:auth:challenge');
  }

  private tryRestoreSession() {
    const token = localStorage.getItem('speckle:auth:token');
    if (token) {
      this.token = token;
    }
  }

  private isPersonalAccessTokenOptions(
    options: PersonalAccessTokenOptions | ApplicationOptions,
  ): options is PersonalAccessTokenOptions {
    return (options as PersonalAccessTokenOptions).token !== undefined;
  }
}
