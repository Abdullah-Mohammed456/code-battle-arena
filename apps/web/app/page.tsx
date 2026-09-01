"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import logoImg from "../public/logo.jpg";

// Dynamic Import for Three.js Canvas to prevent SSR (Server-Side Rendering) issues
const ParticleSwarm3D = dynamic(
  () => import("../src/components/ParticleSwarm3D"),
  {
    ssr: false,
  },
);

export default function LandingPage() {
  // 3D Interactive Parallax state for Avatar
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget.getBoundingClientRect();
    const cardX = e.clientX - card.left - card.width / 2;
    const cardY = e.clientY - card.top - card.height / 2;

    setRotate({
      x: (cardY / card.height) * -25,
      y: (cardX / card.width) * 25,
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div className="relative min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col justify-between p-6 md:p-10 overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* 1. 3D Particle Swarm Background Integration */}
      <ParticleSwarm3D />

      {/* Top Navigation Header */}
      <header className="relative z-10 flex items-center justify-between w-full max-w-7xl mx-auto px-8 py-4 bg-zinc-950/40 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-8">
          <span className="text-xl font-black tracking-widest text-white uppercase">
            DEBLOT{" "}
            <span className="text-xs text-zinc-500 font-normal">
              / AI PLATFORM
            </span>
          </span>
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-zinc-400">
            <span className="hover:text-white cursor-pointer transition-colors">
              / PROTOCOL
            </span>
            <span className="hover:text-white cursor-pointer transition-colors">
              / DEVELOPERS
            </span>
            <span className="hover:text-white cursor-pointer transition-colors">
              / INTEGRATIONS
            </span>
          </nav>
        </div>

        <Link
          href="/arena"
          className="px-6 py-2.5 bg-white text-zinc-950 hover:bg-zinc-200 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95"
        >
          Enter Arena
        </Link>
      </header>

      {/* Hero 32 Main Section */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-between max-w-7xl w-full mx-auto my-auto gap-12 py-12">
        {/* Left Side: 3D Tilting ASCII Avatar */}
        <div
          className="relative w-full md:w-1/2 h-[450px] md:h-[550px] flex items-center justify-center [perspective:1000px] cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Cyan Backlight */}
          <div className="absolute w-[350px] md:w-[480px] h-[350px] md:h-[480px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />

          {/* 3D Card Wrapper */}
          <div
            className="relative w-full h-full max-w-[450px] flex items-center justify-center transition-transform duration-200 ease-out [transform-style:preserve-3d]"
            style={{
              transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
            }}
          >
            {/* ASCII Image Avatar */}
            <img
              src={logoImg.src}
              alt="3D Interactive Avatar"
              className="w-full h-full object-cover grayscale contrast-200 brightness-110 mix-blend-screen pointer-events-none rounded-2xl"
              style={{
                maskImage:
                  "radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 85%)",
                WebkitMaskImage:
                  "radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 85%)",
              }}
            />

            {/* Halftone Dot Matrix Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1.5px,transparent_1.5px)] [background-size:6px_6px] opacity-40 pointer-events-none rounded-2xl" />

            {/* Animated Scanning Laser Beam */}
            <div className="absolute inset-x-0 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 blur-sm animate-[scan_4s_ease-in-out_infinite] pointer-events-none" />
            <div className="absolute inset-x-0 h-[1px] bg-cyan-300 animate-[scan_4s_ease-in-out_infinite] pointer-events-none" />
          </div>
        </div>

        {/* Right Side: Hero Content */}
        <div className="w-full md:w-1/2 flex flex-col items-start gap-6">
          <div className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              ✦ Next-Gen Code Arena Engine
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Build, Deploy & Scale Intelligent Systems
          </h1>

          <p className="text-base text-zinc-400 max-w-lg leading-relaxed font-mono">
            Execute C++ code dynamically with isolated containerized
            environments, test cases pipeline, and instant feedback loops.
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Link
              href="/arena"
              className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-zinc-950 font-black text-sm tracking-wide rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all active:scale-95"
            >
              Launch Code Arena ⚡
            </Link>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between text-xs font-mono text-zinc-600 border-t border-white/5 pt-6">
        <span>DEBLOT SYSTEM INC © 2026</span>
        <span>STATUS: OPERATIONAL</span>
      </footer>
    </div>
  );
}
