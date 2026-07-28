import Icon from './Icon';
import { BOONS, boonGlyphInner, type BoonId } from '../engine/boons';

interface BoonChoiceModalProps {
  options: BoonId[];
  onChoose: (id: BoonId) => void;
}

export default function BoonChoiceModal({ options, onChoose }: BoonChoiceModalProps) {
  const defs = options.map((id) => BOONS.find((b) => b.id === id)!);

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-title">A Boon Awaits</div>
        <div className="modal-body">This domain yields a gift. Choose the one you'll carry forward.</div>
        <div className="boon-choice-grid">
          {defs.map((boon) => (
            <button key={boon.id} className="boon-card" onClick={() => onChoose(boon.id)}>
              <Icon inner={boonGlyphInner(boon.glyph)} color="#7dffd4" size={34} />
              <span className="boon-card-name">{boon.name}</span>
              <span className="boon-card-desc">{boon.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
