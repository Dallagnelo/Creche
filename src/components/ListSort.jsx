import { useId, useState } from 'react'
import { SORTS, savedSort, saveSort } from '../lib/listSort'

/** Guarda a ordem escolhida para a lista "storageKey" (fica salva neste aparelho). */
export function useListSort(storageKey) {
  const [sort, setSort] = useState(() => savedSort(storageKey))
  return [
    sort,
    (value) => {
      setSort(value)
      saveSort(storageKey, value)
    },
  ]
}

/** Caixinha "Ordenar por" das listas de filmes e jogos. */
export default function ListSort({ value, onChange }) {
  const id = useId()
  return (
    <div className="list-sort">
      <label htmlFor={id} className="list-sort-label">
        Ordenar
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {SORTS.map((sort) => (
          <option key={sort.id} value={sort.id}>
            {sort.label}
          </option>
        ))}
      </select>
    </div>
  )
}
