import { Film, GripVertical, Loader2, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { sliderApi } from '../api/sliderApi';
import SliderForm from '../components/sliders/SliderForm';
import { Slider, SliderFormValues, StatusFilter } from '../types';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { formatDuration } from '../utils/format';

export function Thumb({ src, video, alt, className = 'h-12 w-20' }: { src: string | null; video?: string | null; alt: string; className?: string }) {
  const [bad, setBad] = useState(false);
  if (!src && video) return <video src={`${video}#t=0.5`} muted preload="metadata" aria-label={alt} className={`${className} rounded-md bg-black object-cover`} />;
  return bad || !src
    ? <div className={`${className} grid place-items-center rounded-md bg-slate-100 text-[10px] text-slate-400`}>No image</div>
    : <img src={src} alt={alt} onError={() => setBad(true)} className={`${className} rounded-md object-cover`} />;
}

export default function Sliders() {
  const [items, setItems] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [ordering, setOrdering] = useState('display_order');
  const [editing, setEditing] = useState<Slider | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Slider | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { setItems((await sliderApi.list({ search, status, ordering, page_size: 100 })).results); }
    catch (e) { toast.error(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [search, status, ordering]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const save = async (v: SliderFormValues) => {
    setBusy(true); setServerErrors({});
    try {
      if (editing === 'new') { await sliderApi.create(v); toast.success('Slider created successfully.'); }
      else if (editing) { await sliderApi.update(editing.id, v); toast.success('Slider updated successfully.'); }
      setEditing(null); await load();
    } catch (e) {
      const fields = getFieldErrors(e);
      setServerErrors(fields);
      if (!Object.keys(fields).length) toast.error(getErrorMessage(e, 'Unable to save slider. Please try again.'));
    } finally { setBusy(false); }
  };

  const toggle = async (s: Slider) => {
    try { await sliderApi.setStatus(s.id, !s.is_active); toast.success('Slider status updated.'); await load(); }
    catch (e) { toast.error(getErrorMessage(e)); }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try { await sliderApi.remove(toDelete.id); toast.success('Slider deleted successfully.'); setToDelete(null); await load(); }
    catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  const canReorder = !search && status === 'all' && ordering === 'display_order';
  const drop = async (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    const next = [...items];
    const from = next.findIndex((s) => s.id === dragId);
    const [moved] = next.splice(from, 1);
    next.splice(next.findIndex((s) => s.id === targetId) + (from < next.findIndex((s) => s.id === targetId) + 1 ? 1 : 0), 0, moved);
    setItems(next); setDragId(null);
    try { setItems(await sliderApi.reorder(next.map((s) => s.id))); toast.success('Slider order saved.'); }
    catch (e) { toast.error(getErrorMessage(e)); await load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold text-navy-900">Slider Management</h1>
          <p className="text-sm text-slate-500">Manage ISMO website banners and slider content.</p></div>
        <button className="btn-primary" onClick={() => { setServerErrors({}); setEditing('new'); }}><Plus size={16} /> Add New Slider</button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name" aria-label="Search sliders" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="input w-auto" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select className="input w-auto" aria-label="Sort by" value={ordering} onChange={(e) => setOrdering(e.target.value)}>
          <option value="display_order">Display order</option><option value="name">Name</option>
          <option value="-created_at">Created date</option><option value="-updated_at">Updated date</option></select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />)}</div>
          : items.length === 0 ? (
            <div className="p-12 text-center"><p className="text-slate-500">No sliders found.</p>
              <button className="btn-primary mt-4" onClick={() => setEditing('new')}>Create Your First Slider</button></div>
          ) : (
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                {canReorder && <th className="w-8" />}{['Preview', 'Name', 'Description', 'Order', 'Duration', 'Status', 'Updated', 'Actions'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((s) => (
                  <tr key={s.id} draggable={canReorder} onDragStart={() => setDragId(s.id)} onDragOver={(e) => canReorder && e.preventDefault()} onDrop={() => drop(s.id)}
                    className={`transition hover:bg-slate-50 ${dragId === s.id ? 'opacity-40' : ''}`}>
                    {canReorder && <td className="pl-3 text-slate-400"><GripVertical size={16} className="cursor-grab" aria-label="Drag to reorder" /></td>}
                    <td className="px-4 py-3"><Thumb src={s.image} video={s.video} alt={s.name} /></td>
                    <td className="px-4 py-3 font-medium text-navy-900">{s.name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={s.description}>{s.description}</td>
                    <td className="px-4 py-3">{s.display_order}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5">{s.media_type === 'video' && <Film size={15} className="text-navy-800" aria-label="Video slide" />}{formatDuration(s.display_duration)}</span></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.is_active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-slate-500">{new Date(s.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button className="rounded p-2 hover:bg-slate-100" aria-label={`Edit ${s.name}`} onClick={() => { setServerErrors({}); setEditing(s); }}><Pencil size={16} /></button>
                      <button className={`rounded-md p-2 transition ${s.is_active ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} aria-pressed={s.is_active} title={s.is_active ? 'Active: click to deactivate' : 'Inactive: click to activate'} aria-label={s.is_active ? `Deactivate ${s.name}` : `Activate ${s.name}`} onClick={() => toggle(s)}><Power size={18} /></button>
                      <button className="rounded p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${s.name}`} onClick={() => setToDelete(s)}><Trash2 size={16} /></button></div></td>
                  </tr>))}
              </tbody>
            </table>)}
      </div>
      {canReorder && items.length > 1 && <p className="text-xs text-slate-500">Tip: drag a row by its handle to change the display order. Changes save immediately.</p>}

      {editing && <SliderForm key={editing === 'new' ? 'new' : editing.id} slider={editing === 'new' ? null : editing} nextOrder={items.length + 1}
        busy={busy} serverErrors={serverErrors} onSubmit={save} onClose={() => !busy && setEditing(null)} />}

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="del-title">
          <div className="card w-full max-w-md space-y-4 p-6">
            <h2 id="del-title" className="text-lg font-semibold">Delete Slider?</h2>
            <p className="text-sm text-slate-600">Are you sure you want to delete “{toDelete.name}”? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button className="btn-ghost" onClick={() => setToDelete(null)} disabled={busy}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete} disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Deleting...</> : 'Delete Slider'}</button>
            </div></div></div>)}
    </div>
  );
}