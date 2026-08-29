import { useEffect, useRef } from "react";
import * as THREE from "three";
import { run } from "./run.js";

const SEGMENTS_PER_KM = 12;
const RIBBON_WIDTH = 0.55;

// Reported effort drives colour: cool blue when the runner says it is easy,
// accent orange as they report it getting hard.
const effortColor = (effort) => {
  const easy = new THREE.Color(0x2f6f9f);
  const hard = new THREE.Color(0xff5c30);
  return easy.clone().lerp(hard, THREE.MathUtils.clamp((effort - 2) / 6, 0, 1));
};

const sample = (t, key) => {
  const last = run.splits.length - 1;
  const position = THREE.MathUtils.clamp(t, 0, 1) * last;
  const low = Math.floor(position);
  const high = Math.min(low + 1, last);
  return THREE.MathUtils.lerp(
    run.splits[low][key],
    run.splits[high][key],
    position - low,
  );
};

export default function Ribbon() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 1.1, 6.4);
    camera.lookAt(0, -0.2, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const paces = run.splits.map((split) => split.pace);
    const fastest = Math.min(...paces);
    const slowest = Math.max(...paces);
    const steps = (run.splits.length - 1) * SEGMENTS_PER_KM;

    const positions = new Float32Array((steps + 1) * 2 * 3);
    const colors = new Float32Array((steps + 1) * 2 * 3);
    const indices = [];

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const x = (t - 0.5) * 8;
      // A slower kilometre sits lower: pace maps straight onto height.
      const height =
        1.5 - ((sample(t, "pace") - fastest) / (slowest - fastest)) * 3;
      const color = effortColor(sample(t, "effort"));

      for (let side = 0; side < 2; side += 1) {
        const offset = (step * 2 + side) * 3;
        positions[offset] = x;
        positions[offset + 1] = height;
        positions[offset + 2] = side === 0 ? -RIBBON_WIDTH : RIBBON_WIDTH;
        colors[offset] = color.r;
        colors[offset + 1] = color.g;
        colors[offset + 2] = color.b;
      }

      if (step < steps) {
        const base = step * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    const ribbon = new THREE.Mesh(geometry, material);
    scene.add(ribbon);

    const edges = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0xeef2f6,
        transparent: true,
        opacity: 0.08,
      }),
    );
    scene.add(edges);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    const animate = () => {
      const elapsed = (performance.now() - start) / 1000;
      const sway = still ? 0 : Math.sin(elapsed * 0.35) * 0.22;
      ribbon.rotation.y = sway;
      edges.rotation.y = sway;
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
      geometry.dispose();
      material.dispose();
      edges.geometry.dispose();
      edges.material.dispose();
    };
  }, []);

  return <div className="ribbon" ref={mountRef} aria-hidden="true" />;
}
