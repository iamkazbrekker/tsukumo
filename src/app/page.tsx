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

function Page() {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [lastHovered, setLastHovered] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringBody, setIsHoveringBody] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [latestInsights, setLatestInsights] = useState<any>(null);
  const lastSourceFileRef = React.useRef<string | null>(null);
  const [liveNotifications, setLiveNotifications] = useState<any[]>([
    { icon: '🔥', title: 'Cardiac Rhythm Shift', desc: 'Heart rate variance detected at 04:38 AM. Minor fluctuation.', time: '2h ago', severity: 'warn' },
    { icon: '💧', title: 'Hydration Reminder', desc: 'Renal filtration suggests low fluid intake today.', time: '3h ago', severity: 'info' },
    { icon: '🌬️', title: 'Breath Pattern Normal', desc: 'Respiratory cycle aligned with optimal prana flow.', time: '5h ago', severity: 'ok' },
    { icon: '⚡', title: 'Neural Coherence Peak', desc: 'Alpha wave synchrony reached meditative state at dawn.', time: '6h ago', severity: 'ok' },
    { icon: '🌡️', title: 'Agni Metabolic Check', desc: 'Digestive fire steady. Post-meal thermogenesis within range.', time: '8h ago', severity: 'info' },
    { icon: '👁️', title: 'Ocular Strain Alert', desc: 'Extended screen exposure. Blink rate below baseline.', time: '10h ago', severity: 'warn' }
  ]);

  // --- AGENT STATE ---
  const [preppedBooking, setPreppedBooking] = useState<any>(null);
  const [internalMonologue, setInternalMonologue] = useState<string[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'confirmed' | 'failed'>('idle');
  const [finalBookingData, setFinalBookingData] = useState<any>(null);
  const [lastAutoPoppedReason, setLastAutoPoppedReason] = useState<string | null>(null);
  const [stressLevel, setStressLevel] = useState(0.1);
  const [compositeRisk, setCompositeRisk] = useState(0);

  // --- COGNITIVE HEALTH TWIN STATE ---
  const [showCHTModal, setShowCHTModal] = useState(false);
  const [chtData, setChtData] = useState<any>(null);
  const [chtTab, setChtTab] = useState<'graph' | 'phm' | 'shap' | 'narrative'>('phm');
  const [chtLoading, setChtLoading] = useState(false);
  const [phmData, setPhmData] = useState<any>(null);

  const isEmergency = compositeRisk > 0.5 || preppedBooking?.urgency === 'High';


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
        
        if (data && !data.error) {
          if (data.source_file === lastSourceFileRef.current) return; 
          lastSourceFileRef.current = data.source_file;

          // Update Agent States
          if (data.prepped_booking) {
            setPreppedBooking(data.prepped_booking);
            // Automatically prompt if high urgency and not already handled for this specific reason
            if (data.prepped_booking.urgency === 'High' && 
                bookingStatus === 'idle' && 
                data.prepped_booking.reason !== lastAutoPoppedReason
            ) {
                setShowBookingModal(true);
                setLastAutoPoppedReason(data.prepped_booking.reason);
            }
          }
          if (data.internal_monologue) {
            setInternalMonologue(data.internal_monologue);
          }
          if (data.stress_level !== undefined) {
            setStressLevel(data.stress_level);
          }
          if (data.composite_risk !== undefined) {
            setCompositeRisk(data.composite_risk);
          }
          // Store PHM and CHT data from the enhanced vitals response
          if (data.phm) {
            setPhmData(data.phm);
          }
          if (data.cht) {
            setChtData(data.cht);
          }

          const preds = data.predictions || {};
          setLatestInsights(preds);

          const newNotifs: any[] = [];
          
          if (data.prepped_booking) {
             newNotifs.push({
               icon: '⚕️',
               title: `Agent: ${data.prepped_booking.specialty} Healer Prep`,
               desc: data.prepped_booking.reason,
               time: 'just now',
               severity: data.prepped_booking.urgency === 'High' ? 'warn' : 'info'
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

  // Fetch full CHT data when modal opens
  const fetchCHTData = async () => {
    setChtLoading(true);
    try {
      const res = await fetch('/api/cht?endpoint=cht-full&patient_id=patient_001');
      const data = await res.json();
      setChtData(data.graph_rag || data);
      if (data.phm) setPhmData(data.phm);
    } catch (e) {
      console.error('Failed to fetch CHT data', e);
    }
    setChtLoading(false);
  };


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
    <main className="relative min-h-screen w-full overflow-hidden">
      <ThangkaFilters />

      {/* Emergency Alert Outline */}

      <div 
        className={`emergency-outline transition-opacity duration-1000 ease-in-out ${isEmergency ? 'opacity-100' : 'opacity-0'}`}
      />


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
      <div className="fixed left-60 top-1/3 -translate-y-1/2 z-[120] w-[260px] flex flex-col items-center" style={{ perspective: '800px' }}>

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

      {/* ======== BOTTOM ACTION BAR ======== */}
      <div className="fixed bottom-10 left-10 z-[150] flex gap-3">
        {/* Doctor Appointment Button */}
        <button 
          onClick={() => setShowBookingModal(true)}
          className={`
            group relative flex items-center gap-3 px-6 py-4 rounded-2xl 
            bg-gradient-to-br from-amber-900/80 to-stone-900/90 
            border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.1)]
            hover:border-amber-400/60 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)]
            transition-all duration-500 overflow-hidden
          `}
        >
          <div className="absolute inset-0 bg-[url('/assets/thangka/paper-texture.png')] opacity-10 mix-blend-overlay" />
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 group-hover:scale-110 transition-transform">
             <span className="text-xl">⚕️</span>
          </div>
          <div className="relative text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 opacity-80">Autonomous Care</p>
            <h3 className="text-sm font-bold text-amber-100 tracking-wide">Doctor Appointment</h3>
          </div>
          {preppedBooking && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          )}
          {preppedBooking && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          )}
        </button>

        {/* Cognitive Health Twin Button */}
        <button 
          onClick={() => { setShowCHTModal(true); fetchCHTData(); }}
          className={`
            group relative flex items-center gap-3 px-6 py-4 rounded-2xl 
            bg-gradient-to-br from-violet-950/80 to-stone-950/90 
            border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.1)]
            hover:border-violet-400/50 hover:shadow-[0_0_40px_rgba(139,92,246,0.2)]
            transition-all duration-500 overflow-hidden
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-teal-500/5" />
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/30 group-hover:scale-110 transition-transform">
            <span className="text-xl">🧠</span>
          </div>
          <div className="relative text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 opacity-80">Cognitive Twin</p>
            <h3 className="text-sm font-bold text-violet-100 tracking-wide">Health Intelligence</h3>
          </div>
          {phmData && phmData.health_tier >= 3 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full animate-ping" style={{ backgroundColor: phmData.tier_color, boxShadow: `0 0 10px ${phmData.tier_color}` }} />
          )}
          {phmData && (
            <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white" style={{ backgroundColor: phmData.tier_color }}>
              T{phmData.health_tier}
            </div>
          )}
        </button>
      </div>

      {/* ======== APPOINTMENT CONFIRMATION MODAL ======== */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="relative w-full max-w-2xl bg-stone-950 border border-amber-900/50 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-[url('/assets/thangka/paper-texture.png')] opacity-5 pointer-events-none" />
            
            {/* Header */}
            <div className="relative p-8 border-b border-amber-900/20 bg-gradient-to-b from-amber-900/5 to-transparent">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
                    🏥
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-amber-50 tracking-tight">Healer Consultation Prep</h2>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-500/80">Cognitive Health Integration</p>
                  </div>
                </div>
                <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-stone-500 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side: Agent Reasoning */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-3">Agent Reasoning</h4>
                  <div className="bg-stone-900/50 border border-amber-900/20 rounded-2xl p-4 h-[250px] overflow-y-auto space-y-3 font-mono text-[11px]">
                    {internalMonologue.map((thought, i) => (
                      <div key={i} className="text-amber-200/70 border-l-2 border-amber-500/30 pl-3">
                        {thought}
                      </div>
                    ))}
                    {internalMonologue.length === 0 && <div className="text-stone-600 italic">No activity detected... waiting for vitals stream.</div>}
                  </div>
                </div>
              </div>

              {/* Right Side: Appointment Data */}
              <div className="space-y-6">
                {preppedBooking ? (
                  <>
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <span className="text-6xl">✨</span>
                       </div>
                       <div className="relative z-10">
                         <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 ${preppedBooking.urgency === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                           {preppedBooking.urgency} Urgency
                         </span>
                         <h3 className="text-xl font-bold text-white mb-2">{preppedBooking.specialty} Specialist</h3>
                         <p className="text-sm text-stone-400 leading-relaxed italic">"{preppedBooking.reason}"</p>
                       </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-3">Time Window</h4>
                      <div className="flex gap-2">
                        <button className="flex-1 py-3 px-4 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors">
                          {preppedBooking.recommended_window}
                        </button>
                        <button className="flex-1 py-3 px-4 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 font-bold text-xs hover:text-white transition-colors">
                          Custom
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center text-3xl opacity-50">
                      ⚖️
                    </div>
                    <p className="text-stone-500 text-sm">Vitals are currently in harmonized state.<br/>Manual booking is available if needed.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-8 pt-0 flex gap-4">
              <button 
                disabled={!preppedBooking || bookingStatus === 'booking'}
                onClick={async () => {
                  setBookingStatus('booking');
                  try {
                    const res = await fetch('http://127.0.0.1:8000/confirm-booking', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            booking_id: `HEART-REQ-${Date.now()}`,
                            preferred_time_window: preppedBooking?.recommended_window || 'Normal'
                        })
                    });
                    const result = await res.json();
                    setFinalBookingData(result);
                    setBookingStatus('confirmed');
                  } catch (e) {
                    setBookingStatus('failed');
                  }
                }}
                className={`flex-[2] py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all duration-500 ${!preppedBooking ? 'bg-stone-900 text-stone-700 cursor-not-allowed' : 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] shadow-lg'}`}
              >
                {bookingStatus === 'booking' ? 'Invoking Sacred Healer...' : bookingStatus === 'confirmed' ? 'Successfully Linked' : 'Confirm Healer Appointment'}
              </button>
              <button onClick={() => setShowBookingModal(false)} className="flex-1 py-4 rounded-2xl bg-stone-900 border border-stone-800 text-stone-400 font-bold uppercase tracking-[0.1em] text-xs hover:text-white transition-all">
                Dismiss
              </button>
            </div>

            {/* Success Overlay */}
            {bookingStatus === 'confirmed' && finalBookingData && (
              <div className="absolute inset-0 z-50 bg-stone-950/95 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-4xl mb-6 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                  🏮
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Appointment Harmonized</h2>
                <p className="text-amber-500 font-bold tracking-widest uppercase text-[10px] mb-8">Booking ID: {finalBookingData.booking_id}</p>
                
                <div className="bg-stone-900 border border-amber-900/30 rounded-3xl p-6 w-full max-w-sm mb-8">
                  <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Your assigned healer</p>
                  <p className="text-xl font-bold text-amber-50 mb-4">{finalBookingData.healer_name}</p>
                  <div className="flex justify-between items-center text-sm border-t border-white/5 pt-4">
                    <span className="text-stone-500">Scheduled Time</span>
                    <span className="text-white font-mono">{new Date(finalBookingData.time).toLocaleString()}</span>
                  </div>
                </div>

                <button onClick={() => { setShowBookingModal(false); setBookingStatus('idle'); }} className="px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-all">
                  Return to Dashboard
                </button>
              </div>
            )}
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
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-red-500 opacity-80" />
            
            <div className="p-8">
              <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
                <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                     <span className="text-blue-400 text-xl block">❖</span>
                  </div>
                  System Diagnostics
                </h2>
                <button onClick={() => setShowInsightsModal(false)} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          Evaluating ECG variance thresholds & hemodynamic stability vectors via continuous <i>Scikit-Learn</i> streaming interface.
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

              <div className="mt-8 pt-5 border-t border-zinc-800/80 flex justify-between items-center bg-zinc-900/50">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Repository Status: Sync Active</span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400 tracking-wider">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse outline outline-2 outline-blue-500/30" /> 
                   Connection Established
                </span>
              </div>
            </div>
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

      {/* ======== COGNITIVE HEALTH TWIN MODAL ======== */}
      {showCHTModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div className="cht-modal-content relative w-full max-w-5xl max-h-[90vh] bg-stone-950 border border-violet-900/40 rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(139,92,246,0.15)]">
            
            {/* Decorative gradient border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 via-teal-500 to-amber-500 opacity-80" />
            
            {/* Header */}
            <div className="relative p-6 border-b border-violet-900/20 bg-gradient-to-b from-violet-950/30 to-transparent">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-teal-500/10 border border-violet-500/30 flex items-center justify-center text-2xl">
                    🧠
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Cognitive Health Twin</h2>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-400/80">Agentic Graph RAG + PHM Pipeline</p>
                  </div>
                  {/* Health Tier Badge */}
                  {phmData && (
                    <div className="cht-tier-badge ml-4 px-4 py-2 rounded-xl border flex items-center gap-2" 
                         data-tier={phmData.health_tier}
                         style={{ borderColor: phmData.tier_color + '60', backgroundColor: phmData.tier_color + '15' }}>
                      <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: phmData.tier_color, boxShadow: `0 0 8px ${phmData.tier_color}` }} />
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: phmData.tier_color }}>
                        Tier {phmData.health_tier}: {phmData.tier_name}
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowCHTModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-stone-500 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex gap-1 mt-5">
                {([
                  { key: 'phm', label: 'PHM Timeline', icon: '📊' },
                  { key: 'shap', label: 'Explainability', icon: '🔍' },
                  { key: 'graph', label: 'Knowledge Graph', icon: '🕸️' },
                  { key: 'narrative', label: 'Agent Narrative', icon: '📜' },
                ] as const).map(tab => (
                  <button 
                    key={tab.key}
                    onClick={() => setChtTab(tab.key)}
                    className={`cht-tab px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      chtTab === tab.key 
                        ? 'bg-stone-900 text-amber-400 active' 
                        : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50'
                    }`}
                  >
                    <span className="mr-1.5">{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto cht-scroll" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {chtLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                  <p className="mt-4 text-stone-500 text-sm font-medium">Activating Cognitive Health Twin...</p>
                  <p className="text-stone-600 text-xs mt-1">Running Agentic Graph RAG + PHM Pipeline</p>
                </div>
              ) : (
                <>
                  {/* ===== PHM TIMELINE TAB ===== */}
                  {chtTab === 'phm' && phmData && (
                    <div className="space-y-6">
                      {/* Top Stats Row */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-2">PHM Score</p>
                          <p className="text-3xl font-black" style={{ color: phmData.tier_color }}>{(phmData.composite_phm_score * 100).toFixed(0)}%</p>
                        </div>
                        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-2">Health Tier</p>
                          <p className="text-3xl font-black" style={{ color: phmData.tier_color }}>{phmData.tier_name}</p>
                        </div>
                        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 text-center cht-rul-display">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-2">Days to Next Tier</p>
                          <p className="text-3xl font-black text-white">{phmData.rul_days}<span className="text-lg text-stone-500 ml-1">d</span></p>
                        </div>
                        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-2">RUL Confidence</p>
                          <p className="text-3xl font-black text-violet-400">{(phmData.rul_confidence * 100).toFixed(0)}%</p>
                        </div>
                      </div>

                      {/* Trend Indicators */}
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-3">Vital Trends (90-Day Window)</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {phmData.trends && Object.entries(phmData.trends).map(([key, trend]: [string, any]) => (
                            <div key={key} className="bg-stone-900/40 border border-stone-800/50 rounded-xl p-3 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-bold text-stone-400 capitalize">{key.replace(/_/g, ' ')}</p>
                                <p className="text-sm font-black text-white">{typeof trend.current === 'number' ? (Number.isInteger(trend.current) ? trend.current : trend.current.toFixed(1)) : trend.current}</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  trend.direction === 'worsening' ? 'bg-red-500/15 text-red-400' :
                                  trend.direction === 'improving' ? 'bg-emerald-500/15 text-emerald-400' :
                                  'bg-stone-800 text-stone-500'
                                }`}>
                                  {trend.direction === 'worsening' ? '▲' : trend.direction === 'improving' ? '▼' : '—'} {Math.abs(trend.pct_change || 0).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Alerts */}
                      {phmData.alerts && phmData.alerts.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/60 mb-3">PHM Alerts</h4>
                          <div className="space-y-2">
                            {phmData.alerts.map((alert: string, i: number) => (
                              <div key={i} className="bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-2.5 text-xs text-red-300/90 flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">⚠</span>
                                {alert}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PHM Timeline Chart */}
                      {phmData.timeline && phmData.timeline.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-3">PHM Score Timeline</h4>
                          <div className="bg-stone-900/40 border border-stone-800/50 rounded-2xl p-4">
                            <svg width="100%" height="120" viewBox="0 0 800 120" preserveAspectRatio="none">
                              {/* Tier bands */}
                              <rect x="0" y="0" width="800" height="18" fill="rgba(220,38,38,0.06)" />
                              <rect x="0" y="18" width="800" height="24" fill="rgba(239,68,68,0.05)" />
                              <rect x="0" y="42" width="800" height="24" fill="rgba(249,115,22,0.04)" />
                              <rect x="0" y="66" width="800" height="24" fill="rgba(245,158,11,0.03)" />
                              <rect x="0" y="90" width="800" height="30" fill="rgba(16,185,129,0.03)" />
                              {/* Score line */}
                              <polyline
                                fill="none"
                                stroke="url(#chtGradient)"
                                strokeWidth="2"
                                points={phmData.timeline.map((p: any, i: number) => {
                                  const x = (i / Math.max(1, phmData.timeline.length - 1)) * 800;
                                  const y = 120 - (p.phm_score * 120);
                                  return `${x},${y}`;
                                }).join(' ')}
                              />
                              {/* Current point */}
                              {phmData.timeline.length > 0 && (() => {
                                const last = phmData.timeline[phmData.timeline.length - 1];
                                const x = 800;
                                const y = 120 - (last.phm_score * 120);
                                return (
                                  <>
                                    <circle cx={x} cy={y} r="5" fill={last.tier_color} className="cht-timeline-dot" />
                                    <circle cx={x} cy={y} r="8" fill="none" stroke={last.tier_color} strokeWidth="1" opacity="0.4" />
                                  </>
                                );
                              })()}
                              <defs>
                                <linearGradient id="chtGradient" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#10b981" />
                                  <stop offset="50%" stopColor="#f59e0b" />
                                  <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="flex justify-between mt-2 text-[8px] text-stone-600 uppercase tracking-wider">
                              <span>90 days ago</span>
                              <span>Today</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== SHAP EXPLAINABILITY TAB ===== */}
                  {chtTab === 'shap' && phmData && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-1">Feature Importance (SHAP Analysis)</h4>
                        <p className="text-xs text-stone-500 mb-4">Which factors contributed most to the current risk score</p>
                        
                        <div className="space-y-3">
                          {phmData.feature_importances && Object.entries(phmData.feature_importances)
                            .sort(([,a]: any, [,b]: any) => b - a)
                            .map(([key, value]: [string, any], i: number) => {
                              const pct = (value * 100).toFixed(1);
                              const barColors: Record<string, string> = {
                                heart_rate: '#ef4444',
                                blood_pressure_systolic: '#f97316',
                                blood_pressure_diastolic: '#fb923c',
                                glucose_level: '#f59e0b',
                                spo2: '#06b6d4',
                                sleep_hours: '#8b5cf6',
                                stress_level: '#ec4899',
                                glycemic_variability: '#d97706',
                                sleep_debt: '#7c3aed',
                                hrv_instability: '#dc2626',
                              };
                              const color = barColors[key] || '#6b7280';
                              return (
                                <div key={key} className="flex items-center gap-3">
                                  <div className="w-40 text-right">
                                    <span className="text-[10px] font-bold text-stone-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                  </div>
                                  <div className="flex-1 h-6 bg-stone-900/60 rounded-full overflow-hidden border border-stone-800/50 relative">
                                    <div 
                                      className="cht-shap-bar animate h-full rounded-full relative"
                                      style={{ 
                                        width: `${Math.min(100, value * 100 * 2.5)}%`,
                                        background: `linear-gradient(90deg, ${color}40, ${color})`,
                                        animationDelay: `${i * 0.1}s`,
                                      }}
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                                    </div>
                                  </div>
                                  <span className="text-xs font-black w-12 text-right" style={{ color }}>{pct}%</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Clinical Flags */}
                      {chtData?.analysis?.clinical_flags && chtData.analysis.clinical_flags.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-3">Clinical Flags</h4>
                          <div className="space-y-2">
                            {chtData.analysis.clinical_flags.map((flag: string, i: number) => (
                              <div key={i} className="border-l-2 border-amber-500/50 bg-amber-500/5 rounded-r-xl px-4 py-3 text-xs text-amber-200/80">
                                {flag}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Guideline Assessments */}
                      {chtData?.analysis?.guideline_assessments && chtData.analysis.guideline_assessments.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500/60 mb-3">Clinical Guideline Assessment</h4>
                          <div className="space-y-3">
                            {chtData.analysis.guideline_assessments.map((assess: any, i: number) => (
                              <div key={i} className="bg-stone-900/40 border border-stone-800/50 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-black text-violet-400">{assess.guideline}</span>
                                  <span className="text-[8px] text-stone-500">({assess.source})</span>
                                </div>
                                {assess.violations?.map((v: any, j: number) => (
                                  <div key={j} className="ml-3 mt-2 text-xs">
                                    <span className="text-stone-300 font-bold">{v.parameter}:</span>
                                    <span className="text-white font-black ml-1">{v.value}</span>
                                    <span className="text-red-400 ml-2">→ {v.classification}</span>
                                    <p className="text-stone-500 text-[10px] mt-0.5 italic">Action: {v.action}</p>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== KNOWLEDGE GRAPH TAB ===== */}
                  {chtTab === 'graph' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-1">Patient Knowledge Graph</h4>
                        <p className="text-xs text-stone-500 mb-4">Interactive medical entity relationship map</p>
                      </div>

                      {/* Graph Legend */}
                      <div className="flex flex-wrap gap-3 mb-2">
                        {[
                          { type: 'Patient', color: '#8b5cf6' },
                          { type: 'Biomarker', color: '#f59e0b' },
                          { type: 'Disease', color: '#ef4444' },
                          { type: 'Medication', color: '#3b82f6' },
                          { type: 'Symptom', color: '#ec4899' },
                          { type: 'Lifestyle', color: '#10b981' },
                          { type: 'Guideline', color: '#6366f1' },
                          { type: 'Organ', color: '#14b8a6' },
                        ].map(item => (
                          <div key={item.type} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">{item.type}</span>
                          </div>
                        ))}
                      </div>

                      {/* Graph SVG */}
                      <div className="bg-stone-900/40 border border-stone-800/50 rounded-2xl p-1 overflow-hidden">
                        {chtData?.graph_data || chtData?.graph_visualization ? (() => {
                          const graphData = chtData.graph_data || chtData.graph_visualization;
                          const nodes = graphData?.nodes || [];
                          const edges = graphData?.edges || [];
                          
                          if (nodes.length === 0) {
                            return <p className="text-stone-600 text-center py-10 text-sm">Start the Python backend to see the live Knowledge Graph</p>;
                          }

                          // Simple force-directed-ish layout (computed deterministically)
                          const nodeColors: Record<string, string> = {
                            Patient: '#8b5cf6', Biomarker: '#f59e0b', Disease: '#ef4444',
                            Medication: '#3b82f6', Symptom: '#ec4899', LifestyleFactor: '#10b981',
                            ClinicalGuideline: '#6366f1', OrganSystem: '#14b8a6',
                          };
                          const nodeRadius: Record<string, number> = {
                            Patient: 12, Disease: 10, Biomarker: 8, Medication: 7,
                            Symptom: 6, LifestyleFactor: 7, ClinicalGuideline: 6, OrganSystem: 8,
                          };
                          
                          // Layout nodes in concentric circles by type
                          const typeOrder = ['Patient', 'Biomarker', 'Disease', 'OrganSystem', 'Symptom', 'Medication', 'LifestyleFactor', 'ClinicalGuideline'];
                          const positioned = nodes.map((n: any, i: number) => {
                            const typeIndex = typeOrder.indexOf(n.type || n.group);
                            const ring = typeIndex >= 0 ? typeIndex : 4;
                            const sameType = nodes.filter((m: any) => (m.type || m.group) === (n.type || n.group));
                            const indexInType = sameType.indexOf(n);
                            const angleOffset = (ring * 0.7);
                            const angle = angleOffset + (indexInType / Math.max(1, sameType.length)) * Math.PI * 2;
                            const radius = 60 + ring * 45;
                            return {
                              ...n,
                              x: 400 + Math.cos(angle) * radius,
                              y: 220 + Math.sin(angle) * radius * 0.7,
                              color: nodeColors[(n.type || n.group) as string] || '#6b7280',
                              r: nodeRadius[(n.type || n.group) as string] || 6,
                            };
                          });

                          const nodeMap: Record<string, any> = {};
                          positioned.forEach((n: any) => { nodeMap[n.id] = n; });

                          return (
                            <svg width="100%" height="440" viewBox="0 0 800 440">
                              {/* Edges */}
                              {edges.slice(0, 80).map((e: any, i: number) => {
                                const src = nodeMap[e.source];
                                const tgt = nodeMap[e.target];
                                if (!src || !tgt) return null;
                                return (
                                  <line
                                    key={`e-${i}`}
                                    x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                                    stroke="rgba(255,255,255,0.06)"
                                    strokeWidth="1"
                                    className="kg-edge"
                                    style={{ animationDelay: `${i * 0.02}s` }}
                                  />
                                );
                              })}
                              {/* Nodes */}
                              {positioned.slice(0, 50).map((n: any, i: number) => (
                                <g key={n.id} className="kg-node" style={{ animationDelay: `${i * 0.03}s` }}>
                                  <circle cx={n.x} cy={n.y} r={n.r + 2} fill={n.color} opacity="0.15" />
                                  <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                                  <title>{n.label} ({n.type || n.group})</title>
                                  {n.r >= 8 && (
                                    <text x={n.x} y={n.y + n.r + 12} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="7" fontWeight="bold">
                                      {n.label?.length > 18 ? n.label.substring(0, 16) + '…' : n.label}
                                    </text>
                                  )}
                                </g>
                              ))}
                            </svg>
                          );
                        })() : (
                          <p className="text-stone-600 text-center py-10 text-sm">Loading graph data...</p>
                        )}
                      </div>

                      {/* At-Risk Diseases */}
                      {chtData?.retrieval?.at_risk_diseases && chtData.retrieval.at_risk_diseases.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/60 mb-3">Graph-Traced Disease Risks</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {chtData.retrieval.at_risk_diseases.map((disease: any, i: number) => (
                              <div key={i} className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
                                <p className="text-sm font-bold text-red-300">{disease.label}</p>
                                {disease.contributing_biomarkers && (
                                  <p className="text-[9px] text-stone-500 mt-1">
                                    Via: {disease.contributing_biomarkers.map((b: string) => b.replace('bm_', '').replace(/_/g, ' ')).join(', ')}
                                  </p>
                                )}
                                {disease.indirect_via && (
                                  <p className="text-[9px] text-amber-500/60 mt-0.5 italic">Indirect via {disease.indirect_via}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== AGENT NARRATIVE TAB ===== */}
                  {chtTab === 'narrative' && (
                    <div className="space-y-6">
                      {/* Summary */}
                      <div className="bg-gradient-to-br from-violet-950/40 to-stone-900/60 border border-violet-500/20 rounded-2xl p-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/80 mb-3">Agent Summary</h4>
                        <p className="text-sm text-stone-300 leading-relaxed">
                          {chtData?.narrative?.short_summary || 'Awaiting agent analysis... Start the Python backend for full narrative capabilities.'}
                        </p>
                      </div>

                      {/* Severity + Primary Concern */}
                      {chtData?.analysis && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-stone-900/40 border border-stone-800/50 rounded-xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-2">Overall Severity</p>
                            <p className={`text-xl font-black ${
                              chtData.analysis.severity === 'CRITICAL' ? 'text-red-500' :
                              chtData.analysis.severity === 'HIGH' ? 'text-orange-500' :
                              chtData.analysis.severity === 'MODERATE' ? 'text-amber-500' :
                              'text-emerald-500'
                            }`}>{chtData.analysis.severity}</p>
                          </div>
                          <div className="bg-stone-900/40 border border-stone-800/50 rounded-xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-2">Primary Concern</p>
                            <p className="text-xs text-stone-300 leading-relaxed">{chtData.analysis.primary_concern}</p>
                          </div>
                        </div>
                      )}

                      {/* Full Narrative */}
                      {chtData?.narrative?.full_narrative && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-3">Full Agent Narrative</h4>
                          <div className="bg-stone-900/40 border border-stone-800/50 rounded-2xl p-5 cht-narrative-text">
                            <pre className="text-xs text-stone-400 leading-relaxed whitespace-pre-wrap font-mono" style={{ fontFamily: 'Georgia, serif' }}>
                              {chtData.narrative.full_narrative}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Affected Systems */}
                      {chtData?.retrieval?.affected_systems && chtData.retrieval.affected_systems.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500/60 mb-3">Affected Organ Systems</h4>
                          <div className="flex flex-wrap gap-2">
                            {chtData.retrieval.affected_systems.map((sys: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-xs font-bold text-teal-400">
                                {sys}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Internal Monologue */}
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600 mb-3">Agent Internal Monologue</h4>
                        <div className="bg-stone-900/30 border border-stone-800/30 rounded-xl p-4 max-h-[200px] overflow-y-auto cht-scroll">
                          {internalMonologue.length > 0 ? internalMonologue.map((thought, i) => (
                            <div key={i} className="text-[11px] text-stone-500 border-l-2 border-stone-800 pl-3 py-1 font-mono">
                              {thought}
                            </div>
                          )) : (
                            <p className="text-stone-700 text-xs italic">No thoughts recorded yet...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-stone-800/50 flex justify-between items-center bg-stone-950/50">
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-bold text-stone-600 uppercase tracking-widest">
                  Agentic Graph RAG v1.0
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-violet-400">3 Agents Active</span>
                </span>
              </div>
              <button 
                onClick={() => { fetchCHTData(); }}
                className="px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold hover:bg-violet-500/20 transition-colors"
              >
                ↻ Refresh Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Put your actual page background content below */}
      <div className="relative z-10 p-8 text-center" />
    </main>
  );
}

export default Page;