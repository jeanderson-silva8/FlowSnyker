import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

const vertexShader = `
  attribute float speed;
  uniform float time;
  uniform float movementSpeed;
  uniform float particleSize;
  varying float vAlpha;
  void main() {
    vec3 newPos = position;
    float t = time * speed * 0.006;
    float xDisp = sin(t + position.z * 0.001) * movementSpeed;
    float yDisp = cos(t + position.x * 0.001) * movementSpeed;
    newPos.xy += vec2(xDisp, yDisp) * 0.06;
    float vSize = particleSize * (250.0 / -newPos.z);
    float depthFactor = smoothstep(3500.0, 300.0, -newPos.z);
    vAlpha = 0.3 + depthFactor * 0.7;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    gl_PointSize = vSize;
  }
`;

const fragmentShader = `
  varying float vAlpha;
  uniform vec3 particleColor;
  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float r = length(xy);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, r) * vAlpha;
    gl_FragColor = vec4(particleColor, alpha * 0.85);
  }
`;

export default function BackgroundParticleField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const init = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    if (width === 0 || height === 0) return;

    const isMobile = width < 768;
    const particleCount = isMobile ? 1500 : width > 1400 ? 4000 : 2800;
    const connectionDistance = isMobile ? 90 : 120;
    const maxConnections = 220;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 200, 6000);
    camera.position.z = 1000;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
    } catch {
      container.style.background = 'radial-gradient(ellipse at 70% 50%, rgba(255,40,40,0.10) 0%, transparent 60%)';
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(renderer.domElement);

    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const depth = THREE.MathUtils.randFloat(300, 3500);
      positions[i * 3] = THREE.MathUtils.randFloatSpread(1) * camera.aspect * depth;
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(1) * depth;
      positions[i * 3 + 2] = -depth;
      speeds[i] = THREE.MathUtils.randFloat(6, 20);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        movementSpeed: { value: 10 },
        particleSize: { value: 90 },
        particleColor: { value: new THREE.Color(1.0, 0.22, 0.22) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const maxLineVertices = maxConnections * 2 * 3;
    const linePositions = new Float32Array(maxLineVertices);
    const lineColors = new Float32Array(maxLineVertices);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    lineGeometry.setDrawRange(0, 0);

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    let frameCount = 0;
    let animFrameId = 0;
    const clock = new THREE.Clock();

    const rebuildConnections = () => {
      let lineIdx = 0;
      const maxDist = connectionDistance;
      const maxDistSq = maxDist * maxDist;
      const limit = Math.min(particleCount, 700);
      for (let i = 0; i < limit && lineIdx < maxConnections; i++) {
        const ix = positions[i * 3], iy = positions[i * 3 + 1], iz = positions[i * 3 + 2];
        if (iz < -1500) continue;
        for (let j = i + 1; j < limit && lineIdx < maxConnections; j++) {
          const dx = ix - positions[j * 3];
          const dy = iy - positions[j * 3 + 1];
          const dz = iz - positions[j * 3 + 2];
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = 1.0 - dist / maxDist;
            const v = lineIdx * 6;
            linePositions[v] = ix; linePositions[v + 1] = iy; linePositions[v + 2] = iz;
            linePositions[v + 3] = positions[j * 3]; linePositions[v + 4] = positions[j * 3 + 1]; linePositions[v + 5] = positions[j * 3 + 2];
            const r = 1.0 * alpha, g = 0.18 * alpha, b = 0.18 * alpha;
            lineColors[v] = r; lineColors[v + 1] = g; lineColors[v + 2] = b;
            lineColors[v + 3] = r; lineColors[v + 4] = g; lineColors[v + 5] = b;
            lineIdx++;
          }
        }
      }
      lineGeometry.setDrawRange(0, lineIdx * 2);
      (lineGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (lineGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    };

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      frameCount++;
      material.uniforms.time.value = clock.getElapsedTime();
      if (frameCount % 6 === 0) rebuildConnections();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    cleanupRef.current = () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(init, 50);
    return () => { clearTimeout(t); cleanupRef.current?.(); };
  }, [init]);

  return (
    <div
      ref={containerRef}
      role="presentation"
      aria-hidden="true"
      className="bg-particle-field"
    />
  );
}
