export function HeroVisual() {
  return (
    <svg
      viewBox="0 0 360 360"
      className="hero-float h-auto w-full max-w-md drop-shadow-xl"
      role="img"
      aria-label="Ilustração de modelos 3D gerados por parâmetros"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="heroTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="heroRight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <ellipse cx="180" cy="312" rx="104" ry="14" fill="#0f766e" opacity="0.12" />
      <g>
        <polygon points="180,72 268,120 180,168 92,120" fill="url(#heroTop)" />
        <polygon points="92,120 180,168 180,264 92,216" fill="#115e59" />
        <polygon points="268,120 180,168 180,264 268,216" fill="url(#heroRight)" />
      </g>
      <g>
        <polygon points="292,176 326,194 292,212 258,194" fill="#5eead4" />
        <polygon points="258,194 292,212 292,238 258,220" fill="#0f766e" />
        <polygon points="326,194 292,212 292,238 326,220" fill="#14b8a6" />
      </g>
      <g opacity="0.85">
        <polygon points="76,208 104,223 76,238 48,223" fill="#5eead4" />
        <polygon points="48,223 76,238 76,260 48,245" fill="#0f766e" />
        <polygon points="104,223 76,238 76,260 104,245" fill="#14b8a6" />
      </g>
      <circle cx="86" cy="96" r="5" fill="#14b8a6" />
      <circle cx="286" cy="84" r="4" fill="#2dd4bf" />
      <circle cx="316" cy="264" r="4" fill="#0d9488" />
    </svg>
  )
}
