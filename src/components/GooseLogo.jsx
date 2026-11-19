// Ganso do Dallag: o desenho antigo da turma em pixel art (16×16), o mesmo do ícone do site.
const BODY = 'M11 0h1v1h-1zM12 0h1v1h-1zM13 0h1v1h-1zM11 1h1v1h-1zM13 1h1v1h-1zM11 2h1v1h-1zM13 2h1v1h-1zM11 3h1v1h-1zM13 3h1v1h-1zM11 4h1v1h-1zM13 4h1v1h-1zM3 5h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM6 5h1v1h-1zM7 5h1v1h-1zM8 5h1v1h-1zM9 5h1v1h-1zM10 5h1v1h-1zM13 5h1v1h-1zM2 6h1v1h-1zM13 6h1v1h-1zM1 7h1v1h-1zM13 7h1v1h-1zM1 8h1v1h-1zM13 8h1v1h-1zM1 9h1v1h-1zM13 9h1v1h-1zM2 10h1v1h-1zM13 10h1v1h-1zM3 11h1v1h-1zM4 11h1v1h-1zM5 11h1v1h-1zM6 11h1v1h-1zM7 11h1v1h-1zM8 11h1v1h-1zM9 11h1v1h-1zM10 11h1v1h-1zM11 11h1v1h-1zM12 11h1v1h-1zM5 12h1v1h-1zM8 12h1v1h-1zM4 13h1v1h-1zM8 13h1v1h-1zM3 14h1v1h-1zM4 14h1v1h-1zM8 14h1v1h-1zM2 15h1v1h-1zM3 15h1v1h-1zM8 15h1v1h-1z'
const BEAK = 'M14 1h1v1h-1zM15 1h1v1h-1zM14 2h1v1h-1z'

export default function GooseLogo({ size = 64, color = 'currentColor', beak = '#ff7eb6', title = 'Ganso do Dallag', className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <path d={BODY} fill={color} />
      <path d={BEAK} fill={beak} />
    </svg>
  )
}
