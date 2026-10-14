import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Editor, JSONContent } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { TipTapDocument } from '../../core/content/content.models';
import { ContentService } from '../../core/content/content.service';
import { readApiError } from '../../core/http/problem';
import { parseVideoUrl, VimeoVideo, YouTubeVideo } from './video';

/**
 * ProseMirror needs at least one block: a doc with `content: []` (how the API stores a new,
 * empty article) makes TipTap start with an AllSelection, so the first keystroke or toolbar
 * command replaces the whole document. Start such documents with one empty paragraph.
 */
export function withAtLeastOneBlock(document: TipTapDocument): JSONContent {
  return Array.isArray(document.content) && document.content.length > 0
    ? (document as JSONContent)
    : { ...document, type: 'doc', content: [{ type: 'paragraph' }] };
}

/** Plan §8.1: the article limit is 100 000 characters. */
export const MAX_CHARACTERS = 100_000;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * TipTap 3 wrapper. Runs only in the browser (the editor route renders client-side) and only
 * produces the extensions the server renderer accepts (plan §8.1).
 */
@Component({
  selector: 'app-article-editor',
  templateUrl: './article-editor.html',
  host: { class: 'block' },
})
export class ArticleEditor implements OnDestroy {
  private readonly contentService = inject(ContentService);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('editorHost');

  /** The document to start with; later changes go through {@link setContent}. */
  readonly content = input.required<TipTapDocument>();
  readonly contentChange = output<TipTapDocument>();

  protected readonly editor = signal<Editor | null>(null);
  protected readonly uploading = signal(0);
  protected readonly error = signal<string | null>(null);
  /** Bumped on every transaction so toolbar states (`isActive`) re-evaluate. */
  protected readonly revision = signal(0);

  constructor() {
    afterNextRender(() => {
      const editor = new Editor({
        element: this.host().nativeElement,
        extensions: [
          StarterKit.configure({
            heading: { levels: [2, 3, 4] },
            link: {
              openOnClick: false,
              autolink: true,
              defaultProtocol: 'https',
              protocols: ['http', 'https', 'mailto'],
            },
          }),
          Image.configure({ inline: false, allowBase64: false }),
          TableKit.configure({ table: { resizable: false } }),
          Placeholder.configure({ placeholder: $localize`Maqolani shu yerda yozing…` }),
          CharacterCount.configure({ limit: MAX_CHARACTERS }),
          YouTubeVideo,
          VimeoVideo,
        ],
        content: withAtLeastOneBlock(this.content()),
        editorProps: {
          attributes: { class: 'prose-content min-h-[50vh] outline-none' },
          handlePaste: (_view, event) => this.uploadFiles(event.clipboardData?.files),
          handleDrop: (_view, event) => this.uploadFiles((event as DragEvent).dataTransfer?.files),
        },
        onUpdate: ({ editor }) => this.contentChange.emit(editor.getJSON() as TipTapDocument),
        onTransaction: () => this.revision.update((n) => n + 1),
      });
      this.editor.set(editor);
    });
  }

  ngOnDestroy(): void {
    this.editor()?.destroy();
  }

  /** Replaces the document without emitting a change (e.g. restoring a local backup). */
  setContent(document: TipTapDocument): void {
    this.editor()?.commands.setContent(withAtLeastOneBlock(document), { emitUpdate: false });
  }

  getContent(): TipTapDocument | null {
    return (this.editor()?.getJSON() as TipTapDocument | undefined) ?? null;
  }

  protected isActive(name: string, attributes?: Record<string, unknown>): boolean {
    this.revision();
    return this.editor()?.isActive(name, attributes) ?? false;
  }

  protected characters(): number {
    this.revision();
    return this.editor()?.storage.characterCount.characters() ?? 0;
  }

  /**
   * Toolbar clicks keep the focus (and caret) in the editor instead of moving it to the button.
   * The file picker label still opens: only mousedown's default is cancelled, not the click.
   */
  protected keepEditorFocus(event: MouseEvent): void {
    event.preventDefault();
  }

  protected chain() {
    return this.editor()!.chain().focus();
  }

  protected setLink(): void {
    const editor = this.editor();
    if (!editor) {
      return;
    }

    const current = (editor.getAttributes('link')['href'] as string | undefined) ?? 'https://';
    const href = prompt(
      $localize`Havola manzili (bo'sh qoldirsangiz havola olib tashlanadi):`,
      current,
    );
    if (href === null) {
      return;
    }

    if (href.trim() === '' || href.trim() === 'https://') {
      this.chain().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (!/^(https?:\/\/|mailto:)/i.test(href.trim())) {
      this.error.set($localize`Havola http://, https:// yoki mailto: bilan boshlanishi kerak.`);
      return;
    }

    this.error.set(null);
    this.chain().extendMarkRange('link').setLink({ href: href.trim() }).run();
  }

  protected insertVideo(): void {
    const url = prompt($localize`YouTube yoki Vimeo havolasi:`);
    if (!url) {
      return;
    }

    const video = parseVideoUrl(url);
    if (!video) {
      this.error.set($localize`Faqat YouTube va Vimeo havolalari qo'llab-quvvatlanadi.`);
      return;
    }

    this.error.set(null);
    this.chain()
      .insertContent({ type: video.provider, attrs: { videoId: video.videoId } })
      .run();
  }

  protected pickImages(input: HTMLInputElement): void {
    this.uploadFiles(input.files);
    input.value = '';
  }

  /** Uploads image files and inserts them; returns true when it handled the event. */
  private uploadFiles(files: FileList | null | undefined): boolean {
    const images = Array.from(files ?? []).filter((f) => IMAGE_TYPES.includes(f.type));
    if (images.length === 0) {
      return false;
    }

    for (const file of images) {
      void this.uploadOne(file);
    }
    return true;
  }

  private async uploadOne(file: File): Promise<void> {
    this.uploading.update((n) => n + 1);
    this.error.set(null);
    try {
      const media = await this.contentService.upload(file);
      this.chain()
        .setImage({ src: media.url, alt: '', width: media.width, height: media.height })
        .run();
    } catch (e) {
      const apiError = readApiError(e);
      this.error.set(apiError.fieldErrors['file']?.[0] ?? apiError.message);
    } finally {
      this.uploading.update((n) => n - 1);
    }
  }
}
