import './soundToggle.css';

export function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="sound-toggle" aria-label="Sound" aria-pressed={!muted} onClick={onToggle}>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8h3l4-3v10l-4-3H3z" />
        {muted ? <path d="m13 8 4 4m0-4-4 4" /> : <path d="M13 8a3 3 0 0 1 0 4m2-6a6 6 0 0 1 0 8" />}
      </svg>
      Sound <span aria-hidden="true">{muted ? 'Off' : 'On'}</span>
    </button>
  );
}
