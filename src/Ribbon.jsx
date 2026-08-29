// The ribbon. One block per kilometre, standing on a rail, with the ghost of
// the runner's own first kilometre lying flat behind it.
//
//   height  how slow that kilometre was, floor at the fastest kilometre of
//           this run and full height at the slowest
//   colour  the effort called out loud, blue at 1 and orange at 10
//   cap     a flagged kilometre: one run slower while the reported effort held
//
// It is drawn with three directly rather than a renderer binding, because
// @react-three/fiber is not a dependency of this project and adding one for a
// single scene is a build failure waiting for the morning of the demo.
//
// Nothing here autoplays. It paints settled on first render and only draws
// again when a reader turns it, picks a kilometre, or the gate locks. That is
// also why there is no animation loop burning frames on a phone.

import { Component, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import KmCard from "./KmCard.jsx";
import RibbonFallback from "./RibbonFallback.jsx";
import { run } from "./run.js";
import {
  cleanSplits,
  describe,
  effortHex,
  flagsFor,
  heightsFor,
  paceLabel,
  ghostGap,
} from "./summary.js";

const SPAN = 9.4; // world units the whole run tries to occupy
const GAP = 0.07;
const DEPTH = 1.1;
const MIN_WIDTH = 0.12;
const MAX_WIDTH = 1.4;
const FLOOR = 0.55; // the fastest kilometre in the run
const RISE = 3.1; // added at the slowest kilometre in the run
const CAP = 0.1;
const RAIL = 0.13;
const TILT = 0.2;
const HOME_TURN = -0.42;
const TURN_LIMIT = 0.55; // how far a drag may swing it either way
const GHOST_Z = -DEPTH * 1.05;
const DRAG_SLOP = 6; // px of movement below which a drag counts as a tap

const GREY = new THREE.Color(0x8d9aa7);
const WHITE = new THREE.Color(0xffffff);

function hasWebGL() {
  if (typeof document === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
}

class RibbonBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (typeof console !== "undefined" && console.error) {
      console.error("Ribbon fell back to the 2D strip.", error);
    }
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function Stage({ rows, flags, locked, onPick, selected }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !rows.length) return undefined;

    let renderer = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setLost(true);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const canvas = renderer.domElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 200);
    const group = new THREE.Group();
    group.rotation.set(TILT, HOME_TURN, 0);
    scene.add(group);

    const flagged = new Set(flags.map((flag) => flag.km));
    const heights = heightsFor(rows);
    const width = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, SPAN / rows.length - GAP),
    );
    const spanX = rows.length * width + (rows.length - 1) * GAP;
    const disposables = [];
    const blocks = [];

    rows.forEach((row, index) => {
      const height = FLOOR + heights.norm[index] * RISE;
      const geometry = new THREE.BoxGeometry(width, height, DEPTH);
      const base = new THREE.Color(effortHex(row.effort));
      const material = new THREE.MeshBasicMaterial({ color: base.clone() });
      const mesh = new THREE.Mesh(geometry, material);
      const x = -spanX / 2 + width / 2 + index * (width + GAP);
      mesh.position.set(x, height / 2, 0);
      group.add(mesh);
      disposables.push(geometry, material);

      // Only a flagged kilometre is capped. If everything is marked, nothing
      // is marked, and the caps are the whole point of the screen.
      if (flagged.has(row.km)) {
        const capGeometry = new THREE.BoxGeometry(width * 0.98, CAP, DEPTH);
        const capMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.set(x, height + CAP / 2 + 0.03, 0);
        group.add(cap);
        disposables.push(capGeometry, capMaterial);
      }

      blocks.push({ km: row.km, mesh, material, base, height, x });
    });

    // The ghost: the same run if the first kilometre's pace had held. Flat by
    // definition, so the real run's tall late kilometres read as the cost of
    // drifting off it.
    const ghostHeight =
      FLOOR +
      (heights.spread > 0
        ? (rows[0].pace - heights.fastest) / heights.spread
        : 0) *
        RISE;
    const ghostGeometry = new THREE.BoxGeometry(spanX, ghostHeight, DEPTH);
    const ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0x8fb8ff,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
    ghost.position.set(0, ghostHeight / 2, GHOST_Z);
    group.add(ghost);
    const ghostEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(ghostGeometry),
      new THREE.LineBasicMaterial({
        color: 0x8fb8ff,
        transparent: true,
        opacity: 0.38,
      }),
    );
    ghostEdges.position.copy(ghost.position);
    group.add(ghostEdges);
    disposables.push(
      ghostGeometry,
      ghostMaterial,
      ghostEdges.geometry,
      ghostEdges.material,
    );

    const railGeometry = new THREE.BoxGeometry(spanX + GAP, RAIL, DEPTH * 1.06);
    const railMaterial = new THREE.MeshBasicMaterial({ color: 0x232a34 });
    const rail = new THREE.Mesh(railGeometry, railMaterial);
    rail.position.set(0, -RAIL / 2, 0);
    group.add(rail);
    disposables.push(railGeometry, railMaterial);

    const tallest = blocks.reduce(
      (top, block) => Math.max(top, block.height),
      ghostHeight,
    );
    group.position.y = -tallest / 2;

    let drained = locked;
    let picked = selected;

    const tint = () => {
      blocks.forEach((block) => {
        const target = drained ? GREY : block.base;
        block.material.color.copy(target);
        if (!drained && picked === block.km) {
          block.material.color.lerp(WHITE, 0.38);
        }
      });
    };

    const draw = () => {
      tint();
      renderer.render(scene, camera);
    };

    const frame = () => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);

      // Frame the whole run at whatever shape the viewport is, including a
      // phone held upright, and frame the widest it gets across the full turn
      // range rather than the width it happens to have right now.
      const vfov = THREE.MathUtils.degToRad(camera.fov);
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      let widest = 0;
      for (let stepIndex = 0; stepIndex <= 8; stepIndex += 1) {
        const angle =
          HOME_TURN - TURN_LIMIT + (stepIndex / 8) * TURN_LIMIT * 2;
        widest = Math.max(
          widest,
          Math.abs(spanX * Math.cos(angle)) + Math.abs(DEPTH * Math.sin(angle)),
        );
      }
      const distance = Math.max(
        (widest * 1.06) / 2 / Math.tan(hfov / 2),
        (tallest * 1.2) / 2 / Math.tan(vfov / 2),
      );
      camera.position.set(0, 0, distance + DEPTH);
      camera.lookAt(0, 0, 0);
      draw();
    };

    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const meshes = blocks.map((block) => block.mesh);

    const hit = (event) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const first = raycaster.intersectObjects(meshes, false)[0];
      if (!first) return null;
      const index = meshes.indexOf(first.object);
      return index < 0 ? null : blocks[index].km;
    };

    // Drag turns it. A press that goes nowhere picks the kilometre under the
    // finger. Both draw once, on release, so nothing runs on its own.
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startTurn = HOME_TURN;
    let moved = 0;

    const onDown = (event) => {
      dragging = true;
      moved = 0;
      startX = event.clientX;
      startY = event.clientY;
      startTurn = group.rotation.y;
      canvas.setPointerCapture(event.pointerId);
    };

    const onMove = (event) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      if (moved < DRAG_SLOP) return;
      group.rotation.y = Math.max(
        HOME_TURN - TURN_LIMIT,
        Math.min(HOME_TURN + TURN_LIMIT, startTurn + dx * 0.005),
      );
      draw();
    };

    const onUp = (event) => {
      if (!dragging) return;
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (moved < DRAG_SLOP) onPick(hit(event));
    };

    const onContextLost = (event) => {
      event.preventDefault();
      setLost(true);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("webglcontextlost", onContextLost);

    frame();

    const observer = new ResizeObserver(frame);
    observer.observe(mount);

    apiRef.current = {
      setLocked(next) {
        drained = next;
        draw();
      },
      setSelected(next) {
        picked = next;
        draw();
      },
    };

    return () => {
      apiRef.current = null;
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.remove();
      renderer.dispose();
      disposables.forEach((item) => item.dispose());
    };
    // onPick is stable, and locked and selected are pushed in through the api
    // below rather than rebuilding the scene every time one of them changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, flags]);

  useEffect(() => {
    if (apiRef.current) apiRef.current.setLocked(locked);
  }, [locked]);

  useEffect(() => {
    if (apiRef.current) apiRef.current.setSelected(selected);
  }, [selected]);

  if (lost) return <RibbonFallback splits={rows} flags={flags} locked={locked} />;

  return <div className="ribbon-gl" ref={mountRef} />;
}

export default function Ribbon({
  splits = run.splits,
  flags,
  locked = false,
  className = "ribbon",
}) {
  const rows = useMemo(() => cleanSplits(splits), [splits]);
  const marks = useMemo(
    () => (flags ? flags : flagsFor(rows)),
    [flags, rows],
  );
  const flagged = useMemo(
    () => new Set(marks.map((flag) => flag.km)),
    [marks],
  );
  const [supported] = useState(hasWebGL);
  const [selected, setSelected] = useState(null);

  const behind = useMemo(() => ghostGap(rows), [rows]);
  const split = rows.find((row) => row.km === selected) || null;
  const flag = marks.find((item) => item.km === selected) || null;

  // No kilometres yet is not an error state and gets no placeholder art.
  if (!rows.length) return null;

  const strip = (
    <RibbonFallback
      splits={rows}
      flags={marks}
      locked={locked}
      className={className}
    />
  );

  if (!supported) return strip;

  const onKeyDown = (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = rows.findIndex((row) => row.km === selected);
    const next =
      current === -1
        ? 0
        : Math.min(
            rows.length - 1,
            Math.max(0, current + (event.key === "ArrowRight" ? 1 : -1)),
          );
    setSelected(rows[next].km);
  };

  return (
    <RibbonBoundary fallback={strip}>
      <div
        className={className}
        tabIndex={0}
        role="group"
        aria-label="The run as blocks, one for each kilometre. Use the left and right arrow keys to read a kilometre."
        onKeyDown={onKeyDown}
      >
        <Stage
          rows={rows}
          flags={marks}
          locked={locked}
          selected={selected}
          onPick={setSelected}
        />

        {rows.length > 1 ? (
          <p className="plate ghost-gap">
            <span className="plate-label">Behind the ghost of km 1</span>
            <span className="ghost-gap-value">{paceLabel(behind)}</span>
          </p>
        ) : null}

        {split ? (
          <div className="ribbon-card">
            <KmCard split={split} flag={flag} pinned={false} />
            <button
              className="ribbon-close"
              type="button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        ) : null}

        <p className="sr-only">{describe(rows, flagged)}</p>
      </div>
    </RibbonBoundary>
  );
}
