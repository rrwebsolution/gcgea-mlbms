/**
 * Self-contained, CSS/SVG-generated backdrop for the login screen — no external
 * image request, so there is nothing that can fail to load. A solid navy
 * background-color underneath acts as the explicit fallback if gradients or
 * the inline SVG somehow fail to render.
 */
export function LoginBackground() {
  return (
    <div
      className="absolute inset-0 -z-10 bg-[#0b1730] bg-cover bg-center"
      style={{
        backgroundImage: [
          "radial-gradient(ellipse 900px 600px at 85% 8%, color-mix(in oklch, var(--gold) 22%, transparent), transparent 60%)",
          "radial-gradient(ellipse 1000px 700px at 10% 100%, color-mix(in oklch, var(--primary) 35%, transparent), transparent 60%)",
          "linear-gradient(160deg, #0b1730 0%, #0f2247 45%, #14264f 75%, #0b1730 100%)",
        ].join(", "),
      }}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-x-0 bottom-0 h-[38%] w-full opacity-40"
        viewBox="0 0 1200 300"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#060d1e">
          <rect x="40" y="140" width="90" height="160" />
          <rect x="150" y="90" width="70" height="210" />
          <rect x="240" y="170" width="110" height="130" />
          <rect x="370" y="60" width="60" height="240" />
          <polygon points="370,60 400,20 430,60" />
          <rect x="450" y="120" width="140" height="180" />
          <rect x="510" y="80" width="20" height="40" />
          <rect x="610" y="150" width="80" height="150" />
          <rect x="710" y="100" width="90" height="200" />
          <rect x="820" y="180" width="60" height="120" />
          <rect x="900" y="70" width="70" height="230" />
          <polygon points="900,70 935,25 970,70" />
          <rect x="990" y="160" width="100" height="140" />
          <rect x="1100" y="110" width="80" height="190" />
        </g>
        <g fill="#0b1730" opacity="0.7">
          <rect x="0" y="220" width="1200" height="80" />
        </g>
      </svg>

      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/10" />
      <div className="absolute inset-0 bg-black/10" />
    </div>
  )
}
