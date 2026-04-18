"use client";

import React, { useState, useEffect } from 'react';

// --- THEME DATA: Define the look and feel for each organ ---
const organThemes: Record<string, any> = {
  heart: {
    id: "heart",
    title: "Cardiac Dashboard",
    subtitle: "Sacred Rhythm (Fire Element)",
    color: "red",
    icon: "/assets/thangka/heart.png",
    accent: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    glow: "shadow-[0_0_50px_rgba(220,38,38,0.2)]",
    stats: [
      { label: "Heart Rate", value: "72", unit: "BPM", status: "LIVE" },
      { label: "Blood Pressure", value: "120/80", unit: "mmHg", status: "STABLE" }
    ],
    description: "The cardiac rhythm shows normal sinus activity with balanced autonomic tone. Preload and afterload values are within target physiological range."
  },
  "left-lung": {
    id: "left-lung",
    title: "Respiratory Center (Left)",
    subtitle: "Vital Breath (Air Element)",
    color: "cyan",
    icon: "/assets/thangka/lungs.png",
    accent: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_50px_rgba(34,211,238,0.2)]",
    stats: [
      { label: "Oxygen Saturation", value: "98", unit: "%", status: "OPTIMAL" },
      { label: "Tidal Volume", value: "500", unit: "mL", status: "NORMAL" }
    ],
    description: "Alveolar gas exchange is efficient. Bronchial patency is clear. Oxygen saturation indicates high prana absorption.",
    cropSide: 'right'
  },
  "right-lung": {
    id: "right-lung",
    title: "Respiratory Center (Right)",
    subtitle: "Vital Breath (Air Element)",
    color: "cyan",
    icon: "/assets/thangka/lungs.png",
    accent: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_50px_rgba(34,211,238,0.2)]",
    stats: [
      { label: "Oxygen Saturation", value: "99", unit: "%", status: "OPTIMAL" },
      { label: "Respiration Rate", value: "14", unit: "BPM", status: "STEADY" }
    ],
    description: "Right lung lobes show full expansion. No signs of pleural irritation. Diaphragmatic synchrony is maintained.",
    cropSide: 'left'
  },
  "left-kidney": {
    id: "left-kidney",
    title: "Renal Module (Left)",
    subtitle: "Vital Essence (Water Element)",
    color: "blue",
    icon: "/assets/thangka/kidneys.png",
    accent: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_50px_rgba(59,130,246,0.2)]",
    stats: [
      { label: "Filtration Rate", value: "105", unit: "mL/min", status: "ACTIVE" },
      { label: "Hydration Balance", value: "Optimal", unit: "", status: "BALANCED" }
    ],
    description: "Efficient glomerular filtration detected. Electrolyte balance (Na+, K+) is within sacred harmony bounds.",
    cropSide: 'right'
  },
  "right-kidney": {
    id: "right-kidney",
    title: "Renal Module (Right)",
    subtitle: "Vital Essence (Water Element)",
    color: "blue",
    icon: "/assets/thangka/kidneys.png",
    accent: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_50px_rgba(59,130,246,0.2)]",
    stats: [
      { label: "Filtration Rate", value: "102", unit: "mL/min", status: "ACTIVE" },
      { label: "Fluid Retention", value: "None", unit: "", status: "CLEAR" }
    ],
    description: "Renal clearance is performing at peak efficiency. Corticomedullary differentiation is distinct.",
    cropSide: 'left'
  },
  stomach: {
    id: "stomach",
    title: "Digestive Nexus",
    subtitle: "Digestive Fire (Agni/Earth)",
    color: "amber",
    icon: "/assets/thangka/stomach.png",
    accent: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_50px_rgba(245,158,11,0.2)]",
    stats: [
      { label: "Metabolic Rate", value: "1.2x", unit: "Basal", status: "FASTING" },
      { label: "pH Level", value: "1.8", unit: "pH", status: "OPTIMAL" }
    ],
    description: "Digestive fire (Jatharagni) is steady. Nutrient bioavailability optimization is in progress. Gut-brain axis signal is strong."
  },
  eyes: {
    id: "eyes",
    title: "Ocular Command Center",
    subtitle: "Vision & Wisdom (Ether Element)",
    color: "indigo",
    icon: "/assets/thangka/eyes.jpg",
    accent: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    glow: "shadow-[0_0_50px_rgba(129,140,248,0.3)]",
    stats: [
      { label: "Visual Fidelity", value: "20/20", unit: "Snellen", status: "OPTIMAL" },
      { label: "Neural Flux", value: "Sync", unit: "", status: "ACTIVE" }
    ],
    description: "The eyes of wisdom perceive beyond the veil of form. Ocular pressure and retinal harmony are in a state of absolute grace."
  },
  brain: {
    id: "brain",
    title: "Cognitive Lotus",
    subtitle: "Consciousness (Vijnana/Spirit)",
    color: "violet",
    icon: "/assets/thangka/brain.jpg",
    accent: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_50px_rgba(167,139,250,0.3)]",
    stats: [
      { label: "Alpha State", value: "Deep", unit: "", status: "MEDITATIVE" },
      { label: "Synaptic Sync", value: "High", unit: "", status: "COHERENT" }
    ],
    description: "The crown lotus is blossoming. Neural pathways resonate with universal prana. Cognitive dissonance is nullified."
  }
};

// ── What-If types ─────────────────────────────────────────────────────────
type ScenarioResult = {
  scenario:    string;
  description: string;
  risk_type:   'cardiac' | 'diabetes';
  mean_risk:   number;
  p05: number; p95: number;
  color:       string;
};

type WhatIfData = {
  scenarios:   ScenarioResult[];
  trajectory:  Record<string, any>[];
  feature_sensitivity: { cardiac: Record<string,number>; diabetes: Record<string,number> };
  summary:     string;
  _mock?:      boolean;
};

function Page() {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [lastHovered, setLastHovered] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringBody, setIsHoveringBody] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [insightsTab, setInsightsTab] = useState<'diagnostics' | 'whatif'>('diagnostics');
  const [latestInsights, setLatestInsights] = useState<any>(null);
  const [whatIfData, setWhatIfData] = useState<WhatIfData | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfRiskType, setWhatIfRiskType] = useState<'cardiac' | 'diabetes'>('cardiac');
  const lastSourceFileRef = React.useRef<string | null>(null);
  const [liveNotifications, setLiveNotifications] = useState<any[]>([
    { icon: '🔥', title: 'Cardiac Rhythm Shift', desc: 'Heart rate variance detected at 04:38 AM. Minor fluctuation.', time: '2h ago', severity: 'warn' },
    { icon: '💧', title: 'Hydration Reminder', desc: 'Renal filtration suggests low fluid intake today.', time: '3h ago', severity: 'info' },
    { icon: '🌬️', title: 'Breath Pattern Normal', desc: 'Respiratory cycle aligned with optimal prana flow.', time: '5h ago', severity: 'ok' },
    { icon: '⚡', title: 'Neural Coherence Peak', desc: 'Alpha wave synchrony reached meditative state at dawn.', time: '6h ago', severity: 'ok' },
    { icon: '🌡️', title: 'Agni Metabolic Check', desc: 'Digestive fire steady. Post-meal thermogenesis within range.', time: '8h ago', severity: 'info' },
    { icon: '👁️', title: 'Ocular Strain Alert', desc: 'Extended screen exposure. Blink rate below baseline.', time: '10h ago', severity: 'warn' }
  ]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Calculate tilt: relative to container center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = (y - centerY) / (rect.height / 2) * 12; // tilt around X axis depends on Y position
    const tiltY = (x - centerX) / (rect.width / 2) * -12; // tilt around Y axis depends on X position
    setTilt({ x: tiltX, y: tiltY });
  };

  useEffect(() => {
    const fetchDriveStream = async () => {
      try {
        const res = await fetch('/api/drive-monitor');
        const data = await res.json();
        
        if (data && data.predictions && !data.predictions.error) {
          if (data.source_file === lastSourceFileRef.current) return; // Don't duplicate if file hasn't changed
          lastSourceFileRef.current = data.source_file;

          const preds = data.predictions;
          setLatestInsights(preds);

          const newNotifs: any[] = [];
          
          if (preds.cardiac_arrest_risk !== undefined) {
             newNotifs.push({
               icon: preds.cardiac_arrest_risk > 0 ? '⚠️' : '🔥',
               title: 'Drive: Cardiac Model',
               desc: preds.cardiac_arrest_risk > 0 ? 'Elevated cardiac risk detected from synced drive stream.' : 'Cardiac rhythms normal in drive stream.',
               time: 'just now',
               severity: preds.cardiac_arrest_risk > 0 ? 'warn' : 'ok'
             });
          }
          if (preds.diabetes_risk !== undefined) {
             newNotifs.push({
               icon: preds.diabetes_risk > 0 ? '⚠️' : '💧',
               title: 'Drive: Diabetes Model',
               desc: preds.diabetes_risk > 0 ? 'Elevated diabetes risk detected.' : 'Metabolic markers stable in drive stream.',
               time: 'just now',
               severity: preds.diabetes_risk > 0 ? 'warn' : 'ok'
             });
          }
          
          if (newNotifs.length > 0) {
             setLiveNotifications(prev => [...newNotifs, ...prev].slice(0, 6));
          }
        }
      } catch (e) {
        console.error("Failed to fetch drive stream", e);
      }
    };

    const intervalId = setInterval(fetchDriveStream, 10000);
    fetchDriveStream();
    return () => clearInterval(intervalId);
  }, []);

  // ── What-If fetch ──────────────────────────────────────────────────────────
  const fetchWhatIf = React.useCallback(async (patientOverride?: Record<string, number>) => {
    setWhatIfLoading(true);
    try {
      const defaultPatient = {
        age: 45, bmi: 28.5, sysBP: 140, diaBP: 90, heartRate: 85,
        totChol: 215, HDLChol: 45, glucose: 160,
        cigarettes_per_day: 0, sleep_hours: 6, physical_activity_met: 1.5,
        sodium_mg_per_day: 3800, alcohol_drinks_per_week: 4,
        prevalentHyp: 1, diabetes: 0, currentSmoker: 0,
      };
      const res = await fetch('/api/whatif', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patient: { ...defaultPatient, ...patientOverride }, n: 3000, weeks: 24 }),
      });
      if (res.ok) setWhatIfData(await res.json());
    } catch (e) {
      console.error('What-If fetch failed', e);
    } finally {
      setWhatIfLoading(false);
    }
  }, []);

  // Pre-fetch when the modal first opens on the what-if tab
  React.useEffect(() => {
    if (showInsightsModal && insightsTab === 'whatif' && !whatIfData && !whatIfLoading) {
      fetchWhatIf();
    }
  }, [showInsightsModal, insightsTab, whatIfData, whatIfLoading, fetchWhatIf]);

  const handleMouseEnter = (id: string) => {
    setHoveredRegion(id);
    setLastHovered(id);
  };

  const handleMouseLeave = () => {
    setHoveredRegion(null);
  };

  const overlayConfig = {
    src: "/human-overlay.png",
    width: "450px",
    height: "auto",
    top: "51%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 50,
  };



  const regions = [
    { id: "brain", name: "Brain", description: "Higher consciousness and neural processing node.", overlayStyle: { top: "5%", left: "45%", width: "10%", height: "8%" }, modalPosition: "right", isSpecial: true },
    { id: "eyes", name: "Eyes", description: "Visual system and ophthalmic health data.", overlayStyle: { top: "15%", left: "40%", width: "20%", height: "8%" }, modalPosition: "right", isSpecial: true },
    { id: "right-lung", name: "Right Lung", description: "Respiratory and pectoral regional data.", overlayStyle: { top: "30%", left: "32%", width: "15%", height: "15%" }, modalPosition: "right", isSpecial: true },
    { id: "left-lung", name: "Left Lung", description: "Respiratory and pectoral regional data.", overlayStyle: { top: "30%", left: "53%", width: "15%", height: "15%" }, modalPosition: "right", isSpecial: true },
    { id: "heart", name: "Heart", description: "Cardiac system monitoring and real-time hemodynamic data.", overlayStyle: { top: "27%", left: "47%", width: "10%", height: "12%" }, modalPosition: "right", isSpecial: true },
    { id: "stomach", name: "Stomach", description: "Digestive system and gastrointestinal tract diagnostics.", overlayStyle: { top: "38%", left: "45%", width: "10%", height: "15%" }, modalPosition: "right", isSpecial: true },
    { id: "right-kidney", name: "Right Kidney", description: "Renal system functions, filtration, and balances.", overlayStyle: { top: "38%", left: "35%", width: "10%", height: "12%" }, modalPosition: "right", isSpecial: true },
    { id: "left-kidney", name: "Left Kidney", description: "Renal system functions, filtration, and balances.", overlayStyle: { top: "38%", left: "55%", width: "10%", height: "12%" }, modalPosition: "right", isSpecial: true }
  ];

  // We use `lastHovered` to retrieve the data so the modal's text and position
  // don't instantly disappear/shift while the fade-out animation plays.
  const activeRegionData = regions.find(r => r.id === lastHovered);
  const selectedTheme = selectedRegion ? organThemes[selectedRegion] : null;

  // Configuration for the center-bottom prediction overlay
  const predictionOverlayConfig = {
    src: "/prediction-overlay.png",
    width: "450px",  // Adjustable width
    height: "auto",
    bottom: "2.8%",    // Adjustable bottom spacing
    left: "83.8%",     // Middle of the screen horizontally
    transform: "translateX(-50%)", // Centers it exactly at 50% left relative to its own width
    zIndex: 40,
  };

  // Configuration for the left-bottom resources overlay
  const resourcesOverlayConfig = {
    src: "/resources-overlay.png",
    width: "605px",  // Adjustable width
    height: "auto",
    bottom: "0%",    // Adjustable bottom spacing
    left: "0%",      // Adjustable left spacing
    zIndex: 40,
  };


  const getPositionClasses = () => "right-[10%] top-1/2 -translate-y-1/2";

  // Shared Filters for Mural Texture and Gold Leaf
  const ThangkaFilters = () => (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <filter id="mural-texture">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise" />
        <feDiffuseLighting in="noise" lightingColor="#fff" surfaceScale="1">
          <feDistantLight azimuth="45" elevation="60" />
        </feDiffuseLighting>
        <feComposite in="SourceGraphic" operator="arithmetic" k1="0.5" k2="0.5" k3="0" k4="0" />
      </filter>
      <filter id="gold-leaf">
        <feGaussianBlur stdDeviation="0.2" result="blur" />
        <feSpecularLighting in="blur" surfaceScale="3" specularConstant="1.2" specularExponent="30" lightingColor="#FFD700">
          <fePointLight x="-50" y="-50" z="200" />
        </feSpecularLighting>
        <feComposite in="SourceGraphic" operator="over" />
      </filter>
    </svg>
  );

  const renderThangkaIcon = (theme: any, sizeClass = "w-32 h-32", forceBlend?: string, offset?: { x: number, y: number }) => {
    if (!theme) return null;

    const isCropped = !!theme.cropSide;
    const isJpg = theme.icon.endsWith('.jpg');
    
    // Use a more appropriate blend mode for Thangka JPEGs on light backgrounds
    const blendMode = forceBlend || (isJpg ? 'multiply' : 'screen');

    return (
      <div
        className={`${sizeClass} relative overflow-hidden flex items-center justify-center`}
        style={{
          maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
        }}
      >
        <img
          src={theme.icon}
          alt={theme.title}
          style={{
            mixBlendMode: blendMode as any,
            filter: isJpg ? 'contrast(1.1) brightness(1.1)' : 'contrast(1.6) brightness(1.2)',
            transform: `
              ${theme.flip ? 'scaleX(-1)' : 'none'} 
              ${offset ? `translate(${offset.x}px, ${offset.y}px)` : ''}
            `,
            position: 'absolute',
            width: isCropped ? '200%' : '100%',
            maxWidth: 'none',
            height: '100%',
            left: theme.cropSide === 'right' ? '-100%' : '0',
            top: 0,
            objectFit: isCropped ? 'cover' : 'contain',
          }}
          className="drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300"
        />
      </div>
    );
  };

  return (
    <main className="relative min-h-screen w-full">
      <ThangkaFilters />

      {/* Updated Thangka Health Twin Logo (Top Left) */}
      <div className="fixed top-6 left-8 z-[150] flex flex-col items-start gap-0.5 pointer-events-none group transition-all duration-500">
        <img 
          src="/assets/thangka/logo.png" 
          alt="Tsukumo Logo" 
          className="h-10 w-auto drop-shadow-[0_0_20px_rgba(255,215,0,0.4)] brightness-110 contrast-110"
        />
        <div className="flex items-center gap-1.5 ml-2 mt-[-4px]">
          <div className="w-1.5 h-[1.5px] bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.4em] opacity-80 drop-shadow-sm">Co-Health Twin</span>
        </div>
      </div>


      {/* ======== NOTIFICATION SCROLL — Left Side ======== */}
      <div className="fixed right-50 top-1/3 -translate-y-1/2 z-[90] w-[260px] flex flex-col items-center" style={{ perspective: '800px' }}>

        {/* Top Roller */}
        <div className="h-5 w-[108%] notif-roller rounded-full z-30 relative flex items-center justify-between">
          <div className="absolute -left-2 w-5 h-6 notif-roller-cap rounded-sm" />
          <div className="absolute -right-2 w-5 h-6 notif-roller-cap rounded-sm" />
          <div className="absolute left-1/2 -translate-x-1/2 w-10 h-2 rounded-full bg-gradient-to-b from-yellow-800/20 to-transparent" />
        </div>

        {/* Parchment Body */}
        <div className="notif-scroll-body w-full" style={{ maxHeight: '55vh' }}>

          {/* Torn edge overlays */}
          <div className="notif-scroll-left-tear" />

          {/* Burn marks */}
          <div className="notif-scroll-burn-top" />
          <div className="notif-scroll-burn-bottom" />

          {/* Coffee ring stains */}
          <div className="notif-scroll-stain" style={{ width: 60, height: 60, top: '15%', right: '5%' }} />
          <div className="notif-scroll-stain" style={{ width: 45, height: 45, bottom: '20%', left: '8%' }} />

          {/* Foxing spots (age spots) */}
          <div className="notif-scroll-foxing" style={{ width: 8, height: 8, top: '22%', left: '18%' }} />
          <div className="notif-scroll-foxing" style={{ width: 6, height: 6, top: '45%', right: '15%' }} />
          <div className="notif-scroll-foxing" style={{ width: 10, height: 10, bottom: '30%', left: '30%' }} />
          <div className="notif-scroll-foxing" style={{ width: 5, height: 5, top: '60%', right: '25%' }} />
          <div className="notif-scroll-foxing" style={{ width: 7, height: 7, top: '75%', left: '45%' }} />

          {/* Horizontal crease / fold lines */}
          <div className="notif-scroll-crease" style={{ top: '33%' }} />
          <div className="notif-scroll-crease" style={{ top: '66%' }} />

          {/* Scrollable content area */}
          <div className="relative z-10 px-5 py-5 overflow-y-auto" style={{ maxHeight: '55vh', scrollbarWidth: 'none' }}>

            {/* Title with wax seal */}
            <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: '1px solid rgba(110, 75, 30, 0.25)' }}>
              <div className="notif-wax-seal flex-shrink-0">
                <span className="text-[11px] font-black text-red-200/70" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontFamily: 'serif' }}>TS</span>
              </div>
              <div>
                <h3 className="text-sm font-black tracking-wide uppercase" style={{ color: '#3a2010', fontFamily: 'Georgia, serif', textShadow: '0 1px 0 rgba(255,240,200,0.3)' }}>Sacred Notices</h3>
                <p className="text-[8px] uppercase tracking-[0.3em] mt-0.5" style={{ color: '#8a6830' }}>Prana Alerts</p>
              </div>
            </div>

            {/* Notification Items */}
            {liveNotifications.map((notif, idx) => (
              <div key={idx} className="notif-item mb-3 last:mb-0" style={{ animationDelay: `${idx * 0.08}s` }}>
                <div className="flex gap-2.5 group">
                  {/* Ink drip decoration */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <span className="text-base">{notif.icon}</span>
                    <div className="w-px flex-1" style={{ background: 'linear-gradient(to bottom, rgba(80,50,15,0.3), transparent)' }} />
                    <div className="notif-ink-drip" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-[11px] font-bold leading-tight" style={{ color: '#2a1508', fontFamily: 'Georgia, serif' }}>{notif.title}</h4>
                      <div className="flex-shrink-0 mt-0.5" style={{
                        width: 6, height: 6, borderRadius: '50%',
                        backgroundColor: notif.severity === 'warn' ? '#c0392b' : notif.severity === 'ok' ? '#27ae60' : '#b8860b',
                        boxShadow: `0 0 4px ${notif.severity === 'warn' ? 'rgba(192,57,43,0.5)' : notif.severity === 'ok' ? 'rgba(39,174,96,0.4)' : 'rgba(184,134,11,0.4)'}`,
                      }} />
                    </div>
                    <p className="text-[9px] leading-relaxed mt-0.5" style={{ color: '#5a3a20', fontFamily: 'Georgia, serif' }}>{notif.desc}</p>
                    <span className="text-[8px] uppercase tracking-wider mt-1 inline-block" style={{ color: '#9a7a50', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{notif.time}</span>
                  </div>
                </div>

                {/* Separator — ink line */}
                {idx < 5 && (
                  <div className="mt-2.5 mx-1" style={{ height: 1, background: 'linear-gradient(90deg, transparent 5%, rgba(100, 65, 20, 0.2) 20%, rgba(100, 65, 20, 0.15) 80%, transparent 95%)' }} />
                )}
              </div>
            ))}

            {/* Bottom inscription */}
            <div className="mt-4 pt-3 text-center" style={{ borderTop: '1px solid rgba(110, 75, 30, 0.2)' }}>
              <p className="text-[7px] uppercase tracking-[0.35em] italic" style={{ color: '#9a7a50', fontFamily: 'Georgia, serif' }}>
                ❧ End of Proclamations ❧
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Roller */}
        <div className="h-5 w-[108%] notif-roller rounded-full z-30 relative flex items-center justify-between">
          <div className="absolute -left-2 w-5 h-6 notif-roller-cap rounded-sm" />
          <div className="absolute -right-2 w-5 h-6 notif-roller-cap rounded-sm" />
          <div className="absolute left-1/2 -translate-x-1/2 w-10 h-2 rounded-full bg-gradient-to-b from-yellow-800/20 to-transparent" />
        </div>
      </div>

      <div 
        style={{ 
          position: "fixed", 
          top: overlayConfig.top, 
          left: overlayConfig.left, 
          transform: overlayConfig.transform, 
          width: overlayConfig.width, 
          height: overlayConfig.height, 
          zIndex: overlayConfig.zIndex 
        }} 
        className="relative drop-shadow-2xl cursor-none"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHoveringBody(true)}
        onMouseLeave={() => {
          setIsHoveringBody(false);
          setHoveredRegion(null);
        }}
      >
        <img src={overlayConfig.src} alt="Human Overlay" style={{ width: "100%", height: "100%", objectFit: "contain" }} className="pointer-events-none" />
        
        {/* HIT AREAS */}
        {regions.map((region) => (
          <div 
            key={region.id} 
            onMouseEnter={() => handleMouseEnter(region.id)} 
            onMouseLeave={handleMouseLeave} 
            onClick={() => region.isSpecial && setSelectedRegion(region.id)} 
            className="absolute cursor-pointer border border-transparent rounded-lg hover:bg-white/5 transition-colors duration-200 z-[60]" 
            style={region.overlayStyle}
          />
        ))}

        {/* DYNAMIC MAGNIFYING LENS */}
        {isHoveringBody && (
          <div 
            className="pointer-events-none absolute z-[100] transition-opacity duration-300"
            style={{ 
              left: `${mousePos.x}px`, 
              top: `${mousePos.y}px`,
              opacity: isHoveringBody ? 1 : 0,
              transform: `translate(-50%, -50%) perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}
          >
            <div className="lens-frame">
              {/* Inner Glass & Glares */}
              <div className="lens-glass" />
              <div className="lens-glare" />
              <div className="lens-glare-secondary" />
              
              {/* Metallic Glints */}
              <div className="lens-glint top-[20%] left-[25%]" />
              <div className="lens-glint top-[15%] left-[20%] scale-50 opacity-50" />
              
              {/* Magnified Content Reveal */}
              <div className="lens-magnified-content flex items-center justify-center">
                {hoveredRegion && organThemes[hoveredRegion] ? (
                  (() => {
                    const region = regions.find(r => r.id === hoveredRegion);
                    if (!region) return null;

                    const containerWidth = 450;
                    const containerHeight = 600; 
                    
                    const regionLeft = parseFloat(region.overlayStyle.left) / 100 * containerWidth;
                    const regionTop = parseFloat(region.overlayStyle.top) / 100 * containerHeight;
                    const regionWidth = parseFloat(region.overlayStyle.width) / 100 * containerWidth;
                    const regionHeight = parseFloat(region.overlayStyle.height) / 100 * containerHeight;
                    
                    const centerX = regionLeft + regionWidth / 2;
                    const centerY = regionTop + regionHeight / 2;
                    
                    const offsetX = (centerX - mousePos.x) * 1.6;
                    const offsetY = (centerY - mousePos.y) * 1.6;

                    return renderThangkaIcon(
                      organThemes[hoveredRegion], 
                      "w-16 h-16", 
                      organThemes[hoveredRegion].icon.endsWith('.jpg') ? 'screen' : undefined,
                      { x: offsetX, y: offsetY }
                    );
                  })()
                ) : (
                  <div className="w-full h-full bg-white/5 backdrop-blur-[2px]" />
                )}
              </div>
              
              {/* Advanced Chromatic Aberration Layers */}
              <div className="absolute inset-0 rounded-full border border-cyan-400/20 mix-blend-screen scale-[1.01] blur-[1px]" />
              <div className="absolute inset-0 rounded-full border border-red-400/20 mix-blend-screen scale-[0.99] blur-[1px]" />
              <div className="absolute inset-0 rounded-full border border-amber-300/10 mix-blend-overlay scale-[1.03]" />
            </div>
            
            {/* Exterior Glow Aura */}
            <div className="absolute inset-0 bg-amber-200/5 blur-3xl rounded-full -z-10" />
            
            {/* Premium Antique Handle */}
            <div className="absolute top-[85%] left-1/2 -translate-x-1/2 w-6 h-20 lens-handle flex flex-col items-center origin-top rotate-[12deg]">
              {/* Golden Ferrule (Neck) */}
              <div className="w-5 h-5 lens-handle-ferrule rounded-t-sm" />
              {/* Wooden Grip */}
              <div className="w-4 h-16 lens-handle-grip rounded-b-xl" />
              {/* Bottom Cap */}
              <div className="absolute bottom-0 w-3 h-1.5 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-800 rounded-b-full shadow-inner" />
            </div>
          </div>
        )}
      </div>

      {selectedTheme && (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-500 bg-black/70 backdrop-blur-md ${selectedRegion ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <div className={`relative w-full max-w-xl bg-zinc-900/98 border ${selectedTheme.border} rounded-3xl overflow-hidden ${selectedTheme.glow} transition-all duration-500 delay-100 ${selectedRegion ? "translate-y-0 scale-100" : "translate-y-8 scale-95"}`}>
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-${selectedTheme.color}-500 to-transparent opacity-80`} />
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-6">
                  <div className={`p-4 ${selectedTheme.bg} rounded-3xl border ${selectedTheme.border} relative group flex items-center justify-center`}>
                    <div className="absolute inset-0 bg-white/5 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    {renderThangkaIcon(selectedTheme, "w-12 h-12", selectedTheme.icon.endsWith('.jpg') ? 'screen' : undefined)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">{selectedTheme.title}</h2>
                    <p className={`${selectedTheme.accent} text-xs font-bold uppercase tracking-[0.2em] opacity-80`}>{selectedTheme.subtitle}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRegion(null)} className="p-3 hover:bg-white/10 rounded-full transition-all text-zinc-400 hover:text-white border border-transparent hover:border-white/10">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {selectedTheme.stats.map((stat: any, idx: number) => (
                  <div key={idx} className="p-6 rounded-2xl bg-zinc-800/40 border border-zinc-700/50 hover:bg-zinc-800/60 transition-all group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                      <span className={`${selectedTheme.accent} text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedTheme.border}`}> {stat.status} </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white group-hover:scale-105 transition-transform origin-left">{stat.value}</span>
                      <span className="text-zinc-500 font-medium text-sm">{stat.unit}</span>
                    </div>
                    <div className="mt-5 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r from-${selectedTheme.color}-600 to-${selectedTheme.color}-400 opacity-80`} style={{ width: `${60 + Math.random() * 30}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className={`p-6 rounded-2xl ${selectedTheme.bg} border ${selectedTheme.border} relative overflow-hidden group`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Clinical Insight: Harmonized</span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed font-light italic"> "{selectedTheme.description}" </p>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  {renderThangkaIcon({ ...selectedTheme, colorTheme: 'grayscale' }, "w-12 h-12")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed z-[100] w-[340px] transition-all duration-300 ease-out pointer-events-none ${getPositionClasses()} ${hoveredRegion && !selectedRegion ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}>
        {activeRegionData && organThemes[lastHovered || ""] && (() => {
          const theme = organThemes[lastHovered || ""];

          // --- Per-organ scroll color palette ---
          const scrollColors: Record<string, { paper: string; paperEdge: string; rollerGrad: string; knobGrad: string; knobBorder: string; borderColor: string; textColor: string; subtitleColor: string; stitchColor: string; ornamentColor: string; glowColor: string; tagBg: string; tagBorder: string; tagText: string; iconBg: string; iconBorder: string; divider: string; statusGlow: string }> = {
            red: {
              paper: '#e8c4b8',
              paperEdge: 'rgba(140, 50, 40, 0.25)',
              rollerGrad: 'linear-gradient(to bottom, #6b2020 0%, #4a1515 15%, #2a0d0d 40%, #1a0808 50%, #2a0d0d 60%, #4a1515 85%, #6b2020 100%)',
              knobGrad: 'linear-gradient(to bottom, #c94c4c, #8b1414, #c94c4c)',
              knobBorder: '#6b1010',
              borderColor: 'rgba(140, 40, 40, 0.4)',
              textColor: '#4a1c1c',
              subtitleColor: '#991b1b',
              stitchColor: 'rgba(180, 60, 40, 0.18)',
              ornamentColor: 'rgba(180, 50, 40, 0.3)',
              glowColor: 'rgba(220, 38, 38, 0.2)',
              tagBg: 'rgba(254, 202, 202, 0.5)',
              tagBorder: 'rgba(140, 40, 40, 0.25)',
              tagText: '#991b1b',
              iconBg: 'rgba(254, 202, 202, 0.5)',
              iconBorder: 'rgba(140, 40, 40, 0.25)',
              divider: 'rgba(140, 40, 40, 0.2)',
              statusGlow: 'rgba(220, 38, 38, 0.6)',
            },
            cyan: {
              paper: '#c4dde8',
              paperEdge: 'rgba(30, 100, 130, 0.25)',
              rollerGrad: 'linear-gradient(to bottom, #1e5a6b 0%, #15404a 15%, #0d2a30 40%, #081a1e 50%, #0d2a30 60%, #15404a 85%, #1e5a6b 100%)',
              knobGrad: 'linear-gradient(to bottom, #4cc9c9, #148b8b, #4cc9c9)',
              knobBorder: '#106b6b',
              borderColor: 'rgba(30, 130, 140, 0.4)',
              textColor: '#164e63',
              subtitleColor: '#0e7490',
              stitchColor: 'rgba(40, 140, 160, 0.18)',
              ornamentColor: 'rgba(40, 140, 160, 0.3)',
              glowColor: 'rgba(34, 211, 238, 0.2)',
              tagBg: 'rgba(165, 243, 252, 0.45)',
              tagBorder: 'rgba(30, 130, 140, 0.25)',
              tagText: '#0e7490',
              iconBg: 'rgba(165, 243, 252, 0.45)',
              iconBorder: 'rgba(30, 130, 140, 0.25)',
              divider: 'rgba(30, 130, 140, 0.2)',
              statusGlow: 'rgba(34, 211, 238, 0.6)',
            },
            blue: {
              paper: '#c4cfe8',
              paperEdge: 'rgba(30, 60, 140, 0.25)',
              rollerGrad: 'linear-gradient(to bottom, #1e3a6b 0%, #15284a 15%, #0d1a2a 40%, #08101a 50%, #0d1a2a 60%, #15284a 85%, #1e3a6b 100%)',
              knobGrad: 'linear-gradient(to bottom, #4c7ac9, #14458b, #4c7ac9)',
              knobBorder: '#103a6b',
              borderColor: 'rgba(40, 60, 140, 0.4)',
              textColor: '#1e3a5f',
              subtitleColor: '#1d4ed8',
              stitchColor: 'rgba(40, 80, 180, 0.18)',
              ornamentColor: 'rgba(40, 80, 180, 0.3)',
              glowColor: 'rgba(59, 130, 246, 0.2)',
              tagBg: 'rgba(191, 219, 254, 0.5)',
              tagBorder: 'rgba(40, 60, 140, 0.25)',
              tagText: '#1d4ed8',
              iconBg: 'rgba(191, 219, 254, 0.5)',
              iconBorder: 'rgba(40, 60, 140, 0.25)',
              divider: 'rgba(40, 60, 140, 0.2)',
              statusGlow: 'rgba(59, 130, 246, 0.6)',
            },
            amber: {
              paper: '#e8d5a3',
              paperEdge: 'rgba(120, 80, 30, 0.25)',
              rollerGrad: 'linear-gradient(to bottom, #6b4226 0%, #4a2f1d 15%, #2a1810 40%, #1a0f08 50%, #2a1810 60%, #4a2f1d 85%, #6b4226 100%)',
              knobGrad: 'linear-gradient(to bottom, #c9a84c, #8b6914, #c9a84c)',
              knobBorder: '#6b4f10',
              borderColor: 'rgba(140, 95, 40, 0.4)',
              textColor: '#4a3520',
              subtitleColor: '#b45309',
              stitchColor: 'rgba(160, 110, 40, 0.18)',
              ornamentColor: 'rgba(160, 110, 40, 0.3)',
              glowColor: 'rgba(245, 158, 11, 0.2)',
              tagBg: 'rgba(253, 230, 138, 0.5)',
              tagBorder: 'rgba(140, 95, 40, 0.25)',
              tagText: '#b45309',
              iconBg: 'rgba(253, 230, 138, 0.5)',
              iconBorder: 'rgba(140, 95, 40, 0.25)',
              divider: 'rgba(140, 95, 40, 0.2)',
              statusGlow: 'rgba(245, 158, 11, 0.6)',
            },
            indigo: {
              paper: '#ccc4e8',
              paperEdge: 'rgba(60, 30, 140, 0.25)',
              rollerGrad: 'linear-gradient(to bottom, #3a1e6b 0%, #28154a 15%, #1a0d2a 40%, #10081a 50%, #1a0d2a 60%, #28154a 85%, #3a1e6b 100%)',
              knobGrad: 'linear-gradient(to bottom, #7a4cc9, #45148b, #7a4cc9)',
              knobBorder: '#3a106b',
              borderColor: 'rgba(80, 40, 160, 0.4)',
              textColor: '#312e81',
              subtitleColor: '#6366f1',
              stitchColor: 'rgba(100, 60, 200, 0.18)',
              ornamentColor: 'rgba(100, 60, 200, 0.3)',
              glowColor: 'rgba(129, 140, 248, 0.25)',
              tagBg: 'rgba(199, 210, 254, 0.5)',
              tagBorder: 'rgba(80, 40, 160, 0.25)',
              tagText: '#4f46e5',
              iconBg: 'rgba(199, 210, 254, 0.5)',
              iconBorder: 'rgba(80, 40, 160, 0.25)',
              divider: 'rgba(80, 40, 160, 0.2)',
              statusGlow: 'rgba(129, 140, 248, 0.6)',
            },
            violet: {
              paper: '#d8c4e8',
              paperEdge: 'rgba(100, 30, 140, 0.25)',
              rollerGrad: 'linear-gradient(to bottom, #5a1e6b 0%, #40154a 15%, #2a0d30 40%, #1a081e 50%, #2a0d30 60%, #40154a 85%, #5a1e6b 100%)',
              knobGrad: 'linear-gradient(to bottom, #a74cc9, #6b148b, #a74cc9)',
              knobBorder: '#55106b',
              borderColor: 'rgba(120, 40, 160, 0.4)',
              textColor: '#3b1764',
              subtitleColor: '#7c3aed',
              stitchColor: 'rgba(140, 60, 200, 0.18)',
              ornamentColor: 'rgba(140, 60, 200, 0.3)',
              glowColor: 'rgba(167, 139, 250, 0.25)',
              tagBg: 'rgba(221, 214, 254, 0.5)',
              tagBorder: 'rgba(120, 40, 160, 0.25)',
              tagText: '#7c3aed',
              iconBg: 'rgba(221, 214, 254, 0.5)',
              iconBorder: 'rgba(120, 40, 160, 0.25)',
              divider: 'rgba(120, 40, 160, 0.2)',
              statusGlow: 'rgba(167, 139, 250, 0.6)',
            },
          };

          const sc = scrollColors[theme.color] || scrollColors.amber;

          return (
            <div className={`relative flex flex-col items-center ${hoveredRegion && !selectedRegion ? "animate-unroll" : ""}`} style={{ perspective: '600px' }}>
              {/* Top Roller — stays fixed, organ-themed */}
              <div className="h-5 w-[106%] scroll-roller rounded-full z-20 relative flex items-center justify-between" style={{ background: sc.rollerGrad }}>
                <div className="absolute -left-1.5 w-4 h-6 rounded-sm" style={{ background: sc.knobGrad, border: `1px solid ${sc.knobBorder}`, boxShadow: `0 0 4px ${sc.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)` }} />
                <div className="absolute -right-1.5 w-4 h-6 rounded-sm" style={{ background: sc.knobGrad, border: `1px solid ${sc.knobBorder}`, boxShadow: `0 0 4px ${sc.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)` }} />
                {/* Decorative center cap */}
                <div className="absolute left-1/2 -translate-x-1/2 w-8 h-2 rounded-full" style={{ background: `linear-gradient(to bottom, ${sc.knobBorder}50, transparent)` }} />
              </div>

              {/* Scroll Paper — organ-themed parchment */}
              <div className="relative w-full scroll-paper font-serif" style={{
                backgroundColor: sc.paper,
                backgroundImage: `linear-gradient(90deg, ${sc.paperEdge} 0%, transparent 6%, transparent 94%, ${sc.paperEdge} 100%), linear-gradient(0deg, ${sc.paperEdge} 0%, transparent 5%, transparent 95%, ${sc.paperEdge} 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
                borderLeft: `2px solid ${sc.borderColor}`,
                borderRight: `2px solid ${sc.borderColor}`,
                boxShadow: `inset 0 0 60px ${sc.paperEdge}, inset 0 2px 4px rgba(255,245,220,0.3), 0 2px 8px rgba(0,0,0,0.3), 0 0 30px ${sc.glowColor}`,
                color: sc.textColor,
              }}>

                {/* Decorative SVG border stitch */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[2]" preserveAspectRatio="none">
                  <rect x="6" y="6" rx="2" fill="none" stroke={sc.stitchColor} strokeWidth="1" strokeDasharray="4 3" style={{ width: 'calc(100% - 12px)', height: 'calc(100% - 12px)' }} />
                </svg>

                {/* Corner ornament — organ-themed */}
                <div className="absolute top-2 right-3 text-sm pointer-events-none z-[3]" style={{ color: sc.ornamentColor }}>◈</div>
                <div className="absolute bottom-2 left-3 text-sm pointer-events-none z-[3] rotate-180" style={{ color: sc.ornamentColor }}>◈</div>

                {/* Inner content wrapper — fades in after the paper unrolls */}
                <div className="scroll-paper-inner px-6 py-6 relative z-10">
                  {/* Background Accent Glow on Paper */}
                  <div className="absolute -right-20 -top-20 w-40 h-40 rounded-full blur-[60px] opacity-20" style={{ backgroundColor: sc.glowColor }} />

                  <div className="flex flex-col gap-4 relative z-10">
                    <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${sc.divider}` }}>
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg shadow-inner" style={{ backgroundColor: sc.iconBg, border: `1px solid ${sc.iconBorder}` }}>
                          {renderThangkaIcon(theme, "w-8 h-8", theme.icon.endsWith('.jpg') ? 'multiply' : 'screen')}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold tracking-tight leading-none" style={{ color: sc.textColor }}>{activeRegionData.name}</h2>
                          <p className="text-[9px] font-black uppercase tracking-wider opacity-90 mt-1" style={{ color: sc.subtitleColor }}>Bio-Sync Active</p>
                        </div>
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full animate-pulse border border-black/20" style={{ backgroundColor: sc.subtitleColor, boxShadow: `0 0 8px ${sc.statusGlow}` }} />
                    </div>

                    <p className="text-sm font-medium leading-relaxed opacity-90">
                      {activeRegionData.description}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-black rounded-sm shadow-sm" style={{ backgroundColor: sc.tagBg, border: `1px solid ${sc.tagBorder}`, color: sc.tagText }}>
                        Status: Scanning
                      </span>
                      <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-black rounded-sm shadow-sm" style={{ backgroundColor: 'rgba(0,0,0,0.06)', border: `1px solid ${sc.tagBorder}`, color: sc.textColor }}>
                        Element: {theme.subtitle.split('(')[1]?.replace(')', '') || 'Prime'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Roller — drops down, organ-themed */}
              <div className="h-5 w-[106%] scroll-roller scroll-roller-bottom rounded-full z-20 relative flex items-center justify-between" style={{ background: sc.rollerGrad }}>
                <div className="absolute -left-1.5 w-4 h-6 rounded-sm" style={{ background: sc.knobGrad, border: `1px solid ${sc.knobBorder}`, boxShadow: `0 0 4px ${sc.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)` }} />
                <div className="absolute -right-1.5 w-4 h-6 rounded-sm" style={{ background: sc.knobGrad, border: `1px solid ${sc.knobBorder}`, boxShadow: `0 0 4px ${sc.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)` }} />
                <div className="absolute left-1/2 -translate-x-1/2 w-8 h-2 rounded-full" style={{ background: `linear-gradient(to bottom, ${sc.knobBorder}50, transparent)` }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Prediction Overlay (Center Bottom) */}
      <div
        style={{
          position: "fixed",
          bottom: predictionOverlayConfig.bottom,
          left: predictionOverlayConfig.left,
          transform: predictionOverlayConfig.transform,
          width: predictionOverlayConfig.width,
          height: predictionOverlayConfig.height,
          zIndex: predictionOverlayConfig.zIndex,
        }}
        className="pointer-events-auto cursor-pointer drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 transition-all duration-300 group"
        onClick={() => setShowInsightsModal(true)}
      >
        <img
          src={predictionOverlayConfig.src}
          alt="Prediction Overlay"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse pointer-events-none" />
      </div>
      
      {/* ML Insights Modal */}
      {showInsightsModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in" onClick={() => setShowInsightsModal(false)}>
          <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 to-red-500 opacity-80" />

            {/* ── Modal Header ── */}
            <div className="px-8 pt-6 pb-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <span className="text-blue-400 text-xl block">❖</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Tsukumo Intelligence Hub</h2>
                </div>
                <button id="close-insights-modal" onClick={() => setShowInsightsModal(false)} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* ── Tab Switcher ── */}
              <div className="flex gap-1 mt-5 bg-zinc-800/60 rounded-xl p-1 w-max">
                <button
                  id="tab-diagnostics"
                  onClick={() => setInsightsTab('diagnostics')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    insightsTab === 'diagnostics'
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >🔬 Diagnostics</button>
                <button
                  id="tab-whatif"
                  onClick={() => { setInsightsTab('whatif'); if (!whatIfData && !whatIfLoading) fetchWhatIf(); }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    insightsTab === 'whatif'
                      ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >🎲 What-If Simulator</button>
              </div>
            </div>

            {/* ── Tab Content ── */}
            <div className="p-8 pt-5 max-h-[75vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

              {/* ════════ DIAGNOSTICS TAB ════════ */}
              {insightsTab === 'diagnostics' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
                    {/* Cardiac Card */}
                    <div className="bg-zinc-800/40 rounded-2xl p-6 border border-zinc-700/50 relative overflow-hidden group">
                      <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors" />
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <span className="text-3xl drop-shadow-md">🫀</span>
                        <h3 className="text-lg font-bold text-zinc-200">Cardiac Arrest Model</h3>
                      </div>
                      <div className="space-y-5 relative z-10">
                        <div>
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Algorithm Alert Status</div>
                          {latestInsights?.cardiac_arrest_risk === 1 ? (
                            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 py-2 px-4 rounded-lg w-max">
                              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                              <span className="text-red-500 font-black text-lg tracking-wider">ELEVATED (1)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 py-2 px-4 rounded-lg w-max">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                              <span className="text-emerald-500 font-bold text-lg tracking-wider">NORMAL (0)</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                          Evaluating ECG variance thresholds &amp; hemodynamic stability vectors via continuous <i>Scikit-Learn</i> streaming interface.
                        </p>
                      </div>
                    </div>

                    {/* Diabetes Card */}
                    <div className="bg-zinc-800/40 rounded-2xl p-6 border border-zinc-700/50 relative overflow-hidden group">
                      <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <span className="text-3xl drop-shadow-md">🩸</span>
                        <h3 className="text-lg font-bold text-zinc-200">Diabetes Predictor</h3>
                      </div>
                      <div className="space-y-5 relative z-10">
                        <div>
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Algorithm Alert Status</div>
                          {latestInsights?.diabetes_risk === 1 ? (
                            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 py-2 px-4 rounded-lg w-max">
                              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                              <span className="text-red-500 font-black text-lg tracking-wider">ELEVATED (1)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 py-2 px-4 rounded-lg w-max">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                              <span className="text-emerald-500 font-bold text-lg tracking-wider">LOW RISK (0)</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                          Applying nonlinear <i>XGBoost</i> decision trees over fasting glucose histories alongside synchronized drive repository states.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-zinc-800/80 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Repository Status: Sync Active</span>
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400 tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse outline outline-2 outline-blue-500/30" />
                      Connection Established
                    </span>
                  </div>
                </>
              )}

              {/* ════════ WHAT-IF TAB ════════ */}
              {insightsTab === 'whatif' && (
                <div className="mt-3">

                  {/* Loading state */}
                  {whatIfLoading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                      <p className="text-zinc-400 text-sm">Running Monte Carlo Simulation…</p>
                      <p className="text-zinc-600 text-xs">Synthesising 3,000 virtual patients from NHANES priors</p>
                    </div>
                  )}

                  {!whatIfLoading && !whatIfData && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <span className="text-5xl">🎲</span>
                      <button id="whatif-run-btn" onClick={() => fetchWhatIf()} className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                        Run What-If Simulation
                      </button>
                      <p className="text-zinc-500 text-xs text-center max-w-xs">
                        Monte Carlo engine (N=3,000) with Framingham/NHANES statistical priors
                      </p>
                    </div>
                  )}

                  {!whatIfLoading && whatIfData && (() => {
                    const filtered = whatIfData.scenarios.filter(s => s.risk_type === whatIfRiskType);
                    const baseline = filtered.find(s => s.scenario === 'Current Trajectory');
                    const baseRisk = baseline?.mean_risk ?? 0;
                    const MAX_BAR  = Math.max(...filtered.map(s => s.p95), 0.01);

                    // Trajectory lines (first 4 scenarios)
                    const trajScenarios = ['Current Trajectory', 'Run 3× / Week', 'Full Lifestyle Optimisation', 'No Sodium Reduction'];
                    const TRAJ_COLORS: Record<string,string> = {
                      'Current Trajectory':          '#7b7bff',
                      'Run 3× / Week':               '#2ecc71',
                      'Full Lifestyle Optimisation': '#00e5ff',
                      'No Sodium Reduction':         '#e74c3c',
                    };

                    const trajPoints = whatIfData.trajectory ?? [];
                    const W = 520, H = 110;
                    const maxRisk = Math.max(...trajScenarios.flatMap(sc =>
                      trajPoints.map((pt: any) => pt[sc]?.p90 ?? 0)
                    ), 0.01);

                    const toX = (week: number) => (week / 24) * W;
                    const toY = (r: number)    => H - (r / maxRisk) * (H - 10) - 5;

                    const makePath = (sc: string) =>
                      trajPoints.map((pt: any, i: number) => {
                        const v = pt[sc]?.mean ?? 0;
                        return (i === 0 ? 'M' : 'L') + `${toX(pt.week).toFixed(1)},${toY(v).toFixed(1)}`;
                      }).join(' ');

                    const makeArea = (sc: string) => {
                      const upper = trajPoints.map((pt: any) =>
                        `${toX(pt.week).toFixed(1)},${toY(pt[sc]?.p90 ?? 0).toFixed(1)}`
                      ).join(' L');
                      const lower = [...trajPoints].reverse().map((pt: any) =>
                        `${toX(pt.week).toFixed(1)},${toY(pt[sc]?.p10 ?? 0).toFixed(1)}`
                      ).join(' L');
                      return `M${upper} L${lower} Z`;
                    };

                    return (
                      <>
                        {/* ── Risk Type Toggle ── */}
                        <div className="flex gap-2 mb-5">
                          {(['cardiac', 'diabetes'] as const).map(rt => (
                            <button
                              key={rt}
                              id={`whatif-toggle-${rt}`}
                              onClick={() => setWhatIfRiskType(rt)}
                              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                whatIfRiskType === rt
                                  ? rt === 'cardiac'
                                    ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                    : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {rt === 'cardiac' ? '🫀' : '🩸'} {rt === 'cardiac' ? 'Cardiac' : 'Diabetes'}
                            </button>
                          ))}
                          <div className="ml-auto flex items-center gap-2">
                            {whatIfData._mock && (
                              <span className="text-[9px] text-amber-500/60 uppercase tracking-wider border border-amber-500/20 px-2 py-0.5 rounded">offline · mock data</span>
                            )}
                            <button
                              id="whatif-refresh-btn"
                              onClick={() => fetchWhatIf()}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-violet-600/30 text-zinc-400 hover:text-violet-300 border border-zinc-700 transition-all"
                              title="Re-run simulation"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* ── Scenario Bars ── */}
                        <div className="space-y-2.5 mb-6">
                          {filtered.map((sc, idx) => {
                            const delta  = sc.mean_risk - baseRisk;
                            const isBase = sc.scenario === 'Current Trajectory';
                            return (
                              <div key={idx} className="group">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[11px] text-zinc-300 font-semibold truncate max-w-[55%]" title={sc.scenario}>
                                    {sc.scenario}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {!isBase && (
                                      <span className={`text-[10px] font-bold ${delta < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {delta < 0 ? '⬇' : '⬆'} {Math.abs(delta * 100).toFixed(1)}%
                                      </span>
                                    )}
                                    <span className="text-[11px] font-black" style={{ color: sc.color }}>
                                      {(sc.mean_risk * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                                <div className="relative h-2.5 bg-zinc-800 rounded-full overflow-visible">
                                  {/* CI band */}
                                  <div
                                    className="absolute top-0 h-full rounded-full opacity-20"
                                    style={{
                                      left:  `${(sc.p05 / MAX_BAR) * 100}%`,
                                      width: `${((sc.p95 - sc.p05) / MAX_BAR) * 100}%`,
                                      backgroundColor: sc.color,
                                    }}
                                  />
                                  {/* Mean bar */}
                                  <div
                                    className="absolute top-0 h-full rounded-full transition-all duration-700"
                                    style={{
                                      width: `${(sc.mean_risk / MAX_BAR) * 100}%`,
                                      background: `linear-gradient(90deg, ${sc.color}99, ${sc.color})`,
                                      boxShadow: `0 0 8px ${sc.color}55`,
                                    }}
                                  />
                                  {/* Baseline tick */}
                                  {isBase && (
                                    <div
                                      className="absolute top-[-3px] bottom-[-3px] w-px bg-white/50"
                                      style={{ left: `${(sc.mean_risk / MAX_BAR) * 100}%` }}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* ── 6-Month Trajectory SVG ── */}
                        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-4 mb-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">6-Month Trajectory Projection</span>
                          </div>
                          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 110 }}>
                            {/* Grid lines */}
                            {[0.25, 0.5, 0.75, 1.0].map(f => (
                              <line key={f}
                                x1={0} y1={toY(maxRisk * f)}
                                x2={W} y2={toY(maxRisk * f)}
                                stroke="#ffffff08" strokeWidth={1}
                              />
                            ))}
                            {/* Areas + lines */}
                            {trajScenarios.map(sc => (
                              trajPoints.length > 0 && (
                                <g key={sc}>
                                  <path d={makeArea(sc)} fill={TRAJ_COLORS[sc]} fillOpacity={0.06} />
                                  <path d={makePath(sc)} fill="none" stroke={TRAJ_COLORS[sc]} strokeWidth={1.8} strokeLinejoin="round" />
                                </g>
                              )
                            ))}
                          </svg>
                          {/* Legend */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {trajScenarios.map(sc => (
                              <div key={sc} className="flex items-center gap-1.5">
                                <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: TRAJ_COLORS[sc] }} />
                                <span className="text-[9px] text-zinc-500">{sc}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ── Probability Statements ── */}
                        <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-4">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Probability Statements (vs baseline)</p>
                          <div className="space-y-1.5">
                            {filtered.filter(s => s.scenario !== 'Current Trajectory').map((sc, idx) => {
                              const drop5 = Math.max(0, Math.min(1, 0.5 + (baseRisk - sc.mean_risk) * 4));
                              const isBetter = sc.mean_risk < baseRisk;
                              return (
                                <div key={idx} className="flex items-start gap-2">
                                  <span className="mt-0.5 text-sm">{isBetter ? '✅' : '⚠️'}</span>
                                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                                    <span className="font-bold" style={{ color: sc.color }}>{sc.scenario}</span>:
                                    {' '}{isBetter ? 'There is a ' : 'Risk may rise — '}
                                    {isBetter && (
                                      <span className="font-black text-emerald-400">{(drop5 * 100).toFixed(0)}% chance</span>
                                    )}
                                    {isBetter
                                      ? ' your risk drops ≥5% if maintained for 6 months.'
                                      : `estimated +${((sc.mean_risk - baseRisk)*100).toFixed(1)}% vs baseline.`
                                    }
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Summary */}
                        <p className="text-[9px] text-zinc-600 mt-4 leading-relaxed italic">
                          {whatIfData.summary}
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}

            </div>{/* end tab content */}
          </div>
        </div>
      )}

      {/* Resources Overlay (Left Bottom) */}
      <div
        style={{
          position: "fixed",
          bottom: resourcesOverlayConfig.bottom,
          left: resourcesOverlayConfig.left,
          width: resourcesOverlayConfig.width,
          height: resourcesOverlayConfig.height,
          zIndex: resourcesOverlayConfig.zIndex,
        }}
        className="pointer-events-none drop-shadow-xl"
      >
        <img
          src={resourcesOverlayConfig.src}
          alt="Resources Overlay"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Put your actual page background content below */}
      <div className="relative z-10 p-8 text-center" />
    </main>
  );
}

export default Page;