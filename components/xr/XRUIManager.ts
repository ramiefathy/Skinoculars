import * as THREE from 'three';
import { XRUIAction, XRInputRayHit } from './xrTypes';

const UI_LAYER = 1;

type UIActionHandler = (action: XRUIAction) => void;

export class XRUIManager {
  private scene: THREE.Scene;
  private uiRoot: THREE.Group;
  private menuCanvas: HTMLCanvasElement;
  private menuTexture: THREE.CanvasTexture;
  private infoCanvas: HTMLCanvasElement;
  private infoTexture: THREE.CanvasTexture;
  private menuMesh: THREE.Mesh;
  private infoMesh: THREE.Mesh;
  private reticle: THREE.Mesh;
  private uiHitPlanes: THREE.Mesh[] = [];
  private onAction?: UIActionHandler;
  private currentInfo = { title: '', body: '' };
  private debugText = '';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.uiRoot = new THREE.Group();
    this.uiRoot.layers.set(UI_LAYER);
    this.scene.add(this.uiRoot);

    this.menuCanvas = document.createElement('canvas');
    this.menuCanvas.width = 512;
    this.menuCanvas.height = 256;
    this.menuTexture = new THREE.CanvasTexture(this.menuCanvas);

    this.infoCanvas = document.createElement('canvas');
    this.infoCanvas.width = 512;
    this.infoCanvas.height = 256;
    this.infoTexture = new THREE.CanvasTexture(this.infoCanvas);

    const menuPlane = new THREE.PlaneGeometry(0.6, 0.3);
    const infoPlane = new THREE.PlaneGeometry(0.6, 0.25);
    this.menuMesh = new THREE.Mesh(menuPlane, new THREE.MeshBasicMaterial({ map: this.menuTexture, transparent: true }));
    this.infoMesh = new THREE.Mesh(infoPlane, new THREE.MeshBasicMaterial({ map: this.infoTexture, transparent: true }));

    this.menuMesh.layers.set(UI_LAYER);
    this.infoMesh.layers.set(UI_LAYER);
    this.menuMesh.position.set(0.35, 0.1, -1.1);
    this.infoMesh.position.set(-0.35, -0.1, -1.1);

    this.uiRoot.add(this.menuMesh);
    this.uiRoot.add(this.infoMesh);

    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.01, 0.02, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    this.reticle.layers.set(UI_LAYER);
    this.reticle.visible = false;
    this.uiRoot.add(this.reticle);

    this.buildMenuButtons();
    this.drawMenu();
    this.drawInfo();
  }

  dispose() {
    this.scene.remove(this.uiRoot);
    this.menuMesh.geometry.dispose();
    this.infoMesh.geometry.dispose();
    (this.menuMesh.material as THREE.Material).dispose();
    (this.infoMesh.material as THREE.Material).dispose();
    this.menuTexture.dispose();
    this.infoTexture.dispose();
  }

  setActionHandler(handler: UIActionHandler) {
    this.onAction = handler;
  }

  setVisible(visible: boolean) {
    this.uiRoot.visible = visible;
  }

  updateHeadLocked(camera: THREE.Camera) {
    const camPos = new THREE.Vector3();
    const camQuat = new THREE.Quaternion();
    camera.getWorldPosition(camPos);
    camera.getWorldQuaternion(camQuat);
    this.uiRoot.position.copy(camPos);
    this.uiRoot.quaternion.copy(camQuat);
  }

  setInfo(title: string, body: string) {
    if (this.currentInfo.title === title && this.currentInfo.body === body) return;
    this.currentInfo = { title, body };
    this.drawInfo();
  }

  clearInfo() {
    this.currentInfo = { title: '', body: '' };
    this.drawInfo();
  }

  setDebugText(text: string) {
    if (this.debugText === text) return;
    this.debugText = text;
    this.drawMenu();
  }

  updateReticle(hit?: THREE.Vector3) {
    if (!hit) {
      this.reticle.visible = false;
      return;
    }
    this.reticle.visible = true;
    this.reticle.position.copy(hit);
  }

  getPickables(): THREE.Object3D[] {
    return this.uiHitPlanes;
  }

  handleHit(hit: XRInputRayHit): boolean {
    const action = hit.object.userData?.uiAction as XRUIAction | undefined;
    if (!action) return false;
    this.onAction?.(action);
    return true;
  }

  private buildMenuButtons() {
    const buttonDefs: { id: XRUIAction; label: string; x: number; y: number }[] = [
      { id: 'recenter', label: 'Recenter', x: -0.18, y: 0.05 },
      { id: 'scaleUp', label: 'Scale +', x: 0.18, y: 0.05 },
      { id: 'scaleDown', label: 'Scale -', x: -0.18, y: -0.05 },
      { id: 'toggleAutoRotate', label: 'Auto Rotate', x: 0.18, y: -0.05 }
    ];

    for (const def of buttonDefs) {
      const hitPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      hitPlane.position.set(def.x, def.y, 0.002);
      hitPlane.userData.uiAction = def.id;
      hitPlane.layers.set(UI_LAYER);
      this.menuMesh.add(hitPlane);
      this.uiHitPlanes.push(hitPlane);
    }
  }

  private drawMenu() {
    const ctx = this.menuCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.menuCanvas.width, this.menuCanvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, this.menuCanvas.width, this.menuCanvas.height);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.strokeRect(0, 0, this.menuCanvas.width, this.menuCanvas.height);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('XR Menu', this.menuCanvas.width / 2, 36);

    const buttons = [
      { label: 'Recenter', x: 128, y: 110 },
      { label: 'Scale +', x: 384, y: 110 },
      { label: 'Scale -', x: 128, y: 190 },
      { label: 'Auto Rotate', x: 384, y: 190 }
    ];

    ctx.font = '20px sans-serif';
    for (const b of buttons) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fillRect(b.x - 90, b.y - 30, 180, 50);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(b.label, b.x, b.y + 8);
    }
    if (this.debugText) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(this.debugText, 16, this.menuCanvas.height - 16);
    }
    this.menuTexture.needsUpdate = true;
  }

  private drawInfo() {
    const ctx = this.infoCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.infoCanvas.width, this.infoCanvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, this.infoCanvas.width, this.infoCanvas.height);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.strokeRect(0, 0, this.infoCanvas.width, this.infoCanvas.height);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.currentInfo.title || 'No selection', 20, 40);
    ctx.font = '18px sans-serif';
    this.wrapText(ctx, this.currentInfo.body || 'Pinch to select a structure.', 20, 80, 472, 24);
    this.infoTexture.needsUpdate = true;
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let offsetY = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, offsetY);
        line = word + ' ';
        offsetY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, offsetY);
  }
}

export const XR_UI_LAYER = UI_LAYER;
