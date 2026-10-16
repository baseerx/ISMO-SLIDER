import { ArrowRight, Layers, MonitorPlay, PauseCircle, Radio, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { sliderApi } from '../api/sliderApi';
import { useAuth } from '../context/AuthContext';
import type { Slider } from '../types';
import { getErrorMessage } from '../utils/errors';
import { Thumb } from './Sliders';

const loopLabel = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`);
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Slider[] | null>(null);

  useEffect(() => {
    sliderApi.list({ ordering: '-updated_at', page_size: 100 }).then((r) => setItems(r.results))
      .catch((e) => { toast.error(getErrorMessage(e)); setItems([]); });
  }, []);

  const active = (items ?? []).filter((s) => s.is_active).sort((a, b) => a.display_order - b.display_order);
  const total = items?.length ?? 0;
  const loop = active.reduce((sum, s) => sum + s.display_duration, 0);
  const live = active[0];
  const stats = [
    { label: 'Total sliders', value: total, icon: Layers, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Live on website', value: active.length, icon: Radio, tint: 'bg-sky-50 text-sky-600' },
    { label: 'Inactive', value: total - active.length, icon: PauseCircle, tint: 'bg-slate-100 text-slate-500' },
    { label: 'Full loop time', value: loopLabel(loop), icon: Timer, tint: 'bg-orange-50 text-signal-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-navy-900">{greeting()}, {user?.username}</h1>
        <p className="mt-1 text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <section className="grid overflow-hidden rounded-xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white shadow-lg lg:grid-cols-5" aria-label="Live slider summary">
        <div className="flex flex-col justify-center gap-5 p-8 lg:col-span-3">
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
            {items === null ? 'Loading your sliders...' : active.length ? `${active.length} ${active.length === 1 ? 'slide is' : 'slides are'} live on the website` : 'Nothing is live right now'}
          </h2>
          <p className="max-w-lg text-lg text-sky-100/80">
            {active.length ? `Visitors see them in display order. One full loop takes ${loopLabel(loop)}.` : 'Activate a slider in Slider Management to publish it.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/preview" className="btn bg-signal-500 text-navy-950 hover:bg-signal-400"><MonitorPlay size={18} /> Open full-screen preview</Link>
            <Link to="/sliders" className="btn bg-white/10 text-white hover:bg-white/20">Manage sliders <ArrowRight size={18} /></Link>
          </div>
        </div>
        <div className="relative min-h-52 p-4 lg:col-span-2 lg:p-6">
          {live ? (
            <div className="relative h-full min-h-44 overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/20">
              <Thumb src={live.image} video={live.video} alt={live.name} className="absolute inset-0 h-full w-full !rounded-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 to-transparent" />
              <p className="absolute bottom-3 left-4 right-4 truncate text-lg font-semibold">Slide 1: {live.name}</p>
            </div>
          ) : <div className="grid h-full min-h-44 place-items-center rounded-lg border border-dashed border-white/30 text-sky-100/70">No active slide</div>}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Statistics">
        {stats.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="card flex items-center gap-4 p-5 transition hover:shadow-md">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${tint}`}><Icon size={24} /></span>
            <div className="min-w-0">
              <p className="text-sm text-slate-500">{label}</p>
              {items === null ? <div className="mt-1 h-8 w-16 animate-pulse rounded bg-slate-100" /> : <p className="font-display text-3xl font-bold text-navy-900">{value}</p>}
            </div>
          </div>))}
      </section>
    </div>
  );
}