import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ArticleDetail,
  CategoryResponse,
  TipTapDocument,
} from '../../../core/content/content.models';
import { ContentService } from '../../../core/content/content.service';
import { readApiError } from '../../../core/http/problem';
import { ArticleEditor } from '../../../features/editor/article-editor';
import { AutosaveController, AutosaveState, SaveOutcome } from '../../../features/editor/autosave';
import { DRAFT_BACKUP, DraftBackup, DraftSnapshot } from '../../../features/editor/draft-backup';
import { StatusBadge } from './status-badge';

@Component({
  selector: 'app-article-edit',
  imports: [ArticleEditor, FormsModule, RouterLink, DatePipe, StatusBadge],
  templateUrl: './article-edit.html',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class ArticleEdit implements OnInit, OnDestroy {
  private readonly content = inject(ContentService);
  private readonly backups = inject(DRAFT_BACKUP);
  protected readonly auth = inject(AuthService);
  private readonly editorRef = viewChild(ArticleEditor);

  /** Route parameter. */
  readonly id = input.required<string>();

  protected readonly article = signal<ArticleDetail | null>(null);
  protected readonly categories = signal<{ id: string; label: string }[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly title = signal('');
  protected readonly saveState = signal<AutosaveState>('saved');
  protected readonly lastSavedAt = signal<Date | null>(null);
  /** A local copy newer than the server's draft, offered for restoring. */
  protected readonly pendingBackup = signal<DraftBackup | null>(null);

  protected readonly meta = { categoryId: '', slug: '', excerpt: '' };

  protected readonly canPublish = computed(() => {
    const article = this.article();
    return article !== null && article.status !== 'Blocked' && this.saveState() !== 'conflict';
  });

  private etag = '';
  private document: TipTapDocument = { type: 'doc', content: [] };
  private unloading = false;
  private autosave: AutosaveController | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const [{ article, etag }, categories, backup] = await Promise.all([
        this.content.article(this.id()),
        this.content.categories(),
        this.backups.get(this.id()),
      ]);

      this.etag = etag;
      this.apply(article);
      this.title.set(article.draftTitle);
      this.document = article.draftContent;
      this.categories.set(flatten(categories));

      if (backup && new Date(backup.savedAt) > new Date(article.draftUpdatedAt)) {
        this.pendingBackup.set(backup);
      }

      this.autosave = new AutosaveController({
        articleId: article.id,
        backup: this.backups,
        save: (snapshot) => this.save(snapshot),
        onState: (state, savedAt) => {
          this.saveState.set(state);
          this.lastSavedAt.set(savedAt);
        },
      });
    } catch (e) {
      this.loadError.set(readApiError(e).message);
    }
  }

  ngOnDestroy(): void {
    // Leaving for another page of the app: send what is pending.
    void this.autosave?.flush();
    this.autosave?.dispose();
  }

  protected onTitleChange(title: string): void {
    this.title.set(title);
    this.changed();
  }

  protected onContentChange(document: TipTapDocument): void {
    this.document = document;
    this.changed();
  }

  protected restoreBackup(): void {
    const backup = this.pendingBackup();
    if (!backup) {
      return;
    }

    this.title.set(backup.title);
    this.document = backup.content;
    this.editorRef()?.setContent(backup.content);
    this.pendingBackup.set(null);
    this.changed();
  }

  protected async discardBackup(): Promise<void> {
    this.pendingBackup.set(null);
    await this.backups.delete(this.id());
  }

  protected async publish(): Promise<void> {
    await this.run(async () => {
      await this.autosave?.flush();
      if (this.saveState() === 'conflict' || this.saveState() === 'error') {
        throw new Error($localize`Avval qoralamani saqlash kerak.`);
      }
      const result = await this.content.publish(this.id(), this.etag);
      this.accept(result.article, result.etag);
      this.notice.set($localize`Maqola e'lon qilindi.`);
    });
  }

  protected async unpublish(): Promise<void> {
    await this.run(async () => {
      await this.autosave?.flush();
      const result = await this.content.unpublish(this.id());
      this.accept(result.article, result.etag);
      this.notice.set($localize`Maqola yashirildi.`);
    });
  }

  protected async saveMeta(): Promise<void> {
    await this.run(async () => {
      await this.autosave?.flush();
      const result = await this.content.updateMeta(
        this.id(),
        {
          categoryId: this.meta.categoryId,
          slug: this.meta.slug.trim(),
          excerpt: this.meta.excerpt.trim() || null,
        },
        this.etag,
      );
      this.accept(result.article, result.etag);
      this.notice.set($localize`Sozlamalar saqlandi.`);
    });
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.autosave?.hasUnsavedChanges) {
      this.unloading = true;
      void this.autosave.flush();
      // Ask the browser to confirm; the local backup keeps the work either way.
      event.preventDefault();
    }
  }

  private changed(): void {
    this.notice.set(null);
    this.autosave?.change({ title: this.title(), content: this.document });
  }

  private async save(snapshot: DraftSnapshot): Promise<SaveOutcome> {
    try {
      const result = await this.content.saveDraft(
        this.id(),
        snapshot.title,
        snapshot.content,
        this.etag,
        this.unloading,
      );
      this.accept(result.article, result.etag);
      return 'ok';
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 412) {
        return 'conflict';
      }
      if (e instanceof HttpErrorResponse && e.status === 400) {
        this.actionError.set(readApiError(e).message);
      }
      return 'error';
    }
  }

  private accept(article: ArticleDetail, etag: string): void {
    this.etag = etag;
    this.apply(article);
  }

  private apply(article: ArticleDetail): void {
    this.article.set(article);
    this.meta.categoryId = article.categoryId;
    this.meta.slug = article.slug;
    this.meta.excerpt = article.hasCustomExcerpt ? (article.excerpt ?? '') : '';
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    try {
      await action();
    } catch (e) {
      this.actionError.set(
        e instanceof HttpErrorResponse
          ? readApiError(e).message
          : String((e as Error).message ?? e),
      );
    } finally {
      this.busy.set(false);
    }
  }
}

function flatten(categories: CategoryResponse[]): { id: string; label: string }[] {
  return categories.flatMap((root) => [
    { id: root.id, label: root.name },
    ...root.children.map((child) => ({ id: child.id, label: `— ${child.name}` })),
  ]);
}
