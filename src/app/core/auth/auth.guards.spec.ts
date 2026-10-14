import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard, safeReturnUrl } from './auth.guards';

describe('safeReturnUrl', () => {
  it.each(['/me', '/me/articles?x=1'])('keeps in-app path %s', (url) => {
    expect(safeReturnUrl(url)).toBe(url);
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'me', '', null, undefined])(
    'falls back for %s',
    (url) => {
      expect(safeReturnUrl(url)).toBe('/me');
    },
  );
});

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('redirects a signed-out user to /login with the return url', async () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/me' } as RouterStateSnapshot),
    ) as Promise<boolean | UrlTree>;

    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(String(await result)).toBe('/login?returnUrl=%2Fme');
  });
});
