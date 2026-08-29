import { useEffect, useRef } from "react";
import * as THREE from "three";
import { run } from "./run.js";

const SEGMENT_GAP = 0.12;
const SEGMENT_DEPTH = 0.9;
const SPAN = 8.4;

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
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(0, 0.9, 8.2);
    camera.lookAt(0, 0.1, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const paces = run.splits.map((split) => split.pace);
    const fastest = Math.min(...paces);
    const slowest = Math.max(...paces);
    const width = SPAN / run.splits.length - SEGMENT_GAP;
    const disposables = [];

    // One segment per kilometre. Height in space is seconds per kilometre:
    // the slower the split, the taller the block.
    run.splits.forEach((split, index) => {
      const height =
        0.7 + ((split.pace - fastest) / (slowest - fastest || 1)) * 3.1;
      const geometry = new THREE.BoxGeometry(width, height, SEGMENT_DEPTH);
      const material = new THREE.MeshBasicMaterial({
        color: effortColor(split.effort),
      });
      const segment = new THREE.Mesh(geometry, material);
      segment.position.set(
        -SPAN / 2 + width / 2 + index * (width + SEGMENT_GAP),
        height / 2 - 2,
        0,
      );
      group.add(segment);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({
          color: 0x0b0d10,
          transparent: true,
          opacity: 0.6,
        }),
      );
      outline.position.copy(segment.position);
      group.add(outline);

      disposables.push(geometry, material, outline.geometry, outline.material);
    });

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    const animate = () => {
      const elapsed = (performance.now() - start) / 1000;
      group.rotation.y = still ? 0.18 : 0.18 + Math.sin(elapsed * 0.3) * 0.16;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
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
