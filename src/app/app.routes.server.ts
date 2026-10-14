import { RenderMode, ServerRoute } from '@angular/ssr';

// Public pages render on the server per request (plan §9.1). Client-only (/me, auth) and
// prerendered (/about, /terms, /privacy) routes are added here together with their pages.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
