import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import * as THREE from "three";
import KmCard from "./KmCard.jsx";
import { detectDecoupling } from "./decoupling.js";
import {
  cumulativeSeconds,
  distanceAt,
  ghostDistanceAt,
  ghostPace,
  secondsBehind,
  totalSeconds,
} from "./ghost.js";
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
// The whole run replays in this many seconds. Both runners are driven off the
// same compressed clock, so the pace difference between them stays true.
const REPLAY_SECONDS = 22;
const RUNNER_RADIUS = 0.16;
const GHOST_Z = -SEGMENT_DEPTH * 1.05;
const GAP_TWEEN = 0.3;

const flagsByKm = new Map(
  detectDecoupling(run.splits).map((flag) => [flag.km, flag]),
);

const marks = cumulativeSeconds(run.splits);
const pace = ghostPace(run.splits);
const total = totalSeconds(marks);

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

  // The gap counter is written straight into the DOM by a GSAP tween, so the
  // number counts up smoothly without re-rendering the scene every frame.
  const gapRef = useRef(null);
  const gapValueRef = useRef({ value: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const gap = gapValueRef.current;

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

    // The ghost ribbon: the same run if the first kilometre's pace had held. It
    // is flat by definition, translucent, and sits behind the real one so the
    // real run's tall late kilometres read as the cost of drifting off it.
    const ghostHeight = MIN_HEIGHT + (pace - fastest) * HEIGHT_PER_SECOND;
    const ghostGeometry = new THREE.BoxGeometry(
      SPAN,
      ghostHeight,
      SEGMENT_DEPTH,
    );
    const ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0x8fb8ff,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const ghostRibbon = new THREE.Mesh(ghostGeometry, ghostMaterial);
    ghostRibbon.position.set(0, ghostHeight / 2, GHOST_Z);
    group.add(ghostRibbon);

    const ghostEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(ghostGeometry),
      new THREE.LineBasicMaterial({
        color: 0x8fb8ff,
        transparent: true,
        opacity: 0.4,
      }),
    );
    ghostEdges.position.copy(ghostRibbon.position);
    group.add(ghostEdges);
    disposables.push(
      ghostGeometry,
      ghostMaterial,
      ghostEdges.geometry,
      ghostEdges.material,
    );

    // One glowing runner on each ribbon, both moving at their true speed.
    const runnerGeometry = new THREE.SphereGeometry(RUNNER_RADIUS, 20, 16);
    const makeRunner = (color, opacity) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
      });
      const mesh = new THREE.Mesh(runnerGeometry, material);
      const halo = new THREE.Mesh(
        runnerGeometry,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: opacity * 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      halo.scale.setScalar(2.1);
      mesh.add(halo);
      group.add(mesh);
      disposables.push(material, halo.material);
      return mesh;
    };

    const runner = makeRunner(0xffffff, 1);
    const ghostRunner = makeRunner(0x8fb8ff, 0.85);
    disposables.push(runnerGeometry);

    const kmToX = (km) => -SPAN / 2 + (km / run.splits.length) * SPAN;
    const topAt = (km) => {
      const index = Math.min(Math.floor(km), segments.length - 1);
      return segments[index].height;
    };

    const tallest = Math.max(
      ghostHeight,
      ...segments.map((segment) => segment.height),
    );
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

      // Both runners advance on one compressed clock, so the ghost pulling away
      // is the real pace difference and not an animation flourish.
      const raceSeconds = still
        ? total
        : ((elapsed / REPLAY_SECONDS) % 1.18) * total;
      const km = distanceAt(raceSeconds, marks);
      const ghostKm = Math.min(
        ghostDistanceAt(raceSeconds, pace),
        run.splits.length,
      );
      runner.position.set(kmToX(km), topAt(km) + RUNNER_RADIUS, 0);
      ghostRunner.position.set(
        kmToX(ghostKm),
        ghostHeight + RUNNER_RADIUS,
        GHOST_Z,
      );

      const behindNow = secondsBehind(raceSeconds, marks, pace);
      if (gapRef.current && Math.abs(behindNow - gap.value) > 0.5) {
        gsap.to(gap, {
          value: behindNow,
          duration: GAP_TWEEN,
          ease: "none",
          overwrite: true,
          onUpdate: () => {
            if (gapRef.current) {
              gapRef.current.textContent = Math.round(gap.value).toString();
            }
          },
        });
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
      // A margin on both axes, because a short stage frames the run tightly
      // enough that rounding alone clips the first and last kilometre.
      const spanX = (SPAN * Math.cos(group.rotation.y) + SEGMENT_DEPTH) * 1.12;
      const spanY = tallest * 1.14;
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
      gsap.killTweensOf([camera.position, group.rotation, gap]);
      canvas.remove();
      renderer.dispose();
      disposables.forEach((item) => item.dispose());
    };
  }, []);

  const split = active === null ? null : run.splits[active];

  return (
    <div className="ribbon" ref={mountRef}>
      <p className="plate ghost-gap">
        <span className="plate-label">Behind the ghost of km 1</span>
        <span className="ghost-gap-value">
          <span ref={gapRef}>0</span> s
        </span>
      </p>
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
