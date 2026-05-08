import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

/**
 * ParticleField — Otimizado para performance fluida
 * 
 * Diferenças vs protótipo /app:
 * - Sem MeshLine (era o maior gargalo de performance)
 * - Conexões renderizadas via THREE.LineSegments (GPU batch único)
 * - Rebuild de conexões a cada 5 frames (vs 3)
 * - Spatial grid para detecção de vizinhos O(n) vs O(n²)
 * - Partículas reduzidas para máximo 6000
 * - Pixel ratio limitado a 1.5
 */

const particleVertexShader = `
  attribute float speed;
  
  uniform float time;
  uniform vec2 mouse;
  uniform float mouseForce;
  uniform float mouseRadius;
  uniform float movementSpeed;
  uniform float particleSize;
  
  varying float vAlpha;
  
  void main() {
    vec3 newPos = position;
    
    // Mouse repulsion (suave)
    float dist = distance(newPos.xy, mouse);
    if (dist < mouseRadius) {
      float force = (1.0 - dist / mouseRadius) * mouseForce;
      force = force * force; // Ease quadrático para suavizar
      vec2 dir = normalize(newPos.xy - mouse);
      newPos.xy += dir * force;
    }
    
    // Movimento orgânico sutil
    float t = time * speed * 0.008;
    float xDisp = sin(t + position.z * 0.001) * movementSpeed;
    float yDisp = cos(t + position.x * 0.001) * movementSpeed;
    newPos.xy += vec2(xDisp, yDisp) * 0.08;
    
    // Tamanho baseado em profundidade
    float vSize = particleSize * (250.0 / -newPos.z);
    
    // Alpha baseado em profundidade
    float depthFactor = smoothstep(3500.0, 300.0, -newPos.z);
    vAlpha = 0.4 + depthFactor * 0.6;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    gl_PointSize = vSize;
  }
`;

const particleFragmentShader = `
  varying float vAlpha;
  uniform vec3 particleColor;
  
  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float r = length(xy);
    if (r > 0.5) discard;
    
    float alpha = smoothstep(0.5, 0.05, r) * vAlpha;
    gl_FragColor = vec4(particleColor, alpha * 0.7);
  }
`;

interface ParticleFieldProps {
  className?: string;
}

export default function ParticleField({ className }: ParticleFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const init = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth / 2;
    const height = container.clientHeight || window.innerHeight;
    if (width === 0 || height === 0) return;

    // Adaptação de partículas por performance
    const isMobile = width < 768;
    const particleCount = isMobile ? 2500 : width > 1200 ? 6000 : 4500;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 200, 6000);
    camera.position.z = 1000;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      });
    } catch {
      // Fallback: gradiente sutil para dispositivos sem WebGL
      container.style.background = 'radial-gradient(ellipse at 30% 50%, rgba(255,58,58,0.08) 0%, rgba(255,160,128,0.04) 40%, transparent 70%)';
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(renderer.domElement);

    // Gerar partículas
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    // Gaussian distribution: dense red cluster in the center, sparse edges
    const gaussian = () => {
      // Box-Muller transform → standard normal
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    for (let i = 0; i < particleCount; i++) {
      const depth = THREE.MathUtils.randFloat(400, 2800);
      // Spread: 0.22 keeps most particles in central cluster, tail reaches edges
      const spreadX = gaussian() * 0.22;
      const spreadY = gaussian() * 0.18;
      positions[i * 3] = spreadX * camera.aspect * depth;
      positions[i * 3 + 1] = spreadY * depth;
      positions[i * 3 + 2] = -depth;
      speeds[i] = THREE.MathUtils.randFloat(6, 22);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouse: { value: new THREE.Vector2(99999, 99999) },
        mouseForce: { value: 150 },
        mouseRadius: { value: 250 },
        movementSpeed: { value: 12 },
        particleSize: { value: 130 },
        particleColor: { value: new THREE.Color(1.0, 0.22, 0.28) }, // Red — additive blending creates white-hot core in dense areas
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // State
    const mouse3D = new THREE.Vector2(99999, 99999);
    let animFrameId = 0;
    const clock = new THREE.Clock();

    // Animation loop
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      material.uniforms.time.value = elapsed;
      material.uniforms.mouse.value.copy(mouse3D);
      renderer.render(scene, camera);
    };

    animate();

    // Mouse tracking (throttled via rAF)
    let mouseRafPending = false;
    const handleMouseMove = (e: MouseEvent) => {
      if (mouseRafPending) return;
      mouseRafPending = true;
      requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const vector = new THREE.Vector3(x, y, 0.5).unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));
        mouse3D.set(pos.x, pos.y);
        mouseRafPending = false;
      });
    };

    const handleMouseLeave = () => {
      mouse3D.set(99999, 99999);
    };

    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave);

    // Resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    cleanupRef.current = () => {
      cancelAnimationFrame(animFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(init, 50);
    return () => {
      clearTimeout(timer);
      cleanupRef.current?.();
    };
  }, [init]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="presentation"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
