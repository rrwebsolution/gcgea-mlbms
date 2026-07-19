import { useTheme } from "@/contexts/ThemeContext"

interface AppBackgroundProps {
  /** "vivid" is the full-strength login treatment. "subtle" dims the glows/skyline so it doesn't compete with dense dashboard content. */
  intensity?: "vivid" | "subtle"
  /** "fixed" pins the backdrop to the viewport (for scrollable shells like the dashboard). "absolute" fills the nearest positioned ancestor (single-viewport pages like login). */
  position?: "absolute" | "fixed"
}

/**
 * Self-contained, CSS/SVG-generated brand backdrop — no external image request.
 * Features an ambient tech-grid, glowing auroras, and a detailed multi-layered
 * LGU city skyline and civic center silhouette. Colors adapt to the resolved
 * theme so it reads as light/dark like the rest of the app.
 */
export function AppBackground({ intensity = "vivid", position = "absolute" }: AppBackgroundProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const isSubtle = intensity === "subtle"
  const scale = isSubtle ? 0.45 : 1

  const baseBg = isDark ? "#0a0f1d" : "#F8FAFC"
  const cityFadeColor = isDark ? "#0a0f1d" : "#F8FAFC"
  const cityFrontColor = isDark ? "#0a1224" : "#E2E8F0"
  const dotColor = isDark ? "text-white" : "text-slate-900"

  return (
    <div
      className={`${position} inset-0 -z-10 overflow-hidden`}
      style={{ backgroundColor: baseBg }}
      aria-hidden="true"
    >
      {/* Deep Ambient Aurora Glows */}
      <div
        className="absolute -top-[40%] -right-[20%] h-[95%] w-[80%] rounded-full blur-[120px]"
        style={{
          opacity: (isDark ? 0.6 : 0.35) * scale,
          background: "radial-gradient(circle, color-mix(in oklch, var(--gold) 20%, transparent) 0%, transparent 70%)"
        }}
      />
      <div
        className="absolute -bottom-[30%] -left-[10%] h-[90%] w-[70%] rounded-full blur-[140px]"
        style={{
          opacity: (isDark ? 0.5 : 0.3) * scale,
          background: "radial-gradient(circle, color-mix(in oklch, var(--primary) 30%, transparent) 0%, transparent 75%)"
        }}
      />
      <div
        className="absolute top-[20%] left-[30%] h-[60%] w-[60%] rounded-full blur-[160px]"
        style={{
          opacity: (isDark ? 0.45 : 0.25) * scale,
          background: "radial-gradient(circle, color-mix(in oklch, var(--primary) 15%, transparent) 0%, transparent 60%)"
        }}
      />

      {/* Grid Pattern Overlay */}
      <svg
        className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"
        style={{ opacity: 0.04 * scale }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" className={dotColor} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Detailed City & LGU Skyline SVG */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[40%] w-full min-h-[220px]"
        style={{ opacity: isSubtle ? 0.55 : 1 }}
        viewBox="0 0 1200 300"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients to fade buildings into the dark footer */}
          <linearGradient id="city-grad-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.1" />
            <stop offset="100%" stopColor={cityFadeColor} stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="city-grad-mid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor={cityFadeColor} stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="city-grad-front" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={cityFrontColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={cityFadeColor} stopOpacity="1" />
          </linearGradient>

          {/* Window texture pattern for buildings */}
          <pattern id="window-glow" width="12" height="18" patternUnits="userSpaceOnUse">
            <rect x="2" y="2" width="3" height="5" rx="0.5" fill="var(--gold)" fillOpacity="0.25" />
            <rect x="7" y="2" width="3" height="5" rx="0.5" fill="var(--gold)" fillOpacity="0.15" />
            <rect x="2" y="10" width="3" height="5" rx="0.5" fill="var(--primary)" fillOpacity="0.2" />
            <rect x="7" y="10" width="3" height="5" rx="0.5" fill="var(--gold)" fillOpacity="0.2" />
          </pattern>
        </defs>

        {/* LAYER 1: Distant Background Buildings (Soft Opacity) */}
        <g fill="url(#city-grad-back)">
          {/* Distant Tall Towers & Spires */}
          <rect x="40" y="80" width="55" height="220" />
          <polygon points="40,80 67,40 95,80" />
          <rect x="180" y="120" width="70" height="180" />
          <rect x="310" y="90" width="50" height="210" />
          <line x1="335" y1="90" x2="335" y2="50" stroke="var(--primary)" strokeWidth="2" opacity="0.3" />
          <rect x="440" y="140" width="80" height="160" />
          <rect x="650" y="70" width="65" height="230" />
          <polygon points="650,70 682,20 715,70" />
          <rect x="800" y="110" width="75" height="190" />
          <rect x="940" y="130" width="60" height="170" />
          <rect x="1050" y="90" width="70" height="210" />
          <polygon points="1050,90 1085,55 1120,90" />
        </g>

        {/* LAYER 2: Midground Buildings with Civic/LGU Hall Silhouette */}
        <g fill="url(#city-grad-mid)">
          {/* Leftside Municipal / Commercial Blocks */}
          <rect x="100" y="140" width="75" height="160" />
          <rect x="220" y="110" width="60" height="190" />
          <polygon points="220,110 250,75 280,110" />
          <rect x="290" y="160" width="55" height="140" />

          {/* Detailed Civic Dome Center (Representing City Hall / LGU Center) */}
          {/* Dome pillars/base */}
          <rect x="480" y="150" width="160" height="150" rx="3" />
          {/* Dome roof */}
          <path d="M495,150 Q560,95 625,150 Z" />
          {/* Cupola/Spire on dome */}
          <rect x="552" y="75" width="16" height="22" rx="1" />
          <polygon points="548,75 560,50 572,75" />

          {/* Rightside Dense Urban Buildings */}
          <rect x="710" y="150" width="80" height="150" />
          <rect x="760" y="120" width="65" height="180" />
          <rect x="880" y="160" width="85" height="140" />
          <rect x="1000" y="120" width="60" height="180" />
          <line x1="1030" y1="120" x2="1030" y2="80" stroke="var(--primary)" strokeWidth="2" opacity="0.4" />
        </g>

        {/* LAYER 3: Interactive Window Glow Overlay (Appears on midground structures) */}
        <g opacity="0.65">
          {/* Window matrices mapped over corresponding midground coordinate blocks */}
          <rect x="110" y="155" width="55" height="110" fill="url(#window-glow)" />
          <rect x="230" y="125" width="40" height="120" fill="url(#window-glow)" />
          <rect x="720" y="165" width="60" height="100" fill="url(#window-glow)" />
          <rect x="770" y="135" width="45" height="120" fill="url(#window-glow)" />
          <rect x="890" y="175" width="65" height="90" fill="url(#window-glow)" />
          <rect x="1010" y="135" width="40" height="110" fill="url(#window-glow)" />

          {/* Lighted pillars/arches inside the LGU City Hall dome block */}
          <rect x="510" y="180" width="10" height="100" fill="var(--gold)" fillOpacity="0.25" rx="2" />
          <rect x="535" y="180" width="10" height="100" fill="var(--gold)" fillOpacity="0.25" rx="2" />
          <rect x="560" y="180" width="10" height="100" fill="var(--gold)" fillOpacity="0.25" rx="2" />
          <rect x="585" y="180" width="10" height="100" fill="var(--gold)" fillOpacity="0.25" rx="2" />
          <rect x="610" y="180" width="10" height="100" fill="var(--gold)" fillOpacity="0.25" rx="2" />
        </g>

        {/* LAYER 4: Foreground Buildings & Dense Silhouettes (Crisp Dark Blue-Navy) */}
        <g fill="url(#city-grad-front)">
          <rect x="0" y="210" width="80" height="90" />
          <rect x="60" y="190" width="70" height="110" rx="1" />
          <rect x="150" y="170" width="90" height="130" />
          <polygon points="150,170 195,140 240,170" />

          {/* Modern angled-roof buildings next to City Hall */}
          <polygon points="370,150 450,190 450,300 370,300" />
          <polygon points="630,190 700,140 700,300 630,300" />

          <rect x="830" y="180" width="80" height="120" />
          <rect x="930" y="200" width="100" height="100" rx="2" />
          <rect x="1110" y="160" width="90" height="140" />
          <polygon points="1110,160 1155,125 1200,160" />
        </g>
      </svg>

      {/* Readability Vignette overlay */}
      <div
        className={
          isDark
            ? "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10"
            : "absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-white/10"
        }
      />
    </div>
  )
}
