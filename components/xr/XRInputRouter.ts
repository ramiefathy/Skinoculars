import * as THREE from 'three';
import { XRRay, XRInputRayHit } from './xrTypes';
import { XRUIManager, XR_UI_LAYER } from './XRUIManager';

type SelectState = {
  startTime: number;
  startGripPos?: THREE.Vector3;
  startAnchorPos?: THREE.Vector3;
  startAnchorQuat?: THREE.Quaternion;
  startAnchorScale?: THREE.Vector3;
  dragOffset?: THREE.Vector3;
  moved: boolean;
  allowDrag?: boolean;
  startHandYaw?: number;
};

export type XRInputRouterOptions = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  scene: THREE.Scene;
  anchorGroup: THREE.Object3D;
  uiManager: XRUIManager;
  pickStructureFromRay: (origin: THREE.Vector3, direction: THREE.Vector3) => string | null;
  onSelectStructure: (id: string | null) => void;
  onAnchorScaleChange?: (scale: number) => void;
};

export class XRInputRouter {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private anchorGroup: THREE.Object3D;
  private uiManager: XRUIManager;
  private pickStructureFromRay: XRInputRouterOptions['pickStructureFromRay'];
  private onSelectStructure: XRInputRouterOptions['onSelectStructure'];
  private onAnchorScaleChange?: XRInputRouterOptions['onAnchorScaleChange'];
  private raycaster = new THREE.Raycaster();
  private selecting = new Map<XRInputSource, SelectState>();
  private session: XRSession | null = null;

  constructor(opts: XRInputRouterOptions) {
    this.renderer = opts.renderer;
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.anchorGroup = opts.anchorGroup;
    this.uiManager = opts.uiManager;
    this.pickStructureFromRay = opts.pickStructureFromRay;
    this.onSelectStructure = opts.onSelectStructure;
    this.onAnchorScaleChange = opts.onAnchorScaleChange;
  }

  attachSession(session: XRSession) {
    this.session = session;
    session.addEventListener('selectstart', this.handleSelectStart);
    session.addEventListener('selectend', this.handleSelectEnd);
    session.addEventListener('select', this.handleSelect);
  }

  detachSession() {
    if (!this.session) return;
    this.session.removeEventListener('selectstart', this.handleSelectStart);
    this.session.removeEventListener('selectend', this.handleSelectEnd);
    this.session.removeEventListener('select', this.handleSelect);
    this.session = null;
    this.selecting.clear();
  }

  update(frame: XRFrame) {
    if (!this.session) return;
    const refSpace = this.renderer.xr.getReferenceSpace();
    if (!refSpace) return;

    const selectingInputs = [...this.selecting.entries()];
    const gripPoses = selectingInputs
      .map(([input]) => this.getGripPose(frame, input, refSpace))
      .filter((pose): pose is { input: XRInputSource; position: THREE.Vector3 } => !!pose);

    if (gripPoses.length === 2) {
      this.updateBimanual(gripPoses[0], gripPoses[1]);
      return;
    }

    for (const [input, state] of selectingInputs) {
      const grip = this.getGripPose(frame, input, refSpace);
      if (!grip) continue;
      if (!state.startGripPos) state.startGripPos = grip.position.clone();
      if (!state.startAnchorPos) state.startAnchorPos = this.anchorGroup.position.clone();
      if (!state.startAnchorQuat) state.startAnchorQuat = this.anchorGroup.quaternion.clone();
      if (!state.startAnchorScale) state.startAnchorScale = this.anchorGroup.scale.clone();

      const distance = grip.position.distanceTo(state.startGripPos);
      if (distance > 0.02) {
        state.moved = true;
      }

      if (state.moved && state.allowDrag) {
        if (!state.dragOffset) {
          state.dragOffset = this.anchorGroup.position.clone().sub(grip.position);
        }
        this.anchorGroup.position.copy(grip.position.clone().add(state.dragOffset));
        this.anchorGroup.updateMatrixWorld(true);
      }
    }
  }

  private updateBimanual(first: { input: XRInputSource; position: THREE.Vector3 }, second: { input: XRInputSource; position: THREE.Vector3 }) {
    const stateA = this.selecting.get(first.input);
    const stateB = this.selecting.get(second.input);
    if (!stateA || !stateB) return;
    if (!stateA.allowDrag || !stateB.allowDrag) return;

    if (!stateA.startGripPos || !stateB.startGripPos) {
      stateA.startGripPos = first.position.clone();
      stateB.startGripPos = second.position.clone();
      stateA.startAnchorPos = this.anchorGroup.position.clone();
      stateA.startAnchorScale = this.anchorGroup.scale.clone();
      stateA.startAnchorQuat = this.anchorGroup.quaternion.clone();
      const startVec = stateA.startGripPos.clone().sub(stateB.startGripPos);
      stateA.startHandYaw = Math.atan2(startVec.x, startVec.z);
    }

    const startDistance = stateA.startGripPos.distanceTo(stateB.startGripPos);
    const currentDistance = first.position.distanceTo(second.position);
    const ratio = startDistance > 0 ? currentDistance / startDistance : 1;
    const newScale = THREE.MathUtils.clamp((stateA.startAnchorScale?.x ?? 1) * ratio, 0.25, 0.7);
    this.anchorGroup.scale.setScalar(newScale);
    this.onAnchorScaleChange?.(newScale);

    const startMid = stateA.startGripPos.clone().add(stateB.startGripPos).multiplyScalar(0.5);
    const currentMid = first.position.clone().add(second.position).multiplyScalar(0.5);
    const offset = currentMid.clone().sub(startMid);
    this.anchorGroup.position.copy(stateA.startAnchorPos?.clone().add(offset) ?? this.anchorGroup.position);

    if (stateA.startAnchorQuat && stateA.startHandYaw !== undefined) {
      const currentVec = first.position.clone().sub(second.position);
      const currentYaw = Math.atan2(currentVec.x, currentVec.z);
      const deltaYaw = currentYaw - stateA.startHandYaw;
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaYaw);
      this.anchorGroup.quaternion.copy(stateA.startAnchorQuat).multiply(yawQuat);
    }
    this.anchorGroup.updateMatrixWorld(true);
  }

  private handleSelectStart = (event: XRInputSourceEvent) => {
    const refSpace = this.renderer.xr.getReferenceSpace();
    let allowDrag = true;
    if (refSpace && event.frame) {
      const ray = this.getRayFromInput(event.frame, event.inputSource, refSpace);
      if (ray) {
        const uiHit = this.raycastUI(ray);
        const structureHit = this.pickStructureFromRay(ray.origin, ray.direction);
        if (uiHit || structureHit) {
          allowDrag = false;
        }
      }
    }
    this.selecting.set(event.inputSource, { startTime: performance.now(), moved: false, allowDrag });
  };

  private handleSelectEnd = (event: XRInputSourceEvent) => {
    this.selecting.delete(event.inputSource);
  };

  private handleSelect = (event: XRInputSourceEvent) => {
    const state = this.selecting.get(event.inputSource);
    if (!state) return;

    const duration = performance.now() - state.startTime;
    if (state.moved || duration > 250) return;

    const refSpace = this.renderer.xr.getReferenceSpace();
    if (!refSpace || !event.frame) return;
    const ray = this.getRayFromInput(event.frame, event.inputSource, refSpace);
    if (!ray) return;
    const uiHit = this.raycastUI(ray);
    if (uiHit && this.uiManager.handleHit(uiHit)) return;

    const id = this.pickStructureFromRay(ray.origin, ray.direction);
    this.onSelectStructure(id);
  };

  private getRayFromInput(frame: XRFrame, input: XRInputSource, refSpace: XRReferenceSpace): XRRay | null {
    const pose = frame.getPose(input.targetRaySpace, refSpace);
    if (!pose) return null;
    const mat = new THREE.Matrix4().fromArray(pose.transform.matrix as unknown as number[]);
    const origin = new THREE.Vector3().setFromMatrixPosition(mat);
    const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(new THREE.Matrix4().extractRotation(mat)).normalize();
    return { origin, direction };
  }

  private getGripPose(frame: XRFrame, input: XRInputSource, refSpace: XRReferenceSpace): { input: XRInputSource; position: THREE.Vector3 } | null {
    if (!input.gripSpace) return null;
    const pose = frame.getPose(input.gripSpace, refSpace);
    if (!pose) return null;
    const mat = new THREE.Matrix4().fromArray(pose.transform.matrix as unknown as number[]);
    const position = new THREE.Vector3().setFromMatrixPosition(mat);
    return { input, position };
  }

  private raycastUI(ray: XRRay): XRInputRayHit | null {
    this.raycaster.set(ray.origin, ray.direction);
    this.raycaster.layers.set(XR_UI_LAYER);
    const hits = this.raycaster.intersectObjects(this.uiManager.getPickables(), true);
    if (hits.length === 0) return null;
    const hit = hits[0];
    return { object: hit.object, point: hit.point.clone(), distance: hit.distance };
  }
}
