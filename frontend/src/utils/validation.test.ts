import { describe, expect, it } from 'vitest';
import type { SliderFormValues } from '../types';
import { LIMITS, validateImageFile, validateSlider, validateVideoFile } from './validation';

const file = (type: string, bytes = 100) => new File([new Uint8Array(bytes)], 'x', { type });
const ok: SliderFormValues = { name: 'Market', description: 'Desc', display_order: 1, display_duration: 5, is_active: true, show_caption: false, media_type: 'image', image: file('image/png'), video: null };
const clip: SliderFormValues = { ...ok, media_type: 'video', image: null, video: file('video/mp4'), display_duration: 120 };

describe('validateSlider (image slides)', () => {
  it('accepts a valid create', () => expect(validateSlider(ok)).toEqual({}));
  it('requires name and trims whitespace', () => expect(validateSlider({ ...ok, name: '   ' }).name).toBeDefined());
  it('rejects names over the limit', () => expect(validateSlider({ ...ok, name: 'a'.repeat(LIMITS.nameMax + 1) }).name).toBeDefined());
  it('treats the description as optional but enforces its limit', () => {
    expect(validateSlider({ ...ok, description: '' }).description).toBeUndefined();
    expect(validateSlider({ ...ok, description: 'a'.repeat(LIMITS.descMax + 1) }).description).toBeDefined();
  });
  it('rejects zero, negative, fractional and NaN order', () => {
    for (const n of [0, -1, 1.5, NaN]) expect(validateSlider({ ...ok, display_order: n }).display_order).toBeDefined();
  });
  it('enforces image duration range 1-60 whole seconds', () => {
    for (const n of [0, 61, 2.5, NaN]) expect(validateSlider({ ...ok, display_duration: n }).display_duration).toBeDefined();
    for (const n of [1, 60]) expect(validateSlider({ ...ok, display_duration: n }).display_duration).toBeUndefined();
  });
  it('requires an image on create but not when one already exists', () => {
    expect(validateSlider({ ...ok, image: null }).image).toBeDefined();
    expect(validateSlider({ ...ok, image: null }, { image: true }).image).toBeUndefined();
  });
});

describe('validateSlider (video slides)', () => {
  it('accepts a long video duration', () => expect(validateSlider(clip)).toEqual({}));
  it('caps video duration', () => expect(validateSlider({ ...clip, display_duration: LIMITS.maxVideoDuration + 1 }).display_duration).toBeDefined());
  it('requires a video unless one already exists', () => {
    expect(validateSlider({ ...clip, video: null }).video).toBeDefined();
    expect(validateSlider({ ...clip, video: null }, { video: true }).video).toBeUndefined();
  });
  it('does not require an image', () => expect(validateSlider(clip).image).toBeUndefined());
});

describe('file validators', () => {
  it('rejects unsupported image types and big images', () => {
    expect(validateImageFile(file('image/gif'))).toMatch(/JPG/);
    expect(validateImageFile(file('image/png', 5 * 1024 * 1024 + 1))).toMatch(/5 MB/);
  });
  it('accepts jpeg, png and webp', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp']) expect(validateImageFile(file(t))).toBeUndefined();
  });
  it('accepts mp4 and webm, rejects others and oversize', () => {
    for (const t of ['video/mp4', 'video/webm']) expect(validateVideoFile(file(t))).toBeUndefined();
    expect(validateVideoFile(file('video/x-msvideo'))).toMatch(/MP4/);
    expect(validateVideoFile(file('video/mp4', LIMITS.maxVideoMb * 1024 * 1024 + 1))).toMatch(/100 MB/);
  });
});