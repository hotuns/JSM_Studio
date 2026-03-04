import { useState } from 'react'
import { SectionActions } from './SectionActions'
import rwcGuideImage from '../assets/docs/mouse-sensitivity_guide.png'

const MOUSE_SENSITIVITY_URL = 'https://www.mouse-sensitivity.com'

type RwcGuideModalProps = {
  isOpen: boolean
  inGameSens: string
  onClose: () => void
  onApplyRwc: (rwc: string) => void
}

export function RwcGuideModal({ isOpen, inGameSens, onClose, onApplyRwc }: RwcGuideModalProps) {
  const [counts, setCounts] = useState('')
  const [sens, setSens] = useState('')

  if (!isOpen) return null

  const effectiveSens = sens !== '' ? sens : inGameSens
  const countsNum = parseFloat(counts)
  const sensNum = parseFloat(effectiveSens)
  const computed =
    !isNaN(countsNum) && !isNaN(sensNum) && countsNum > 0 && sensNum > 0
      ? sensNum / (360 / countsNum)
      : null

  function handleApply() {
    if (computed !== null) {
      onApplyRwc(computed.toFixed(4))
      setCounts('')
      setSens('')
      onClose()
    }
  }

  function handleCancel() {
    setCounts('')
    setSens('')
    onClose()
  }

  function handleLinkClick(e: React.MouseEvent) {
    e.preventDefault()
    window.electronAPI?.openExternal?.(MOUSE_SENSITIVITY_URL)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Easy real world calibration method</h3>
          <button className="secondary-btn" onClick={handleCancel}>Close</button>
        </div>
        <p className="modal-description">
          The easiest way to get your Real World Calibration value is via{' '}
          <a href={MOUSE_SENSITIVITY_URL} onClick={handleLinkClick}>
            mouse-sensitivity.com
          </a>. Follow these steps:
        </p>
        <ol className="modal-description">
          <li>Open the site and set the <strong>Units</strong> dropdown to <strong>Counts</strong>.</li>
          <li>Select your game from the game list.</li>
          <li>Enter values for Sensitivity and DPI — any values work, but remember what you entered.</li>
          <li>Take note of the <strong>Counts</strong> value the site displays.</li>
          <li>
            Enter that sensitivity and counts value in the fields below — your RWC will be computed automatically using:<br />
            <code>RWC = sensitivity / (360 / counts)</code>
          </li>
        </ol>
        <img
          src={rwcGuideImage}
          alt="mouse-sensitivity.com guide screenshot"
          style={{ width: '100%', borderRadius: 6, marginTop: 8, marginBottom: 8 }}
        />
        <div className="flex-inputs">
          <label>
            In-Game Sensitivity
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder={inGameSens || 'e.g. 1'}
              value={sens}
              onChange={(e) => setSens(e.target.value)}
            />
          </label>
          <label>
            Counts (from mouse-sensitivity.com)
            <input
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 14400"
              value={counts}
              onChange={(e) => setCounts(e.target.value)}
            />
          </label>
        </div>
        {computed !== null && (
          <div className="flex-inputs">
            <label>
              Computed RWC
              <input type="number" readOnly value={computed.toFixed(4)} />
            </label>
          </div>
        )}
        <SectionActions
          hasPendingChanges={counts !== '' || sens !== ''}
          statusMessage={null}
          applyDisabled={computed === null}
          onApply={handleApply}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
