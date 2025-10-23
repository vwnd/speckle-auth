import { useCallback, useEffect, useState } from 'react';
import './App.css';

import { SpeckleAuthClient, type User } from '../../../';

const client = new SpeckleAuthClient({
  serverUrl: 'https://app.speckle.systems',
  clientId: import.meta.env.VITE_SPECKLE_CLIENT_ID,
  clientSecret: import.meta.env.VITE_SPECKLE_CLIENT_SECRET,
});

function App() {
  console.log('app start');

  const [userInfo, setUserInfo] = useState<User | null>(null);

  const handleLogout = () => {
    console.log('logging out...');
    client.logout(); // No need to await
    setUserInfo(null);
  };

  const handleLogin = async () => {
    console.log('manual login triggered');
    const user = await client.login();
    if (user) setUserInfo(user);
  };

  const authenticate = useCallback(async () => {
    console.log('checking for existing session...');
    const user = await client.user();
    if (user) {
      setUserInfo(user);
    } else {
      // Only trigger login if no user is found
      const loginResult = await client.login();
      if (loginResult) setUserInfo(loginResult);
    }
  }, [client]);

  useEffect(() => {
    // Only run once on mount
    authenticate();
  }, []);

  return (
    <div>
      <div>{userInfo ? `Hello, ${userInfo.name}` : 'Please log in'}</div>
      <button onClick={handleLogin}>login</button>
      <button onClick={handleLogout}>logout</button>
    </div>
  );
}

export default App;
