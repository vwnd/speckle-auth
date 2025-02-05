interface BaseOptions {
  serverUrl?: string;
}
interface PersonalAccessTokenOptions extends BaseOptions {
  token: string;
}

interface ApplicationOptions extends BaseOptions {
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

  async user() {
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
    return data.data.activeUser;
  }

  async login() {
    if (this.authType === 'pat') {
      return;
    }

    const storedChallenge = localStorage.getItem('speckle:auth:challenge');
    const accessCode = window.location.search.split('access_code=')[1];
    if (storedChallenge && accessCode) {
      return this.handleRedirect(accessCode, storedChallenge);
    }

    const challenge =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    localStorage.setItem('speckle:auth:challenge', challenge);

    window.location.href = `${this.serverUrl}/authn/verify/${this.clientId}/${challenge}`;
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
  }

  private isPersonalAccessTokenOptions(
    options: PersonalAccessTokenOptions | ApplicationOptions,
  ): options is PersonalAccessTokenOptions {
    return (options as PersonalAccessTokenOptions).token !== undefined;
  }
}
