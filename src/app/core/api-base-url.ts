import { InjectionToken } from '@angular/core';

/**
 * Base URL for API calls. The browser uses the relative `/api` path (same origin behind Caddy);
 * the SSR server overrides it with the internal address (see app.config.server.ts).
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
