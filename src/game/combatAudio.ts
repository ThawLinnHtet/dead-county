export function createCombatAudio() {
  let context: AudioContext | undefined;
  let noise: AudioBuffer | undefined;

  function unlock() {
    if (typeof AudioContext === 'undefined') return;
    if (!context) {
      context = new AudioContext();
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * .64), context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
  }

  function playNoise(duration: number, frequency: number, volume: number, pan = 0) {
    if (!context || !noise || context.state !== 'running' || volume <= .001) return;
    const time = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, time);
    filter.frequency.exponentialRampToValueAtTime(frequency / 3, time + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + .025);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    const stereo = context.createStereoPanner();
    stereo.pan.value = pan;
    source.connect(filter).connect(gain).connect(stereo).connect(context.destination);
    source.start(time);
    source.stop(time + duration);
  }

  return {
    unlock,
    swing() {
      unlock();
      playNoise(.16, 1900, .19);
    },
    footsteps(pan: number, volume: number, heavy: boolean) {
      playNoise(.09, heavy ? 380 : 630, volume, pan);
    },
    groan(pan: number, volume: number) {
      if (!context || context.state !== 'running' || volume < .01) return;
      playNoise(.48, 450, volume * .5, pan);
      const time = context.currentTime;
      const voice = context.createOscillator();
      const gain = context.createGain();
      const stereo = context.createStereoPanner();
      stereo.pan.value = pan;
      voice.type = 'triangle';
      voice.frequency.setValueAtTime(105, time);
      voice.frequency.linearRampToValueAtTime(137, time + .18);
      voice.frequency.exponentialRampToValueAtTime(66, time + .48);
      gain.gain.setValueAtTime(.001, time);
      gain.gain.linearRampToValueAtTime(volume * .25, time + .13);
      gain.gain.exponentialRampToValueAtTime(.001, time + .48);
      voice.connect(gain).connect(stereo).connect(context.destination);
      voice.start(time);
      voice.stop(time + .48);
    },
    doorHit(pan: number, volume: number) {
      playNoise(.18, 240, volume, pan);
    },
    impact() {
      if (!context) return;
      playNoise(.085, 590, .35);
      const time = context.currentTime;
      const thud = context.createOscillator();
      const gain = context.createGain();
      thud.frequency.setValueAtTime(125, time);
      thud.frequency.exponentialRampToValueAtTime(57, time + .12);
      gain.gain.setValueAtTime(.23, time);
      gain.gain.exponentialRampToValueAtTime(.001, time + .12);
      thud.connect(gain).connect(context.destination);
      thud.start(time);
      thud.stop(time + .12);
    },
    dispose() {
      if (context) void context.close().catch(() => {});
      context = undefined;
      noise = undefined;
    },
  };
}
