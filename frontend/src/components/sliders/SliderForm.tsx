import { Film, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Slider, SliderFormValues } from '../../types';
import { formatDuration } from '../../utils/format';
import { FormErrors, LIMITS, validateImageFile, validateSlider, validateVideoFile } from '../../utils/validation';

interface Props {
  slider: Slider | null; nextOrder: number; busy: boolean; serverErrors: FormErrors;
  onSubmit: (v: SliderFormValues) => void; onClose: () => void;
}
type Field = keyof FormErrors;

export default function SliderForm({ slider, nextOrder, busy, serverErrors, onSubmit, onClose }: Props) {
  const initial: SliderFormValues = {
    name: slider?.name ?? '', description: slider?.description ?? '',
    display_order: slider?.display_order ?? nextOrder, display_duration: slider?.display_duration ?? 5,
    is_active: slider?.is_active ?? true, show_caption: slider?.show_caption ?? false, media_type: slider?.media_type ?? 'image', image: null, video: null,
  };
  const [v, setV] = useState<SliderFormValues>(initial);
  const [preview, setPreview] = useState<string | null>(slider?.image ?? null);
  const [videoPreview, setVideoPreview] = useState<string | null>(slider?.video ?? null);
  const [touched, setTouched] = useState<Set<Field>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [dimNote, setDimNote] = useState('');
  const [dismissed, setDismissed] = useState<Set<Field>>(new Set());
  const [badFile, setBadFile] = useState('');

  useEffect(() => setDismissed(new Set()), [serverErrors]);
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (videoPreview?.startsWith('blob:')) URL.revokeObjectURL(videoPreview); }, [videoPreview]);

  const live = validateSlider(v, { image: Boolean(slider?.image), video: Boolean(slider?.video) });
  const dirty = v.image !== null || v.video !== null || (['name', 'description', 'display_order', 'display_duration', 'is_active', 'show_caption', 'media_type'] as const).some((k) => v[k] !== initial[k]);
  const err = (k: Field) => (touched.has(k) || submitted ? live[k] : undefined) ?? (dismissed.has(k) ? undefined : serverErrors[k]);
  const touch = (k: Field) => setTouched((t) => new Set(t).add(k));
  const edit = <K extends keyof SliderFormValues>(k: K, val: SliderFormValues[K]) => { setV({ ...v, [k]: val }); setDismissed((d) => new Set(d).add(k as Field)); };
  const close = () => { if (dirty && !window.confirm('Discard unsaved changes?')) return; onClose(); };

  const dismissMedia = () => setDismissed((d) => new Set(d).add('image').add('video'));

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    touch('image');
    const problem = validateImageFile(f);
    if (problem) { setV({ ...v, image: null }); setPreview(slider?.image ?? null); setDimNote(''); setBadFile(problem); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setDimNote(img.width < 1920 || img.height < 1080 ? `This image is ${img.width} × ${img.height} px. For the sharpest full-screen result use 1920 × 1080 px (16:9) or larger.` : '');
      setBadFile(''); dismissMedia(); setPreview(url); setVideoPreview(null);
      setV((cur) => ({ ...cur, media_type: 'image', image: f, video: null, display_duration: cur.display_duration > LIMITS.maxDuration ? 5 : cur.display_duration }));
    };
    img.onerror = () => { URL.revokeObjectURL(url); setBadFile('This file could not be read as an image.'); };
    img.src = url;
  };
  const mediaError = badFile || err('image') || err('video');

  const pickVideo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    touch('video');
    const problem = validateVideoFile(f);
    if (problem) return setBadFile(problem);
    const url = URL.createObjectURL(f);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const secs = Math.ceil(probe.duration);
      if (!Number.isFinite(probe.duration) || secs < 1) { URL.revokeObjectURL(url); return setBadFile('Could not read the video length.'); }
      if (secs > LIMITS.maxVideoDuration) { URL.revokeObjectURL(url); return setBadFile(`Video must be shorter than ${LIMITS.maxVideoDuration} seconds.`); }
      setBadFile(''); dismissMedia(); setVideoPreview(url); setPreview(null); setDimNote('');
      setV((cur) => ({ ...cur, media_type: 'video', video: f, image: null, display_duration: secs })); // slide shows for exactly the video length
    };
    probe.onerror = () => { URL.revokeObjectURL(url); setBadFile('This file could not be read as a video.'); };
    probe.src = url;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(live).length === 0 && !badFile) onSubmit({ ...v, name: v.name.trim(), description: v.description.trim() });
  };
  const msg = (k: Field) => err(k) && <p id={`${k}-err`} role="alert" className="mt-1.5 text-sm text-red-600">{err(k)}</p>;
  const bad = (k: Field) => (err(k) ? 'border-red-400 focus:border-red-500' : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-label={slider ? 'Edit slider' : 'Add slider'}>
      <form onSubmit={submit} noValidate className="card max-h-[92vh] w-full max-w-2xl space-y-5 overflow-y-auto p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-navy-900">{slider ? 'Edit Slider' : 'Add New Slider'}</h2>
          <button type="button" onClick={close} aria-label="Close"><X size={22} /></button>
        </div>
        <div>
          <label htmlFor="name" className="mb-1.5 block font-medium">Slider Name *</label>
          <input id="name" maxLength={LIMITS.nameMax + 20} aria-invalid={Boolean(err('name'))} aria-describedby="name-err" className={`input ${bad('name')}`} placeholder="ISMO Market Operations" value={v.name} onBlur={() => touch('name')} onChange={(e) => edit('name', e.target.value)} />
          <div className="flex justify-between">{msg('name') || <span />}<span className="mt-1.5 text-sm text-slate-500">{v.name.trim().length}/{LIMITS.nameMax}</span></div>
        </div>
        <div>
          <span className="mb-1.5 block font-medium">Video or image * <span className="text-sm font-normal text-slate-500">(add one, not both)</span></span>
          <p className="mb-2 text-sm text-slate-500">A video slide needs no image, and an image slide needs no video. Images: JPG, PNG or WEBP up to {LIMITS.maxMb} MB. Videos: MP4 or WEBM up to {LIMITS.maxVideoMb} MB.</p>
          {v.media_type === 'video' && videoPreview ? (
            <video src={videoPreview} controls muted className="h-44 w-full rounded-md border border-slate-200 bg-black object-contain" />
          ) : v.media_type === 'image' && preview ? (
            <div className="relative overflow-hidden rounded-md border border-slate-200">
              <img src={preview} alt="Selected slider preview" className="h-44 w-full object-cover" />
              {v.image && <button type="button" aria-label="Remove selected image" className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow"
                onClick={() => { setV({ ...v, image: null }); setPreview(slider?.image ?? null); setDimNote(''); }}><Trash2 size={16} /></button>}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="btn-ghost cursor-pointer"><Film size={18} /> {v.media_type === 'video' && videoPreview ? 'Replace video' : 'Choose video'}
              <input type="file" accept=".mp4,.webm,video/mp4,video/webm" className="sr-only" onChange={pickVideo} /></label>
            <label className="btn-ghost cursor-pointer"><ImagePlus size={18} /> {v.media_type === 'image' && preview ? 'Replace image' : 'Choose image'}
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={pick} /></label>
          </div>
          {mediaError && <p role="alert" className="mt-1.5 text-sm text-red-600">{mediaError}</p>}
          {dimNote && !mediaError && v.media_type === 'image' && <p className="mt-1.5 text-sm text-amber-700">{dimNote}</p>}
          {v.media_type === 'video' && videoPreview && !mediaError && <p className="mt-1.5 text-sm text-slate-600">Video length: {formatDuration(v.display_duration)}. The slide stays on screen for exactly this long.</p>}
        </div>
        <div>
          <label htmlFor="desc" className="mb-1.5 block font-medium">Description <span className="font-normal text-slate-500">(optional)</span></label>
          <textarea id="desc" rows={3} aria-invalid={Boolean(err('description'))} className={`input ${bad('description')}`} value={v.description} onBlur={() => touch('description')} onChange={(e) => edit('description', e.target.value)} />
          <div className="flex justify-between">{msg('description') || <span />}<span className={`mt-1.5 text-sm ${v.description.trim().length > LIMITS.descMax ? 'text-red-600' : 'text-slate-500'}`}>{v.description.trim().length}/{LIMITS.descMax}</span></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ord" className="mb-1.5 block font-medium">Display Order *</label>
            <input id="ord" type="number" min={1} step={1} aria-invalid={Boolean(err('display_order'))} className={`input ${bad('display_order')}`} value={Number.isNaN(v.display_order) ? '' : v.display_order} onBlur={() => touch('display_order')} onChange={(e) => edit('display_order', e.target.value === '' ? NaN : Number(e.target.value))} />
            <p className="mt-1.5 text-sm text-slate-500">Other sliders shift down automatically.</p>{msg('display_order')}
          </div>
          <div>
            <label htmlFor="dur" className="mb-1.5 block font-medium">Display Duration (seconds) *</label>
            <input id="dur" type="number" min={LIMITS.minDuration} max={v.media_type === 'video' ? LIMITS.maxVideoDuration : LIMITS.maxDuration} step={1} readOnly={v.media_type === 'video'} aria-invalid={Boolean(err('display_duration'))} className={`input ${bad('display_duration')} ${v.media_type === 'video' ? 'bg-slate-100 text-slate-500' : ''}`} value={Number.isNaN(v.display_duration) ? '' : v.display_duration} onBlur={() => touch('display_duration')} onChange={(e) => edit('display_duration', e.target.value === '' ? NaN : Number(e.target.value))} />
            <p className="mt-1.5 text-sm text-slate-500">{v.media_type === 'video' ? 'Set automatically from the video length.' : `Between ${LIMITS.minDuration} and ${LIMITS.maxDuration} seconds.`}</p>{msg('display_duration')}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" role="switch" className="mt-0.5 h-5 w-5 accent-navy-800" checked={v.show_caption} onChange={(e) => setV({ ...v, show_caption: e.target.checked })} />
          <span>Show title and description on the slide<span className="block text-sm text-slate-500">{v.show_caption ? 'On: the name and description appear over the picture or video.' : 'Off: only the picture or video is shown.'}</span></span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" role="switch" className="h-5 w-5 accent-navy-800" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} />
          {v.is_active ? 'Active: shown in the public slider' : 'Inactive: hidden from the public slider'}
        </label>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" className="btn-ghost" onClick={close} disabled={busy}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? <><Loader2 size={18} className="animate-spin" />{slider ? 'Saving changes...' : 'Creating slider...'}</> : slider ? 'Save Changes' : 'Create Slider'}</button>
        </div>
      </form>
    </div>
  );
}