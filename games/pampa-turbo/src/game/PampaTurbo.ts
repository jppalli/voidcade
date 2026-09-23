import * as THREE from 'three';
import type { EngineAudio } from '../audio/EngineAudio';
import type { InputController } from './InputController';
import type { Dictionary, Lang } from '../i18n';
import {
  cityFlavor,
  cityName,
  finishSignLines,
  forkSignLines,
  FORK_CITIES,
  WAYPOINT_CITIES,
} from './route';

const ROAD_SEGMENTS = 46;
const SEGMENT_LENGTH = 12;
const CAR_Z = 6;
const RACE_TIME = 68;
const FORK_START_DISTANCE = 740;
const ROUTE_CHOICE_DISTANCE = 900;
const FORK_END_DISTANCE = 1160;
const FORK_SPREAD = 15.5;
const FORK_SEGMENTS = Math.ceil((FORK_END_DISTANCE - FORK_START_DISTANCE) / SEGMENT_LENGTH) + 1;
const FINISH_DISTANCE = 2400;
const LANES = [-4.4, 0, 4.4] as const;

export interface HudSnapshot {
  speedKph: number;
  score: number;
  timeLeft: number;
  mate: number;
  boosting: boolean;
}

export interface RaceResult {
  success: boolean;
  score: number;
  timeLeft: number;
  route: string;
}

interface GameCallbacks {
  onHud: (snapshot: HudSnapshot) => void;
  onMessage: (message: string) => void;
  onEnd: (result: RaceResult) => void;
}

interface TrafficVehicle {
  group: THREE.Group;
  lane: number;
  forkSide: -1 | 1;
  distance: number;
  speed: number;
  previousAhead: number;
  collided: boolean;
}

interface MatePickup {
  group: THREE.Group;
  lane: number;
  forkSide: -1 | 1;
  distance: number;
  phase: number;
}

interface ForkRoadSegment {
  group: THREE.Group;
  side: -1 | 1;
  distance: number;
}

interface TrackSign {
  group: THREE.Group;
  distance: number;
}

type GameState = 'menu' | 'playing' | 'paused' | 'ended';

/** Out Run-style layered horizon: a sky gradient band above a distant
 * ground band, both painted on canvases and mapped onto huge cylinders
 * that stay centered on the camera, so the "horizon" always sits at a
 * fixed screen height no matter how the road curves or climbs. */
class SkyBand {
  readonly group = new THREE.Group();
  private readonly skyMaterial: THREE.MeshBasicMaterial;
  private readonly skyTexture: THREE.CanvasTexture;
  private readonly skyCanvas: HTMLCanvasElement;
  private readonly skyContext: CanvasRenderingContext2D;

  constructor() {
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 4;
    this.skyCanvas.height = 256;
    const context = this.skyCanvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable');
    this.skyContext = context;
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTexture.colorSpace = THREE.SRGBColorSpace;
    this.skyMaterial = new THREE.MeshBasicMaterial({
      map: this.skyTexture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(480, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7), this.skyMaterial);
    this.group.add(sky);
    this.paint(['#5a3a86', '#c15a8f', '#f0855a', '#ffcf7a']);
  }

  /** Repaints the vertical sky gradient from a top-to-bottom stop list. */
  paint(stops: string[]): void {
    const gradient = this.skyContext.createLinearGradient(0, 0, 0, this.skyCanvas.height);
    stops.forEach((color, index) => gradient.addColorStop(index / (stops.length - 1), color));
    this.skyContext.fillStyle = gradient;
    this.skyContext.fillRect(0, 0, this.skyCanvas.width, this.skyCanvas.height);
    this.skyTexture.needsUpdate = true;
  }

  follow(position: THREE.Vector3): void {
    this.group.position.set(position.x, 0, position.z);
  }
}

export class PampaTurbo {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(76, 1, 0.1, 900);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly skyBand: SkyBand;
  private readonly roadSegments: THREE.Group[] = [];
  private readonly forkRoadSegments: ForkRoadSegment[] = [];
  private readonly traffic: TrafficVehicle[] = [];
  private readonly pickups: MatePickup[] = [];
  private readonly waypointSigns: TrackSign[] = [];
  private readonly player: THREE.Group;
  private readonly driverHead: THREE.Group;
  private readonly passengerHead: THREE.Group;
  private forkArch: THREE.Group = new THREE.Group();
  private readonly branchSign: THREE.Group;
  private readonly finishSign: THREE.Group;
  private lastFrameTime = performance.now();
  private state: GameState = 'menu';
  private speed = 0;
  private distance = 0;
  private previewDistance = 0;
  private playerOffset = 0;
  private mate = 62;
  private score = 0;
  private timeLeft = RACE_TIME;
  private branch: -1 | 0 | 1 = 0;
  private route: string;
  private collisionCooldown = 0;
  private messageDistance = 0;
  private dictionary: Dictionary;
  private lang: Lang;

  constructor(
    private readonly host: HTMLElement,
    private readonly input: InputController,
    private readonly audio: EngineAudio,
    private readonly callbacks: GameCallbacks,
    dictionary: Dictionary,
    lang: Lang,
  ) {
    this.dictionary = dictionary;
    this.lang = lang;
    this.route = dictionary.routePending;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.host.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.Fog(0xf0855a, 180, 680);
    // Out Run-style low camera: sits just above the road surface, very close
    // behind the car, FOV wide and lookAt aimed at a far horizon — this is
    // what creates the classic "road rushing under you" feeling.
    this.camera.position.set(0, 1.15, CAR_Z + 3.2);
    this.camera.lookAt(0, 1.0, -120);

    this.skyBand = new SkyBand();
    this.scene.add(this.skyBand.group);

    this.createEnvironment();
    this.createRoad();
    this.createForkRoad();
    this.createForkArch();
    const { car, driverHead, passengerHead } = this.createPlayerCar();
    this.player = car;
    this.driverHead = driverHead;
    this.passengerHead = passengerHead;
    this.scene.add(this.player);
    this.createTraffic();
    this.createPickups();
    this.traffic.forEach((vehicle) => { vehicle.group.visible = false; });
    this.pickups.forEach((pickup) => { pickup.group.visible = false; });

    this.forkArch.visible = false;
    this.branchSign = this.createSign(...forkSignLines(this.lang));
    this.finishSign = this.createSign(...finishSignLines(this.lang));
    this.scene.add(this.branchSign, this.finishSign);

    WAYPOINT_CITIES.forEach((waypoint) => {
      const sign = this.createSign(cityName(waypoint, this.lang), this.lang === 'en' ? 'AHEAD' : 'ADELANTE');
      this.scene.add(sign);
      this.waypointSigns.push({ group: sign, distance: waypoint.distance });
    });

    window.addEventListener('resize', this.resize);
    this.resize();
    this.animate();
  }

  get isPlaying(): boolean { return this.state === 'playing'; }
  get isPaused(): boolean { return this.state === 'paused'; }

  /** Swaps the active language: rebuilds every canvas-rendered road sign
   * and resets the pending route label so mid-run language switches (from
   * the pause screen) show up correctly on the next fork/finish. */
  setLanguage(dictionary: Dictionary, lang: Lang): void {
    this.dictionary = dictionary;
    this.lang = lang;
    this.repaintSign(this.branchSign, ...forkSignLines(lang));
    this.repaintSign(this.finishSign, ...finishSignLines(lang));
    this.waypointSigns.forEach((sign, index) => {
      const waypoint = WAYPOINT_CITIES[index];
      this.repaintSign(sign.group, cityName(waypoint, lang), lang === 'en' ? 'AHEAD' : 'ADELANTE');
    });
    if (this.branch === 0) this.route = dictionary.routePending;
    else this.route = dictionary.routeName(cityName(FORK_CITIES[this.branch === -1 ? 0 : 1], lang));
  }

  start(): void {
    this.speed = 0;
    this.distance = 0;
    this.playerOffset = 0;
    this.mate = 62;
    this.score = 0;
    this.timeLeft = RACE_TIME;
    this.branch = 0;
    this.route = this.dictionary.routePending;
    this.collisionCooldown = 0;
    this.messageDistance = 0;
    this.state = 'playing';
    this.input.reset();
    this.resetTraffic();
    this.resetPickups();
    this.lastFrameTime = performance.now();
    this.callbacks.onMessage(this.dictionary.startMessage);
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.update(this.speed / 82, false, false);
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lastFrameTime = performance.now();
  }

  private resize = (): void => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.fov = width < 700 ? 82 : 76;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;

    if (this.state === 'playing') this.update(dt);
    else if (this.state === 'menu') {
      this.previewDistance += dt * 11;
      this.updateRoad(this.previewDistance);
      this.updateTrackObject(this.branchSign, FORK_START_DISTANCE - 60, this.previewDistance);
      this.updateTrackObject(this.finishSign, FINISH_DISTANCE, this.previewDistance);
      this.waypointSigns.forEach((sign) => this.updateTrackObject(sign.group, sign.distance, this.previewDistance));
      this.updateForkArch(this.previewDistance);
      this.player.rotation.y = Math.sin(performance.now() * 0.0007) * 0.03;
      this.updateCamera(dt, 0, false);
      this.skyBand.follow(this.camera.position);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number): void {
    const controls = this.input.state;
    const onGrass = this.distanceFromRoadCenter(this.distance, this.playerOffset) > 7.4;
    const boosting = controls.boost && this.mate > 0.2 && this.speed > 6;
    const maxSpeed = boosting ? 82 : 65;

    if (controls.accelerate) this.speed += 27 * dt;
    else this.speed -= 7.5 * dt;
    if (controls.brake) this.speed -= 42 * dt;
    if (boosting) {
      this.speed += 35 * dt;
      this.mate -= 25 * dt;
      this.score += 80 * dt;
    } else {
      this.mate += 2.2 * dt;
    }
    if (onGrass) this.speed -= 25 * dt;

    this.speed = THREE.MathUtils.clamp(this.speed, 0, onGrass ? Math.min(maxSpeed, 32) : maxSpeed);
    this.mate = THREE.MathUtils.clamp(this.mate, 0, 100);

    const steer = Number(controls.right) - Number(controls.left);
    const steeringPower = (6.5 + this.speed * 0.055) * (0.35 + this.speed / 82);
    this.playerOffset += steer * steeringPower * dt;
    this.playerOffset = THREE.MathUtils.clamp(this.playerOffset, -16.2, 16.2);
    if (onGrass && Math.abs(steer) < 0.1) this.playerOffset *= Math.pow(0.992, dt * 60);

    this.distance += this.speed * dt;
    this.timeLeft -= dt;
    this.score += this.speed * dt * (boosting ? 2.2 : 1.15);
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);

    if (this.branch === 0 && this.distance >= ROUTE_CHOICE_DISTANCE) {
      const selectedBranch: -1 | 1 = this.playerOffset < 0 ? -1 : 1;
      const selectedCenter = selectedBranch * this.forkOffsetAt(this.distance);
      this.branch = selectedBranch;
      this.playerOffset -= selectedCenter;
      this.player.position.x = this.playerOffset;
      const city = FORK_CITIES[selectedBranch === -1 ? 0 : 1];
      const name = cityName(city, this.lang);
      this.route = this.dictionary.routeName(name);
      this.score += 500;
      this.audio.routeChoice();
      this.callbacks.onMessage(this.dictionary.forkChosen(name, cityFlavor(city, this.lang)));
    }

    if (this.messageDistance < 1 && this.distance > 620) {
      this.messageDistance = 1;
      const [cityA, cityB] = FORK_CITIES;
      this.callbacks.onMessage(this.dictionary.forkWarning(cityName(cityA, this.lang), cityName(cityB, this.lang)));
    } else if (this.messageDistance < 2 && this.distance > 1750) {
      this.messageDistance = 2;
      this.callbacks.onMessage(this.dictionary.finishStretch);
    }

    this.updateRoad(this.distance);
    this.updateTraffic(dt);
    this.updatePickups(dt);
    this.updateTrackObject(this.branchSign, FORK_START_DISTANCE - 60, this.distance);
    this.updateTrackObject(this.finishSign, FINISH_DISTANCE, this.distance);
    this.waypointSigns.forEach((sign) => this.updateTrackObject(sign.group, sign.distance, this.distance));
    this.updateForkArch(this.distance);
    this.updatePlayer(dt, steer, onGrass, boosting);
    this.updateCamera(dt, steer, boosting);
    this.skyBand.follow(this.camera.position);
    this.audio.update(this.speed / 82, true, boosting);
    this.callbacks.onHud({
      speedKph: this.speed * 3.6,
      score: this.score,
      timeLeft: Math.max(0, this.timeLeft),
      mate: this.mate,
      boosting,
    });

    if (this.distance >= FINISH_DISTANCE) this.end(true);
    else if (this.timeLeft <= 0) this.end(false);
  }

  private end(success: boolean): void {
    if (this.state === 'ended') return;
    this.state = 'ended';
    this.speed = 0;
    this.input.reset();
    if (success) this.score += Math.max(0, this.timeLeft) * 120;
    this.audio.update(0, false, false);
    this.audio.finish(success);
    this.callbacks.onEnd({ success, score: this.score, timeLeft: Math.max(0, this.timeLeft), route: this.route });
  }

  private updatePlayer(dt: number, steer: number, onGrass: boolean, boosting: boolean): void {
    this.player.position.x = THREE.MathUtils.damp(this.player.position.x, this.playerOffset, 11, dt);
    this.player.position.y = 0.52 + Math.sin(performance.now() * (onGrass ? 0.025 : 0.009)) * (onGrass ? 0.05 : 0.015);
    this.player.rotation.y = THREE.MathUtils.damp(this.player.rotation.y, -steer * 0.16, 9, dt);
    this.player.rotation.z = THREE.MathUtils.damp(this.player.rotation.z, -steer * 0.08, 9, dt);
    this.player.scale.z = THREE.MathUtils.damp(this.player.scale.z, boosting ? 1.07 : 1, 8, dt);

    // Driver bobs and leans into the turn; passenger reacts a beat later
    // and leans the opposite way when the tractor gets close, selling the
    // "co-pilot along for the ride" feel from the chase-cam framing.
    const bob = Math.sin(performance.now() * 0.01) * 0.02;
    this.driverHead.rotation.z = THREE.MathUtils.damp(this.driverHead.rotation.z, -steer * 0.22, 7, dt);
    this.driverHead.position.y = 1.62 + bob;
    this.passengerHead.rotation.z = THREE.MathUtils.damp(this.passengerHead.rotation.z, -steer * 0.14, 5, dt);
    this.passengerHead.position.y = 1.6 + Math.sin(performance.now() * 0.011 + 1.4) * 0.022;
  }

  private updateCamera(dt: number, steer: number, boosting: boolean): void {
    // Out Run framing: camera stays very low (y ≈ 1.1) and close behind the
    // car, with the lookAt point far ahead so the road appears to rush beneath
    // you rather than the car floating above it.  Lateral follow is subtle —
    // the camera drifts toward the curve but less than the car moves, which
    // stretches the perspective through corners exactly like the original.
    const targetX = this.playerOffset * 0.35;
    const targetY = boosting ? 0.95 : 1.15;
    const targetZ = this.player.position.z + (boosting ? 2.8 : 3.2);

    const followX = THREE.MathUtils.damp(this.camera.position.x, targetX, 5, dt);
    const followY = THREE.MathUtils.damp(this.camera.position.y, targetY, 4, dt);
    const followZ = THREE.MathUtils.damp(this.camera.position.z, targetZ, 7, dt);
    this.camera.position.set(followX, followY, followZ);

    // Very slight roll on steering — just enough to feel body lean without
    // being nauseating (Out Run uses ~2–3° roll in corners).
    this.camera.rotation.z = THREE.MathUtils.damp(this.camera.rotation.z, -steer * 0.025, 6, dt);

    // Horizon follows the road curve but stays at eye level (y = 1.0),
    // looking far ahead so the vanishing point is always near center-screen.
    this.camera.lookAt(this.playerOffset * 0.6, 1.0, this.player.position.z - 110);
  }

  private updateRoad(progress: number): void {
    const baseCurve = this.curveAt(progress);
    const baseHeight = this.heightAt(progress);
    const remainder = progress % SEGMENT_LENGTH;

    this.roadSegments.forEach((segment, index) => {
      const ahead = index * SEGMENT_LENGTH - remainder;
      const sample = progress + ahead;
      const dx = this.curveAt(sample + 5) - this.curveAt(sample - 5);
      const dy = this.heightAt(sample + 5) - this.heightAt(sample - 5);
      const insideFork = sample >= FORK_START_DISTANCE && sample <= FORK_END_DISTANCE;
      segment.children.forEach((child) => {
        if (child.userData.hideAtFork === true) child.visible = !insideFork;
      });
      segment.position.set(this.curveAt(sample) - baseCurve, this.heightAt(sample) - baseHeight, CAR_Z - ahead);
      segment.rotation.y = -Math.atan2(dx, 10);
      segment.rotation.x = Math.atan2(dy, 10);
    });

    this.forkRoadSegments.forEach((forkSegment) => {
      const ahead = forkSegment.distance - progress;
      const dx = this.forkCurveAt(forkSegment.distance + 5, forkSegment.side)
        - this.forkCurveAt(forkSegment.distance - 5, forkSegment.side);
      const dy = this.heightAt(forkSegment.distance + 5) - this.heightAt(forkSegment.distance - 5);
      forkSegment.group.visible = ahead > -SEGMENT_LENGTH * 2 && ahead < ROAD_SEGMENTS * SEGMENT_LENGTH;
      forkSegment.group.position.set(
        this.forkCurveAt(forkSegment.distance, forkSegment.side) - baseCurve,
        this.heightAt(forkSegment.distance) - baseHeight,
        CAR_Z - ahead,
      );
      forkSegment.group.rotation.y = -Math.atan2(dx, 10);
      forkSegment.group.rotation.x = Math.atan2(dy, 10);
    });
  }

  private updateForkArch(progress: number): void {
    const archDistance = FORK_START_DISTANCE - 6;
    const ahead = archDistance - progress;
    this.forkArch.visible = ahead > -20 && ahead < 420;
    this.forkArch.position.set(
      this.curveAt(archDistance) - this.curveAt(progress),
      this.heightAt(archDistance) - this.heightAt(progress),
      CAR_Z - ahead,
    );
    this.forkArch.rotation.y = -Math.atan2(this.curveAt(archDistance + 5) - this.curveAt(archDistance - 5), 10);
  }

  private updateTraffic(dt: number): void {
    const baseCurve = this.curveAt(this.distance);
    const baseHeight = this.heightAt(this.distance);

    this.traffic.forEach((vehicle, index) => {
      vehicle.distance += vehicle.speed * dt;
      if (this.branch !== 0 && vehicle.forkSide !== this.branch && vehicle.distance >= FORK_END_DISTANCE - SEGMENT_LENGTH) {
        this.respawnTraffic(vehicle, 280 + Math.random() * 220);
      }
      const ahead = vehicle.distance - this.distance;
      const roadX = this.objectCurveAt(vehicle.distance, vehicle.forkSide) - baseCurve;
      const vehicleX = roadX + vehicle.lane;
      vehicle.group.position.set(vehicleX, 0.5 + this.heightAt(vehicle.distance) - baseHeight, CAR_Z - ahead);
      vehicle.group.rotation.y = -Math.atan2(
        this.objectCurveAt(vehicle.distance + 5, vehicle.forkSide) - this.objectCurveAt(vehicle.distance - 5, vehicle.forkSide),
        10,
      );
      vehicle.group.visible = ahead > -32 && ahead < 530;

      if (this.collisionCooldown <= 0 && Math.abs(ahead) < 3.5 && Math.abs(this.playerOffset - vehicleX) < 1.65) {
        vehicle.collided = true;
        this.collisionCooldown = 1.1;
        this.speed *= 0.34;
        this.score = Math.max(0, this.score - 350);
        this.audio.collision();
        this.host.classList.remove('impact');
        void this.host.offsetWidth;
        this.host.classList.add('impact');
        const messages = this.dictionary.collisionMessages;
        this.callbacks.onMessage(messages[index % messages.length]);
      }

      if (vehicle.previousAhead >= -4 && ahead < -4 && !vehicle.collided) {
        const gap = Math.abs(this.playerOffset - vehicleX);
        const bonus = gap < 3.4 ? 420 : 160;
        this.score += bonus;
        if (gap < 3.4) this.callbacks.onMessage(this.dictionary.overtakeMessage);
      }
      vehicle.previousAhead = ahead;

      if (ahead < -35) this.respawnTraffic(vehicle, 250 + Math.random() * 300);
    });
  }

  private updatePickups(dt: number): void {
    const baseCurve = this.curveAt(this.distance);
    const baseHeight = this.heightAt(this.distance);
    this.pickups.forEach((pickup) => {
      if (this.branch !== 0 && pickup.forkSide !== this.branch && pickup.distance >= FORK_END_DISTANCE - SEGMENT_LENGTH) {
        this.respawnPickup(pickup, 320 + Math.random() * 360);
      }
      const ahead = pickup.distance - this.distance;
      const x = this.objectCurveAt(pickup.distance, pickup.forkSide) - baseCurve + pickup.lane;
      pickup.phase += dt * 2.8;
      pickup.group.position.set(x, 1.1 + Math.sin(pickup.phase) * 0.18 + this.heightAt(pickup.distance) - baseHeight, CAR_Z - ahead);
      pickup.group.rotation.y += dt * 1.8;
      pickup.group.visible = ahead > -20 && ahead < 520;

      if (Math.abs(ahead) < 3.3 && Math.abs(this.playerOffset - x) < 1.65) {
        this.mate = Math.min(100, this.mate + 36);
        this.score += 300;
        this.audio.pickup();
        this.callbacks.onMessage(this.dictionary.pickupMessage);
        this.respawnPickup(pickup, 340 + Math.random() * 420);
      } else if (ahead < -22) {
        this.respawnPickup(pickup, 300 + Math.random() * 420);
      }
    });
  }

  private updateTrackObject(object: THREE.Group, objectDistance: number, progress: number): void {
    const ahead = objectDistance - progress;
    object.visible = ahead > -25 && ahead < 540;
    object.position.set(
      this.curveAt(objectDistance) - this.curveAt(progress),
      this.heightAt(objectDistance) - this.heightAt(progress),
      CAR_Z - ahead,
    );
    object.rotation.y = -Math.atan2(this.curveAt(objectDistance + 5) - this.curveAt(objectDistance - 5), 10);
  }

  private naturalCurveAt(distance: number): number {
    return Math.sin(distance * 0.0042) * 8 + Math.sin(distance * 0.0105) * 3.8;
  }

  private forkOffsetAt(distance: number): number {
    const progress = THREE.MathUtils.clamp((distance - FORK_START_DISTANCE) / 230, 0, 1);
    const smoothProgress = progress * progress * (3 - 2 * progress);
    return smoothProgress * FORK_SPREAD;
  }

  private forkCurveAt(distance: number, side: -1 | 1): number {
    return this.naturalCurveAt(distance) + side * this.forkOffsetAt(distance);
  }

  private curveAt(distance: number): number {
    return this.naturalCurveAt(distance) + this.branch * this.forkOffsetAt(distance);
  }

  private distanceFromRoadCenter(distance: number, offset: number): number {
    if (this.branch === 0 && distance >= FORK_START_DISTANCE) {
      const forkOffset = this.forkOffsetAt(distance);
      return Math.min(Math.abs(offset - forkOffset), Math.abs(offset + forkOffset));
    }
    return Math.abs(offset);
  }

  private objectCurveAt(distance: number, forkSide: -1 | 1): number {
    if (distance >= FORK_START_DISTANCE && distance <= FORK_END_DISTANCE) {
      return this.forkCurveAt(distance, forkSide);
    }
    return this.curveAt(distance);
  }

  private heightAt(distance: number): number {
    return Math.sin(distance * 0.006) * 2.6 + Math.sin(distance * 0.0021) * 3.4;
  }

  private createEnvironment(): void {
    const hemisphere = new THREE.HemisphereLight(0xbdeaff, 0x6f8f45, 2.2);
    this.scene.add(hemisphere);

    const sunLight = new THREE.DirectionalLight(0xfff1c2, 3.6);
    sunLight.position.set(-35, 55, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -24;
    sunLight.shadow.camera.right = 24;
    sunLight.shadow.camera.top = 24;
    sunLight.shadow.camera.bottom = -24;
    this.scene.add(sunLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200),
      new THREE.MeshLambertMaterial({ color: 0x78b957 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -18, -320);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(34, 48),
      new THREE.MeshBasicMaterial({ color: 0xffc94d, fog: false }),
    );
    sun.position.set(-72, 54, -520);
    this.scene.add(sun);

    const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x795c94, flatShading: true });
    for (let index = 0; index < 13; index += 1) {
      const height = 18 + (index % 4) * 8;
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(18 + (index % 3) * 8, height, 5), mountainMaterial);
      mountain.position.set(-230 + index * 39, height / 2 - 2, -430 - (index % 2) * 42);
      mountain.rotation.y = index * 0.7;
      this.scene.add(mountain);
    }
  }

  private createRoad(): void {
    const terrainGeometry = new THREE.PlaneGeometry(170, SEGMENT_LENGTH + 0.5);
    const roadGeometry = new THREE.PlaneGeometry(16, SEGMENT_LENGTH + 0.25);
    const shoulderGeometry = new THREE.BoxGeometry(1.05, 0.08, SEGMENT_LENGTH + 0.25);
    const dashGeometry = new THREE.BoxGeometry(0.16, 0.055, 4.3);
    const terrainMaterial = new THREE.MeshLambertMaterial({ color: 0x78b957 });
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x373744 });
    const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1cf });
    const redMaterial = new THREE.MeshBasicMaterial({ color: 0xf2555d });
    const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0b5 });

    for (let index = 0; index < ROAD_SEGMENTS; index += 1) {
      const segment = new THREE.Group();
      const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
      terrain.rotation.x = -Math.PI / 2;
      terrain.position.y = -0.1;
      terrain.receiveShadow = true;
      segment.add(terrain);

      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.02;
      road.receiveShadow = true;
      road.userData.hideAtFork = true;
      segment.add(road);

      [-8.48, 8.48].forEach((x, sideIndex) => {
        const shoulder = new THREE.Mesh(shoulderGeometry, index % 2 === sideIndex ? redMaterial : whiteMaterial);
        shoulder.position.set(x, 0.04, 0);
        shoulder.userData.hideAtFork = true;
        segment.add(shoulder);
      });
      [-2.7, 2.7].forEach((x) => {
        const dash = new THREE.Mesh(dashGeometry, dashMaterial);
        dash.position.set(x, 0.06, 0);
        dash.userData.hideAtFork = true;
        segment.add(dash);
      });

      if (index % 4 === 1) {
        const side = index % 8 < 4 ? -1 : 1;
        const cactus = this.createCactus();
        cactus.position.set(side * (13 + (index % 3) * 2.5), 0, 0);
        cactus.rotation.y = index;
        cactus.userData.hideAtFork = true;
        segment.add(cactus);
      } else if (index % 7 === 3) {
        const bale = new THREE.Mesh(
          new THREE.CylinderGeometry(1.15, 1.15, 1.5, 12),
          new THREE.MeshLambertMaterial({ color: 0xe2ad48, flatShading: true }),
        );
        bale.rotation.z = Math.PI / 2;
        bale.position.set(index % 2 ? -14 : 14, 1.1, 0);
        bale.userData.hideAtFork = true;
        segment.add(bale);
      }

      this.roadSegments.push(segment);
      this.scene.add(segment);
    }
  }

  private createForkRoad(): void {
    const roadGeometry = new THREE.PlaneGeometry(15, SEGMENT_LENGTH + 0.35);
    const shoulderGeometry = new THREE.BoxGeometry(0.95, 0.08, SEGMENT_LENGTH + 0.35);
    const dashGeometry = new THREE.BoxGeometry(0.18, 0.06, 4.2);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x343441 });
    const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1cf });
    const redMaterial = new THREE.MeshBasicMaterial({ color: 0xf2555d });
    const leftDashMaterial = new THREE.MeshBasicMaterial({ color: 0x79e7ff });
    const rightDashMaterial = new THREE.MeshBasicMaterial({ color: 0xffd85c });

    ([-1, 1] as const).forEach((side) => {
      for (let index = 0; index < FORK_SEGMENTS; index += 1) {
        const group = new THREE.Group();
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.y = side < 0 ? 0.025 : 0.035;
        road.receiveShadow = true;
        group.add(road);

        [-7.95, 7.95].forEach((x, shoulderIndex) => {
          const shoulder = new THREE.Mesh(
            shoulderGeometry,
            (index + shoulderIndex) % 2 === 0 ? whiteMaterial : redMaterial,
          );
          shoulder.position.set(x, 0.055, 0);
          group.add(shoulder);
        });

        [-2.5, 2.5].forEach((x) => {
          const dash = new THREE.Mesh(dashGeometry, side < 0 ? leftDashMaterial : rightDashMaterial);
          dash.position.set(x, 0.075, 0);
          group.add(dash);
        });

        if (index === 7) {
          const routeStripe = new THREE.Mesh(
            new THREE.BoxGeometry(5.5, 0.065, 1.1),
            side < 0 ? leftDashMaterial : rightDashMaterial,
          );
          routeStripe.position.set(0, 0.08, 0);
          group.add(routeStripe);
        }

        const distance = FORK_START_DISTANCE + index * SEGMENT_LENGTH;
        this.forkRoadSegments.push({ group, side, distance });
        this.scene.add(group);
      }
    });
  }

  /** A wide overhead gateway straddling both lanes right before the fork
   * opens, like the road-spanning signs on real Argentine highways —
   * makes the fork read as a real decision point instead of a paint job. */
  private createForkArch(): THREE.Group {
    const group = new THREE.Group();
    const postMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a38, flatShading: true });
    const beamMaterial = new THREE.MeshLambertMaterial({ color: 0xe94952, flatShading: true });

    [-14.5, 14.5].forEach((x) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9.5, 0.6), postMaterial);
      post.position.set(x, 4.75, 0);
      post.castShadow = true;
      group.add(post);
    });

    const beam = new THREE.Mesh(new THREE.BoxGeometry(30, 0.9, 0.9), beamMaterial);
    beam.position.set(0, 9.1, 0);
    group.add(beam);

    const [leftLine, rightLine] = forkSignLines(this.lang);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#fff4d6';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#100b2d';
      context.font = '900 76px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(`${leftLine}     ${rightLine}`, canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(21, 3.6),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    );
    board.position.set(0, 7.1, 0);
    group.add(board);

    this.forkArch = group;
    this.scene.add(group);
    return group;
  }

  private createCactus(): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0x267c4b, flatShading: true });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 3.2, 7), material);
    trunk.position.y = 1.6;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.3, 7), material);
    arm.position.set(0.55, 1.8, 0);
    arm.rotation.z = Math.PI / 2.8;
    group.add(trunk, arm);
    return group;
  }

  /** Builds the player car with an Out Run-style open cockpit: the body
   * is cut low behind the windshield so the driver's head+helmet and a
   * co-pilot's head are both visible from the chase camera, riding side
   * by side like the classic Ferrari Testarossa convertible framing. */
  private createPlayerCar(): { car: THREE.Group; driverHead: THREE.Group; passengerHead: THREE.Group } {
    const car = this.createVehicle(0x55c9ef, false);
    const creamMaterial = new THREE.MeshBasicMaterial({ color: 0xfff4d6 });
    const coralMaterial = new THREE.MeshBasicMaterial({ color: 0xff5f62 });
    const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2438, flatShading: true });

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 4.55), creamMaterial);
    stripe.position.set(0, 0.88, 0);
    car.add(stripe);

    // Low cockpit rim replaces the old boxy cabin roof, keeping the
    // windshield but leaving the heads exposed above it.
    const cockpitRim = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 1.5), seatMaterial);
    cockpitRim.position.set(0, 1.0, 0.2);
    car.add(cockpitRim);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), new THREE.MeshLambertMaterial({ color: 0xb7efff, flatShading: true, transparent: true, opacity: 0.75 }));
    windshield.position.set(0, 1.28, -0.42);
    windshield.rotation.x = -0.32;
    car.add(windshield);

    const driverHead = this.createHead(0x63cdef, coralMaterial, creamMaterial);
    driverHead.group.position.set(-0.42, 1.62, 0.32);
    car.add(driverHead.group);

    const passengerHead = this.createHead(0xffce4b, coralMaterial, creamMaterial);
    passengerHead.group.position.set(0.42, 1.6, 0.34);
    passengerHead.group.rotation.y = 0.12;
    car.add(passengerHead.group);

    const numberCanvas = document.createElement('canvas');
    numberCanvas.width = 128;
    numberCanvas.height = 64;
    const numberContext = numberCanvas.getContext('2d');
    if (!numberContext) throw new Error('Canvas 2D unavailable');
    numberContext.fillStyle = '#fff4d6';
    numberContext.fillRect(0, 0, 128, 64);
    numberContext.strokeStyle = '#100b2d';
    numberContext.lineWidth = 8;
    numberContext.strokeRect(4, 4, 120, 56);
    numberContext.fillStyle = '#100b2d';
    numberContext.font = '900 44px Arial';
    numberContext.textAlign = 'center';
    numberContext.textBaseline = 'middle';
    numberContext.fillText('79', 64, 34);
    const numberTexture = new THREE.CanvasTexture(numberCanvas);
    numberTexture.colorSpace = THREE.SRGBColorSpace;
    const numberPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.36),
      new THREE.MeshBasicMaterial({ map: numberTexture, side: THREE.DoubleSide }),
    );
    numberPlate.position.set(0, 0.72, 2.16);
    car.add(numberPlate);

    car.position.set(0, 0.52, CAR_Z - 0.5);
    car.scale.setScalar(1.06);
    return { car, driverHead: driverHead.group, passengerHead: passengerHead.group };
  }

  /** A helmeted head built from primitives: sphere helmet, stripe, dark
   * visor, and a chin scarf — reused for both driver and passenger with
   * different helmet colors so they read as two distinct characters. */
  private createHead(
    helmetColor: number,
    scarfMaterial: THREE.MeshBasicMaterial,
    stripeMaterial: THREE.MeshBasicMaterial,
  ): { group: THREE.Group } {
    const group = new THREE.Group();
    const helmetMaterial = new THREE.MeshLambertMaterial({ color: helmetColor, flatShading: true });
    const visorMaterial = new THREE.MeshLambertMaterial({ color: 0x24243a, flatShading: true });
    const gloveMaterial = new THREE.MeshLambertMaterial({ color: 0xfff4d6, flatShading: true });

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 9), helmetMaterial);
    helmet.castShadow = true;
    group.add(helmet);

    const helmetStripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.6), stripeMaterial);
    helmetStripe.position.set(0, 0.28, 0);
    group.add(helmetStripe);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.07), visorMaterial);
    visor.position.set(0, 0.03, -0.28);
    visor.rotation.x = -0.12;
    group.add(visor);

    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.6), scarfMaterial);
    scarf.position.set(0.05, -0.14, 0.34);
    scarf.rotation.y = -0.2;
    group.add(scarf);

    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), gloveMaterial);
    glove.position.set(0, -0.3, -0.5);
    group.add(glove);

    return { group };
  }

  private createVehicle(color: number, tractor: boolean): THREE.Group {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshLambertMaterial({ color, flatShading: true });
    const darkMaterial = new THREE.MeshLambertMaterial({ color: 0x171722, flatShading: true });
    const glassMaterial = new THREE.MeshLambertMaterial({ color: 0xb7efff, flatShading: true });

    const body = new THREE.Mesh(new THREE.BoxGeometry(tractor ? 2.5 : 2.25, tractor ? 1 : 0.7, tractor ? 3.2 : 4.25), bodyMaterial);
    body.position.y = tractor ? 0.75 : 0.62;
    body.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(tractor ? 1.6 : 1.65, tractor ? 1.2 : 0.62, tractor ? 1.4 : 2), glassMaterial);
    cabin.position.set(0, tractor ? 1.65 : 1.25, tractor ? 0.5 : 0.15);
    cabin.castShadow = true;
    group.add(body, cabin);

    const wheelGeometry = new THREE.CylinderGeometry(tractor ? 0.52 : 0.38, tractor ? 0.52 : 0.38, 0.28, 10);
    [-1.03, 1.03].forEach((x) => {
      [-1.32, 1.32].forEach((z) => {
        const wheel = new THREE.Mesh(wheelGeometry, darkMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, tractor ? 0.48 : 0.38, z);
        group.add(wheel);
      });
    });

    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffe47a });
    [-0.7, 0.7].forEach((x) => {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.08), lightMaterial);
      light.position.set(x, 0.7, -2.16);
      group.add(light);
    });
    return group;
  }

  private createTraffic(): void {
    const colors = [0xff5f62, 0xffcc4b, 0x875dde, 0x4ecb78, 0xf28c45, 0x5e71d8, 0xe66ba6, 0x66b9a8];
    colors.forEach((color, index) => {
      const group = this.createVehicle(color, index === 3);
      this.scene.add(group);
      this.traffic.push({
        group,
        lane: LANES[index % LANES.length],
        forkSide: index % 2 === 0 ? -1 : 1,
        distance: 0,
        speed: 0,
        previousAhead: Infinity,
        collided: false,
      });
    });
    this.resetTraffic();
  }

  private resetTraffic(): void {
    this.traffic.forEach((vehicle, index) => {
      vehicle.lane = LANES[(index * 2) % LANES.length];
      vehicle.forkSide = vehicle.lane < 0 ? -1 : index % 2 === 0 ? -1 : 1;
      vehicle.distance = this.distance + 110 + index * 72 + Math.random() * 45;
      vehicle.speed = 17 + (index % 4) * 4.5;
      vehicle.previousAhead = Infinity;
      vehicle.collided = false;
      vehicle.group.visible = true;
    });
  }

  private respawnTraffic(vehicle: TrafficVehicle, ahead: number): void {
    vehicle.distance = this.distance + ahead;
    vehicle.lane = LANES[Math.floor(Math.random() * LANES.length)];
    vehicle.forkSide = this.branch === 0 ? (vehicle.lane < 0 ? -1 : 1) : this.branch;
    vehicle.speed = 17 + Math.random() * 18;
    vehicle.previousAhead = ahead;
    vehicle.collided = false;
  }

  private createPickups(): void {
    for (let index = 0; index < 5; index += 1) {
      const group = new THREE.Group();
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.34, 0.7, 12),
        new THREE.MeshLambertMaterial({ color: 0x4a9d4b, flatShading: true }),
      );
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 12), new THREE.MeshBasicMaterial({ color: 0x352514 }));
      top.position.y = 0.38;
      const straw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), new THREE.MeshBasicMaterial({ color: 0xc9d3db }));
      straw.position.set(0.2, 0.66, 0);
      straw.rotation.z = -0.22;
      const glow = new THREE.PointLight(0x8dff77, 1.2, 7);
      group.add(cup, top, straw, glow);
      this.scene.add(group);
      this.pickups.push({
        group,
        lane: LANES[index % LANES.length],
        forkSide: index % 2 === 0 ? -1 : 1,
        distance: 0,
        phase: index,
      });
    }
    this.resetPickups();
  }

  private resetPickups(): void {
    this.pickups.forEach((pickup, index) => {
      pickup.distance = this.distance + 230 + index * 350;
      pickup.lane = LANES[(index + 1) % LANES.length];
      pickup.forkSide = pickup.lane < 0 ? -1 : index % 2 === 0 ? -1 : 1;
      pickup.group.visible = true;
    });
  }

  private respawnPickup(pickup: MatePickup, ahead: number): void {
    pickup.distance = this.distance + ahead;
    pickup.lane = LANES[Math.floor(Math.random() * LANES.length)];
    pickup.forkSide = this.branch === 0 ? (pickup.lane < 0 ? -1 : 1) : this.branch;
  }

  private createSign(topLine: string, bottomLine: string): THREE.Group {
    const group = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 256;
    this.paintSignCanvas(canvas, topLine, bottomLine);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 3.25), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    board.position.y = 5.4;
    board.userData.canvas = canvas;
    board.userData.texture = texture;
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x20202d });
    [-4.1, 4.1].forEach((x) => {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.1, 0.22), poleMaterial);
      pole.position.set(x, 2.55, 0.15);
      group.add(pole);
    });
    group.add(board);
    return group;
  }

  private paintSignCanvas(canvas: HTMLCanvasElement, topLine: string, bottomLine: string): void {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#fff4d6';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#100b2d';
    context.lineWidth = 24;
    context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    context.fillStyle = '#100b2d';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 72px Arial';
    context.fillText(topLine, canvas.width / 2, 82);
    context.fillStyle = '#e94952';
    context.font = '900 62px Arial';
    context.fillText(bottomLine, canvas.width / 2, 174);
  }

  /** Repaints an existing sign's canvas texture in place (used when the
   * player swaps language mid-session) instead of rebuilding the mesh. */
  private repaintSign(signGroup: THREE.Group, topLine: string, bottomLine: string): void {
    const board = signGroup.children.find((child) => child.userData.canvas) as THREE.Mesh | undefined;
    if (!board) return;
    const canvas = board.userData.canvas as HTMLCanvasElement;
    const texture = board.userData.texture as THREE.CanvasTexture;
    this.paintSignCanvas(canvas, topLine, bottomLine);
    texture.needsUpdate = true;
  }
}
