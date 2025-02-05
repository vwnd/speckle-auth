# Speckle Authentication Client 🔐

The Speckle Authentication Client makes it easy for web apps to log users into the Speckle platform. It supports two ways to log in: using an OAuth-based application login or a personal access token (PAT). 🌐✅🔑

## Installation 🛠️

To install this package, run:

```sh
npm install speckle-auth
```

## How to Use It 💡

### Logging in with Application Credentials (OAuth) 🔑🌍🛠️

If you're using OAuth, you need a `clientId` and `clientSecret` to let users log in.

```ts
import { SpeckleAuthClient, type ApplicationOptions } from 'speckle-auth';

const options: ApplicationOptions = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  serverUrl: 'https://app.speckle.systems',
};
const speckle = new SpeckleAuthClient(options);

async function authenticateUser() {
  const user = await speckle.user();
  if (!user) {
    await speckle.login();
  }
  return user;
}

async function logoutUser() {
  await speckle.logout();
}
```

### Logging in with a Personal Access Token (PAT) 🔒🛡️🔑

If you don't want to use OAuth, you can log in with a personal access token instead.

```ts
import {
  SpeckleAuthClient,
  type PersonalAccessTokenOptions,
} from 'speckle-auth';

const options: PersonalAccessTokenOptions = {
  serverUrl: 'https://app.speckle.systems',
  token: 'your-personal-access-token',
};
const speckle = new SpeckleAuthClient(options);

async function authenticateUser() {
  const user = await speckle.user();
  return user;
}

async function logoutUser() {
  await speckle.logout();
}
```

## API Reference 📚

### `SpeckleAuthClient(options)` 📝

Creates a new authentication client.

- **options**: You can pass in either `ApplicationOptions` (for OAuth) or `PersonalAccessTokenOptions` (for PAT).

### `speckle.user()` 👤🔍💾

Returns the logged-in user, or `null` if no one is logged in.

### `speckle.login()` 🔑📲✅

Starts the login process for OAuth users. Note that the `login` will also handle the finish process of the login, when the user is redirected back from Speckle.

### `speckle.logout()` 🚪🔒👋

Logs the user out.

## License 📜⚖️🔓

This package is available under the MIT License, so you can modify and share it as needed. 🎉📢💡
