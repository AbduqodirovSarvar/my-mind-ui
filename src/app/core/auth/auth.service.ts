import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { CurrentUser, LoginRequest, RegisterRequest } from './auth.models';

/**
 * Session state for the browser. The session itself is an HttpOnly cookie set by the API;
 * `GET /auth/me` also hands out the XSRF token that HttpClient sends with every mutation.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly currentUser = signal<CurrentUser | null>(null);
  private readonly isLoaded = signal(false);
  private loading: Promise<void> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly loaded = this.isLoaded.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  /** Loads the session once; later calls reuse the same request. */
  ensureLoaded(): Promise<void> {
    this.loading ??= this.fetchCurrentUser();
    return this.loading;
  }

  async login(request: LoginRequest): Promise<void> {
    const user = await firstValueFrom(
      this.http.post<CurrentUser>(`${this.baseUrl}/auth/login`, request),
    );
    this.setUser(user);
  }

  async register(request: RegisterRequest): Promise<void> {
    const user = await firstValueFrom(
      this.http.post<CurrentUser>(`${this.baseUrl}/auth/register`, request),
    );
    this.setUser(user);
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.baseUrl}/auth/logout`, null));
    this.setUser(null);
  }

  private async fetchCurrentUser(): Promise<void> {
    try {
      this.currentUser.set(
        await firstValueFrom(this.http.get<CurrentUser>(`${this.baseUrl}/auth/me`)),
      );
    } catch (error) {
      this.currentUser.set(null);
      if (!(error instanceof HttpErrorResponse && error.status === 401)) {
        console.error('Sessiyani yuklab bo‘lmadi', error);
      }
    } finally {
      this.isLoaded.set(true);
    }
  }

  private setUser(user: CurrentUser | null): void {
    this.currentUser.set(user);
    this.isLoaded.set(true);
    this.loading = Promise.resolve();
  }
}
