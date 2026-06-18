import React from 'react'
import { OLLAMA_MODELS, OllamaModel } from '../types'

interface ModelSelectorProps {
  value: OllamaModel
  onChange: (model: OllamaModel) => void
  disabled?: boolean
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange, disabled }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Model</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as OllamaModel)}
      disabled={disabled}
      className="input-glass cursor-pointer appearance-none px-4 py-2.5 text-sm"
    >
      {OLLAMA_MODELS.map((model) => (
        <option key={model} value={model}>{model}</option>
      ))}
    </select>
  </div>
)
