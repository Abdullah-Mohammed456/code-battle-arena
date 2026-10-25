import { useEffect, useRef } from "react";

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const stars = Array.from({ length: 84 }, (_, index) => {
      const random = (seed: number) => {
        const value = Math.sin((index + 1) * seed) * 43758.5453;
        return value - Math.floor(value);
      };
      return {
        x: random(12.9898),
        y: random(78.233),
        radius: 0.4 + random(39.346) * 1.1,
        phase: random(17.719) * Math.PI * 2,
      };
    });
    const meteors: {
      x: number;
      y: number;
      start: number;
      speed: number;
      angle: number;
      length: number;
      life: number;
    }[] = [];
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let time = 0;
    let visible = !document.hidden;
    let active = true;
    let nextMeteorAt = 0;
    let gsap: typeof import("gsap").gsap | undefined;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.min(devicePixelRatio || 1, 1.5);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };
    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const alpha = 0.25 + (Math.sin(time * 0.5 + star.phase) + 1) * 0.15;
        context.beginPath();
        context.arc(
          star.x * width,
          star.y * height,
          star.radius,
          0,
          Math.PI * 2,
        );
        context.fillStyle = `rgba(255, 172, 190, ${reducedMotion.matches ? 0.35 : alpha})`;
        context.shadowColor = "rgba(255, 145, 167, 0.8)";
        context.shadowBlur = star.radius * 5;
        context.fill();
      }
      context.shadowBlur = 0;

      if (reducedMotion.matches) return;
      for (const meteor of meteors) {
        const age = time - meteor.start;
        if (age < 0 || age > meteor.life) continue;
        const headX = meteor.x + Math.cos(meteor.angle) * meteor.speed * age;
        const headY = meteor.y + Math.sin(meteor.angle) * meteor.speed * age;
        const tailX = headX - Math.cos(meteor.angle) * meteor.length;
        const tailY = headY - Math.sin(meteor.angle) * meteor.length;
        const trail = context.createLinearGradient(tailX, tailY, headX, headY);
        trail.addColorStop(0, "rgba(255, 145, 167, 0)");
        trail.addColorStop(0.65, "rgba(255, 145, 167, 0.45)");
        trail.addColorStop(1, "rgba(255, 238, 242, 0.95)");
        context.globalAlpha = Math.min(1, (meteor.life - age) * 3);
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(headX, headY);
        context.strokeStyle = trail;
        context.lineWidth = 1.5;
        context.shadowColor = "rgba(255, 145, 167, 0.95)";
        context.shadowBlur = 12;
        context.stroke();
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    };
    const ticker = (elapsed: number) => {
      time = elapsed;
      if (!nextMeteorAt) nextMeteorAt = time + 0.2;
      if (time >= nextMeteorAt) {
        const angle = Math.PI / 5 + Math.random() * 0.18;
        const speed = 1100 + Math.random() * 900;
        const fromLeft = Math.random() < 0.65;
        const x = fromLeft ? -80 : Math.random() * width * 0.85;
        const y = fromLeft ? Math.random() * height * 0.8 : -80;
        const distance = Math.max(width + 160 - x, height + 160 - y);
        meteors.push({
          x,
          y,
          start: time,
          speed,
          angle,
          length: 70 + Math.random() * 100,
          life: distance / speed,
        });
        nextMeteorAt = time + 0.35 + Math.random() * 0.65;
      }
      while (meteors[0] && time - meteors[0].start > meteors[0].life) {
        meteors.shift();
      }
      draw();
    };
    const updateMotion = () => {
      gsap?.ticker.remove(ticker);
      draw();
      if (active && visible && !reducedMotion.matches) {
        nextMeteorAt = time + 0.2;
        gsap?.ticker.add(ticker);
      }
    };
    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    const onVisibilityChange = () => {
      visible = !document.hidden;
      updateMotion();
    };
    const onMotionPreferenceChange = () => updateMotion();

    observer.observe(canvas);
    resize();
    draw();
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);
    void import("gsap").then((module) => {
      if (!active) return;
      gsap = module.gsap;
      updateMotion();
    });

    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      gsap?.ticker.remove(ticker);
    };
  }, []);

  return <canvas className="starfield" ref={canvasRef} aria-hidden="true" />;
}
