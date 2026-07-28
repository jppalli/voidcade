import Icon from '../components/Icon';
import type { Progress } from '../engine/progress';
import { TOTAL_LEVELS } from '../engine/saga';
import { playClick } from '../sounds';

interface MenuScreenProps {
  progress: Progress;
  onPlay: () => void;
  onOpenSaga: () => void;
}

export default function MenuScreen({ progress, onPlay, onOpenSaga }: MenuScreenProps) {
  const levelsCleared = Object.values(progress.results).filter((r) => r.completed).length;

  return (
    <div className="menu-screen">
      <div className="menu-logo">
        <Icon
          inner='<path d="M12 3l7 3.5v6c0 4.2-3 7-7 8.5-4-1.5-7-4.3-7-8.5v-6Z" /><circle cx="12" cy="12" r="2.6" />'
          color="#7dffd4"
          size={64}
        />
        <h1 className="menu-title">Wardens</h1>
      </div>
      <p className="menu-subtitle">
        Place one Warden in every row, column, and domain. No two may ever stand side by side. A saga of
        elemental logic, realm by realm.
      </p>

      <div className="menu-actions">
        <button
          className="btn-primary"
          onClick={() => {
            playClick();
            onPlay();
          }}
        >
          {levelsCleared === 0 ? 'Begin the Saga' : 'Continue'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            playClick();
            onOpenSaga();
          }}
        >
          View Saga Map
        </button>
      </div>

      <div className="menu-stats">
        <div>
          <strong>{levelsCleared}</strong>
          of {TOTAL_LEVELS} levels
        </div>
        <div>
          <strong>{progress.totalStars}</strong>
          stars earned
        </div>
      </div>

      <a className="link-back" href="../../">
        ← Back to Voidcade
      </a>
    </div>
  );
}
