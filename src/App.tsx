import { PlaySession } from './game/PlaySession';
import { createDexieSaveRepository } from './save/dexieSaveRepository';
import { useRunFlow } from './save/useRunFlow';
import { RunMenus } from './ui/RunMenus';

const repository = createDexieSaveRepository();

export function App() {
  const flow = useRunFlow(repository);

  return flow.session
    ? <PlaySession
        coordinator={flow.session.coordinator}
        onNewRun={() => { void flow.leaveDeadRun('survivors'); }}
        onMainMenu={() => { void flow.leaveDeadRun('main'); }}
        deathSaveStatus={flow.deathStatus}
        pauseSaveActions={{
          saveGame: () => { void flow.save(false); },
          saveAndExit: () => { void flow.save(true); },
          feedback: flow.pauseFeedback,
          recovery: flow.pauseRecovery && { ...flow.pauseRecovery, activate: () => { void flow.recoverPause(); } },
        }}
      />
    : <RunMenus
        initialScreen={flow.destination}
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
