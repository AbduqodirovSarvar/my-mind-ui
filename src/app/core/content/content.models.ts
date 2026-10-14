/** Mirrors the API contracts in MyMind.Application (my-mind repo). */

export interface CategoryResponse {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  articleCount: number;
  children: CategoryResponse[];
}

export type ArticleStatus = 'Draft' | 'Published' | 'Unpublished' | 'Blocked';

export interface ArticleListItem {
  id: string;
  categoryId: string;
  slug: string;
  status: ArticleStatus;
  title: string;
  publishedAt: string | null;
  updatedAt: string;
}

/** A TipTap document: `{ type: 'doc', content: [...] }`. */
export type TipTapDocument = { type: 'doc'; content?: unknown[] } & Record<string, unknown>;

export interface ArticleDetail {
  id: string;
  categoryId: string;
  slug: string;
  status: ArticleStatus;
  draftTitle: string;
  draftContent: TipTapDocument;
  draftUpdatedAt: string;
  publishedTitle: string | null;
  excerpt: string | null;
  hasCustomExcerpt: boolean;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
  version: number;
}

/** An article together with the ETag the next write must send back in If-Match. */
export interface VersionedArticle {
  article: ArticleDetail;
  etag: string;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MediaResponse {
  id: string;
  url: string;
  smallUrl: string | null;
  width: number;
  height: number;
  sizeBytes: number;
}
