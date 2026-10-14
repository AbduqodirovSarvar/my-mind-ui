import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import {
  ArticleDetail,
  ArticleListItem,
  CategoryResponse,
  MediaResponse,
  PagedResponse,
  TipTapDocument,
  VersionedArticle,
} from './content.models';

/** The signed-in author's categories, articles and uploads (`/api/me/*`). */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  categories(): Promise<CategoryResponse[]> {
    return firstValueFrom(this.http.get<CategoryResponse[]>(`${this.baseUrl}/me/categories`));
  }

  createCategory(name: string, parentId: string | null = null): Promise<CategoryResponse> {
    return firstValueFrom(
      this.http.post<CategoryResponse>(`${this.baseUrl}/me/categories`, { name, parentId }),
    );
  }

  articles(page = 1, pageSize = 50): Promise<PagedResponse<ArticleListItem>> {
    return firstValueFrom(
      this.http.get<PagedResponse<ArticleListItem>>(`${this.baseUrl}/me/articles`, {
        params: { page, pageSize },
      }),
    );
  }

  createArticle(categoryId: string, title: string | null): Promise<VersionedArticle> {
    return this.versioned(
      this.http.post<ArticleDetail>(
        `${this.baseUrl}/me/articles`,
        { categoryId, title },
        { observe: 'response' },
      ),
    );
  }

  article(id: string): Promise<VersionedArticle> {
    return this.versioned(
      this.http.get<ArticleDetail>(`${this.baseUrl}/me/articles/${id}`, { observe: 'response' }),
    );
  }

  /**
   * Autosave. `keepalive` lets the request finish while the page unloads (the browser caps
   * such bodies at 64 KB; bigger drafts rely on the IndexedDB backup instead).
   */
  saveDraft(
    id: string,
    title: string,
    content: TipTapDocument,
    etag: string,
    keepalive = false,
  ): Promise<VersionedArticle> {
    return this.versioned(
      this.http.put<ArticleDetail>(
        `${this.baseUrl}/me/articles/${id}/draft`,
        { title, content },
        { observe: 'response', headers: { 'If-Match': etag }, keepalive },
      ),
    );
  }

  updateMeta(
    id: string,
    meta: { categoryId: string; slug: string; excerpt: string | null },
    etag: string,
  ): Promise<VersionedArticle> {
    return this.versioned(
      this.http.put<ArticleDetail>(`${this.baseUrl}/me/articles/${id}/meta`, meta, {
        observe: 'response',
        headers: { 'If-Match': etag },
      }),
    );
  }

  publish(id: string, etag: string): Promise<VersionedArticle> {
    return this.versioned(
      this.http.post<ArticleDetail>(`${this.baseUrl}/me/articles/${id}/publish`, null, {
        observe: 'response',
        headers: { 'If-Match': etag },
      }),
    );
  }

  unpublish(id: string): Promise<VersionedArticle> {
    return this.versioned(
      this.http.post<ArticleDetail>(`${this.baseUrl}/me/articles/${id}/unpublish`, null, {
        observe: 'response',
      }),
    );
  }

  upload(file: File): Promise<MediaResponse> {
    const form = new FormData();
    form.append('file', file, file.name);
    return firstValueFrom(this.http.post<MediaResponse>(`${this.baseUrl}/me/media`, form));
  }

  private async versioned(
    request: Observable<HttpResponse<ArticleDetail>>,
  ): Promise<VersionedArticle> {
    const response = await firstValueFrom(request);
    // Built from the body's version rather than the ETag header, which compressing proxies
    // rewrite (Caddy turns "835" into "835-zstd").
    return { article: response.body!, etag: `"${response.body!.version}"` };
  }
}
