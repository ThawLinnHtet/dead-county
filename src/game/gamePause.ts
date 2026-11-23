export type BlockingPanel = 'inventory' | 'loot' | 'map';
type ForegroundPanel = BlockingPanel | 'pause' | null;
type PauseReason = NonNullable<ForegroundPanel> | 'visibility' | 'save';

export interface PauseState {
  readonly foregroundPanel: ForegroundPanel;
  readonly tabHidden: boolean;
  readonly resumeRequired: boolean;
  readonly savePending: boolean;
  readonly isPaused: boolean;
}

export function createGamePause(onChange: () => void) {
  const reasons = new Set<PauseReason>();
  let state: PauseState = {
    foregroundPanel: null,
    tabHidden: false,
    resumeRequired: false,
    savePending: false,
    isPaused: false,
  };

  function update(foregroundPanel: ForegroundPanel, resumeRequired = state.resumeRequired) {
    if (!foregroundPanel && resumeRequired && !reasons.has('visibility')) foregroundPanel = 'pause';
    if (state.foregroundPanel) reasons.delete(state.foregroundPanel);
    if (foregroundPanel) reasons.add(foregroundPanel);
    state = {
      foregroundPanel,
      resumeRequired,
      tabHidden: reasons.has('visibility'),
      savePending: reasons.has('save'),
      isPaused: reasons.size > 0 || resumeRequired,
    };
    onChange();
  }

  function resume() {
    if (state.foregroundPanel === 'pause' && !state.tabHidden && !state.savePending) {
      update(null, false);
    }
  }

  return {
    getPauseState: () => state,
    resume,
    handleEscape() {
      if (state.tabHidden || state.savePending) return;
      if (state.foregroundPanel === 'pause') {
        if (!state.resumeRequired) resume();
      } else {
        update(state.foregroundPanel ? null : 'pause');
      }
    },
    setForegroundPanel(panel: BlockingPanel | null) {
      if (state.foregroundPanel === 'pause' || state.foregroundPanel === panel) return;
      if (panel && state.isPaused) return;
      update(panel);
    },
    setTabHidden(hidden: boolean) {
      if (state.tabHidden === hidden) return;
      if (hidden) reasons.add('visibility');
      else reasons.delete('visibility');
      update(state.foregroundPanel, hidden || state.resumeRequired);
    },
    setSavePending(pending: boolean) {
      if (state.savePending === pending) return;
      if (pending) reasons.add('save');
      else reasons.delete('save');
      update(state.foregroundPanel);
    },
    holdForSaveConflict() {
      reasons.add('save');
      update('pause');
    },
  };
}
