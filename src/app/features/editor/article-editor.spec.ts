import { withAtLeastOneBlock } from './article-editor';

describe('withAtLeastOneBlock', () => {
  it('gives an empty document one paragraph, so the editor starts with a caret, not a select-all', () => {
    expect(withAtLeastOneBlock({ type: 'doc', content: [] })).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
    expect(withAtLeastOneBlock({ type: 'doc' })).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });

  it('keeps documents that have content', () => {
    const document = { type: 'doc' as const, content: [{ type: 'heading', attrs: { level: 2 } }] };

    expect(withAtLeastOneBlock(document)).toBe(document);
  });
});
