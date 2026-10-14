import { Node } from '@tiptap/core';

export type VideoProvider = 'youtube' | 'vimeo';

export interface VideoRef {
  provider: VideoProvider;
  videoId: string;
}

// Same patterns as the server's TipTapRenderer; the server stays authoritative.
const YOUTUBE =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#].*)?$/;
const VIMEO = /^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{1,12})(?:[/?#].*)?$/;

/** Only YouTube and Vimeo links are embeddable (plan §7.4); anything else returns null. */
export function parseVideoUrl(url: string): VideoRef | null {
  const trimmed = url.trim();
  const youtube = YOUTUBE.exec(trimmed);
  if (youtube) {
    return { provider: 'youtube', videoId: youtube[1] };
  }

  const vimeo = VIMEO.exec(trimmed);
  return vimeo ? { provider: 'vimeo', videoId: vimeo[1] } : null;
}

/**
 * A video stored as provider + id only. The editor shows a preview; no third-party iframe is
 * loaded while writing, and the published page creates the player on click.
 */
function videoNode(provider: VideoProvider, label: string) {
  return Node.create({
    name: provider,
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
      return { videoId: { default: null } };
    },

    parseHTML() {
      return [
        {
          tag: `div[data-provider="${provider}"]`,
          getAttrs: (element) => ({ videoId: (element as HTMLElement).dataset['videoId'] ?? null }),
        },
      ];
    },

    renderHTML({ node }) {
      const videoId = String(node.attrs['videoId'] ?? '');
      const preview =
        provider === 'youtube'
          ? ['img', { src: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, alt: label }]
          : ['span', { class: 'video-embed-label' }, `${label}: ${videoId}`];
      return [
        'div',
        { class: 'video-embed', 'data-provider': provider, 'data-video-id': videoId },
        preview,
      ];
    },
  });
}

export const YouTubeVideo = videoNode('youtube', 'YouTube video');
export const VimeoVideo = videoNode('vimeo', 'Vimeo video');
