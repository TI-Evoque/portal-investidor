import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo, useState } from 'react'

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

  const summary = useMemo(() => {
    if (selected.length === 0) return placeholder
    const labels = options.filter((option) => selected.includes(option.id)).map((option) => option.label)
    if (labels.length <= 2) return labels.join(', ')
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
  }, [options, selected, placeholder])

  const toggleOption = (optionId: number) => {
    onChange(
      selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId]
    )
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
              options.map((option) => {
                const checked = selected.includes(option.id)
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
              })
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
