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
  cookieAppDomain?: string;
}

interface SetCookieProps {
  name: string;
  value: string;
}

export class SpeckleAuthClient {
  private readonly serverUrl: string;
  private _token?: string;
  private readonly _tokenName = 'speckle:auth:token';
  private readonly _refreshTokenName = 'speckle:auth:refresh-token';
  private readonly _challengeName = 'speckle:auth:challenge';

  private readonly authType: 'pat' | 'app';
  private readonly cookieAppDomain?: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;

  constructor(options: PersonalAccessTokenOptions | ApplicationOptions) {
    this.serverUrl = options.serverUrl || 'https://app.speckle.systems';
    if (this.isPersonalAccessTokenOptions(options)) {
      this._token = options.token;
      this.authType = 'pat';
      localStorage.setItem(this._tokenName, this._token);
    } else {
      this.clientId = options.clientId;
      this.clientSecret = options.clientSecret;
      this.cookieAppDomain = options.cookieAppDomain;
      this.authType = 'app';
    }
  }

  get token(): string | undefined {
    return this._token;
  }

  async user(): Promise<User | null> {
    this.tryRestoreSession();

    if (!this._token) {
      return null;
    }

    const response = await fetch(`${this.serverUrl}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this._token}`,
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

  async login(): Promise<User | null> {
    if (this.authType === 'pat') {
      return await this.user();
    }

    const storedChallenge = localStorage.getItem(this._challengeName);
    const accessCode = window.location.search.split('access_code=')[1];
    if (storedChallenge && accessCode) {
      await this.handleRedirect(accessCode, storedChallenge);
      return await this.user();
    }

    const challenge =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    localStorage.setItem(this._challengeName, challenge);

    window.location.href = `${this.serverUrl}/authn/verify/${this.clientId}/${challenge}`;
    return null;
  }

  logout(): void {
    if (this.authType !== 'pat') {
      this._token = undefined;
    }
    if (this.cookieAppDomain) {
      this.deleteCookie(this._tokenName);
      this.deleteCookie(this._refreshTokenName);
    }
    localStorage.removeItem(this._tokenName);
    localStorage.removeItem(this._refreshTokenName);
    localStorage.removeItem(this._challengeName);
  }

  private tryRestoreSession(): void {
    let token: string | null | undefined;
    if (this.cookieAppDomain) {
      token = this.getCookie(this._tokenName);
    } else {
      token = localStorage.getItem(this._tokenName);
    }
    if (token) {
      this._token = token;
    }
  }

  private isPersonalAccessTokenOptions(
    options: PersonalAccessTokenOptions | ApplicationOptions,
  ): options is PersonalAccessTokenOptions {
    return (options as PersonalAccessTokenOptions).token !== undefined;
  }

  private async handleRedirect(
    accessCode: string,
    challenge: string,
  ): Promise<void> {
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
      localStorage.removeItem(this._challengeName);
      if (this.cookieAppDomain) {
        this.setCookie({ name: this._tokenName, value: data.token });
        this.setCookie({
          name: this._refreshTokenName,
          value: data.refreshToken,
        });
      }
      localStorage.setItem(this._tokenName, data.token);
      localStorage.setItem(this._refreshTokenName, data.refreshToken);

      this._token = data.token;
    }
  }

  private setCookie = ({ name, value }: SetCookieProps) => {
    document.cookie = `${name}=${value}; domain=${this.cookieAppDomain}; SameSite=${this.cookieAppDomain === 'localhost' ? 'lax' : 'None; Secure;'}`;
  };

  private deleteCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
  };

  private getCookie = (name: string) => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1];
  };
}
