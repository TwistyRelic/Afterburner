import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import * as THREE from "three";
import KmCard from "./KmCard.jsx";
import { detectDecoupling } from "./decoupling.js";
import { run } from "./run.js";

const SPAN = 10;
const SEGMENT_GAP = 0.06;
const SEGMENT_DEPTH = 1.1;
const MIN_HEIGHT = 0.6;
const HEIGHT_PER_SECOND = 0.035;
const ROLL_SECONDS = 0.55;
const HOME_ROTATION_Y = -0.5;
const FOCUS_ROTATION_Y = -0.16;
const FOCUS_ZOOM = 0.62;

const flagsByKm = new Map(
  detectDecoupling(run.splits).map((flag) => [flag.km, flag]),
);

// Reported effort drives colour: cool blue when the runner says it is easy,
// accent orange as they report it getting hard.
const effortColor = (effort) => {
  const easy = new THREE.Color(0x3aa0ff);
  const hard = new THREE.Color(0xff5c30);
  return easy.clone().lerp(hard, THREE.MathUtils.clamp((effort - 2) / 6, 0, 1));
};

// Desaturating the run is the whole point of the gate: standing still drains the
// colour out of the evidence you are trying to talk over.
const desaturate = (color) => {
  const grey = color.getHSL({ h: 0, s: 0, l: 0 }).l * 0.75;
  return new THREE.Color(grey, grey, grey);
};

export default function Ribbon({ locked = false }) {
  const mountRef = useRef(null);
  const anchorRef = useRef(null);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  // `active` is the segment the card is showing; `pinned` is whether a tap has
  // held it there and turned the camera onto it.
  const [active, setActive] = useState(null);
  const [pinned, setPinned] = useState(false);
  const activeRef = useRef(null);
  activeRef.current = active;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.set(0.22, HOME_ROTATION_Y, 0);
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

      segments.push({
        mesh: segment,
        material,
        base,
        grey: desaturate(base),
        height,
      });
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
      const drained = lockedRef.current;
      segments.forEach((segment, index) => {
        const distance = Math.abs(head - index);
        const glow = Math.max(0, 1 - distance / 2.5);
        segment.material.color
          .copy(drained ? segment.grey : segment.base)
          .lerp(highlight, glow * (still || drained ? 0 : 0.75));
      });

      // The card tracks its segment in screen space every frame, so it stays
      // glued to the kilometre while the camera turns.
      const anchor = anchorRef.current;
      const index = activeRef.current;
      if (anchor && index !== null && segments[index]) {
        const target = segments[index].mesh;
        const point = new THREE.Vector3(0, segments[index].height / 2, 0);
        target.localToWorld(point);
        point.project(camera);
        const { clientWidth, clientHeight } = mount;
        anchor.style.transform = `translate3d(${((point.x + 1) / 2) * clientWidth}px, ${((1 - point.y) / 2) * clientHeight}px, 0)`;
      }

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
      home = distance + SEGMENT_DEPTH * 2;
      const held = pinnedIndex !== null;
      camera.position.set(
        held ? segments[pinnedIndex].mesh.position.x * 0.6 : 0,
        0,
        held ? home * FOCUS_ZOOM : home,
      );
      camera.lookAt(0, 0, 0);
    };

    // Clicking a kilometre turns the run towards it and pulls the camera in;
    // clicking again lets it go back to rolling.
    let pinnedIndex = null;
    let home = 0;
    const turn = (index) => {
      pinnedIndex = index;
      const held = index !== null;
      gsap.to(camera.position, {
        x: held ? segments[index].mesh.position.x * 0.6 : 0,
        z: held ? home * FOCUS_ZOOM : home,
        duration: 0.7,
        ease: "power3.inOut",
        onUpdate: () => camera.lookAt(0, 0, 0),
      });
      gsap.to(group.rotation, {
        y: held ? FOCUS_ROTATION_Y : HOME_ROTATION_Y,
        duration: 0.7,
        ease: "power3.inOut",
      });
    };

    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const meshes = segments.map((segment) => segment.mesh);

    const hit = (event) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const first = raycaster.intersectObjects(meshes, false)[0];
      return first ? meshes.indexOf(first.object) : null;
    };

    const onMove = (event) => {
      if (pinnedIndex !== null) return;
      const index = hit(event);
      if (index !== null || activeRef.current !== null) setActive(index);
    };

    const onLeave = () => {
      if (pinnedIndex === null) setActive(null);
    };

    const onClick = (event) => {
      const index = hit(event);
      if (index === null) {
        setPinned(false);
        setActive(null);
        turn(null);
        return;
      }
      if (index === pinnedIndex) {
        setPinned(false);
        turn(null);
        return;
      }
      setActive(index);
      setPinned(true);
      turn(index);
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);

    resize();
    animate();

    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
      gsap.killTweensOf([camera.position, group.rotation]);
      canvas.remove();
      renderer.dispose();
      disposables.forEach((item) => item.dispose());
    };
  }, []);

  const split = active === null ? null : run.splits[active];

  return (
    <div className="ribbon" ref={mountRef}>
      <div className="km-anchor" ref={anchorRef}>
        {split ? (
          <KmCard
            split={split}
            flag={flagsByKm.get(split.km) ?? null}
            pinned={pinned}
          />
        ) : null}
      </div>
    </div>
  );
}
