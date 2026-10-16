import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicSlider } from '../../types';

export default function SliderCarousel({ slides }: { slides: PublicSlider[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); 
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const root = useRef<HTMLElement>(null);
  const vids = useRef(new Map<number, HTMLVideoElement>());
  const count = slides.length;
  const cur = slides[index] ?? slides[0];

  const [ratios, setRatios] = useState<Record<number, number>>({});
  const [screenRatio, setScreenRatio] = useState(() => window.innerWidth / window.innerHeight);
  const setRatio = (id: number, r: number) => { if (Number.isFinite(r) && r > 0) setRatios((prev) => (prev[id] === r ? prev : { ...prev, [id]: r })); };
  const fitOf = (id: number) => { const r = ratios[id]; return !r || Math.abs(r - screenRatio) / screenRatio <= 0.25 ? 'cover' : 'contain'; };
  const fitClass = (id: number) => (fitOf(id) === 'contain' ? 'object-contain' : 'object-cover');
  useEffect(() => {
    const onResize = () => setScreenRatio(window.innerWidth / window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const go = useCallback((i: number) => { setIndex(((i % count) + count) % count); setCycle((c) => c + 1); }, [count]);

  useEffect(() => {
    if (paused || count < 2 || !cur) return;
    const grace = cur.media_type === 'video' ? 3 : 0;
    const timer = window.setTimeout(() => go(index + 1), (cur.display_duration + grace) * 1000);
    return () => window.clearTimeout(timer);
  }, [index, paused, cycle, count, cur, go]);

  useEffect(() => {
    vids.current.forEach((el, id) => {
      if (id === cur?.id) { el.currentTime = 0; el.play().catch(() => undefined); } else el.pause();
    });
  }, [index, cur?.id]);

  useEffect(() => {
    const el = cur && vids.current.get(cur.id);
    if (!el) return;
    if (paused) el.pause(); else el.play().catch(() => undefined);
  }, [paused, cur]);

  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);
  useEffect(() => { root.current?.focus(); }, []);

  if (!count) return <div className="grid h-full place-items-center text-lg text-sky-100/70">No active sliders. Activate one in Slider Management.</div>;
  const arrow = 'absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-3 text-white backdrop-blur transition hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-signal-400';
  const markBroken = (id: number) => setBroken((b) => new Set(b).add(id));

  return (
    <section ref={root} tabIndex={0} aria-roledescription="carousel" aria-label="ISMO slider" className="absolute inset-0 overflow-hidden focus:outline-none"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => { setPaused(false); setCycle((c) => c + 1); }}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(index - 1); if (e.key === 'ArrowRight') go(index + 1); }}>
      {slides.map((s, i) => (
        <div key={s.id} aria-hidden={i !== index} className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          {broken.has(s.id) || (!s.image && !s.video) ? <div className="grid h-full place-items-center text-sky-100/50">{s.media_type === 'video' ? 'This video could not be played. Use an H.264 MP4.' : 'No image'}</div>
            : s.media_type === 'video' && s.video ? (
              <video ref={(el) => { if (el) { el.muted = true; vids.current.set(s.id, el); } else vids.current.delete(s.id); }}
                src={s.video} muted playsInline preload="auto" loop={count < 2} aria-label={s.name} className={`h-full w-full object-center ${fitClass(s.id)}`}
                onLoadedMetadata={(e) => setRatio(s.id, e.currentTarget.videoWidth / e.currentTarget.videoHeight)}
                onEnded={() => { if (count > 1) go(i + 1); }} onError={() => markBroken(s.id)} />
            ) : (
              <>
                {fitOf(s.id) === 'contain' && <img src={s.image ?? ''} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-75" />}
                <img src={s.image ?? ''} alt={s.name} decoding="async" onError={() => markBroken(s.id)}
                  onLoad={(e) => setRatio(s.id, e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                  className={`relative h-full w-full object-center ${fitClass(s.id)}`} />
              </>
            )}
        </div>))}
      <div className={`absolute inset-0 ${cur.show_caption ? 'bg-gradient-to-t from-navy-950/95 via-navy-950/30 to-navy-950/40' : 'bg-gradient-to-t from-black/35 via-transparent to-transparent'}`} />

      {cur.show_caption && (
        <div className="absolute inset-x-0 bottom-0 px-6 pb-16 sm:px-14 sm:pb-20">
          <h2 className="max-w-4xl font-display text-4xl font-bold leading-[1.05] text-white sm:text-6xl">{cur.name}</h2>
          {cur.description && <p className="mt-4 max-w-2xl text-base text-sky-50/85 sm:text-xl">{cur.description}</p>}
        </div>
      )}

      {count > 1 && <>
        <button aria-label="Previous slide" onClick={() => go(index - 1)} className={`${arrow} left-4 sm:left-8`}><ChevronLeft size={26} /></button>
        <button aria-label="Next slide" onClick={() => go(index + 1)} className={`${arrow} right-4 sm:right-8`}><ChevronRight size={26} /></button>
      </>}

      <div className="absolute inset-x-6 bottom-6 flex items-center gap-2 sm:inset-x-14 sm:bottom-8">
        {slides.map((s, i) => (
          <button key={s.id} aria-label={`Go to slide ${i + 1}: ${s.name}`} aria-current={i === index} onClick={() => go(i)} className="group h-6 flex-1 focus:outline-none">
            <span className="block h-1 overflow-hidden rounded-full bg-white/25 group-focus-visible:ring-2 group-focus-visible:ring-signal-400">
              {i < index && <span className="block h-full w-full bg-white/80" />}
              {i === index && <span key={s.media_type === 'video' ? `v${index}` : `${index}-${cycle}`} className="motion-safe-anim block h-full origin-left bg-signal-400"
                style={{ animation: `fill ${s.display_duration}s linear forwards`, animationPlayState: paused ? 'paused' : 'running' }} />}
            </span>
          </button>))}
      </div>
    </section>
  );
}