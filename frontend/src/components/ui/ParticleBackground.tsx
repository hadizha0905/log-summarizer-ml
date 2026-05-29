/**
 * Анимированный фон с частицами
 */

import React, { useEffect, useRef } from 'react';

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  
  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.size = Math.random() * 2 + 1;
    this.alpha = Math.random() * 0.5 + 0.2;
  }
  
  update(canvasWidth: number, canvasHeight: number) {
    this.x += this.vx;
    this.y += this.vy;
    
    if (this.x < 0 || this.x > canvasWidth) this.vx *= -1;
    if (this.y < 0 || this.y > canvasHeight) this.vy *= -1;
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(59, 130, 246, ${this.alpha})`;
    ctx.fill();
  }
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const initParticles = () => {
    const particleCount = Math.min(100, Math.floor(window.innerWidth / 20));

    particlesRef.current = [];

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(
        new Particle(canvas.width, canvas.height)
      );
    }
  };

  const handleResize = () => {
    resizeCanvas();
    initParticles();
  };

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Connections
    for (let i = 0; i < particlesRef.current.length; i++) {
      for (let j = i + 1; j < particlesRef.current.length; j++) {
        const dx = particlesRef.current[i].x - particlesRef.current[j].x;
        const dy = particlesRef.current[i].y - particlesRef.current[j].y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          ctx.beginPath();

          ctx.moveTo(
            particlesRef.current[i].x,
            particlesRef.current[i].y
          );

          ctx.lineTo(
            particlesRef.current[j].x,
            particlesRef.current[j].y
          );

          ctx.strokeStyle = `rgba(59,130,246,${
            0.1 * (1 - distance / 100)
          })`;

          ctx.stroke();
        }
      }
    }

    // Particles
    particlesRef.current.forEach((particle) => {
      particle.update(canvas.width, canvas.height);
      particle.draw(ctx);
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  resizeCanvas();
  initParticles();
  animate();

  window.addEventListener('resize', handleResize);

  return () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    window.removeEventListener('resize', handleResize);
  };
}, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default ParticleBackground;