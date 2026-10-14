import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { CurrentUser } from './auth.models';

const user: CurrentUser = {
  id: '01a13a09-e15c-7207-88d0-2d801dccc785',
  userName: 'sarvar',
  email: 'sarvar@example.com',
  displayName: 'Sarvar',
  emailConfirmed: false,
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the current user once, however often it is asked', async () => {
    const first = auth.ensureLoaded();
    const second = auth.ensureLoaded();

    http.expectOne('/api/auth/me').flush(user);
    await Promise.all([first, second]);

    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.loaded()).toBe(true);
  });

  it('treats 204 from /me as an anonymous visitor', async () => {
    const loading = auth.ensureLoaded();

    http.expectOne('/api/auth/me').flush(null, { status: 204, statusText: 'No Content' });
    await loading;

    expect(auth.user()).toBeNull();
    expect(auth.loaded()).toBe(true);
  });

  it('treats 401 from /me as signed out', async () => {
    const loading = auth.ensureLoaded();

    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await loading;

    expect(auth.user()).toBeNull();
    expect(auth.loaded()).toBe(true);
  });

  it('signs in and out', async () => {
    const login = auth.login({
      login: 'sarvar',
      password: 'correct-horse-battery',
      rememberMe: true,
    });
    const loginRequest = http.expectOne('/api/auth/login');
    expect(loginRequest.request.method).toBe('POST');
    loginRequest.flush(user);
    await login;
    expect(auth.isAuthenticated()).toBe(true);

    const logout = auth.logout();
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await logout;
    expect(auth.isAuthenticated()).toBe(false);

    // The session is already known; no extra /me request.
    await auth.ensureLoaded();
  });
});
