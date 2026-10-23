import { ArrowLeft, Eye, EyeOff, Maximize, Minimize } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sliderApi } from '../api/sliderApi';
import SliderCarousel from '../components/sliders/SliderCarousel';
import type { PublicSlider } from '../types';
import { getErrorMessage } from '../utils/errors';

const LOGO_SRC = '/ismo_logo.png';
const LOGO_KEY = 'ismo_slider_show_logo';

function readShowLogo(): boolean {
  try { return localStorage.getItem(LOGO_KEY) !== 'false'; } catch { return true; }
}

export default function SliderPreview() {
  const [slides, setSlides] = useState<PublicSlider[] | null>(null);
  const [error, setError] = useState('');
  const [isFull, setIsFull] = useState(false);
  const [showLogo, setShowLogo] = useState(readShowLogo);

  useEffect(() => { sliderApi.active().then(setSlides).catch((e) => setError(getErrorMessage(e))); }, []);
  useEffect(() => {
    const sync = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleLogo = () => {
    const next = !showLogo;
    setShowLogo(next);
    try { localStorage.setItem(LOGO_KEY, String(next)); } catch {  }
  };
  const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  const chip = 'inline-flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-signal-400';

  return (
    <div className="fixed inset-0 bg-navy-950 text-white">
      {error ? <div role="alert" className="grid h-full place-items-center text-red-300">{error}</div>
        : slides === null ? <div className="h-full animate-pulse bg-navy-900" />
        : <SliderCarousel slides={slides} />}

      {showLogo && (
        <span className="absolute left-4 top-4 z-20 rounded-lg bg-white px-4 py-2 shadow-lg sm:left-6 sm:top-6">
          <img src={LOGO_SRC} alt="Logo" className="h-9 w-auto sm:h-11" />
        </span>
      )}

      <div data-testid="controls-zone" className="group absolute right-0 top-0 z-20 flex h-28 w-full max-w-xl items-start justify-end p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-end gap-3 opacity-0 transition-opacity duration-300 focus-within:opacity-100 group-hover:opacity-100">
          <Link to="/sliders" className={chip}><ArrowLeft size={16} /> Back to admin</Link>
          <button onClick={toggleLogo} className={chip} aria-pressed={showLogo}>
            {showLogo ? <><EyeOff size={16} /> Hide logo</> : <><Eye size={16} /> Show logo</>}
          </button>
          <button onClick={toggleFullscreen} className={chip} aria-label={isFull ? 'Exit full screen' : 'Enter full screen'}>
            {isFull ? <><Minimize size={16} /> Exit full screen</> : <><Maximize size={16} /> Full screen</>}
          </button>
        </div>
      </div>
    </div>
  );
}