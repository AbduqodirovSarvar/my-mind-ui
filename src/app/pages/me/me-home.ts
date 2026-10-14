import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

/** Placeholder for the personal area; articles and categories arrive in phase 2. */
@Component({
  selector: 'app-me-home',
  template: `
    <section class="mx-auto max-w-3xl px-4 py-16">
      @if (auth.user(); as user) {
        <h1 class="text-2xl font-semibold" i18n>Salom, {{ user.displayName }}!</h1>
        <p class="mt-2 text-slate-600 dark:text-slate-400">&#64;{{ user.userName }}</p>
        @if (!user.emailConfirmed) {
          <p class="form-alert mt-6" i18n>
            Emailingiz hali tasdiqlanmagan. Tasdiqlangandan keyin maqola e'lon qila olasiz.
          </p>
        }
      }
    </section>
  `,
})
export class MeHome {
  protected readonly auth = inject(AuthService);
}
