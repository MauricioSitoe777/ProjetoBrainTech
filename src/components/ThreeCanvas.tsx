import { useEffect, useRef } from "react";

/**
 * Full-bleed Three.js canvas rendered as an absolute background layer.
 * Renders animated wireframe torus rings, a golden particle field, and a
 * perspective grid — all on a transparent WebGL context.
 */
export default function ThreeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let THREE: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scene: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let camera: any;
    let animId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const particles: { mesh: any; rx: number; ry: number }[] = [];
    let cleanupResize: (() => void) | undefined;

    const init = async () => {
      THREE = await import("https://esm.sh/three@0.161.0" as string);

      if (!mountEl) return;
      const W = mountEl.clientWidth;
      const H = mountEl.clientHeight;

      scene  = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
      camera.position.set(0, 0, 40);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mountEl.appendChild(renderer.domElement);

      // Floating wireframe torus rings
      const ringColors = [0xe8b84b, 0xd4401a, 0xffffff];
      for (let i = 0; i < 6; i++) {
        const geo = new THREE.TorusGeometry(6 + i * 2.5, 0.04, 8, 80);
        const mat = new THREE.MeshBasicMaterial({
          color: ringColors[i % 3],
          transparent: true,
          opacity: 0.07 + i * 0.02,
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.rotation.x = Math.random() * Math.PI;
        ring.rotation.y = Math.random() * Math.PI;
        ring.position.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10
        );
        scene.add(ring);
        particles.push({
          mesh: ring,
          rx: 0.002 + Math.random() * 0.003,
          ry: 0.001 + Math.random() * 0.002,
        });
      }

      // Golden particle dot field
      const dotGeo = new THREE.BufferGeometry();
      const count  = 800;
      const pos    = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 120;
      dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const dotMat = new THREE.PointsMaterial({
        color: 0xe8b84b,
        size: 0.12,
        transparent: true,
        opacity: 0.4,
      });
      scene.add(new THREE.Points(dotGeo, dotMat));

      // Perspective grid floor
      const gridHelper = new THREE.GridHelper(80, 30, 0x333333, 0x1a1a1a);
      gridHelper.position.y          = -18;
      gridHelper.material.opacity    = 0.35;
      gridHelper.material.transparent = true;
      scene.add(gridHelper);

      const handleResize = () => {
        if (!mountEl) return;
        const nW = mountEl.clientWidth;
        const nH = mountEl.clientHeight;
        camera.aspect = nW / nH;
        camera.updateProjectionMatrix();
        renderer.setSize(nW, nH);
      };
      window.addEventListener("resize", handleResize);
      cleanupResize = () => window.removeEventListener("resize", handleResize);

      const animate = () => {
        animId = requestAnimationFrame(animate);
        particles.forEach((p) => {
          p.mesh.rotation.x += p.rx;
          p.mesh.rotation.y += p.ry;
        });
        renderer.render(scene, camera);
      };
      animate();
    };

    init();

    return () => {
      cancelAnimationFrame(animId);
      cleanupResize?.();
      if (renderer) renderer.dispose();
      if (mountEl && renderer?.domElement) {
        try { mountEl.removeChild(renderer.domElement); } catch { /* ignore */ }
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}
