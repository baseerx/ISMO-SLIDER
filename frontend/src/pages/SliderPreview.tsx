import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sliderApi } from '../api/sliderApi';
import SliderCarousel from '../components/sliders/SliderCarousel';
import { PublicSlider } from '../types';
import { getErrorMessage } from '../utils/errors';

export default function SliderPreview() {
  const [slides, setSlides] = useState<PublicSlider[] | null>(null);
  const [error, setError] = useState('');
  const [isFull, setIsFull] = useState(false);

  useEffect(() => { sliderApi.active().then(setSlides).catch((e) => setError(getErrorMessage(e))); }, []);
  useEffect(() => {
    const sync = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  const chip = 'inline-flex items-center gap-2 rounded-full bg-black/35 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-signal-400';

  return (
    <div className="fixed inset-0 bg-navy-950 text-white">
      {error ? <div role="alert" className="grid h-full place-items-center text-red-300">{error}</div>
        : slides === null ? <div className="h-full animate-pulse bg-navy-900" />
        : <SliderCarousel slides={slides} />}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6">
        <span className="rounded-lg bg-white px-4 py-2 shadow-lg"><img src="/ismo_logo.png" alt="ISMO" className="h-9 w-auto sm:h-11" /></span>
        <div className="flex items-center gap-3">
          <Link to="/sliders" className={chip}><ArrowLeft size={16} /> Back to admin</Link>
          <button onClick={toggleFullscreen} className={chip} aria-label={isFull ? 'Exit full screen' : 'Enter full screen'}>
            {isFull ? <><Minimize size={16} /> Exit full screen</> : <><Maximize size={16} /> Full screen</>}
          </button>
        </div>
      </div>
    </div>
  );
}