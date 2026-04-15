// Web Audio API — 90s CRT terminal: warm mechanical clacks, analog static, tube hum

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

// Warm noise buffer
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

// Mechanical keyboard clack — two layers: low thump + mid click
export const playKeyClick = () => {
  try {
    const c = getCtx();
    const t = c.currentTime;

    // Layer 1: Low mechanical thump (the body of the keypress)
    const thump = createNoise(c, 0.02);
    const thumpLPF = c.createBiquadFilter();
    const thumpGain = c.createGain();
    thumpLPF.type = "lowpass";
    thumpLPF.frequency.value = 500 + Math.random() * 200;
    thumpLPF.Q.value = 0.6;
    thump.connect(thumpLPF);
    thumpLPF.connect(thumpGain);
    thumpGain.connect(c.destination);
    thumpGain.gain.setValueAtTime(0.025 + Math.random() * 0.01, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    thump.start(t);
    thump.stop(t + 0.02);

    // Layer 2: High click (the contact snap)
    const click = createNoise(c, 0.008);
    const clickBPF = c.createBiquadFilter();
    const clickGain = c.createGain();
    clickBPF.type = "bandpass";
    clickBPF.frequency.value = 1400 + Math.random() * 600;
    clickBPF.Q.value = 1.0;
    click.connect(clickBPF);
    clickBPF.connect(clickGain);
    clickGain.connect(c.destination);
    clickGain.gain.setValueAtTime(0.012 + Math.random() * 0.008, t + 0.003);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    click.start(t + 0.002);
    click.stop(t + 0.012);
  } catch {}
};

// Heavier clack for enter/return — deeper, resonant
export const playEnterKey = () => {
  try {
    const c = getCtx();
    const t = c.currentTime;

    const noise = createNoise(c, 0.05);
    const lpf = c.createBiquadFilter();
    const gain = c.createGain();
    lpf.type = "lowpass";
    lpf.frequency.value = 600;
    lpf.Q.value = 1.2;
    noise.connect(lpf);
    lpf.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    noise.start(t);
    noise.stop(t + 0.05);

    // Rattle
    const rattle = createNoise(c, 0.03);
    const rattleBPF = c.createBiquadFilter();
    const rattleGain = c.createGain();
    rattleBPF.type = "bandpass";
    rattleBPF.frequency.value = 1800;
    rattleBPF.Q.value = 2;
    rattle.connect(rattleBPF);
    rattleBPF.connect(rattleGain);
    rattleGain.connect(c.destination);
    rattleGain.gain.setValueAtTime(0.04, t + 0.01);
    rattleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    rattle.start(t + 0.008);
    rattle.stop(t + 0.04);
  } catch {}
};

// CRT power-on — low warm thump with tube warmup whine
export const playPowerOn = () => {
  try {
    const c = getCtx();
    const t = c.currentTime;
    const noise = createNoise(c, 0.5);
    const lpf = c.createBiquadFilter();
    const gain = c.createGain();
    lpf.type = "lowpass";
    lpf.frequency.value = 150;
    noise.connect(lpf);
    lpf.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    noise.start(t);
    noise.stop(t + 0.5);

    const osc = c.createOscillator();
    const oscGain = c.createGain();
    osc.connect(oscGain);
    oscGain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(40, t);
    osc.frequency.linearRampToValueAtTime(60, t + 0.8);
    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(0.04, t + 0.3);
    oscGain.gain.linearRampToValueAtTime(0, t + 0.8);
    osc.start(t);
    osc.stop(t + 0.8);
  } catch {}
};

// Low CRT hum — 60Hz mains + harmonics
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
      oscGain.gain.value = 1 / (i + 1);
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

// Warm analog static — brown noise
export const playStatic = (duration = 0.15, volume = 0.08) => {
  try {
    const c = getCtx();
    const t = c.currentTime;
    const noise = createNoise(c, duration);
    const lpf = c.createBiquadFilter();
    const hpf = c.createBiquadFilter();
    const gain = c.createGain();
    lpf.type = "lowpass";
    lpf.frequency.value = 4000;
    hpf.type = "highpass";
    hpf.frequency.value = 200;
    noise.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.linearRampToValueAtTime(volume * 0.8, t + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    noise.start(t);
    noise.stop(t + duration);
  } catch {}
};

// Glitch — rapid static pops
export const playGlitch = () => {
  try {
    const c = getCtx();
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

// CRT power-off — degauss whine descending
export const playTVOff = () => {
  try {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.start(t);
    osc.stop(t + 0.6);
    setTimeout(() => playStatic(0.08, 0.1), 400);
  } catch {}
};

// Subtle confirmation — soft double-tap
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

// Ambient matrix drone — low filtered noise + sub-bass pulse
export const startAmbientDrone = (): (() => void) => {
  try {
    const c = getCtx();
    const master = c.createGain();
    master.connect(c.destination);
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.035, c.currentTime + 3);

    // Brown noise layer
    const bufferSize = c.sampleRate * 4;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const noiseLPF = c.createBiquadFilter();
    noiseLPF.type = "lowpass";
    noiseLPF.frequency.value = 300;
    noiseLPF.Q.value = 0.5;

    noise.connect(noiseLPF);
    noiseLPF.connect(master);
    noise.start();

    // Sub-bass pulse
    const sub = c.createOscillator();
    const subGain = c.createGain();
    sub.type = "sine";
    sub.frequency.value = 38;
    subGain.gain.value = 0.4;
    sub.connect(subGain);
    subGain.connect(master);
    sub.start();

    // Very slow LFO on the noise filter for movement
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(noiseLPF.frequency);
    lfo.start();

    return () => {
      master.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
      setTimeout(() => {
        noise.stop();
        sub.stop();
        lfo.stop();
      }, 2000);
    };
  } catch {
    return () => {};
  }
};