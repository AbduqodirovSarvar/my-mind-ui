import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ArticleListItem, CategoryResponse } from '../../../core/content/content.models';
import { ContentService } from '../../../core/content/content.service';
import { readApiError } from '../../../core/http/problem';
import { StatusBadge } from './status-badge';

/** The author's articles and a way to start a new one. Category management proper comes in phase 4. */
@Component({
  selector: 'app-article-list',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, StatusBadge],
  templateUrl: './article-list.html',
})
export class ArticleList implements OnInit {
  private readonly content = inject(ContentService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly articles = signal<ArticleListItem[]>([]);
  /** Categories flattened for the select: subcategories follow their parent, indented. */
  protected readonly categoryOptions = signal<{ id: string; label: string }[]>([]);

  protected readonly categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
  });
  protected readonly articleForm = this.fb.group({
    categoryId: ['', Validators.required],
    title: ['', Validators.maxLength(200)],
  });

  async ngOnInit(): Promise<void> {
    try {
      const [articles, categories] = await Promise.all([
        this.content.articles(),
        this.content.categories(),
      ]);
      this.articles.set(articles.items);
      this.setCategories(categories);
    } catch (e) {
      this.error.set(readApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected async createCategory(): Promise<void> {
    if (this.categoryForm.invalid) {
      return;
    }

    try {
      await this.content.createCategory(this.categoryForm.getRawValue().name);
      this.categoryForm.reset();
      this.setCategories(await this.content.categories());
    } catch (e) {
      this.error.set(readApiError(e).message);
    }
  }

  protected async createArticle(): Promise<void> {
    if (this.articleForm.invalid) {
      this.articleForm.markAllAsTouched();
      return;
    }

    try {
      const { categoryId, title } = this.articleForm.getRawValue();
      const { article } = await this.content.createArticle(categoryId, title.trim() || null);
      await this.router.navigate(['/me/articles', article.id, 'edit']);
    } catch (e) {
      this.error.set(readApiError(e).message);
    }
  }

  private setCategories(categories: CategoryResponse[]): void {
    const options = categories.flatMap((root) => [
      { id: root.id, label: root.name },
      ...root.children.map((child) => ({ id: child.id, label: `— ${child.name}` })),
    ]);
    this.categoryOptions.set(options);
    if (!this.articleForm.controls.categoryId.value && options.length > 0) {
      this.articleForm.controls.categoryId.setValue(options[0].id);
    }
  }
}
