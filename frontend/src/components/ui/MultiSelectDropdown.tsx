import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Option = { id: number; label: string; hint?: string }

interface MultiSelectDropdownProps {
  label: string
  options: Option[]
  selected: number[]
  onChange: (next: number[]) => void
  placeholder?: string
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Selecionar',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftSelected, setDraftSelected] = useState<number[]>(selected)

  useEffect(() => {
    if (!isOpen) {
      setDraftSelected(selected)
    }
  }, [isOpen, selected])

  const summary = useMemo(() => {
    if (selected.length === 0) return placeholder
    const labels = options.filter((option) => selected.includes(option.id)).map((option) => option.label)
    if (labels.length <= 2) return labels.join(', ')
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
  }, [options, selected, placeholder])

  const toggleOption = (optionId: number) => {
    setDraftSelected(
      draftSelected.includes(optionId)
        ? draftSelected.filter((id) => id !== optionId)
        : [...draftSelected, optionId]
    )
  }

  const handleApply = () => {
    onChange(draftSelected)
    setIsOpen(false)
  }

  const handleClear = () => {
    setDraftSelected([])
    onChange([])
    setIsOpen(false)
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className={`multi-select ${isOpen ? 'open' : ''}`}>
        <button type="button" className="multi-select-trigger" onClick={() => setIsOpen((prev) => !prev)}>
          <span>{summary}</span>
          <span className="multi-select-caret">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </button>

        {isOpen ? (
          <div className="multi-select-panel">
            {options.length === 0 ? (
              <div className="multi-select-empty">Nenhuma unidade cadastrada ainda.</div>
            ) : (
              <>
                <div className="multi-select-options-list">
                  {options.map((option) => {
                    const checked = draftSelected.includes(option.id)
                    return (
                      <label key={option.id} className={`multi-select-option ${checked ? 'selected' : ''}`}>
                        <div className="multi-select-option-row">
                          <div className="multi-select-option-copy">
                            <div className="multi-select-option-title">{option.label}</div>
                            {option.hint ? <small>{option.hint}</small> : null}
                          </div>
                          <span className={`multi-select-check ${checked ? 'checked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOption(option.id)}
                            />
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>

                <div className="multi-select-footer">
                  <button type="button" className="action-chip" onClick={handleClear}>
                    Limpar filtros
                  </button>
                  <button type="button" className="action-chip primary" onClick={handleApply}>
                    OK
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
