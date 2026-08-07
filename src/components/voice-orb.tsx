"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { useAgentStore } from "@/lib/stores/agent-store";

interface VoiceOrbProps {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  onClick: () => void;
}

const vertexShader = `
  varying vec2 vUv;
  varying float vNoise;
  uniform float u_time;
  uniform float u_intensity;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vNoise = snoise(vec3(position * 0.5 + u_time * 0.2));
    vec3 newPosition = position + normal * vNoise * u_intensity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying float vNoise;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform float u_time;

  void main() {
    float alpha = 0.6 + vNoise * 0.3;
    vec3 gradColor = mix(u_color1, u_color2, vUv.y + sin(u_time * 0.3) * 0.1);
    vec3 finalColor = mix(gradColor, vec3(1.0), vNoise * 0.5);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export default function VoiceOrb({ isListening, isThinking, isSpeaking, onClick }: VoiceOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    orb: THREE.Mesh;
    particles: THREE.Points;
    material: THREE.ShaderMaterial;
    particlesMaterial: THREE.PointsMaterial;
    audioIntensity: number;
    targetIntensity: number;
    animationId: number;
    time: number;
  } | null>(null);

  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);
  const isThinkingRef = useRef(isThinking);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isThinkingRef.current = isThinking; }, [isThinking]);

  const initThree = useCallback(() => {
    if (!containerRef.current || sceneRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    renderer.domElement.classList.add("orb-canvas");

    // Organic Fluid Orb
    const orbGeometry = new THREE.SphereGeometry(2, 128, 128);
    const orbMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_intensity: { value: 0.3 },
        u_color1: { value: new THREE.Color(0x4648d4) },
        u_color2: { value: new THREE.Color(0xc0c1ff) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
    });

    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    scene.add(orb);

    // Particles
    const particleCount = 800;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 10;
    }
    for (let i = 0; i < particleCount; i++) {
      particleSpeeds[i] = 0.2 + Math.random() * 0.8;
    }
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: 0.015,
      transparent: true,
      opacity: 0.35,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    camera.position.z = 6;

    sceneRef.current = {
      renderer,
      scene,
      camera,
      orb,
      particles,
      material: orbMaterial,
      particlesMaterial,
      audioIntensity: 0.3,
      targetIntensity: 0.3,
      animationId: 0,
      time: 0,
    };

    const animate = (time: number) => {
      if (!sceneRef.current) return;
      const { material, orb, particles, particlesMaterial } = sceneRef.current;
      const t = time * 0.001;
      const dt = t - sceneRef.current.time;
      sceneRef.current.time = t;

      const listening = isListeningRef.current;
      const thinking = isThinkingRef.current;
      const speaking = isSpeakingRef.current;

      // ── State-dependent intensity targets ──
      if (Math.random() > 0.93) {
        if (listening) {
          sceneRef.current.targetIntensity = 0.8 + Math.random() * 1.2;
        } else if (thinking) {
          // Steady pulsing rhythm for thinking
          sceneRef.current.targetIntensity = 0.5 + Math.sin(t * 2.5) * 0.3;
        } else if (speaking) {
          sceneRef.current.targetIntensity = 0.4 + Math.random() * 0.8;
        } else {
          // Idle: gentle breathe
          sceneRef.current.targetIntensity = 0.3 + Math.sin(t * 0.5) * 0.05;
        }
      } else if (thinking) {
        // Continuous smooth pulse for thinking state
        sceneRef.current.targetIntensity = 0.5 + Math.sin(t * 2.5) * 0.3;
      }

      // Smooth lerp to target
      const lerpSpeed = thinking ? 0.12 : 0.08;
      sceneRef.current.audioIntensity = THREE.MathUtils.lerp(
        sceneRef.current.audioIntensity,
        sceneRef.current.targetIntensity,
        lerpSpeed
      );

      material.uniforms.u_time.value = t;
      material.uniforms.u_intensity.value = sceneRef.current.audioIntensity;

      // ── State-dependent rotation ──
      if (thinking) {
        orb.rotation.y = t * 0.25;
        orb.rotation.z = t * 0.15;
      } else {
        orb.rotation.y = t * 0.1;
        orb.rotation.z = t * 0.05;
      }

      // ── State-dependent particles ──
      if (thinking) {
        // Swirling vortex pattern
        particles.rotation.y = t * 0.3;
        particles.rotation.x = Math.sin(t * 0.5) * 0.2;
        particlesMaterial.opacity = 0.45;
        particlesMaterial.size = 0.018;
        // Color shift toward amber for thinking
        particlesMaterial.color.setHex(0xc0c1ff);
      } else if (listening) {
        particles.rotation.y = t * 0.15;
        particlesMaterial.opacity = 0.5;
        particlesMaterial.size = 0.02;
        particlesMaterial.color.setHex(0x818cf8);
      } else if (speaking) {
        particles.rotation.y = t * (0.1 + Math.sin(t * 1.5) * 0.05);
        particlesMaterial.opacity = 0.45;
        particlesMaterial.size = speaking ? 0.02 : 0.015;
        particlesMaterial.color.setHex(0xa78bfa);
      } else {
        particles.rotation.y = t * 0.05;
        particlesMaterial.opacity = 0.35;
        particlesMaterial.size = 0.015;
        particlesMaterial.color.setHex(0x818cf8);
      }

      renderer.render(scene, sceneRef.current.camera);
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    animate(0);

    const handleResize = () => {
      if (!sceneRef.current || !container) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 320;
      sceneRef.current.camera.aspect = w / h;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const cleanupFn = initThree();
    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.renderer.dispose();
        sceneRef.current.material.dispose();
        void sceneRef.current.particlesGeometry;
        sceneRef.current.particlesMaterial.dispose();
        const canvas = containerRef.current?.querySelector("canvas");
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        sceneRef.current = null;
      }
    };
  }, [initThree]);

  const isIdle = useAgentStore((s) => s.agentState === 'idle' || s.agentState === 'error');

  return (
    <div
      ref={containerRef}
      className={`orb-container cursor-pointer flex justify-center items-center relative ${
        isListening ? 'listening' : ''
      } ${isIdle ? 'orb-breathe' : ''} ${isSpeaking ? 'orb-speaking' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={
        isListening ? 'Voice assistant is listening'
        : isThinking ? 'Tamanna is thinking'
        : 'Tap to start voice assistant'
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Pulse rings — different patterns per state */}
      {(isListening || isThinking) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isThinking ? (
            <>
              {/* Concentric expanding rings for thinking — slower, more rhythmic */}
              <div className="absolute w-3/4 h-3/4 rounded-full border border-lumina-primary/15 animate-ping [animation-duration:2s]" />
              <div className="absolute w-[85%] h-[85%] rounded-full border border-lumina-primary/10 animate-ping [animation-duration:2s] [animation-delay:0.7s]" />
              <div className="absolute w-[95%] h-[95%] rounded-full border border-lumina-primary/8 animate-ping [animation-duration:2s] [animation-delay:1.4s]" />
            </>
          ) : (
            <>
              {/* Fast responsive rings for listening */}
              <div className="absolute w-3/4 h-3/4 rounded-full border border-lumina-primary/20 animate-ping" />
              <div className="absolute w-[85%] h-[85%] rounded-full border border-lumina-primary/15 animate-ping [animation-delay:0.5s]" />
              <div className="absolute w-[95%] h-[95%] rounded-full border border-lumina-primary/10 animate-ping [animation-delay:1s]" />
            </>
          )}
        </div>
      )}

      {/* Speaking waveform rings */}
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[60%] h-[60%] rounded-full border-2 border-lumina-primary/20 animate-pulse" />
          <div className="absolute w-[70%] h-[70%] rounded-full border border-lumina-primary/12 animate-pulse [animation-delay:0.3s]" />
        </div>
      )}
    </div>
  );
}
