import { useEffect, useRef } from "react";
import * as THREE from "three";

// FIRST PERSON GHOST, ON A PARK PATH
//
// You are the camera. The ghost is a translucent runner on the path ahead, and
// the only thing that moves it is the real gap in seconds. Once you pass it,
// the camera turns and you watch it behind you.
//
// The scenery is PROCEDURAL and stylised: a tarmac path, grass, trees, and a
// stadium bowl on the horizon. It is built to read as an urban park, not to be
// a photograph of one, and nothing here is a map or a real location claim.

const PATH_W = 3.6;
const FAR = 260;
const METRES_PER_SECOND = 3.2;

const mmss = (s) => {
  if (!Number.isFinite(s)) return "0:00";
  const w = Math.round(s);
  return Math.floor(w / 60) + ":" + String(w % 60).padStart(2, "0");
};

export default function GhostView({
  gapSeconds = 0,
  zoneColour = "#3AA0FF",
  running = false,
  ghostPace = null,
  yourPace = null,
  distanceKm = null,
}) {
  const mountRef = useRef(null);
  const gapRef = useRef(gapSeconds);
  gapRef.current = gapSeconds;
  const colourRef = useRef(zoneColour);
  colourRef.current = zoneColour;
  const runRef = useRef(running);
  runRef.current = running;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let renderer;
    let frame = 0;
    const bin = [];

    try {
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0xdfe6ea, 60, 230);

      const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 600);
      camera.position.set(0, 1.62, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      const add = (geo, mat, x, y, z, parent) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        (parent || scene).add(m);
        return m;
      };

      // Grass, either side of the path.
      const grassGeo = new THREE.PlaneGeometry(200, FAR + 60);
      const grassMat = new THREE.MeshBasicMaterial({ color: 0x8fae74 });
      const grass = add(grassGeo, grassMat, 0, -0.02, -FAR / 2 + 20);
      grass.rotation.x = -Math.PI / 2;
      bin.push(grassGeo, grassMat);

      // The path itself.
      const pathGeo = new THREE.PlaneGeometry(PATH_W, FAR + 60);
      const pathMat = new THREE.MeshBasicMaterial({ color: 0x9a9287 });
      const path = add(pathGeo, pathMat, 0, 0, -FAR / 2 + 20);
      path.rotation.x = -Math.PI / 2;
      bin.push(pathGeo, pathMat);

      // Trees. One trunk geometry and one canopy geometry, reused, scattered
      // deterministically so the scene is identical every load.
      const trunkGeo = new THREE.CylinderGeometry(0.16, 0.22, 3.2, 6);
      const trunkMat = new THREE.MeshBasicMaterial({ color: 0x6b5642 });
      const leafGeo = new THREE.SphereGeometry(1.5, 8, 6);
      const leafMats = [0x5f8a4e, 0x6f9a58, 0x547d46].map(
        (c) => new THREE.MeshBasicMaterial({ color: c }),
      );
      bin.push(trunkGeo, trunkMat, leafGeo, ...leafMats);

      const trees = new THREE.Group();
      scene.add(trees);
      for (let i = 0; i < 34; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const z = -6 - i * 7.4;
        const x = side * (PATH_W / 2 + 2.4 + ((i * 37) % 9));
        const t = add(trunkGeo, trunkMat, x, 1.6, z, trees);
        const scale = 0.85 + ((i * 13) % 5) / 8;
        t.scale.setScalar(scale);
        const canopy = add(leafGeo, leafMats[i % 3], x, 3.4 * scale, z, trees);
        canopy.scale.set(scale, scale * 0.9, scale);
      }

      // The stadium bowl on the horizon, and a couple of towers, so the skyline
      // reads as this park rather than as anywhere.
      const bowlGeo = new THREE.CylinderGeometry(30, 34, 13, 26, 1, true);
      const bowlMat = new THREE.MeshBasicMaterial({
        color: 0xcfd6da,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });
      add(bowlGeo, bowlMat, -26, 6.5, -215);
      bin.push(bowlGeo, bowlMat);

      const towerGeo = new THREE.BoxGeometry(7, 34, 7);
      const towerMat = new THREE.MeshBasicMaterial({ color: 0xc3ccd2 });
      add(towerGeo, towerMat, 34, 17, -222);
      add(towerGeo, towerMat, 48, 12, -234).scale.set(0.8, 0.7, 0.8);
      bin.push(towerGeo, towerMat);

      // A red loop sculpture on the skyline, which is what you actually see
      // from that park. Stylised, not a model of it.
      const archGeo = new THREE.TorusGeometry(9, 0.5, 8, 30, Math.PI * 1.5);
      const archMat = new THREE.MeshBasicMaterial({ color: 0xb04532 });
      const arch = add(archGeo, archMat, 14, 12, -205);
      arch.rotation.set(0.2, 0.5, 0.4);
      bin.push(archGeo, archMat);

      // ── THE GHOST ────────────────────────────────────────────────────
      const ghost = new THREE.Group();
      const gMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colourRef.current),
        transparent: true,
        opacity: 0.55,
      });
      bin.push(gMat);

      const torsoGeo = new THREE.CapsuleGeometry(0.24, 0.66, 6, 12);
      const headGeo = new THREE.SphereGeometry(0.18, 16, 12);
      const thighGeo = new THREE.CapsuleGeometry(0.095, 0.4, 4, 8);
      const shinGeo = new THREE.CapsuleGeometry(0.075, 0.4, 4, 8);
      const armGeo = new THREE.CapsuleGeometry(0.07, 0.34, 4, 8);
      bin.push(torsoGeo, headGeo, thighGeo, shinGeo, armGeo);

      const torso = add(torsoGeo, gMat, 0, 1.12, 0, ghost);
      add(headGeo, gMat, 0, 1.72, 0.04, ghost);

      // Hip and shoulder pivots, so the limbs swing from the right place and
      // the knee bends instead of the whole leg rotating like a stick.
      const mkLeg = (x) => {
        const hip = new THREE.Group();
        hip.position.set(x, 0.86, 0);
        const thigh = add(thighGeo, gMat, 0, -0.22, 0, hip);
        const knee = new THREE.Group();
        knee.position.set(0, -0.44, 0);
        add(shinGeo, gMat, 0, -0.22, 0, knee);
        hip.add(knee);
        ghost.add(hip);
        return { hip, knee, thigh };
      };
      const mkArm = (x) => {
        const sh = new THREE.Group();
        sh.position.set(x, 1.42, 0);
        add(armGeo, gMat, 0, -0.2, 0, sh);
        const el = new THREE.Group();
        el.position.set(0, -0.38, 0);
        add(armGeo, gMat, 0, -0.16, 0.06, el).scale.setScalar(0.85);
        sh.add(el);
        ghost.add(sh);
        return { sh, el };
      };

      const legL = mkLeg(-0.13);
      const legR = mkLeg(0.13);
      const armL = mkArm(-0.3);
      const armR = mkArm(0.3);

      const haloGeo = new THREE.SphereGeometry(0.9, 16, 12);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colourRef.current),
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = add(haloGeo, haloMat, 0, 1.05, 0, ghost);
      halo.scale.set(1, 1.55, 1);
      bin.push(haloGeo, haloMat);

      scene.add(ghost);

      const resize = () => {
        const w = mount.clientWidth || 340;
        const h = mount.clientHeight || 300;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      let t = 0;
      let bob = 0;
      const tick = () => {
        const live = runRef.current;
        t += live ? 0.03 : 0.012;
        const gap = gapRef.current;
        const ahead = gap >= 0;

        const target = Math.min(95, Math.abs(gap) * METRES_PER_SECOND + 7);
        ghost.position.z = THREE.MathUtils.lerp(ghost.position.z, ahead ? -target : target, 0.05);
        // Behind it you see its back; once past it you turn and it faces you.
        ghost.rotation.y = ahead ? Math.PI : 0;
        camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, ahead ? 0 : Math.PI, 0.06);

        // The gait. Thighs swing opposed, knees flex on the recovery leg, arms
        // counter the legs, and the torso leans forward and bobs on each step.
        const p = t * 8.2;
        const s = Math.sin(p);
        const c = Math.cos(p);
        legL.hip.rotation.x = s * 0.72;
        legR.hip.rotation.x = -s * 0.72;
        legL.knee.rotation.x = -Math.max(0, -s) * 1.25;
        legR.knee.rotation.x = -Math.max(0, s) * 1.25;
        armL.sh.rotation.x = -s * 0.62;
        armR.sh.rotation.x = s * 0.62;
        armL.el.rotation.x = -0.85;
        armR.el.rotation.x = -0.85;
        bob = Math.abs(c) * 0.05;
        torso.position.y = 1.12 + bob;
        torso.rotation.x = 0.12;
        ghost.position.y = bob * 0.4;

        gMat.color.set(colourRef.current);
        haloMat.color.set(colourRef.current);
        haloMat.opacity = 0.08 + Math.abs(Math.sin(t * 2)) * 0.05;

        // The world slides past while the run is live.
        if (live) {
          const speed = 0.42;
          trees.position.z = (trees.position.z + speed) % 7.4;
          path.position.z = (path.position.z + speed) % 8;
          grass.position.z = (grass.position.z + speed) % 8;
        }

        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(tick);
      };
      tick();

      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        bin.forEach((b) => b.dispose && b.dispose());
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    } catch {
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  const ahead = gapSeconds >= 0;
  const far = Math.abs(gapSeconds) > 25;

  return (
    <div className="gv">
      <div className="gv-sky" aria-hidden="true" />
      <div className="gv-canvas" ref={mountRef} aria-hidden="true" />
      <div className={ahead ? "gv-readout behind" : "gv-readout ahead"}>
        <span className="gv-num">{Math.abs(Math.round(gapSeconds))}s</span>
        <span className="gv-word">{ahead ? "behind the ghost" : "ahead of the ghost"}</span>
      </div>

      {(ghostPace != null || yourPace != null || distanceKm != null) && (
        <div className="gv-strip">
          <div>
            <span className="gv-s-val">{distanceKm != null ? distanceKm.toFixed(2) : "0.00"}</span>
            <span className="gv-s-lab">km</span>
          </div>
          <div>
            <span className="gv-s-val">{mmss(yourPace)}</span>
            <span className="gv-s-lab">your pace</span>
          </div>
          <div className="gv-s-ghost">
            <span className="gv-s-val">{mmss(ghostPace)}</span>
            <span className="gv-s-lab">ghost pace</span>
          </div>
        </div>
      )}
      {far && (
        <p className={ahead ? "gv-warn drop" : "gv-warn dash"}>
          {ahead
            ? "You are dropping off the ghost. Ease into the pace rather than chasing it back in one kilometre."
            : "You are well ahead of the ghost. That is a pace you have not been checked at yet, so take a reading."}
        </p>
      )}
    </div>
  );
}
