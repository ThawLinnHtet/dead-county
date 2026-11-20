export function createCombatAudio() {
  let context: AudioContext | undefined;
  let noise: AudioBuffer | undefined;

  function playNoise(duration: number, frequency: number, volume: number) {
    if (!context || !noise) return;
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
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(time);
    source.stop(time + duration);
  }

  return {
    swing() {
      if (typeof AudioContext === 'undefined') return;
      if (!context) {
        context = new AudioContext();
        noise = context.createBuffer(1, Math.ceil(context.sampleRate * .2), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      }
      if (context.state === 'suspended') void context.resume().catch(() => {});
      playNoise(.16, 1900, .19);
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
