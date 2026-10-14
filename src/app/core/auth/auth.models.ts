export interface CurrentUser {
  id: string;
  userName: string;
  email: string;
  displayName: string;
  emailConfirmed: boolean;
}

export interface LoginRequest {
  /** Email or username. */
  login: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterRequest {
  email: string;
  userName: string;
  password: string;
  displayName: string | null;
  acceptTerms: boolean;
}
