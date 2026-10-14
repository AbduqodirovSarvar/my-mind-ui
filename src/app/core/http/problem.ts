import { HttpErrorResponse } from '@angular/common/http';

/** RFC 9457 problem details as returned by the API. */
interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  message: string;
  /** Field errors keyed by camelCase property name (`userName`, `password`, ...). */
  fieldErrors: Record<string, string[]>;
}

export function readApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { message: $localize`Kutilmagan xatolik yuz berdi.`, fieldErrors: {} };
  }

  if (error.status === 0) {
    return { message: $localize`Server bilan aloqa yo'q. Internetni tekshiring.`, fieldErrors: {} };
  }

  const problem = (error.error ?? {}) as ProblemDetails;
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(problem.errors ?? {})) {
    const field = key ? key.charAt(0).toLowerCase() + key.slice(1) : '';
    fieldErrors[field] = [...(fieldErrors[field] ?? []), ...messages];
  }

  return {
    message: problem.title ?? $localize`So'rov bajarilmadi (${error.status}:status:).`,
    fieldErrors,
  };
}
