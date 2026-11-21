export type FootSurface = 'grass' | 'pavement' | 'wood' | 'tile';

const footstepTone = { grass: 830, pavement: 510, wood: 340, tile: 1150 };

export function createCombatAudio() {
  let context: AudioContext | undefined;
  let noise: AudioBuffer | undefined;
  let output: GainNode | undefined;
  let ambience: { filter: BiquadFilterNode; gain: GainNode };
  let paused = false;
  let indoors = false;
  let night = false;

  function mixAmbience() {
    if (!context || !output) return;
    const time = context.currentTime;
    ambience.filter.frequency.setTargetAtTime(indoors ? 145 : night ? 390 : 650, time, .45);
    ambience.gain.gain.setTargetAtTime(indoors ? .017 : night ? .047 : .062, time, .45);
    output.gain.setTargetAtTime(paused ? 0 : .72, time, .025);
  }

  function unlock() {
    if (typeof AudioContext === 'undefined') return;
    if (!context) {
      context = new AudioContext();
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * 2.7), context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      output = context.createGain();
      output.gain.value = paused ? 0 : .72;
      output.connect(context.destination);
      const air = context.createBufferSource();
      air.buffer = noise;
      air.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      const gain = context.createGain();
      gain.gain.value = 0;
      air.connect(filter).connect(gain).connect(output);
      ambience = { filter, gain };
      mixAmbience();
      air.start();
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
  }

  function playNoise(duration: number, frequency: number, volume: number, pan = 0) {
    if (!context || !noise || !output || paused || context.state !== 'running' || volume <= .001) return;
    const time = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, time);
    filter.frequency.exponentialRampToValueAtTime(frequency / 3, time + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + Math.min(.024, duration * .2));
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    const stereo = context.createStereoPanner();
    stereo.pan.value = pan;
    source.connect(filter).connect(gain).connect(stereo).connect(output);
    source.start(time);
    source.stop(time + duration);
  }

  function thud(frequency: number, duration: number, volume: number, pan: number) {
    if (!context || !output || paused || context.state !== 'running') return;
    const time = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const stereo = context.createStereoPanner();
    stereo.pan.value = pan;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .44, time + duration);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    oscillator.connect(gain).connect(stereo).connect(output);
    oscillator.start();
    oscillator.stop(time + duration);
  }

  return {
    unlock,
    setPaused(value: boolean) {
      paused = value;
      mixAmbience();
    },
    setEnvironment(inside: boolean, dark: boolean) {
      if (indoors === inside && night === dark) return;
      indoors = inside;
      night = dark;
      mixAmbience();
    },
    swing() {
      playNoise(.17, 2100, .26);
      playNoise(.095, 640, .12);
    },
    footsteps(pan: number, volume: number, heavy: boolean, surface: FootSurface, muffled = false) {
      const tone = footstepTone[surface] * (muffled ? .52 : 1);
      playNoise(surface === 'grass' ? .12 : .085, tone, volume, pan);
      if (heavy || surface === 'wood') thud(heavy ? 92 : 148, .071, volume * .52, pan);
    },
    groan(pan: number, volume: number, muffled: boolean) {
      if (!context || !output || paused || context.state !== 'running' || volume < .01) return;
      playNoise(.48, muffled ? 220 : 450, volume * .5, pan);
      const time = context.currentTime;
      const voice = context.createOscillator();
      const gain = context.createGain();
      const stereo = context.createStereoPanner();
      stereo.pan.value = pan;
      voice.type = muffled ? 'sine' : 'triangle';
      voice.frequency.setValueAtTime(105, time);
      voice.frequency.linearRampToValueAtTime(137, time + .18);
      voice.frequency.exponentialRampToValueAtTime(66, time + .48);
      gain.gain.setValueAtTime(.001, time);
      gain.gain.linearRampToValueAtTime(volume * .25, time + .13);
      gain.gain.exponentialRampToValueAtTime(.001, time + .48);
      voice.connect(gain).connect(stereo).connect(output);
      voice.start(time);
      voice.stop(time + .48);
    },
    doorHit(pan: number, volume: number, strained: boolean, forced: boolean) {
      playNoise(.18, 240, volume, pan);
      if (strained || forced) playNoise(forced ? .21 : .085, 980, volume * (forced ? .8 : .4), pan);
    },
    shoveHit(pan: number, volume: number) {
      playNoise(.11, 390, volume, pan);
    },
    impact(pan: number) {
      playNoise(.069, 1540, .29, pan);
      playNoise(.145, 460, .29, pan);
      thud(145, .155, .34, pan);
    },
    bite() {
      playNoise(.12, 870, .23);
      playNoise(.17, 2200, .13);
      thud(112, .145, .21, 0);
    },
    opening(type: string, closed: boolean, locked: boolean) {
      if (locked) {
        playNoise(.075, 1500, .16);
      } else if (type === 'window') {
        playNoise(.135, 910, .18);
      } else {
        playNoise(closed ? .075 : .16, closed ? 1220 : 530, .19);
        thud(closed ? 121 : 179, .09, closed ? .18 : .095, 0);
      }
    },
    dispose() {
      if (context) void context.close().catch(() => {});
      context = undefined;
      noise = undefined;
      output = undefined;
    },
  };
}
