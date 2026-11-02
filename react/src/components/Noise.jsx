import { useEffect, useRef } from "react";
import { useMadpomo } from "../store.jsx";
import { NOISE_TYPES, clampVolume, isNoiseType, noiseEngine } from "../lib/noise.js";

/* Resume whatever was playing when the page is opened. Browsers refuse to let
   a page make sound before it has been interacted with, so a blocked context
   is woken by the first click or key press instead (lib/noise.js). Set this
   to false to make every load start silent. */
const RESUME_ON_LOAD = true;

/* ==========================================================================
   //noise — four generated noises and one volume bar

   Worth comparing with the plain build's noise.js. There, every button
   handler reached into the audio graph itself: click brown, and that handler
   started a voice, faded the old one out and then wrote the choice to
   localStorage.

   Here nothing touches the audio directly. A click changes one field in
   settings, and a single effect below makes the sound match whatever settings
   now say. Saving is already handled: the store writes settings to
   localStorage on every change. This is the shape React pushes you into —
   describe what should be true, not what to do — and audio is a good place to
   feel the difference, because the AudioContext is the one part that cannot
   live in state.
   ========================================================================== */

export default function Noise() {
  const { settings, setSettings } = useMadpomo();

  // a stored value that is not one of the four (an old save, a hand-edited
  // key) must not leave a button stuck on
  const current = isNoiseType(settings.noiseType) ? settings.noiseType : null;
  const volume = clampVolume(settings.noiseVolume);
  const checkedOnLoad = useRef(false);

  /* Only when resuming is off: the saved choice is cleared once, on load, so
     the buttons cannot show a noise as playing while the page is silent. */
  useEffect(() => {
    if (checkedOnLoad.current) return;
    checkedOnLoad.current = true;

    if (!RESUME_ON_LOAD && current) {
      setSettings((previous) => ({ ...previous, noiseType: null }));
    }
  }, [current, setSettings]);

  /* The one place the audio is told anything. `play` ignores a repeat of the
     noise already playing, which matters here: an effect can run again for
     the same state — twice on mount in StrictMode — and a restart would be an
     audible double fade. */
  useEffect(() => {
    const engine = noiseEngine();

    if (current) {
      engine.play(current);
    } else {
      engine.stop();
    }
  }, [current]);

  /* Its own effect, because the level has to follow the bar even while
     nothing is playing. */
  useEffect(() => {
    noiseEngine().setVolume(volume);
  }, [volume]);

  /* Clicking the noise that is on turns it off; clicking another crosses over
     to it. Neither touches the volume, which is the whole reason the two are
     separate fields. */
  function select(type) {
    setSettings((previous) => ({
      ...previous,
      noiseType: previous.noiseType === type ? null : type
    }));
  }

  return (
    <div className="sidebar__section noise">
      <h2 className="sidebar__title">//noise</h2>

      <ul className="noise__types">
        {NOISE_TYPES.map((type) => (
          <li key={type}>
            <button
              type="button"
              className="btn noise__type"
              aria-pressed={current === type}
              onClick={() => select(type)}
            >
              {type}
            </button>
          </li>
        ))}
      </ul>

      <div className="noise__volume">
        <label className="noise__volume-label" htmlFor="noise-volume">volume</label>
        <input
          type="range"
          className="noise__slider"
          id="noise-volume"
          min="0"
          max="10"
          step="1"
          value={volume}
          /* the filled part of the track is drawn by CSS from this */
          style={{ "--noise-fill": volume * 10 + "%" }}
          onChange={(event) =>
            setSettings((previous) => ({
              ...previous,
              noiseVolume: clampVolume(event.target.value)
            }))
          }
        />
        {/* the slider already announces its own value, so the number beside
            it is for the eyes only */}
        <output className="noise__volume-value" htmlFor="noise-volume" aria-hidden="true">
          {volume}
        </output>
      </div>
    </div>
  );
}
