// Web Audio API synthesized sound effects — no external files needed

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

// Soft mechanical key click
export const playKeyClick = () => {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = "square";
    osc.frequency.setValueAtTime(800 + Math.random() * 600, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.02);

    gain.gain.setValueAtTime(0.03, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);

    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.03);
  } catch {}
};

// Heavier "enter" key sound
export const playEnterKey = () => {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = "square";
    osc.frequency.setValueAtTime(400, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.05);

    gain.gain.setValueAtTime(0.06, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);

    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.06);
  } catch {}
};

// CRT power-on thump
export const playPowerOn = () => {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(80, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);

    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.4);
  } catch {}
};

// Low CRT hum — returns stop function
export const startCRTHum = (): (() => void) => {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const osc2 = c.createOscillator();
    const gain = c.createGain();

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(c.destination);

    osc.type = "sine";
    osc.frequency.value = 60;
    osc2.type = "sine";
    osc2.frequency.value = 120;

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.015, c.currentTime + 1);

    osc.start();
    osc2.start();

    return () => {
      gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
      setTimeout(() => {
        osc.stop();
        osc2.stop();
      }, 600);
    };
  } catch {
    return () => {};
  }
};

// Static burst noise
export const playStatic = (duration = 0.15, volume = 0.08) => {
  try {
    const c = getCtx();
    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }

    const source = c.createBufferSource();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();

    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 2000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

    source.start();
  } catch {}
};

// Glitch / digital corruption burst
export const playGlitch = () => {
  try {
    const c = getCtx();
    for (let i = 0; i < 3; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);

      osc.type = "sawtooth";
      osc.frequency.value = 200 + Math.random() * 2000;

      const t = c.currentTime + i * 0.06;
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.start(t);
      osc.stop(t + 0.05);
    }
    playStatic(0.2, 0.05);
  } catch {}
};

// TV power-off sound — descending whine
export const playTVOff = () => {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(2000, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.6);

    gain.gain.setValueAtTime(0.08, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);

    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.7);
  } catch {}
};

// "Access granted" confirmation beep
export const playConfirm = () => {
  try {
    const c = getCtx();
    [600, 800, 1000].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);

      osc.type = "sine";
      osc.frequency.value = freq;

      const t = c.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.start(t);
      osc.stop(t + 0.12);
    });
  } catch {}
};
