// Web Audio API — 90s CRT terminal aesthetic: clacky keys, warm static, analog hum

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

// Warm noise buffer helper
const createNoise = (c: AudioContext, duration: number): AudioBufferSourceNode => {
  const bufferSize = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  return source;
};

// Mechanical keyboard clack — short noise burst with resonant filter
export const playKeyClick = () => {
  try {
    const c = getCtx();
    const noise = createNoise(c, 0.025);
    const filter = c.createBiquadFilter();
    const gain = c.createGain();

    filter.type = "bandpass";
    filter.frequency.value = 3000 + Math.random() * 2000;
    filter.Q.value = 2 + Math.random() * 3;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    gain.gain.setValueAtTime(0.06 + Math.random() * 0.03, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.025);

    noise.start(c.currentTime);
    noise.stop(c.currentTime + 0.025);
  } catch {}
};

// Heavier clack for enter/return key — lower, slightly longer
export const playEnterKey = () => {
  try {
    const c = getCtx();
    const noise = createNoise(c, 0.06);
    const filter = c.createBiquadFilter();
    const gain = c.createGain();

    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 1.5;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    gain.gain.setValueAtTime(0.1, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);

    noise.start(c.currentTime);
    noise.stop(c.currentTime + 0.06);
  } catch {}
};

// CRT power-on — low warm thump with tube warmup whine
export const playPowerOn = () => {
  try {
    const c = getCtx();
    // Thump
    const noise = createNoise(c, 0.5);
    const lpf = c.createBiquadFilter();
    const gain = c.createGain();
    lpf.type = "lowpass";
    lpf.frequency.value = 150;
    noise.connect(lpf);
    lpf.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(0.12, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    noise.start(c.currentTime);
    noise.stop(c.currentTime + 0.5);

    // Tube warmup whine
    const osc = c.createOscillator();
    const oscGain = c.createGain();
    osc.connect(oscGain);
    oscGain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(40, c.currentTime);
    osc.frequency.linearRampToValueAtTime(60, c.currentTime + 0.8);
    oscGain.gain.setValueAtTime(0, c.currentTime);
    oscGain.gain.linearRampToValueAtTime(0.04, c.currentTime + 0.3);
    oscGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.8);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.8);
  } catch {}
};

// Low CRT hum — 60Hz mains + harmonics, very subtle
export const startCRTHum = (): (() => void) => {
  try {
    const c = getCtx();
    const gain = c.createGain();
    gain.connect(c.destination);
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.008, c.currentTime + 2);

    const freqs = [60, 120, 180];
    const oscs = freqs.map((f, i) => {
      const osc = c.createOscillator();
      const oscGain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      oscGain.gain.value = 1 / (i + 1); // harmonics decay
      osc.connect(oscGain);
      oscGain.connect(gain);
      osc.start();
      return osc;
    });

    return () => {
      gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
      setTimeout(() => oscs.forEach((o) => o.stop()), 600);
    };
  } catch {
    return () => {};
  }
};

// Warm analog static — brown noise (lowpass filtered white noise)
export const playStatic = (duration = 0.15, volume = 0.08) => {
  try {
    const c = getCtx();
    const noise = createNoise(c, duration);
    const lpf = c.createBiquadFilter();
    const hpf = c.createBiquadFilter();
    const gain = c.createGain();

    // Brown-ish noise: cut highs, keep it warm
    lpf.type = "lowpass";
    lpf.frequency.value = 4000;
    hpf.type = "highpass";
    hpf.frequency.value = 200;

    noise.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(gain);
    gain.connect(c.destination);

    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.8, c.currentTime + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

    noise.start(c.currentTime);
    noise.stop(c.currentTime + duration);
  } catch {}
};

// Glitch — rapid static pops, analog feel
export const playGlitch = () => {
  try {
    const c = getCtx();
    // Several short static pops
    for (let i = 0; i < 4; i++) {
      const t = c.currentTime + i * 0.05 + Math.random() * 0.02;
      const noise = createNoise(c, 0.04);
      const filter = c.createBiquadFilter();
      const gain = c.createGain();
      filter.type = "bandpass";
      filter.frequency.value = 500 + Math.random() * 3000;
      filter.Q.value = 1;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      noise.start(t);
      noise.stop(t + 0.04);
    }
    playStatic(0.25, 0.06);
  } catch {}
};

// CRT power-off — degauss whine descending into silence
export const playTVOff = () => {
  try {
    const c = getCtx();
    // Descending flyback whine
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.5);
    gain.gain.setValueAtTime(0.06, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.6);

    // Static pop at the end
    setTimeout(() => playStatic(0.08, 0.1), 400);
  } catch {}
};

// Subtle confirmation — soft double-tap, not a game beep
export const playConfirm = () => {
  try {
    const c = getCtx();
    [0, 0.08].forEach((delay) => {
      const noise = createNoise(c, 0.03);
      const filter = c.createBiquadFilter();
      const gain = c.createGain();
      filter.type = "bandpass";
      filter.frequency.value = 2000;
      filter.Q.value = 2;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      const t = c.currentTime + delay;
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      noise.start(t);
      noise.stop(t + 0.03);
    });
  } catch {}
};
