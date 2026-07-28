import { HeartIcon } from './Icon';

interface FailModalProps {
  onRetry: () => void;
  onMap: () => void;
}

export default function FailModal({ onRetry, onMap }: FailModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-stars">
          {[0, 1, 2].map((i) => (
            <HeartIcon key={i} filled={false} size={30} />
          ))}
        </div>
        <div className="modal-title">The Domains Resist</div>
        <div className="modal-body">
          Out of lives. The board resets, but everything you worked out about it stays in your head.
        </div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={onRetry}>
            Try Again
          </button>
          <button className="btn-secondary" onClick={onMap}>
            Saga Map
          </button>
        </div>
      </div>
    </div>
  );
}
