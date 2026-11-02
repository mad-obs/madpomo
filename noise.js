/* ==========================================================================
   madpomo — //noise

   Four background noises, written in code. Nothing is downloaded and there
   are no audio files in the repo: each noise is a few seconds of samples
   generated one at a time into an AudioBuffer, then looped forever.

   The graph is deliberately small:

     buffer source (looping) --> voice gain --> master gain --> speakers

   Two gains, two jobs. A voice gain is the fade: 0 -> 1 turns a noise on,
   1 -> 0 turns it off, and running both at once crosses from one noise to
   another. The master gain is the volume bar, and nothing except the volume
   bar ever touches it — which is why switching noise cannot move the level
   the user chose.

   The sidebar is on every page, so this file runs on every page. The choice
   and the volume live in madpomo.settings, which is what lets the noise come
   back after navigating from the board to the report.
   ========================================================================== */

window.MP = window.MP || {};

MP.noise = (function () {
  const buttons = Array.prototype.slice.call(document.querySelectorAll(".noise__type"));
  const slider = document.getElementById("noise-volume");
  const valueOut = document.getElementById("noise-volume-value");

  // A page without the //noise markup must not throw.
  if (buttons.length === 0 || !slider || !valueOut) return null;

  /* --------------------------------------------------------------------------
     Tuning — every number worth changing is here
     -------------------------------------------------------------------------- */

  const FADE_SECONDS = 1.2;       // on, off, and one noise into another
  const VOLUME_SECONDS = 0.08;    // the volume bar: quick, but not a click
  const HEADROOM = 0.6;           // 10/10 is loud, not painful
  const BUFFER_SECONDS = 10;      // long enough that the loop is not a rhythm
  const SEAM_SECONDS = 1;         // crossfade that hides the loop point
  const TARGET_RMS = 0.11;        // every noise normalized to the same power

  /* Equal power is not equal loudness: the ear hears middle and high
     frequencies as louder, so white needs taking down and brown needs
     lifting for the four to feel like the same amount of sound. These two are
     judged by ear — change them if your own ears disagree. */
  const TRIM = { white: 0.75, pink: 1, brown: 1.3, green: 1 };

  /* Resume whatever was playing when a page opens. Browsers refuse to let a
     page make sound before it has been interacted with, so a blocked context
     is woken by the first click or key press instead. Set this to false to
     make every page load start silent. */
  const RESUME_ON_LOAD = true;

  /* --------------------------------------------------------------------------
     The four generators

     All four start from the same raw material: Math.random() mapped to -1..1,
     which *is* white noise. They differ only in what they do with it.
     -------------------------------------------------------------------------- */

  /* Every frequency at the same power. The hiss of an untuned radio. */
  function white(out) {
    for (let i = 0; i < out.length; i = i + 1) {
      out[i] = Math.random() * 2 - 1;
    }
  }

  /* -3 dB per octave: power halves every time the frequency doubles. Paul
     Kellet's filter gets there by summing seven leaky one-pole filters, each
     holding on to a narrower band of lows than the one before. */
  function pink(out) {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < out.length; i = i + 1) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    }
  }

  /* -6 dB per octave, twice as steep as pink: deep and soft, closer to heavy
     rain or a distant engine. A leaky integrator does it — each sample is
     mostly the previous one, which cancels the highs. Dividing by 1.02 is the
     leak, and without it the signal would slowly wander away from zero and
     stay there. */
  function brown(out) {
    let last = 0;

    for (let i = 0; i < out.length; i = i + 1) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      out[i] = last;
    }
  }

  /* Green noise has no agreed definition. The common one is noise with its
     energy pushed into the middle of hearing, around 500 Hz, which is why it
     gets sold as the sound of open country. Here that is white noise through
     a single band-pass filter, so the hiss and the rumble both fall away.

     The filter is one biquad using the RBJ cookbook coefficients: the same
     maths a BiquadFilterNode runs, done by hand because the samples are being
     written one at a time anyway. */
  const GREEN_HZ = 500;
  const GREEN_Q = 0.6;

  function green(out, sampleRate) {
    const w0 = 2 * Math.PI * GREEN_HZ / sampleRate;
    const alpha = Math.sin(w0) / (2 * GREEN_Q);
    const cos0 = Math.cos(w0);

    // divided through by a0 once, here, so the sample loop stays cheap
    const a0 = 1 + alpha;
    const b0 = alpha / a0;
    const b2 = -alpha / a0;
    const a1 = (-2 * cos0) / a0;
    const a2 = (1 - alpha) / a0;

    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = 0; i < out.length; i = i + 1) {
      const x = Math.random() * 2 - 1;
      const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      out[i] = y;
    }
  }

  const GENERATORS = { white: white, pink: pink, brown: brown, green: green };
  const TYPES = Object.keys(GENERATORS);

  /* --------------------------------------------------------------------------
     Turning samples into a buffer that can loop unnoticed
     -------------------------------------------------------------------------- */

  /* Brown noise in particular drifts, and a drifting signal is one that sits
     slightly off centre — inaudible on its own, but it eats headroom and it
     thumps when the loop jumps back. */
  function removeOffset(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i = i + 1) sum = sum + samples[i];

    const mean = sum / samples.length;
    for (let i = 0; i < samples.length; i = i + 1) samples[i] = samples[i] - mean;
  }

  /* A looping buffer jumps from its last sample straight back to its first,
     and two unrelated samples side by side is a click — once every ten
     seconds, forever. So extra samples are generated past the end of the loop
     and faded into the head: the first sample now continues the last one. */
  function hideSeam(samples, length, overlap) {
    for (let i = 0; i < overlap; i = i + 1) {
      const t = i / overlap;
      /* Square roots, not t and 1 - t. The two stretches being mixed here are
         unrelated pieces of noise, and unrelated signals add as power, not as
         amplitude: fading one down to half while bringing the other up to half
         leaves 0.5 x 0.5 + 0.5 x 0.5, which is half the power — a 3 dB dip in
         the middle of every crossfade, once per loop. Weighting by the square
         root keeps the squares summing to 1 the whole way across, which is what
         "equal power" means, and the level stays flat over the loop point. */
      samples[i] = samples[i] * Math.sqrt(t) + samples[length + i] * Math.sqrt(1 - t);
    }
  }

  /* Each generator comes out at its own level, which would turn switching
     noise into a jump in volume. Measuring the power that is actually there
     and scaling it to one shared target fixes that without guessing. */
  function normalize(samples, target) {
    let sum = 0;
    for (let i = 0; i < samples.length; i = i + 1) sum = sum + samples[i] * samples[i];

    const rms = Math.sqrt(sum / samples.length);
    if (rms === 0) return;

    const scale = target / rms;
    for (let i = 0; i < samples.length; i = i + 1) {
      samples[i] = Math.max(-1, Math.min(1, samples[i] * scale));
    }
  }

  /* --------------------------------------------------------------------------
     State
     -------------------------------------------------------------------------- */

  let ctx = null;
  let master = null;
  const buffers = {};       // generated once per noise, then kept
  let current = null;       // the noise that is on, or null
  let playing = null;       // { type, source, gain } of that noise
  let waitingForGesture = false;

  function clampVolume(value) {
    const number = Number(value);
    if (!isFinite(number)) return 4;
    return Math.max(0, Math.min(10, Math.round(number)));
  }

  let volume = clampVolume(MP.settings.noiseVolume);

  /* 0..10 into a gain. Squared, because hearing is not linear: with a
     straight 0..1 gain most of the bar barely changes anything. */
  function amplitude(level) {
    const unit = clampVolume(level) / 10;
    return HEADROOM * unit * unit;
  }

  function audioContext() {
    if (ctx) return ctx;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      console.warn("madpomo: this browser has no Web Audio, so //noise stays off.");
      return null;
    }

    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = amplitude(volume);
    master.connect(ctx.destination);
    return ctx;
  }

  function bufferFor(type) {
    if (buffers[type]) return buffers[type];

    const rate = ctx.sampleRate;
    const length = Math.floor(BUFFER_SECONDS * rate);
    const overlap = Math.floor(SEAM_SECONDS * rate);

    // generated long, then trimmed back to `length` once the seam is hidden
    const raw = new Float32Array(length + overlap);
    GENERATORS[type](raw, rate);
    removeOffset(raw);
    hideSeam(raw, length, overlap);

    const buffer = ctx.createBuffer(1, length, rate);
    const channel = buffer.getChannelData(0);
    channel.set(raw.subarray(0, length));
    normalize(channel, TARGET_RMS * (TRIM[type] || 1));

    buffers[type] = buffer;
    return buffer;
  }

  /* --------------------------------------------------------------------------
     Fades

     Re-targeting is the part worth care: clicking white, brown, white quickly
     lands a new ramp on a gain that is already mid-ramp. Holding the value at
     "now" before scheduling the next one keeps that smooth — without it the
     new ramp starts from the last value that was *scheduled*, which is a
     jump.
     -------------------------------------------------------------------------- */

  /* Takes the gain *node*, not its AudioParam: every call site then looks
     the same, and passing the wrong one of the two stops being possible. */
  function fade(node, target, seconds) {
    const param = node.gain;
    const now = ctx.currentTime;

    if (typeof param.cancelAndHoldAtTime === "function") {
      param.cancelAndHoldAtTime(now);
    } else {
      const held = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(held, now);
    }

    /* Linear, not equal-power. Two uncorrelated noises crossfading linearly
       dip about 3 dB in the middle; the equal-power curve holds the level but
       makes re-targeting mid-fade much harder to get right. Over 1.2 seconds
       of noise, that dip is not something you hear. */
    param.linearRampToValueAtTime(target, now + seconds);
  }

  function startVoice(type) {
    const source = ctx.createBufferSource();
    source.buffer = bufferFor(type);
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(gain);
    gain.connect(master);
    source.start();
    fade(gain, 1, FADE_SECONDS);

    return { type: type, source: source, gain: gain };
  }

  /* Faded out, then stopped a moment later. The node has to outlive its own
     fade, or the sound would be cut off at full volume. */
  function stopVoice(voice) {
    fade(voice.gain, 0, FADE_SECONDS);
    voice.source.stop(ctx.currentTime + FADE_SECONDS + 0.1);
    voice.source.onended = function () {
      voice.source.disconnect();
      voice.gain.disconnect();
    };
  }

  /* --------------------------------------------------------------------------
     What the buttons and the bar do
     -------------------------------------------------------------------------- */

  function render() {
    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.noise === current ? "true" : "false");
    });

    slider.value = String(volume);
    // the filled part of the track is drawn by CSS from this
    slider.style.setProperty("--noise-fill", (volume * 10) + "%");
    valueOut.textContent = String(volume);
  }

  function save() {
    MP.settings.noiseType = current;
    MP.settings.noiseVolume = volume;
    MP.saveSettings();
  }

  /* Chrome and Safari will not start audio until the page has been
     interacted with. Rather than drop the choice, the context is woken on the
     first click or key press after the page loads. */
  function wakeOnFirstGesture() {
    if (waitingForGesture) return;
    waitingForGesture = true;

    function wake() {
      document.removeEventListener("pointerdown", wake);
      document.removeEventListener("keydown", wake);
      waitingForGesture = false;
      if (ctx && ctx.state === "suspended") ctx.resume();
    }

    document.addEventListener("pointerdown", wake);
    document.addEventListener("keydown", wake);
  }

  function play(type) {
    if (!audioContext()) return;

    if (ctx.state === "suspended") {
      ctx.resume();
      wakeOnFirstGesture();
    }

    if (playing) stopVoice(playing);
    playing = startVoice(type);
    current = type;
  }

  function silence() {
    if (playing) stopVoice(playing);
    playing = null;
    current = null;
  }

  /* One door for all four buttons: clicking the noise that is already on
     turns it off, clicking another crosses over to it. */
  function select(type) {
    if (!GENERATORS[type]) return;

    if (current === type) {
      silence();
    } else {
      play(type);
    }

    render();
    save();
  }

  function setVolume(level) {
    volume = clampVolume(level);
    if (master) fade(master, amplitude(volume), VOLUME_SECONDS);
    render();
    save();
  }

  /* --------------------------------------------------------------------------
     Wiring
     -------------------------------------------------------------------------- */

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      select(button.dataset.noise);
    });
  });

  slider.addEventListener("input", function () {
    setVolume(slider.value);
  });

  render();

  if (RESUME_ON_LOAD && TYPES.indexOf(MP.settings.noiseType) !== -1) {
    play(MP.settings.noiseType);
    render();
  }

  return {
    select: select,
    setVolume: setVolume,

    stop: function () {
      silence();
      render();
      save();
    },

    current: function () {
      return current;
    },

    volume: function () {
      return volume;
    }
  };
})();
