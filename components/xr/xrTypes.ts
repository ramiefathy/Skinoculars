import * as THREE from 'three';

export type XRRay = {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
};

export type XRInputRayHit = {
  object: THREE.Object3D;
  point: THREE.Vector3;
  distance: number;
};

export type XRUIAction = 'recenter' | 'scaleUp' | 'scaleDown' | 'toggleAutoRotate';
