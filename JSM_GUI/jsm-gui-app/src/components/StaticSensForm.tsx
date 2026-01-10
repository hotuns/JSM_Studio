import { SensitivityValues } from '../utils/keymap'

type StaticSensFormProps = {
  sensitivity: SensitivityValues
  onChangeX: (value: string) => void
  onChangeY: (value: string) => void
}

export function StaticSensForm({ sensitivity, onChangeX, onChangeY }: StaticSensFormProps) {
  const selectAllOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select()
  }

  return (
    <div className="flex-inputs">
      <label>
        Static Sens (X)
        <input
          type="number"
          step="0.1"
          min="0"
          value={sensitivity.gyroSensX ?? ''}
          onChange={(e) => onChangeX(e.target.value)}
          onFocus={selectAllOnFocus}
        />
        <input type="range" min="0" max="30" step="0.1" value={sensitivity.gyroSensX ?? 0} onChange={(e) => onChangeX(e.target.value)} />
      </label>
      <label>
        Static Sens (Y)
        <input
          type="number"
          step="0.1"
          min="0"
          value={sensitivity.gyroSensY ?? ''}
          onChange={(e) => onChangeY(e.target.value)}
          onFocus={selectAllOnFocus}
        />
        <input type="range" min="0" max="30" step="0.1" value={sensitivity.gyroSensY ?? 0} onChange={(e) => onChangeY(e.target.value)} />
      </label>
    </div>
  )
}
