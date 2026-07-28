import { StarIcon } from './Icon';

interface WinModalProps {
  stars: number;
  isLastInRealm: boolean;
  isSagaComplete: boolean;
  onNext: () => void;
  onMap: () => void;
}

export default function WinModal({ stars, isLastInRealm, isSagaComplete, onNext, onMap }: WinModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-title">
          {isSagaComplete ? 'The Saga Awaits More' : isLastInRealm ? 'Realm Cleared' : 'Domain Settled'}
        </div>
        <div className="modal-stars">
          {[0, 1, 2].map((i) => (
            <StarIcon key={i} filled={i < stars} size={36} />
          ))}
        </div>
        <div className="modal-body">
          {isSagaComplete
            ? "You've cleared every realm in the saga so far. More await in future updates."
            : isLastInRealm
            ? 'The next realm grows larger, and its elements grow stranger.'
            : stars === 3
            ? 'Not a single life lost. Every domain found its Warden.'
            : 'Every row, column, and domain finds its balance.'}
        </div>
        <div className="modal-actions">
          {!isSagaComplete && (
            <button className="btn-primary" onClick={onNext}>
              {isLastInRealm ? 'Enter Next Realm' : 'Next Level'}
            </button>
          )}
          <button className="btn-secondary" onClick={onMap}>
            Saga Map
          </button>
        </div>
      </div>
    </div>
  );
}
