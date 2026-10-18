import { test, describe, beforeEach, afterEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// Polyfill environment for testing in Node
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

let dispatchedEvents = [];
globalThis.window = {
  location: {
    pathname: '/student/dashboard',
    href: 'http://localhost:3000/student/dashboard',
  },
  dispatchEvent: (event) => {
    dispatchedEvents.push(event);
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

globalThis.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type;
    this.detail = eventInitDict?.detail;
  }
};

// Import api module under test
const {
  api,
  clearAuthState,
  isAuthEndpoint,
  isAuthRoute,
  resetRedirectState,
  getRedirectState,
} = await import('../src/services/api.ts');

describe('HIGH-08: Global Axios 401 Response Interceptor & Auth State Management', () => {
  let server;
  let serverBaseUrl;

  before(async () => {
    // Spin up an in-process mock HTTP server to verify actual network calls
    server = http.createServer((req, res) => {
      const url = req.url;

      if (url === '/api/auth/login') {
        // Mock invalid login credentials
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Incorrect student number/email or password' }));
        return;
      }

      if (url === '/api/auth/register/trainer') {
        // Mock unauthorized registration
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Authentication required' }));
        return;
      }

      if (url === '/api/protected/session-expired') {
        // Mock session expiration on protected resource
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Could not validate credentials' }));
        return;
      }

      if (url === '/api/protected/forbidden') {
        // Mock HTTP 403 Forbidden (e.g. unauthorized material/batch)
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Access forbidden: unauthorized role' }));
        return;
      }

      if (url === '/api/protected/not-found') {
        // Mock HTTP 404 Not Found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Resource not found' }));
        return;
      }

      if (url === '/api/protected/server-error') {
        // Mock HTTP 500 Internal Server Error
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Internal server error' }));
        return;
      }

      if (url === '/api/protected/success') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: 'test-user', authHeader: req.headers.authorization }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ detail: 'Not Found' }));
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    serverBaseUrl = `http://127.0.0.1:${port}/api`;
    api.defaults.baseURL = serverBaseUrl;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    storage.clear();
    dispatchedEvents = [];
    resetRedirectState();
    window.location.pathname = '/student/dashboard';
    window.location.href = 'http://localhost:3000/student/dashboard';
  });

  test('1. Request Interceptor: attaches Bearer token when lms_token is present', async () => {
    localStorage.setItem('lms_token', 'valid-jwt-token-12345');
    const res = await api.get('/protected/success');
    assert.equal(res.status, 200);
    assert.equal(res.data.authHeader, 'Bearer valid-jwt-token-12345');
  });

  test('2. Request Interceptor: leaves Authorization empty when lms_token is missing', async () => {
    const res = await api.get('/protected/success');
    assert.equal(res.status, 200);
    assert.equal(res.data.authHeader, undefined);
  });

  test('3. Expired Session: 401 on protected endpoint clears lms_token and lms_current_user', async () => {
    localStorage.setItem('lms_token', 'expired-token');
    localStorage.setItem('lms_current_user', 'usr-123');

    await assert.rejects(
      async () => {
        await api.get('/protected/session-expired');
      },
      (err) => err.response?.status === 401
    );

    assert.equal(localStorage.getItem('lms_token'), null, 'lms_token must be removed from localStorage');
    assert.equal(localStorage.getItem('lms_current_user'), null, 'lms_current_user must be removed from localStorage');
  });

  test('4. Expired Session: 401 dispatches auth:unauthorized event and redirects to /login', async () => {
    localStorage.setItem('lms_token', 'expired-token');
    window.location.pathname = '/student/tests';
    window.location.href = 'http://localhost:3000/student/tests';

    await assert.rejects(
      async () => {
        await api.get('/protected/session-expired');
      },
      (err) => err.response?.status === 401
    );

    assert.equal(dispatchedEvents.length, 1, 'auth:unauthorized event must be dispatched');
    assert.equal(dispatchedEvents[0].type, 'auth:unauthorized');
    assert.equal(window.location.href, '/login', 'window.location.href must be set to /login');
    assert.equal(getRedirectState(), true, 'Redirect state must be active');
  });

  test('5. Concurrency Guard: multiple concurrent 401s do not trigger repeated redirects', async () => {
    localStorage.setItem('lms_token', 'expired-token');
    window.location.pathname = '/trainer/dashboard';
    window.location.href = 'http://localhost:3000/trainer/dashboard';

    let redirectCount = 0;
    // Trap setter on window.location.href to count assignments
    const originalHref = window.location.href;
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get: () => originalHref,
      set: (val) => {
        if (val === '/login') redirectCount++;
      },
    });

    try {
      // Dispatch 5 parallel requests that all return 401
      const promises = [
        api.get('/protected/session-expired'),
        api.get('/protected/session-expired'),
        api.get('/protected/session-expired'),
        api.get('/protected/session-expired'),
        api.get('/protected/session-expired'),
      ];

      await Promise.allSettled(promises);

      assert.equal(redirectCount, 1, 'Only exactly 1 redirect to /login must be triggered for concurrent 401s');
      assert.equal(localStorage.getItem('lms_token'), null);
    } finally {
      // Restore plain property
      delete window.location.href;
      window.location.href = 'http://localhost:3000/trainer/dashboard';
    }
  });

  test('6. Redirect Loop Prevention: does not redirect if already on /login or login portals', async () => {
    localStorage.setItem('lms_token', 'expired-token');

    const authPaths = [
      '/login',
      '/student/login',
      '/trainer/login',
      '/institution/login',
      '/admin/login',
      '/student/register',
    ];

    for (const path of authPaths) {
      resetRedirectState();
      window.location.pathname = path;
      window.location.href = `http://localhost:3000${path}`;

      await assert.rejects(
        async () => {
          await api.get('/protected/session-expired');
        },
        (err) => err.response?.status === 401
      );

      assert.equal(
        window.location.href,
        `http://localhost:3000${path}`,
        `Path ${path} must NOT be redirected to /login (redirect loop prevention)`
      );
      assert.equal(getRedirectState(), false, 'isRedirecting flag must remain false on auth pages');
    }
  });

  test('7. Login Failure Preservation: 401 on /auth/login does NOT redirect or clear tokens', async () => {
    localStorage.setItem('lms_token', 'existing-token-dont-touch');
    localStorage.setItem('lms_current_user', 'existing-user-123');
    window.location.pathname = '/student/login';
    window.location.href = 'http://localhost:3000/student/login';

    let caughtError;
    try {
      await api.post('/auth/login', { identifier: 'bad@user.com', password: 'wrongpassword' });
    } catch (e) {
      caughtError = e;
    }

    assert.ok(caughtError, 'Login failure must throw/reject error');
    assert.equal(caughtError.response?.status, 401);
    assert.equal(caughtError.response?.data?.detail, 'Incorrect student number/email or password');

    // Verify auth state is preserved and no redirect happened
    assert.equal(localStorage.getItem('lms_token'), 'existing-token-dont-touch');
    assert.equal(localStorage.getItem('lms_current_user'), 'existing-user-123');
    assert.equal(dispatchedEvents.length, 0, 'No auth:unauthorized event should be fired for login failure');
    assert.equal(window.location.href, 'http://localhost:3000/student/login', 'User must remain on login page');
    assert.equal(getRedirectState(), false);
  });

  test('8. Registration Endpoint Preservation: 401 on /auth/register does NOT redirect or clear state', async () => {
    localStorage.setItem('lms_token', 'current-token');
    window.location.pathname = '/student/register';
    window.location.href = 'http://localhost:3000/student/register';

    await assert.rejects(
      async () => {
        await api.post('/auth/register/trainer', { email: 'trainer@example.com' });
      },
      (err) => err.response?.status === 401
    );

    assert.equal(localStorage.getItem('lms_token'), 'current-token');
    assert.equal(dispatchedEvents.length, 0);
    assert.equal(window.location.href, 'http://localhost:3000/student/register');
  });

  test('9. HTTP 403 Forbidden: does NOT log out user or redirect', async () => {
    localStorage.setItem('lms_token', 'valid-active-session');
    localStorage.setItem('lms_current_user', 'user-456');
    window.location.pathname = '/student/materials';
    window.location.href = 'http://localhost:3000/student/materials';

    await assert.rejects(
      async () => {
        await api.get('/protected/forbidden');
      },
      (err) => err.response?.status === 403
    );

    assert.equal(localStorage.getItem('lms_token'), 'valid-active-session', 'Token must remain on 403');
    assert.equal(localStorage.getItem('lms_current_user'), 'user-456', 'User ID must remain on 403');
    assert.equal(dispatchedEvents.length, 0, 'No logout event on 403');
    assert.equal(window.location.href, 'http://localhost:3000/student/materials', 'No redirect on 403');
  });

  test('10. HTTP 404 Not Found: does NOT log out user or redirect', async () => {
    localStorage.setItem('lms_token', 'valid-active-session');
    localStorage.setItem('lms_current_user', 'user-456');
    window.location.pathname = '/student/tests';
    window.location.href = 'http://localhost:3000/student/tests';

    await assert.rejects(
      async () => {
        await api.get('/protected/not-found');
      },
      (err) => err.response?.status === 404
    );

    assert.equal(localStorage.getItem('lms_token'), 'valid-active-session', 'Token must remain on 404');
    assert.equal(localStorage.getItem('lms_current_user'), 'user-456', 'User ID must remain on 404');
    assert.equal(dispatchedEvents.length, 0);
    assert.equal(window.location.href, 'http://localhost:3000/student/tests');
  });

  test('11. HTTP 500 Server Error: does NOT log out user or redirect', async () => {
    localStorage.setItem('lms_token', 'valid-active-session');
    localStorage.setItem('lms_current_user', 'user-456');
    window.location.pathname = '/student/dashboard';
    window.location.href = 'http://localhost:3000/student/dashboard';

    await assert.rejects(
      async () => {
        await api.get('/protected/server-error');
      },
      (err) => err.response?.status === 500
    );

    assert.equal(localStorage.getItem('lms_token'), 'valid-active-session', 'Token must remain on 500');
    assert.equal(localStorage.getItem('lms_current_user'), 'user-456', 'User ID must remain on 500');
    assert.equal(dispatchedEvents.length, 0);
    assert.equal(window.location.href, 'http://localhost:3000/student/dashboard');
  });

  test('12. Helper functions: isAuthEndpoint and isAuthRoute pattern matching', () => {
    // isAuthEndpoint
    assert.equal(isAuthEndpoint('/auth/login'), true);
    assert.equal(isAuthEndpoint('/api/auth/login'), true);
    assert.equal(isAuthEndpoint('http://localhost:8000/api/auth/login'), true);
    assert.equal(isAuthEndpoint('/auth/register/student'), true);
    assert.equal(isAuthEndpoint('/tests'), false);
    assert.equal(isAuthEndpoint('/materials/123'), false);
    assert.equal(isAuthEndpoint(undefined), false);

    // isAuthRoute
    assert.equal(isAuthRoute('/login'), true);
    assert.equal(isAuthRoute('/login/student'), true);
    assert.equal(isAuthRoute('/student/login'), true);
    assert.equal(isAuthRoute('/trainer/login'), true);
    assert.equal(isAuthRoute('/institution/login'), true);
    assert.equal(isAuthRoute('/admin/login'), true);
    assert.equal(isAuthRoute('/student/register'), true);
    assert.equal(isAuthRoute('/register'), true);
    assert.equal(isAuthRoute('/student/dashboard'), false);
    assert.equal(isAuthRoute('/trainer/tests'), false);
    assert.equal(isAuthRoute('/admin/management'), false);
    assert.equal(isAuthRoute(''), false);
    assert.equal(isAuthRoute(undefined), false);
  });

  test('13. Network Error: does NOT log out user or redirect', async () => {
    localStorage.setItem('lms_token', 'valid-active-session');
    localStorage.setItem('lms_current_user', 'user-456');
    window.location.pathname = '/student/dashboard';
    window.location.href = 'http://localhost:3000/student/dashboard';

    // Request against non-listening port to trigger network ECONNREFUSED
    await assert.rejects(
      async () => {
        await api.get('http://127.0.0.1:1/unreachable');
      }
    );

    assert.equal(localStorage.getItem('lms_token'), 'valid-active-session', 'Token must remain on network error');
    assert.equal(localStorage.getItem('lms_current_user'), 'user-456', 'User ID must remain on network error');
    assert.equal(dispatchedEvents.length, 0);
    assert.equal(window.location.href, 'http://localhost:3000/student/dashboard');
  });

  test('14. Headless/SSR environment without window: safely clears tokens without crashing', async () => {
    const originalWindow = globalThis.window;
    try {
      delete globalThis.window;
      localStorage.setItem('lms_token', 'token-in-worker');
      localStorage.setItem('lms_current_user', 'user-in-worker');

      await assert.rejects(
        async () => {
          await api.get('/protected/session-expired');
        },
        (err) => err.response?.status === 401
      );

      assert.equal(localStorage.getItem('lms_token'), null);
      assert.equal(localStorage.getItem('lms_current_user'), null);
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

