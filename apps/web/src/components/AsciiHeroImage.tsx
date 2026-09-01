"use client";

import React from "react";

interface AsciiHeroImageProps {
  imageSrc: string;
}

export default function AsciiHeroImage({ imageSrc }: AsciiHeroImageProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center -z-10 overflow-hidden pointer-events-none">
      {/* Background Neon Glow */}
      <div className="absolute w-[650px] h-[650px] bg-cyan-500/25 rounded-full blur-[140px]" />

      {/* ASCII Image Container */}
      <div className="relative w-[600px] h-[700px] flex items-center justify-center opacity-85 transition-all">
        <img
          src={imageSrc}
          alt="ASCII Background Avatar"
          className="w-full h-full object-cover grayscale contrast-200 brightness-125 mix-blend-screen"
          style={{
            maskImage:
              "radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 80%)",
            WebkitMaskImage:
              "radial-gradient(circle, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 80%)",
          }}
        />
        {/* Dot Matrix Screen Overlay in Cyan/White Dots */}
        <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1.5px,transparent_1.5px)] [background-size:6px_6px] opacity-40" />
      </div>
    </div>
  );
}
