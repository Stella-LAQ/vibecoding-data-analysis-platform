import { useEffect, useRef } from "react";
import * as THREE from "three";

class SimplexNoise {
  p: Uint8Array;
  perm: Uint8Array;
  grad3 = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [1, 0], [-1, 0],
    [0, 1], [0, -1], [0, 1], [0, -1],
  ];

  constructor() {
    this.p = new Uint8Array(512);
    this.perm = new Uint8Array(512);
    const p = new Uint8Array([
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
    ]);
    for (let i = 0; i < 256; i++) this.p[i] = p[i];
    for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - i + t;
    const y0 = yin - j + t;
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x12_0 = x0 - i1 + G2;
    const y12_0 = y0 - j1 + G2;
    const x3 = x0 - 1 + 2 * G2;
    const y3 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let t1 = 0.5 - x12_0 * x12_0 - y12_0 * y12_0;
    let t2 = 0.5 - x3 * x3 - y3 * y3;
    let n0 = 0, n1 = 0, n2 = 0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * (this.grad3[gi0][0] * x0 + this.grad3[gi0][1] * y0); }
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * (this.grad3[gi1][0] * x12_0 + this.grad3[gi1][1] * y12_0); }
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * (this.grad3[gi2][0] * x3 + this.grad3[gi2][1] * y3); }
    return 70 * (n0 + n1 + n2);
  }
}

interface TrailPoint {
  progress: number;
  speed: number;
  offset: THREE.Vector3;
  freq: number;
  amp: number;
  radius: number;
  numPoints: number;
  history: THREE.Vector3[];
}

interface NoteParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
}

export default function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ====== TrailBackground class implementation ======
    let time = 0;
    const speed = 0.5;
    const mouse = { x: 0.87, y: 0.6, tx: 0.87, ty: 0.6 };
    const noise = new SimplexNoise();
    const NOTE_COLORS = ["#6C5CE7", "#00E5FF", "#00C9A7"];
    const NOTE_LIFETIME = 3;
    const clock = new THREE.Clock();
    let width = window.innerWidth;
    let height = window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);

    // Background sphere
    const sphereGeo = new THREE.SphereGeometry(10, 64, 64);
    const sphereMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color("#0A0A12") },
        uColor2: { value: new THREE.Color("#14142B") },
        uColor3: { value: new THREE.Color("#2D2D44") },
        uNoiseStrength: { value: 0.6 },
        uColorIntensity: { value: 1.2 },
        uMotionSpeed: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uNoiseStrength;
        uniform float uColorIntensity;
        uniform float uMotionSpeed;
        varying vec2 vUv;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289v2(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          float slow = snoise(vUv * 2.0 + uTime * 0.1 * uMotionSpeed);
          float medium = snoise(vUv * 5.0 - uTime * 0.2 * uMotionSpeed);
          float noiseVal = slow * 0.6 + medium * 0.4;
          vec3 color = mix(uColor1, uColor2, vUv.y + noiseVal * uNoiseStrength);
          color = mix(color, uColor3, noiseVal * 0.3);
          color *= (1.0 - length(vUv - 0.5) * 0.5);
          gl_FragColor = vec4(color * uColorIntensity, 1.0);
        }
      `,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // Stars
    function createStars(count: number, radius: number, size: number, color: number) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
      }
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity: 0.7 });
      return new THREE.Points(geo, mat);
    }

    scene.add(createStars(2000, 20, 0.05, 0xFFFFFF));
    scene.add(createStars(1500, 25, 0.08, 0xE0E0FF));
    scene.add(createStars(1000, 30, 0.06, 0xA0A0FF));

    // Trails
    const trailGroup = new THREE.Group();

    const trailPoints: TrailPoint[] = [];
    for (let i = 0; i < 20; i++) {
      trailPoints.push({
        progress: Math.random(),
        speed: 0.04 + Math.random() * 0.04,
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 5
        ),
        freq: 0.8 + Math.random(),
        amp: 0.2 + Math.random() * 0.3,
        radius: 4 + Math.random() * 3,
        numPoints: 100,
        history: [],
      });
    }

    // Trail lines
    const trailLineGeo = new THREE.BufferGeometry();
    const trailLineMat = new THREE.LineBasicMaterial({
      color: "#6C5CE7", transparent: true, opacity: 0.15, depthWrite: false,
    });
    const trailLine = new THREE.Line(trailLineGeo, trailLineMat);
    trailGroup.add(trailLine);

    const trailLine2Geo = new THREE.BufferGeometry();
    const trailLine2Mat = new THREE.LineBasicMaterial({
      color: "#00E5FF", transparent: true, opacity: 0.1, depthWrite: false,
    });
    const trailLine2 = new THREE.Line(trailLine2Geo, trailLine2Mat);
    trailGroup.add(trailLine2);

    scene.add(trailGroup);

    // Note particles
    const activeNotes: NoteParticle[] = [];
    let noteSpawnAccum = 0;

    function spawnNote() {
      noteSpawnAccum = 0;
      const geo = new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 8, 8);
      const col = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      );
      mesh.position.copy(pos);
      scene.add(mesh);
      activeNotes.push({
        position: pos,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02),
        color: col,
        life: 0,
        maxLife: NOTE_LIFETIME,
        mesh,
      });
    }

    // Camera setup
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);

    // Post processing (simple pass-through)
    const composer = {
      readBuffer: new THREE.WebGLRenderTarget(width, height),
      writeBuffer: new THREE.WebGLRenderTarget(width, height),
      render: (r: THREE.WebGLRenderer, s: THREE.Scene, c: THREE.PerspectiveCamera) => {
        r.setRenderTarget(composer.readBuffer);
        r.clear();
        r.render(s, c);
        r.setRenderTarget(null);
      },
    };

    // Event handlers
    const onMouseMove = (e: MouseEvent) => {
      const qx = Math.round(e.clientX / width * 4) / 4;
      const qy = Math.round(e.clientY / height * 4) / 4;
      mouse.tx = qx;
      mouse.ty = qy;
    };

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.readBuffer.setSize(width, height);
      composer.writeBuffer.setSize(width, height);
    };

    const onClick = () => spawnNote();
    const onDblClick = () => spawnNote();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDblClick);

    let rafId: number;

    function updateTrails(dt: number) {
      const dtd = dt * 0.15 * speed;
      const allPositions: THREE.Vector3[] = [];

      for (let i = 0; i < trailPoints.length; i++) {
        const tp = trailPoints[i];
        const t = (tp.progress + dtd) % 1;
        tp.progress = t;

        const angle = t * Math.PI * 2;
        let px = Math.cos(angle) * tp.radius;
        let py = Math.sin(angle * 2) * tp.amp;
        let pz = Math.sin(angle) * tp.radius;

        py += noise.noise2D(t * tp.freq + tp.offset.x, time * 0.1) * 0.5;
        pz += noise.noise2D(t * tp.freq + tp.offset.y, time * 0.1 + 100) * 0.5;
        px += Math.sin(t * 4 + tp.offset.z) * 0.5;

        const headPos = new THREE.Vector3(px, py, pz).add(tp.offset);
        tp.history.unshift(headPos);
        if (tp.history.length > tp.numPoints) tp.history.pop();

        allPositions.push(...tp.history);
      }

      // Update trail lines
      if (allPositions.length > 1) {
        const positions = new Float32Array(allPositions.length * 3);
        for (let i = 0; i < allPositions.length; i++) {
          positions[i * 3] = allPositions[i].x;
          positions[i * 3 + 1] = allPositions[i].y;
          positions[i * 3 + 2] = allPositions[i].z;
        }
        trailLineGeo.setAttribute("position", new THREE.BufferAttribute(positions.slice(0, Math.floor(positions.length / 2) * 3), 3));
        trailLine2Geo.setAttribute("position", new THREE.BufferAttribute(positions.slice(Math.floor(positions.length / 2) * 3), 3));
        trailLineGeo.attributes.position.needsUpdate = true;
        trailLine2Geo.attributes.position.needsUpdate = true;
      }
    }

    function updateNotes(dt: number) {
      noteSpawnAccum += dt;
      if (noteSpawnAccum > 1.5) spawnNote();

      for (let i = activeNotes.length - 1; i >= 0; i--) {
        const note = activeNotes[i];
        note.life += dt;
        note.position.add(note.velocity);
        note.mesh.position.copy(note.position);
        const alpha = 1 - note.life / note.maxLife;
        (note.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.8;
        if (note.life >= note.maxLife) {
          scene.remove(note.mesh);
          (note.mesh.geometry as THREE.SphereGeometry).dispose();
          (note.mesh.material as THREE.MeshBasicMaterial).dispose();
          activeNotes.splice(i, 1);
        }
      }
    }

    function animate() {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      time += dt * speed;

      // Mouse lerp
      mouse.x += (mouse.tx - mouse.x) * (1 - Math.pow(0.012, dt));
      mouse.y += (mouse.ty - mouse.y) * (1 - Math.pow(0.012, dt));

      // Camera
      const mouseAngleX = (mouse.y - 0.5) * 0.3;
      const mouseAngleY = (mouse.x - 0.5) * 0.3;
      const camPos = new THREE.Vector3(0, 0, 3);
      camPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), mouseAngleX);
      camPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseAngleY);
      camPos.add(new THREE.Vector3((mouse.x - 0.5) * 0.2, (mouse.y - 0.5) * 0.2, 0));
      camera.position.copy(camPos);
      camera.lookAt(0, 0, 0);

      updateTrails(dt);
      updateNotes(dt);

      // Background
      sphereMat.uniforms.uTime.value = time;

      // Render
      composer.render(renderer, scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", onDblClick);
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      trailLineGeo.dispose();
      trailLineMat.dispose();
      trailLine2Geo.dispose();
      trailLine2Mat.dispose();
      composer.readBuffer.dispose();
      composer.writeBuffer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "auto",
      }}
    />
  );
}
