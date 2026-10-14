import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <section class="mx-auto max-w-3xl px-4 py-16">
      <h1 class="text-3xl font-semibold">MyMind</h1>
      <p class="mt-2 text-slate-600 dark:text-slate-400" i18n>Maqolalar platformasi</p>
    </section>
  `,
})
export class Home {}
