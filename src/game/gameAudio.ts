import { renderMenuTheme } from './menuTheme';

export type FootSurface = 'grass' | 'pavement' | 'wood' | 'tile';
type AudioScene = 'menu' | 'world' | 'paused' | 'silent';

const footstepTone = { grass: 830, pavement: 510, wood: 340, tile: 1150 };
const groans = ['groan-1', 'groan-2', 'groan-3'] as const;
const snarls = ['snarl-1', 'snarl-2', 'snarl-3'] as const;
type ZombieClip = (typeof groans)[number] | (typeof snarls)[number];

export type GameAudio = ReturnType<typeof createGameAudio>;

export function createGameAudio() {
  let context: AudioContext | undefined;
  let noise: AudioBuffer | undefined;
  let output: GainNode | undefined;
  let master: GainNode | undefined;
  let music: GainNode | undefined;
  let interfaceOutput: GainNode | undefined;
  let ambience: { filter: BiquadFilterNode; gain: GainNode } | undefined;
  let themeRequested = false;
  let scene: AudioScene = 'menu';
  let muted = false;
  let hidden = false;
  let indoors = false;
  let night = false;
  const zombieClips = new Map<ZombieClip, AudioBuffer>();
  const zombieTakes = new Map<number, number>();
  const zombieVoices = new Map<number, { source: AudioBufferSourceNode; gain: GainNode }>();

  function mixAmbience() {
    if (!context || !ambience) return;
    const time = context.currentTime;
    ambience.filter.frequency.setTargetAtTime(indoors ? 145 : night ? 390 : 650, time, .45);
    ambience.gain.gain.setTargetAtTime(indoors ? .017 : night ? .047 : .062, time, .45);
  }

  function mix() {
    if (!context || !master || !output || !music || !interfaceOutput) return;
    const time = context.currentTime;
    master.gain.setTargetAtTime(muted || hidden ? 0 : .84, time, .018);
    output.gain.setTargetAtTime(scene === 'world' ? .85 : 0, time, .022);
    music.gain.setTargetAtTime(scene === 'menu' ? .59 : 0, time, .13);
    interfaceOutput.gain.setTargetAtTime(scene === 'world' || scene === 'paused' ? .7 : 0, time, .022);
  }

  function startTheme() {
    if (themeRequested || scene !== 'menu' || muted || hidden || context?.state !== 'running' || !music) return;
    themeRequested = true;
    const owner = context;
    const destination = music;
    void renderMenuTheme().then((buffer) => {
      if (context !== owner) return;
      const theme = owner.createBufferSource();
      theme.buffer = buffer;
      theme.loop = true;
      theme.connect(destination);
      theme.start();
    }).catch(() => {});
  }

  async function loadZombieClips(owner: AudioContext) {
    const { zombieClipUrls } = await import('./zombieVoiceClips');
    if (context !== owner) return;
    await Promise.allSettled([...groans, ...snarls].map(async (clip) => {
      const response = await fetch(zombieClipUrls[clip]);
      const buffer = await owner.decodeAudioData(await response.arrayBuffer());
      if (context === owner) zombieClips.set(clip, buffer);
    }));
  }

  function unlock() {
    if (muted || hidden || typeof AudioContext === 'undefined') return;
    if (!context) {
      context = new AudioContext();
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * 2.7), context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      master = context.createGain();
      output = context.createGain();
      music = context.createGain();
      interfaceOutput = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.ratio.value = 3;
      for (const bus of [master, output, music, interfaceOutput]) bus.gain.value = 0;
      output.connect(compressor);
      interfaceOutput.connect(compressor);
      music.connect(compressor);
      compressor.connect(master).connect(context.destination);
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
      void loadZombieClips(context).catch(() => {});
    }
    mix();
    if (context.state === 'running') startTheme();
    else void context.resume().then(startTheme).catch(() => {});
  }

  function worldOutput() {
    return !muted && !hidden && scene === 'world' && context?.state === 'running' ? output : undefined;
  }

  function playNoise(duration: number, frequency: number, volume: number, pan = 0) {
    const destination = worldOutput();
    if (!context || !noise || !destination || volume <= .001) return;
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
    source.connect(filter).connect(gain).connect(stereo).connect(destination);
    source.start(time);
    source.stop(time + duration);
  }

  function thud(frequency: number, duration: number, volume: number, pan: number) {
    const destination = worldOutput();
    if (!context || !destination || volume <= .001) return;
    const time = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const stereo = context.createStereoPanner();
    stereo.pan.value = pan;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .44, time + duration);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    oscillator.connect(gain).connect(stereo).connect(destination);
    oscillator.start();
    oscillator.stop(time + duration);
  }

  return {
    unlock,
    setScene(value: AudioScene) {
      scene = value;
      mix();
      startTheme();
    },
    setMuted(value: boolean) {
      muted = value;
      mix();
    },
    setHidden(value: boolean) {
      hidden = value;
      mix();
      startTheme();
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
    groan(pan: number, volume: number, muffled: boolean, variant: number, attacking: boolean) {
      const destination = worldOutput();
      if (!context || !destination || volume < .01) return;
      const current = zombieVoices.get(variant);
      if (!attacking && (current || zombieVoices.size >= 3)) return;
      const pool = attacking ? snarls : groans;
      const take = zombieTakes.get(variant) ?? variant;
      const clip = zombieClips.get(pool[take % pool.length]!) ?? zombieClips.get(pool[0]);
      if (!clip) {
        playNoise(attacking ? .21 : .34, muffled ? 285 : 710, volume * .26, pan);
        return;
      }
      zombieTakes.set(variant, take + 1);
      const time = context.currentTime;
      if (current) {
        current.gain.gain.setTargetAtTime(0, time, .012);
        current.source.stop(time + .05);
      }
      const voice = context.createBufferSource();
      const obstruction = context.createBiquadFilter();
      const gain = context.createGain();
      const stereo = context.createStereoPanner();
      voice.buffer = clip;
      voice.playbackRate.value = .94 + Math.random() * .12;
      stereo.pan.value = pan;
      obstruction.type = 'lowpass';
      obstruction.frequency.value = muffled ? 580 : 5400;
      obstruction.Q.value = .35;
      gain.gain.value = volume;
      voice.connect(obstruction).connect(gain).connect(stereo).connect(destination);
      zombieVoices.set(variant, { source: voice, gain });
      voice.onended = () => {
        if (zombieVoices.get(variant)?.source === voice) zombieVoices.delete(variant);
      };
      voice.start(time);
    },
    doorHit(pan: number, volume: number, strained: boolean, forced: boolean) {
      playNoise(.18, 240, volume, pan);
      if (strained || forced) playNoise(forced ? .21 : .085, 980, volume * (forced ? .8 : .4), pan);
    },
    shoveHit(pan: number, volume: number) {
      playNoise(.11, 390, volume, pan);
    },
    impact(pan: number) {
      playNoise(.049, 2330, .43, pan);
      playNoise(.13, 545, .36, pan);
      thud(126, .143, .36, pan);
    },
    bite(pan: number) {
      playNoise(.16, 960, .34, pan);
      playNoise(.10, 2850, .28, pan);
      thud(95, .15, .24, pan);
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
    confirm(action: 'item' | 'equip' | 'use') {
      if (muted || hidden || !context || context.state !== 'running' || !interfaceOutput
        || (scene !== 'world' && scene !== 'paused')) return;
      const time = context.currentTime;
      const pitches = action === 'equip' ? [175, 260] : action === 'use' ? [308, 411] : [245, 328];
      for (const [index, pitch] of pitches.entries()) {
        const start = time + index * .043;
        const voice = context.createOscillator();
        const gain = context.createGain();
        voice.type = 'triangle';
        voice.frequency.setValueAtTime(pitch, start);
        voice.frequency.exponentialRampToValueAtTime(pitch * .82, start + .09);
        gain.gain.setValueAtTime(.001, start);
        gain.gain.exponentialRampToValueAtTime(index === 0 ? .075 : .05, start + .009);
        gain.gain.exponentialRampToValueAtTime(.001, start + .10);
        voice.connect(gain).connect(interfaceOutput);
        voice.start(start);
        voice.stop(start + .10);
      }
    },
    dispose() {
      if (context) void context.close().catch(() => {});
      context = undefined;
      noise = undefined;
      output = undefined;
      music = undefined;
      master = undefined;
      ambience = undefined;
      interfaceOutput = undefined;
      themeRequested = false;
      zombieClips.clear();
      zombieTakes.clear();
      zombieVoices.clear();
    },
  };
}
