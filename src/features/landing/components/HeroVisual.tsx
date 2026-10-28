export function HeroVisual() {
  return (
    <video
      src="/hero.mp4"
      aria-label="Vídeo demonstrativo de modelos 3D"
      className="h-auto w-full max-w-[33.6rem]"
      autoPlay
      loop
      muted
      playsInline
    >
      Seu navegador não suporta vídeo.
    </video>
  )
}
