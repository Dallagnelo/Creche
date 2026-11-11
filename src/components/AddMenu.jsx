import { useEffect, useState } from 'react'
import Icon from './Icon'

// Botão "Adicionar" do mural: abre duas opções (nova lembrança ou novo álbum).
// No celular é o + flutuante e as opções aparecem em cima dele.
export default function AddMenu({ onPhoto, onAlbum }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const choose = (action) => () => {
    setOpen(false)
    action()
  }

  return (
    <div className="add-menu">
      {open && <div className="add-menu-backdrop" onClick={() => setOpen(false)} />}
      <button
        type="button"
        className={`btn btn-new ${open ? 'is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Adicionar foto
      </button>
      {open && (
        <div className="add-menu-list" role="menu">
          <button type="button" role="menuitem" className="add-menu-item is-album" onClick={choose(onAlbum)}>
            <Icon name="album" /> Novo álbum
          </button>
          <button type="button" role="menuitem" className="add-menu-item" onClick={choose(onPhoto)}>
            <Icon name="photos" /> Nova foto
          </button>
        </div>
      )}
    </div>
  )
}
