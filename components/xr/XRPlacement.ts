import * as THREE from 'three';

export type AnchorTransform = {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
};

export function captureAnchorTransform(anchor: THREE.Object3D): AnchorTransform {
  return {
    pos: anchor.position.clone(),
    quat: anchor.quaternion.clone(),
    scale: anchor.scale.clone()
  };
}

export function restoreAnchorTransform(anchor: THREE.Object3D, t: AnchorTransform): void {
  anchor.position.copy(t.pos);
  anchor.quaternion.copy(t.quat);
  anchor.scale.copy(t.scale);
  anchor.updateMatrixWorld(true);
}

export function placeAnchorInFrontOfViewer(params: {
  anchor: THREE.Object3D;
  xrCamera: THREE.Camera;
  distanceM: number;
  verticalOffsetM: number;
  faceViewerYawOnly: boolean;
}): void {
  const { anchor, xrCamera, distanceM, verticalOffsetM, faceViewerYawOnly } = params;
  const camPos = new THREE.Vector3();
  const camQuat = new THREE.Quaternion();
  xrCamera.getWorldPosition(camPos);
  xrCamera.getWorldQuaternion(camQuat);

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat);
  if (faceViewerYawOnly) {
    forward.y = 0;
    if (forward.lengthSq() < 1e-5) {
      forward.set(0, 0, -1);
    }
  }
  forward.normalize();

  const targetPos = camPos.clone().add(forward.multiplyScalar(distanceM));
  targetPos.y += verticalOffsetM;

  anchor.position.copy(targetPos);

  if (faceViewerYawOnly) {
    const yaw = Math.atan2(forward.x, forward.z);
    anchor.quaternion.setFromEuler(new THREE.Euler(0, yaw + Math.PI, 0));
  } else {
    anchor.quaternion.copy(camQuat);
  }

  anchor.updateMatrixWorld(true);
}
