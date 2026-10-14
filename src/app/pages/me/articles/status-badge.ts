import { Component, computed, input } from '@angular/core';
import { ArticleStatus } from '../../../core/content/content.models';

@Component({
  selector: 'app-status-badge',
  template: `<span class="rounded px-1.5 py-0.5 text-xs font-medium" [class]="tone()">{{
    label()
  }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<ArticleStatus>();

  protected readonly label = computed(() => {
    switch (this.status()) {
      case 'Published':
        return $localize`E'lon qilingan`;
      case 'Unpublished':
        return $localize`Yashirilgan`;
      case 'Blocked':
        return $localize`Bloklangan`;
      default:
        return $localize`Qoralama`;
    }
  });

  protected readonly tone = computed(() => {
    switch (this.status()) {
      case 'Published':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'Blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  });
}
