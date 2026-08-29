import { useEffect, useRef } from "react";
import * as THREE from "three";
import { run } from "./run.js";

const SPAN = 10;
const SEGMENT_GAP = 0.06;
const SEGMENT_DEPTH = 1.1;
const MIN_HEIGHT = 0.6;
const HEIGHT_PER_SECOND = 0.035;
const ROLL_SECONDS = 0.55;

// Reported effort drives colour: cool blue when the runner says it is easy,
// accent orange as they report it getting hard.
const effortColor = (effort) => {
  const easy = new THREE.Color(0x3aa0ff);
  const hard = new THREE.Color(0xff5c30);
  return easy.clone().lerp(hard, THREE.MathUtils.clamp((effort - 2) / 6, 0, 1));
};

export default function Ribbon() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.set(0.22, -0.5, 0);
    scene.add(group);

    const fastest = Math.min(...run.splits.map((split) => split.pace));
    const width = SPAN / run.splits.length - SEGMENT_GAP;
    const disposables = [];
    const segments = [];

    // One segment per kilometre. Height in space is seconds per kilometre above
    // the runner's fastest split, so a slow kilometre is a tall block.
    run.splits.forEach((split, index) => {
      const height = MIN_HEIGHT + (split.pace - fastest) * HEIGHT_PER_SECOND;
      const geometry = new THREE.BoxGeometry(width, height, SEGMENT_DEPTH);
      const base = effortColor(split.effort);
      const material = new THREE.MeshBasicMaterial({ color: base.clone() });
      const segment = new THREE.Mesh(geometry, material);
      segment.position.set(
        -SPAN / 2 + width / 2 + index * (width + SEGMENT_GAP),
        height / 2,
        0,
      );
      group.add(segment);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({
          color: 0x0b0d10,
          transparent: true,
          opacity: 0.55,
        }),
      );
      outline.position.copy(segment.position);
      group.add(outline);

      segments.push({ material, base, height });
      disposables.push(geometry, material, outline.geometry, outline.material);
    });

    const tallest = Math.max(...segments.map((segment) => segment.height));
    group.position.y = -tallest / 2;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const highlight = new THREE.Color(0xffffff);
    const start = performance.now();
    let frame = 0;

    // The meter rolls on its own: the lit kilometre walks the run end to end so
    // the screen keeps moving in someone's hand without being touched.
    const animate = () => {
      const elapsed = (performance.now() - start) / 1000;
      const head = still
        ? run.splits.length - 1
        : (elapsed / ROLL_SECONDS) % (run.splits.length + 6);
      segments.forEach((segment, index) => {
        const distance = Math.abs(head - index);
        const glow = Math.max(0, 1 - distance / 2.5);
        segment.material.color
          .copy(segment.base)
          .lerp(highlight, glow * (still ? 0 : 0.75));
      });
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);

      // Frame the whole run whatever the viewport shape, so nothing is cropped
      // when the phone is held in portrait.
      const vfov = THREE.MathUtils.degToRad(camera.fov);
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      const spanX = SPAN * Math.cos(group.rotation.y) + SEGMENT_DEPTH;
      const spanY = tallest * 1.05;
      const distance = Math.max(
        spanX / 2 / Math.tan(hfov / 2),
        spanY / 2 / Math.tan(vfov / 2),
      );
      camera.position.set(0, 0, distance + SEGMENT_DEPTH * 2);
      camera.lookAt(0, 0, 0);
    };
    resize();
    animate();

    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.remove();
      renderer.dispose();
      disposables.forEach((item) => item.dispose());
    };
  }, []);

  return <div className="ribbon" ref={mountRef} aria-hidden="true" />;
}
