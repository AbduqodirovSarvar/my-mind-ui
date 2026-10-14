import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE_URL } from './core/api-base-url';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Inside Docker the SSR server reaches the API over the internal network.
    { provide: API_BASE_URL, useValue: `${process.env['API_URL'] ?? 'http://localhost:5071'}/api` },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
