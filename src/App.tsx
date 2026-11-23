import { useLayoutEffect, useState } from 'react';
import { createGameAudio } from './game/gameAudio';
import { PlaySession } from './game/PlaySession';
import { createDexieSaveRepository } from './save/dexieSaveRepository';
import { useRunFlow } from './save/useRunFlow';
import { RunMenus } from './ui/RunMenus';
import { SoundToggle } from './ui/SoundToggle';

const repository = createDexieSaveRepository();
const soundPreferenceKey = 'dead-county:muted';

function readMuted() {
  try {
    return localStorage.getItem(soundPreferenceKey) === 'true';
  } catch {
    return false;
  }
}
      
export function App() {
  const flow = useRunFlow(repository);
  const [muted, setMuted] = useState(readMuted);
  const [audio] = useState(createGameAudio);
  const hasSession = flow.session !== null;

  useLayoutEffect(() => {
    if (!hasSession) audio.setScene('menu');
  }, [audio, hasSession]);

  useLayoutEffect(() => {
    const updateVisibility = () => audio.setHidden(document.hidden);
    const unlock = (event: MouseEvent | KeyboardEvent) => {
      if (!event.isTrusted || (event instanceof KeyboardEvent && event.repeat)) return;
      audio.unlock();
    };
    updateVisibility();
    window.addEventListener('click', unlock, true);
    window.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      document.removeEventListener('visibilitychange', updateVisibility);
      audio.dispose();
    };
  }, [audio]);

  useLayoutEffect(() => audio.setMuted(muted), [audio, muted]);

  const soundToggle = <SoundToggle muted={muted} onToggle={() => {
    const nextMuted = !muted;
    audio.setMuted(nextMuted);
    if (!nextMuted) audio.unlock();
    setMuted(nextMuted);
    try {
      localStorage.setItem(soundPreferenceKey, String(nextMuted));
    } catch {
      // Keep the current tab's setting when storage is unavailable.
    }
  }} />;

  return flow.session
    ? <PlaySession
        coordinator={flow.session.coordinator}
        audio={audio}
        soundToggle={soundToggle}
        onNewRun={() => { void flow.leaveDeadRun('survivors'); }}
        onMainMenu={() => { void flow.leaveDeadRun('main'); }}
        deathSaveStatus={flow.deathStatus}
        onRecoverDeathSave={() => { void flow.recoverDeadSave(); }}
        pauseSaveActions={{
          saveGame: () => { void flow.save(false); },
          saveAndExit: () => { void flow.save(true); },
          feedback: flow.pauseFeedback,
          recovery: flow.pauseRecovery && { ...flow.pauseRecovery, activate: () => { void flow.recoverPause(); } },
        }}
      />
    : <RunMenus
        initialScreen={flow.destination}
        soundToggle={soundToggle}
        canStart={['empty', 'dead', 'ready'].includes(flow.availability.status) || flow.damagedReplacement?.stage === 'choose'}
        canContinue={flow.availability.status === 'ready'}
        statusMessage={flow.availability.message}
        errorMessage={flow.menuError}
        pending={flow.pending}
        replacementOpen={flow.replacement !== null}
        canRetryRead={flow.availability.status === 'read_failed'}
        canReplaceDamaged={flow.availability.status === 'damaged'}
        damagedStage={flow.damagedReplacement?.stage ?? null}
        onStartRun={(characterId) => { void flow.requestStart(characterId); }}
        onContinue={() => { void flow.continueRun(); }}
        onConfirmReplacement={() => { void flow.finishReplacement(true); }}
        onCancelReplacement={() => { void flow.finishReplacement(false); }}
        onRetryRead={() => { void flow.retryMenuRead(); }}
        onReplaceDamaged={() => { void flow.requestDamagedReplacement(); }}
        onDecideDamaged={(confirm) => { void flow.decideDamagedReplacement(confirm); }}
        onNavigate={flow.clearMenuError}
      />;
}
