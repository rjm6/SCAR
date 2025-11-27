import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user and token from localStorage on mount
    const storedUser = localStorage.getItem('google_user');
    const storedToken = localStorage.getItem('google_access_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setAccessToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (credentialResponse) => {
    // The @react-oauth/google library provides the credential response
    // We'll decode the JWT to get user info
    const decoded = parseJwt(credentialResponse.credential);

    const userData = {
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      sub: decoded.sub,
    };

    setUser(userData);
    setAccessToken(credentialResponse.access_token);

    // Store in localStorage
    localStorage.setItem('google_user', JSON.stringify(userData));
    if (credentialResponse.access_token) {
      localStorage.setItem('google_access_token', credentialResponse.access_token);
    }
  };

  const handleLoginError = (error) => {
    console.error('Login failed:', error);
    setUser(null);
    setAccessToken(null);
  };

  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('google_user');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');

    // Revoke Google token if needed
    if (window.google && window.google.accounts) {
      window.google.accounts.id.revoke(user?.email, () => {
        console.log('Token revoked');
      });
    }
  };

  const value = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user,
    login: handleLoginSuccess,
    loginError: handleLoginError,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Helper function to decode JWT
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return {};
  }
}
