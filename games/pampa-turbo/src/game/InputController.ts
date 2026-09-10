export type Control = 'left' | 'right' | 'accelerate' | 'brake' | 'boost';

export interface InputState {
  left: boolean;
  right: boolean;
  accelerate: boolean;
  brake: boolean;
  boost: boolean;
}

const KEY_CONTROLS: Readonly<Record<string, Control>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'accelerate',
  KeyW: 'accelerate',
  ArrowDown: 'brake',
  KeyS: 'brake',
  Space: 'boost',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
};

export class InputController {
  readonly state: InputState = {
    left: false,
    right: false,
    accelerate: false,
    brake: false,
    boost: false,
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp, { passive: false });
    window.addEventListener('blur', this.reset);
  }

  attachTouchControls(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('[data-control]').forEach((button) => {
      const control = button.dataset.control as Control | undefined;
      if (!control) return;

      const press = (event: PointerEvent): void => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.state[control] = true;
        button.classList.add('pressed');
      };
      const release = (event: PointerEvent): void => {
        event.preventDefault();
        this.state[control] = false;
        button.classList.remove('pressed');
      };

      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    });
  }

  reset = (): void => {
    (Object.keys(this.state) as Control[]).forEach((control) => {
      this.state[control] = false;
    });
    document.querySelectorAll('[data-control].pressed').forEach((button) => {
      button.classList.remove('pressed');
    });
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const control = KEY_CONTROLS[event.code];
    if (!control) return;
    event.preventDefault();
    this.state[control] = true;
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    const control = KEY_CONTROLS[event.code];
    if (!control) return;
    event.preventDefault();
    this.state[control] = false;
  };
}
