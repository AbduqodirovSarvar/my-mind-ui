import { RenderMode, ServerRoute } from '@angular/ssr';

// Plan §9.1: public pages render on the server per request; auth and personal pages need the
// session cookie, which the SSR server never sees, so they render in the browser only.
export const serverRoutes: ServerRoute[] = [
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'register', renderMode: RenderMode.Client },
  { path: 'me', renderMode: RenderMode.Client },
  { path: 'me/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
