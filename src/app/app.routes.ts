import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'me',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/me/me-home').then((m) => m.MeHome),
  },
  {
    path: 'me/articles',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/me/articles/article-list').then((m) => m.ArticleList),
  },
  {
    // The editor (TipTap) lives in this lazy chunk only.
    path: 'me/articles/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/me/articles/article-edit').then((m) => m.ArticleEdit),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
