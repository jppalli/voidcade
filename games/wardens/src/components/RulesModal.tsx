import Icon, { HeartIcon } from './Icon';
import { elementGlyphInner, getElement } from '../engine/elements';

interface RulesModalProps {
  onClose: () => void;
  closeLabel?: string;
}

// A tiny 4x4 diagram showing two legally-placed Wardens plus the ring of
// cells they forbid, so the "never touching" rule is visible rather than
// only described.
const DIAGRAM_REGIONS = [
  [0, 0, 1, 1],
  [0, 2, 2, 1],
  [3, 3, 2, 1],
  [3, 3, 2, 2],
];
const DIAGRAM_WARDENS = new Set(['0,1', '2,0']);
const DIAGRAM_BLOCKED = new Set(['1,0', '1,1', '1,2', '0,0', '0,2', '3,0', '3,1', '2,1']);

export default function RulesModal({ onClose, closeLabel = 'Begin' }: RulesModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card-wide">
        <div className="modal-title">How to Play</div>

        <div className="rules-diagram">
          {DIAGRAM_REGIONS.map((row, r) =>
            row.map((regionIdx, c) => {
              const element = getElement(regionIdx);
              const key = `${r},${c}`;
              const isWarden = DIAGRAM_WARDENS.has(key);
              const isBlocked = DIAGRAM_BLOCKED.has(key);
              return (
                <div
                  key={key}
                  className={`rules-diagram-cell ${isBlocked ? 'is-blocked' : ''}`}
                  style={{ background: element.cell }}
                >
                  {isWarden && <Icon inner={elementGlyphInner(element.id)} color={element.ink} size={20} />}
                  {isBlocked && <span className="rules-diagram-dot" />}
                </div>
              );
            })
          )}
        </div>

        <ul className="rules-list">
          <li>
            <span className="rules-num">1</span>
            One Warden in every <strong>row</strong>, every <strong>column</strong>, and every{' '}
            <strong>colored domain</strong>.
          </li>
          <li>
            <span className="rules-num">2</span>
            No two Wardens may <strong>touch</strong> — not side by side, not diagonally. The small dots above
            mark cells the two Wardens rule out.
          </li>
          <li>
            <span className="rules-num">3</span>
            Tap a cell to place a Warden. Guess wrong and it gets crossed out and costs you a life.
          </li>
        </ul>

        <div className="rules-lives">
          <HeartIcon filled size={20} />
          <HeartIcon filled size={20} />
          <HeartIcon filled size={20} />
          <span>Three lives per level. Every puzzle has exactly one solution — it can always be reasoned out.</span>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
