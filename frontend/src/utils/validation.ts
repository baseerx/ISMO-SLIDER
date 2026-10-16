import type { SliderFormValues } from '../types';

export const LIMITS = { nameMax: 150, descMax: 500, maxMb: 5, minDuration: 1, maxDuration: 60, maxVideoMb: 100, maxVideoDuration: 600 } as const;
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export type FormErrors = Partial<Record<'name' | 'description' | 'display_order' | 'display_duration' | 'image' | 'video', string>>;
export interface Existing { image?: boolean; video?: boolean }

export function validateImageFile(file: File): string | undefined {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Image must be a JPG, JPEG, PNG or WEBP file.';
  if (file.size > LIMITS.maxMb * 1024 * 1024) return `Image size must be less than ${LIMITS.maxMb} MB.`;
  return undefined;
}

export function validateVideoFile(file: File): string | undefined {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) return 'Video must be an MP4 or WEBM file.';
  if (file.size > LIMITS.maxVideoMb * 1024 * 1024) return `Video size must be less than ${LIMITS.maxVideoMb} MB.`;
  return undefined;
}

export function validateSlider(v: SliderFormValues, existing: Existing = {}): FormErrors {
  const e: FormErrors = {};
  const name = v.name.trim();
  if (!name) e.name = 'Slider name is required.';
  else if (name.length > LIMITS.nameMax) e.name = `Name must not exceed ${LIMITS.nameMax} characters.`;
  const desc = v.description.trim();
  if (desc.length > LIMITS.descMax) e.description = `Description must not exceed ${LIMITS.descMax} characters.`;
  if (!Number.isInteger(v.display_order) || v.display_order < 1) e.display_order = 'Display order must be a positive whole number.';

  const isVideo = v.media_type === 'video';
  const maxDuration = isVideo ? LIMITS.maxVideoDuration : LIMITS.maxDuration;
  if (!Number.isInteger(v.display_duration) || v.display_duration < LIMITS.minDuration || v.display_duration > maxDuration)
    e.display_duration = `Duration must be a whole number between ${LIMITS.minDuration} and ${maxDuration} seconds.`;

  if (isVideo) {
    const problem = v.video ? validateVideoFile(v.video) : existing.video ? undefined : 'Add an image or a video.';
    if (problem) e.video = problem;
  } else {
    const problem = v.image ? validateImageFile(v.image) : existing.image ? undefined : 'Add an image or a video.';
    if (problem) e.image = problem;
  }
  return e;
}