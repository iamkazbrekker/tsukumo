"use client";

import React, { useState } from 'react';

function Page() {
  // State to track which body part is currently being hovered for visibility
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // State to track the last hovered region so the modal doesn't jump to center while fading out
  const [lastHovered, setLastHovered] = useState<string | null>(null);

  const handleMouseEnter = (id: string) => {
    setHoveredRegion(id);
    setLastHovered(id);
  };

  const handleMouseLeave = () => {
    setHoveredRegion(null);
  };

  // --- SETTINGS: Change these parameters to adjust the human overlay ---
  const overlayConfig = {
    // Put your human image in the 'public' folder and replace the name here
    src: "/human-overlay.png",

    // Size controls
    width: "475px",  // e.g., "400px", "50vw"
    height: "auto",

    // Position controls
    top: "47%",      // "50%" is middle of the screen vertically
    left: "50%",     // "50%" is middle of the screen horizontally

    // Keeps it exactly centered relative to the top/left coordinates
    transform: "translate(-50%, -50%)",

    // Ensures it overlays on top of other content
    zIndex: 50,
  };

  // --- REGIONS: Define coordinates and popup position ---
  const regions = [
    {
      id: "eyes",
      name: "Eyes",
      description: "Visual system and ophthalmic health data.",
      overlayStyle: { top: "15%", left: "40%", width: "20%", height: "8%" },
      modalPosition: "center",
    },
    {
      id: "left-chest",
      name: "Left Chest",
      description: "Cardiac and respiratory regional data. (Viewer's right side)",
      overlayStyle: { top: "25%", left: "50%", width: "18%", height: "12%" },
      modalPosition: "right",
    },
    {
      id: "right-chest",
      name: "Right Chest",
      description: "Respiratory and pectoral regional data. (Viewer's left side)",
      overlayStyle: { top: "25%", left: "32%", width: "18%", height: "12%" },
      modalPosition: "left",
    },
    {
      id: "stomach",
      name: "Stomach",
      description: "Digestive system and gastrointestinal tract diagnostics.",
      overlayStyle: { top: "38%", left: "45%", width: "10%", height: "15%" },
      modalPosition: "center",
    },
    {
      id: "left-kidney",
      name: "Left Kidney",
      description: "Renal system functions, filtration, and balances.",
      overlayStyle: { top: "38%", left: "55%", width: "10%", height: "12%" }, // Viewer's right side (beside 45%-55% stomach)
      modalPosition: "right",
    },
    {
      id: "right-kidney",
      name: "Right Kidney",
      description: "Renal system functions, filtration, and balances.",
      overlayStyle: { top: "38%", left: "35%", width: "10%", height: "12%" }, // Viewer's left side (beside 45%-55% stomach)
      modalPosition: "left",
    }
  ];

  // We use `lastHovered` to retrieve the data so the modal's text and position
  // don't instantly disappear/shift while the fade-out animation plays.
  const activeRegionData = regions.find(r => r.id === lastHovered);

  const getPositionClasses = (position?: string) => {
    switch (position) {
      case "left":
        return "left-[10%] top-1/2 -translate-y-1/2";
      case "right":
        return "right-[10%] top-1/2 -translate-y-1/2";
      case "center":
      default:
        return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
    }
  };

  return (
    <main className="relative min-h-screen w-full">
      {/* Human Overlay Container */}
      <div
        style={{
          position: "fixed",
          top: overlayConfig.top,
          left: overlayConfig.left,
          transform: overlayConfig.transform,
          width: overlayConfig.width,
          height: overlayConfig.height,
          zIndex: overlayConfig.zIndex,
        }}
        // The container needs to capture pointer events now so we can hover the regions
        className="relative drop-shadow-2xl"
      >
        <img
          src={overlayConfig.src}
          alt="Human Overlay"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          // The image itself ignores clicks so we can freely interact with the invisible region boxes lying over it
          className="pointer-events-none"
        />

        {/* Interactable invisible boxes laid over the image */}
        {regions.map((region) => (
          <div
            key={region.id}
            onMouseEnter={() => handleMouseEnter(region.id)}
            onMouseLeave={handleMouseLeave}
            // 'absolute' positions them over the image. 
            // We add a subtle hover effect (bg-white/10) to help you visualize and adjust regions.
            className="absolute cursor-pointer border border-transparent rounded-lg hover:border-white/40 hover:bg-white/10 transition-colors duration-200 z-[60]"
            style={region.overlayStyle}
          />
        ))}
      </div>

      {/* Information Module / Modal */}
      {/* Dynamic positioning with an opacity/scale fade-out when no region is hovered */}
      <div
        className={`fixed z-[100] w-[340px] p-6 rounded-2xl shadow-2xl backdrop-blur-xl border border-zinc-200 dark:border-zinc-800
                    bg-zinc-100/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 transition-all duration-300 ease-out pointer-events-none
                    ${getPositionClasses(activeRegionData?.modalPosition)}
                    ${hoveredRegion ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {activeRegionData && (
          <div className="flex flex-col gap-4">
            {/* Header section with an animated indicator */}
            <div className="flex items-center gap-3 border-b border-zinc-300 dark:border-zinc-700 pb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <h2 className="text-xl font-bold tracking-tight">{activeRegionData.name}</h2>
            </div>

            {/* Description */}
            <p className="text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
              {activeRegionData.description}
            </p>

            {/* Small status badges */}
            <div className="mt-2 flex gap-3">
              <span className="px-2 py-1 text-xs uppercase tracking-wider font-bold rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                Status: Scanning
              </span>
              <span className="px-2 py-1 text-xs uppercase tracking-wider font-bold rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                Sensors: Active
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Put your actual page background content below */}
      <div className="relative z-10 p-8 text-center" />
    </main>
  );
}

export default Page;