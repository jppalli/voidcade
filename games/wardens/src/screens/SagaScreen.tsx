import type { CSSProperties } from 'react';
import Icon, { LockIcon, StarIcon } from '../components/Icon';
import { boonGlyphInner } from '../engine/boons';
import type { Progress } from '../engine/progress';
import { isLevelUnlocked, starsForResult } from '../engine/progress';
import { REALMS, getAllLevelRefs } from '../engine/saga';
import { playClick } from '../sounds';

interface SagaScreenProps {
  progress: Progress;
  onSelectLevel: (globalIndex: number) => void;
}

// Alternates left/right/center to make the path feel like it winds down
// the screen, rather than a flat grid.
function rowAlignment(levelInRealm: number): 'align-left' | 'align-right' | '' {
  const m = levelInRealm % 4;
  if (m === 1) return 'align-right';
  if (m === 3) return 'align-left';
  return '';
}

export default function SagaScreen({ progress, onSelectLevel }: SagaScreenProps) {
  const allRefs = getAllLevelRefs();

  return (
    <div className="saga-screen">
      {REALMS.map((realm, realmIndex) => {
        const refs = allRefs.filter((r) => r.realmIndex === realmIndex);
        return (
          <div className="realm-block" key={realm.id}>
            <div className="realm-header">
              <div className="realm-name">{realm.name}</div>
              <div className="realm-blurb">{realm.blurb}</div>
            </div>
            <div
              className="realm-path"
              style={
                {
                  '--realm-color': realm.colorFrom,
                  '--realm-glow': `${realm.colorFrom}55`,
                } as CSSProperties
              }
            >
              {refs.map((ref, i) => {
                const unlocked = isLevelUnlocked(progress, ref.globalIndex);
                const result = progress.results[ref.globalIndex];
                const stars = starsForResult(result);
                return (
                  <div key={ref.id}>
                    <div className={`path-node-row ${rowAlignment(ref.levelInRealm)}`}>
                      <button
                        className={`path-node ${unlocked ? 'unlocked' : 'locked'} ${ref.grantsBoon ? 'boon-node' : ''}`}
                        disabled={!unlocked}
                        onClick={() => {
                          if (!unlocked) return;
                          playClick();
                          onSelectLevel(ref.globalIndex);
                        }}
                        aria-label={`Level ${ref.levelInRealm + 1} of ${realm.name}`}
                      >
                        {unlocked ? (
                          ref.grantsBoon ? (
                            <Icon inner={boonGlyphInner('seers-eye')} color={realm.colorFrom} size={26} />
                          ) : (
                            ref.levelInRealm + 1
                          )
                        ) : (
                          <LockIcon />
                        )}
                        {unlocked && result?.completed && (
                          <div className="path-node-stars">
                            {[0, 1, 2].map((s) => (
                              <StarIcon key={s} filled={s < stars} />
                            ))}
                          </div>
                        )}
                      </button>
                    </div>
                    {i < refs.length - 1 && (
                      <div className="path-node-row" style={{ justifyContent: 'center' }}>
                        <div className="path-connector" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
