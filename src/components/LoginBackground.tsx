import { useEffect, useRef } from 'react';

/**
 * Subtle animated mesh-gradient background for login pages.
 * Renders slowly drifting, blurred circles in brand-adjacent tones
 * on a canvas behind the login card.
 */
const LoginBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize);

    // Orbs with brand-adjacent colors (blues, teals, soft grays)
    const orbs = [
      { x: 0.2, y: 0.3, r: 0.35, color: 'hsla(204, 80%, 55%, 0.12)', dx: 0.00015, dy: 0.0001 },
      { x: 0.7, y: 0.6, r: 0.4, color: 'hsla(190, 60%, 50%, 0.10)', dx: -0.0001, dy: 0.00012 },
      { x: 0.5, y: 0.15, r: 0.3, color: 'hsla(220, 40%, 65%, 0.08)', dx: 0.00008, dy: -0.00006 },
      { x: 0.8, y: 0.2, r: 0.25, color: 'hsla(204, 100%, 35%, 0.06)', dx: -0.00012, dy: 0.00008 },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const orb of orbs) {
        orb.x += orb.dx;
        orb.y += orb.dy;

        // Soft bounce
        if (orb.x < -0.1 || orb.x > 1.1) orb.dx *= -1;
        if (orb.y < -0.1 || orb.y > 1.1) orb.dy *= -1;

        const cx = orb.x * width;
        const cy = orb.y * height;
        const radius = orb.r * Math.max(width, height);

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'hsla(0, 0%, 100%, 0)');

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
};

export default LoginBackground;
