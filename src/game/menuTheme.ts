// An original eight-bar theme. Render it once so the loop needs no real-time scheduler.
export async function renderMenuTheme(): Promise<AudioBuffer> {
  const beat = .82;
  const seconds = 32 * beat;
  const sampleRate = 24000;
  const score = new OfflineAudioContext(2, Math.round(sampleRate * seconds), sampleRate);
  const frequency = (note: number) => 440 * 2 ** ((note - 69) / 12);

  const harmony = [
    [38, 45, 53, 57, 64], [34, 41, 50, 53, 57],
    [33, 41, 48, 53, 60], [31, 43, 50, 58, 62],
    [38, 45, 53, 57, 64], [34, 41, 50, 53, 57],
    [36, 43, 52, 55, 62], [38, 45, 50, 53, 57],
  ] as const;
  for (const [bar, chord] of harmony.entries()) {
    for (const [voice, pitch] of chord.entries()) {
      const start = (bar * 4 + voice * .08) * beat;
      note('triangle', pitch, start, (3.86 - voice * .08) * beat, .042 - voice * .004, (voice - 2) * .16, .75);
    }
  }

  // Felt-piano motif, with quiet detuned overtones and two soft reflections.
  const melody = [
    [1, 69], [2.5, 65], [4, 64], [6, 60], [8.5, 69], [10, 67],
    [12, 65], [13.5, 62], [16.5, 69], [18, 72], [19.5, 76],
    [21, 77], [23, 72], [24.5, 67], [26, 64], [28, 62],
  ] as const;
  for (const [position, pitch] of melody) {
    const start = position * beat;
    const pan = position % 2 < 1 ? -.21 : .17;
    note('sine', pitch, start, 1.62, .1, pan, .016);
    note('triangle', pitch + 12.06, start, .36, .031, pan, .009);
    note('sine', pitch, start + .24, 1.58, .027, .42, .05);
    note('sine', pitch, start + .39, 1.42, .016, -.46, .07);
  }
  return score.startRendering();

  function note(type: OscillatorType, pitch: number, start: number, duration: number, level: number, pan: number, rise: number) {
    const voice = score.createOscillator();
    const envelope = score.createGain();
    const stereo = score.createStereoPanner();
    voice.type = type;
    voice.frequency.value = frequency(pitch);
    stereo.pan.value = pan;
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.linearRampToValueAtTime(level, start + rise);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    voice.connect(envelope).connect(stereo).connect(score.destination);
    voice.start(start);
    voice.stop(start + duration);
  }
}
