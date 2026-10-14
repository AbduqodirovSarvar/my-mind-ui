import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { readApiError } from '../../../core/http/problem';

/** Mirrors the server rules (UsernameRules, RegisterRequestValidator); the server stays authoritative. */
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const PASSWORD_MIN_LENGTH = 10;

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly serverErrors = signal<Record<string, string[]>>({});

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    userName: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    displayName: ['', [Validators.maxLength(60)]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
    acceptTerms: [false, [Validators.requiredTrue]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.serverErrors.set({});
    try {
      const value = this.form.getRawValue();
      await this.auth.register({
        ...value,
        userName: value.userName.trim().toLowerCase(),
        displayName: value.displayName.trim() || null,
      });
      await this.router.navigateByUrl('/me');
    } catch (e) {
      const apiError = readApiError(e);
      this.serverErrors.set(apiError.fieldErrors);
      this.error.set(apiError.message);
    } finally {
      this.submitting.set(false);
    }
  }

  protected fieldError(field: string): string | null {
    return this.serverErrors()[field]?.[0] ?? null;
  }
}
