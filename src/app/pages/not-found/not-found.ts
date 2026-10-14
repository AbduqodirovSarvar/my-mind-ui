import { Component, inject, RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-3xl px-4 py-16">
      <h1 class="text-2xl font-semibold" i18n>Sahifa topilmadi</h1>
      <a routerLink="/" class="form-link mt-4 inline-block" i18n>Bosh sahifaga qaytish</a>
    </section>
  `,
})
export class NotFound {
  constructor() {
    // During SSR, answer with a real 404 so search engines do not index the page.
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) {
      response.status = 404;
    }
  }
}
