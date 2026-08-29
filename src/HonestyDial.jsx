import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import { honesty } from "./honesty.js";
import { run } from "./run.js";

const RADIUS = 1.35;
const TUBE = 0.34;
const RADIAL_SEGMENTS = 24;
const TUBULAR_SEGMENTS = 180;
const FILL_SECONDS = 1.8;

const LIE = new THREE.Color(0xff3b30);
const TRUTH = new THREE.Color(0x2fd07a);

export default function HonestyDial() {
  const mountRef = useRef(null);
  const numberRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const { score } = honesty(run.splits);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 5.4);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.TorusGeometry(
      RADIUS,
      TUBE,
      RADIAL_SEGMENTS,
      TUBULAR_SEGMENTS,
    );

    // The empty dial, so the fill has something to be a fraction of.
    const trackMaterial = new THREE.MeshBasicMaterial({
      color: 0x2a3038,
      transparent: true,
      opacity: 0.55,
    });
    const track = new THREE.Mesh(geometry, trackMaterial);

    // The fill is the same torus revealed a slice at a time: torus indices run
    // along the tube, so shortening the draw range sweeps an arc round the ring
    // rather than dissolving it.
    const fillMaterial = new THREE.MeshBasicMaterial({ color: LIE.clone() });
    const fill = new THREE.Mesh(geometry.clone(), fillMaterial);
    const indices = fill.geometry.index.count;
    fill.geometry.setDrawRange(0, 0);

    const dial = new THREE.Group();
    dial.rotation.set(-0.18, 0, Math.PI / 2);
    dial.add(track, fill);
    scene.add(dial);

    const state = { value: 0 };
    const tween = gsap.to(state, {
      value: score,
      duration: FILL_SECONDS,
      ease: "power2.out",
      onUpdate: () => {
        const fraction = state.value / 100;
        fill.geometry.setDrawRange(0, Math.round(indices * fraction));
        fillMaterial.color.copy(LIE).lerp(TRUTH, fraction);
        if (numberRef.current) {
          numberRef.current.textContent = Math.round(state.value).toString();
        }
      },
    });

    let frame = 0;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) tween.progress(1).pause();

    const animate = () => {
      if (!still) dial.rotation.z += 0.0015;
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
      tween.kill();
      renderer.domElement.remove();
      renderer.dispose();
      geometry.dispose();
      fill.geometry.dispose();
      trackMaterial.dispose();
      fillMaterial.dispose();
    };
  }, []);

  const { r, score } = honesty(run.splits);

  return (
    <section className="dial">
      <h2 className="dial-head">The honesty dial</h2>
      <p className="dial-sub">
        Reported effort against measured pace across all {run.splits.length}
        {" kilometres. "}
        {score >= 90
          ? "What he said tracked what he ran."
          : "Where they disagree is the part he could not feel."}
      </p>

      <div className="dial-stage" ref={mountRef}>
        <p className="dial-readout">
          <span className="dial-number" ref={numberRef}>
            0
          </span>
          <span className="plate-label">Honesty</span>
        </p>
      </div>

      <dl className="dial-sources">
        <div className="dial-source">
          <dt>Correlation</dt>
          <dd>{r.toFixed(2)}</dd>
        </div>
        <div className="dial-source">
          <dt>Kilometres</dt>
          <dd>{run.splits.length}</dd>
        </div>
        <div className="dial-source">
          <dt>Scale</dt>
          <dd>−1 → 0, +1 → 100</dd>
        </div>
      </dl>
    </section>
  );
}
