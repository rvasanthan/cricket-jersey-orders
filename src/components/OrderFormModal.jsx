import { useEffect, useState } from 'react'
import Modal from './Modal'
import {
  HAT_COLORS,
  JERSEY_COLORS,
  PANTS_COLORS,
  SIZES,
  SLEEVE_TYPES,
  validateHatItem,
  validateJerseyItem,
  validatePantsItem,
  validatePlayerDetails,
} from '../utils/validation'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { checkFieldAvailability, createOrder, updateOrder } from '../services/ordersService'

const FIELD_LABELS = {
  jerseyNumber: 'Jersey number',
  shortName: 'Short name',
}

const DEFAULT_JERSEY_ITEM = {
  jerseySize: 'M',
  jerseyColor: 'Red',
  sleeveType: 'Half Sleeve',
  quantity: 1,
  needDragon: false,
  needBlueWhale: false,
}

const DEFAULT_HAT_ITEM = { hatSize: 'M', hatColor: 'Red', quantity: 1 }
const DEFAULT_PANTS_ITEM = { pantsSize: 'M', pantsColor: 'Red', quantity: 1 }

function decomposeCart(initialForm, mode) {
  if (mode !== 'edit' || !initialForm) {
    return {
      player: { firstName: '', lastName: '', shortName: '', jerseyNumber: '' },
      jerseys: [],
      hats: [],
      pants: [],
    }
  }
  const player = {
    firstName: initialForm.firstName || '',
    lastName: initialForm.lastName || '',
    shortName: initialForm.shortName || '',
    jerseyNumber: initialForm.jerseyNumber || '',
  }
  const jerseys =
    Array.isArray(initialForm.jerseys) && initialForm.jerseys.length > 0
      ? initialForm.jerseys
      : [
          {
            jerseySize: initialForm.jerseySize || 'M',
            jerseyColor: initialForm.jerseyColor || 'Red',
            sleeveType: initialForm.sleeveType || 'Half Sleeve',
            quantity: initialForm.quantity || 1,
            needDragon: Boolean(initialForm.needDragon),
            needBlueWhale: Boolean(initialForm.needBlueWhale),
          },
        ]

  const hats =
    Array.isArray(initialForm.hats) && initialForm.hats.length > 0
      ? initialForm.hats
      : initialForm.needHat
        ? [
            {
              hatSize: initialForm.hatSize || 'M',
              hatColor: initialForm.hatColor || 'Red',
              quantity: Math.max(1, Number(initialForm.hatQuantity) || 1),
            },
          ]
        : []

  const pants =
    Array.isArray(initialForm.pants) && initialForm.pants.length > 0
      ? initialForm.pants
      : initialForm.needPants
        ? [
            {
              pantsSize: initialForm.pantsSize || 'M',
              pantsColor: initialForm.pantsColor || 'Red',
              quantity: Math.max(1, Number(initialForm.pantsQuantity) || 1),
            },
          ]
        : []

  return {
    player,
    jerseys,
    hats,
    pants,
  }
}

function summarizeJerseyItem(j) {
  const addon =
    j.jerseyColor === 'Red'
      ? j.needDragon
        ? ' · Dragon'
        : ''
      : j.needBlueWhale
        ? ' · Blue Whale'
        : ''
  return `${j.jerseyColor} · Size ${j.jerseySize} · ${j.sleeveType} · Qty ${j.quantity}${addon}`
}

function summarizeHatItem(h) {
  return `${h.hatColor} · Size ${h.hatSize} · Qty ${h.quantity}`
}

function summarizePantsItem(p) {
  return `${p.pantsColor} · Size ${p.pantsSize} · Qty ${p.quantity}`
}

export default function OrderFormModal({ mode, initialForm, orderId, onClose, onSaved }) {
  const initial = decomposeCart(initialForm, mode)
  const [player, setPlayer] = useState(initial.player)
  const [jerseys, setJerseys] = useState(initial.jerseys)
  const [hats, setHats] = useState(initial.hats)
  const [pants, setPants] = useState(initial.pants)

  const [step, setStep] = useState('cart') // cart | jersey | hat | pants | review
  const [editingJerseyIndex, setEditingJerseyIndex] = useState(null)
  const [editingHatIndex, setEditingHatIndex] = useState(null)
  const [editingPantsIndex, setEditingPantsIndex] = useState(null)

  const [jerseyDraft, setJerseyDraft] = useState(DEFAULT_JERSEY_ITEM)
  const [hatDraft, setHatDraft] = useState(DEFAULT_HAT_ITEM)
  const [pantsDraft, setPantsDraft] = useState(DEFAULT_PANTS_ITEM)

  const [playerErrors, setPlayerErrors] = useState({})
  const [jerseyErrors, setJerseyErrors] = useState({})
  const [hatErrors, setHatErrors] = useState({})
  const [pantsErrors, setPantsErrors] = useState({})
  const [cartError, setCartError] = useState('')

  const [fieldStatus, setFieldStatus] = useState({ jerseyNumber: null, shortName: null })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const debouncedJerseyNumber = useDebouncedValue(player.jerseyNumber)
  const debouncedShortName = useDebouncedValue(player.shortName)

  useEffect(() => {
    let active = true
    if (!player.jerseyNumber.toString().trim()) {
      setFieldStatus((s) => ({ ...s, jerseyNumber: null }))
      return
    }
    setFieldStatus((s) => ({ ...s, jerseyNumber: 'checking' }))
    checkFieldAvailability('jerseyNumber', debouncedJerseyNumber, orderId).then((available) => {
      if (active) setFieldStatus((s) => ({ ...s, jerseyNumber: available ? 'available' : 'taken' }))
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedJerseyNumber])

  useEffect(() => {
    let active = true
    if (!player.shortName.trim()) {
      setFieldStatus((s) => ({ ...s, shortName: null }))
      return
    }
    setFieldStatus((s) => ({ ...s, shortName: 'checking' }))
    checkFieldAvailability('shortName', debouncedShortName, orderId).then((available) => {
      if (active) setFieldStatus((s) => ({ ...s, shortName: available ? 'available' : 'taken' }))
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedShortName])

  function updatePlayerField(name, value) {
    setPlayer((p) => ({ ...p, [name]: value }))
  }

  function updateJerseyDraft(name, value) {
    setJerseyDraft((j) => ({ ...j, [name]: value }))
  }

  function updateHatDraft(name, value) {
    setHatDraft((h) => ({ ...h, [name]: value }))
  }

  function updatePantsDraft(name, value) {
    setPantsDraft((p) => ({ ...p, [name]: value }))
  }

  function openAddJersey() {
    setEditingJerseyIndex(null)
    setJerseyDraft(DEFAULT_JERSEY_ITEM)
    setJerseyErrors({})
    setStep('jersey')
  }

  function openEditJersey(index) {
    setEditingJerseyIndex(index)
    setJerseyDraft(jerseys[index])
    setJerseyErrors({})
    setStep('jersey')
  }

  function handleSaveJersey(event) {
    event.preventDefault()
    const errs = validateJerseyItem(jerseyDraft)
    setJerseyErrors(errs)
    if (Object.keys(errs).length === 0) {
      if (editingJerseyIndex !== null) {
        setJerseys((list) => list.map((item, i) => (i === editingJerseyIndex ? jerseyDraft : item)))
      } else {
        setJerseys((list) => [...list, jerseyDraft])
      }
      setCartError('')
      setStep('cart')
    }
  }

  function handleRemoveJersey(index) {
    setJerseys((list) => list.filter((_, i) => i !== index))
  }

  function openAddHat() {
    setEditingHatIndex(null)
    setHatDraft(DEFAULT_HAT_ITEM)
    setHatErrors({})
    setStep('hat')
  }

  function openEditHat(index) {
    setEditingHatIndex(index)
    setHatDraft(hats[index])
    setHatErrors({})
    setStep('hat')
  }

  function handleSaveHat(event) {
    event.preventDefault()
    const errs = validateHatItem(hatDraft)
    setHatErrors(errs)
    if (Object.keys(errs).length === 0) {
      if (editingHatIndex !== null) {
        setHats((list) => list.map((item, i) => (i === editingHatIndex ? hatDraft : item)))
      } else {
        setHats((list) => [...list, hatDraft])
      }
      setStep('cart')
    }
  }

  function handleRemoveHat(index) {
    setHats((list) => list.filter((_, i) => i !== index))
  }

  function openAddPants() {
    setEditingPantsIndex(null)
    setPantsDraft(DEFAULT_PANTS_ITEM)
    setPantsErrors({})
    setStep('pants')
  }

  function openEditPants(index) {
    setEditingPantsIndex(index)
    setPantsDraft(pants[index])
    setPantsErrors({})
    setStep('pants')
  }

  function handleSavePants(event) {
    event.preventDefault()
    const errs = validatePantsItem(pantsDraft)
    setPantsErrors(errs)
    if (Object.keys(errs).length === 0) {
      if (editingPantsIndex !== null) {
        setPants((list) => list.map((item, i) => (i === editingPantsIndex ? pantsDraft : item)))
      } else {
        setPants((list) => [...list, pantsDraft])
      }
      setStep('cart')
    }
  }

  function handleRemovePants(index) {
    setPants((list) => list.filter((_, i) => i !== index))
  }

  function handleGoToReview() {
    const errs = validatePlayerDetails(player)
    if (fieldStatus.jerseyNumber === 'taken') {
      errs.jerseyNumber = 'That jersey number is already taken.'
    }
    if (fieldStatus.shortName === 'taken') {
      errs.shortName = 'That short name is already taken.'
    }
    setPlayerErrors(errs)

    if (jerseys.length === 0) {
      setCartError('Please add at least 1 jersey item to your order.')
      return
    }
    setCartError('')

    if (Object.keys(errs).length === 0) {
      setStep('review')
    }
  }

  async function handleSubmitOrder() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const combinedForm = {
        ...player,
        jerseys,
        hats,
        pants,
      }
      const result =
        mode === 'edit' ? await updateOrder(orderId, combinedForm) : await createOrder(combinedForm)

      if (!result.success) {
        const fields = [...new Set(result.conflicts.map((c) => FIELD_LABELS[c.field]))]
        setSubmitError(
          `Someone already has that ${fields.join(' / ')}. Please choose different values.`,
        )
        setStep('cart')
        return
      }
      onSaved(result)
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong while saving your order.')
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    step === 'jersey'
      ? editingJerseyIndex !== null
        ? 'Edit Jersey'
        : 'Add Jersey'
      : step === 'hat'
        ? editingHatIndex !== null
          ? 'Edit Hat'
          : 'Add Hat'
        : step === 'pants'
          ? editingPantsIndex !== null
            ? 'Edit Track Pants'
            : 'Add Track Pants'
          : step === 'review'
            ? 'Review Order'
            : mode === 'edit'
              ? 'Edit Order'
              : 'New Order'

  return (
    <Modal title={title} onClose={onClose}>
      {step === 'cart' && (
        <div>
          <fieldset className="fieldset">
            <legend>Player Details</legend>
            <div className="form-grid">
              <Field
                label="First Name"
                id="firstName"
                value={player.firstName}
                onChange={(v) => updatePlayerField('firstName', v)}
                error={playerErrors.firstName}
                required
              />
              <Field
                label="Last Name"
                id="lastName"
                value={player.lastName}
                onChange={(v) => updatePlayerField('lastName', v)}
                error={playerErrors.lastName}
                required
              />
              <Field
                label="Short Name"
                id="shortName"
                value={player.shortName}
                onChange={(v) => updatePlayerField('shortName', v)}
                error={playerErrors.shortName}
                hint="Shown on jersey back. Must be unique."
                status={fieldStatus.shortName}
                required
              />
              <Field
                label="Jersey Number"
                id="jerseyNumber"
                value={player.jerseyNumber}
                onChange={(v) =>
                  updatePlayerField('jerseyNumber', v.replace(/[^\d]/g, '').slice(0, 3))
                }
                error={playerErrors.jerseyNumber}
                hint="Must be unique across the team."
                status={fieldStatus.jerseyNumber}
                inputMode="numeric"
                required
              />
            </div>
          </fieldset>

          <div className="cart-section">
            <div className="cart-section__header">
              <h3>
                Jerseys <span className="muted">(At least 1 required)</span>
              </h3>
              <button type="button" className="btn btn--outline btn--sm" onClick={openAddJersey}>
                + Add Jersey
              </button>
            </div>

            {jerseys.length === 0 ? (
              <p className="cart-empty-msg">
                No jerseys added yet. Click &quot;+ Add Jersey&quot; to choose colors, sizes, and sleeves.
              </p>
            ) : (
              <div className="cart-list">
                {jerseys.map((item, idx) => (
                  <div key={idx} className="cart-item">
                    <div className="cart-item__info">
                      <p className="cart-item__label">Jersey #{idx + 1}</p>
                      <p className="cart-item__summary">{summarizeJerseyItem(item)}</p>
                    </div>
                    <div className="cart-item__actions">
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => openEditJersey(idx)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => handleRemoveJersey(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {cartError && (
              <p className="field-error" role="alert">
                {cartError}
              </p>
            )}
          </div>

          <div className="cart-section">
            <div className="cart-section__header">
              <h3>Hats</h3>
              <button type="button" className="btn btn--outline btn--sm" onClick={openAddHat}>
                + Add Hat
              </button>
            </div>

            {hats.length === 0 ? (
              <p className="cart-empty-msg">No hats added yet.</p>
            ) : (
              <div className="cart-list">
                {hats.map((item, idx) => (
                  <div key={idx} className="cart-item">
                    <div className="cart-item__info">
                      <p className="cart-item__label">Hat #{idx + 1}</p>
                      <p className="cart-item__summary">{summarizeHatItem(item)}</p>
                    </div>
                    <div className="cart-item__actions">
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => openEditHat(idx)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => handleRemoveHat(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cart-section">
            <div className="cart-section__header">
              <h3>Track Pants</h3>
              <button type="button" className="btn btn--outline btn--sm" onClick={openAddPants}>
                + Add Pants
              </button>
            </div>

            {pants.length === 0 ? (
              <p className="cart-empty-msg">No track pants added yet.</p>
            ) : (
              <div className="cart-list">
                {pants.map((item, idx) => (
                  <div key={idx} className="cart-item">
                    <div className="cart-item__info">
                      <p className="cart-item__label">Pants #{idx + 1}</p>
                      <p className="cart-item__summary">{summarizePantsItem(item)}</p>
                    </div>
                    <div className="cart-item__actions">
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => openEditPants(idx)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => handleRemovePants(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={handleGoToReview}>
              Review Order
            </button>
          </div>
        </div>
      )}

      {step === 'jersey' && (
        <form onSubmit={handleSaveJersey} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="jerseyColor">Jersey Color</label>
              <select
                id="jerseyColor"
                value={jerseyDraft.jerseyColor}
                onChange={(e) => updateJerseyDraft('jerseyColor', e.target.value)}
              >
                {JERSEY_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
            <SizeSelect
              label="Jersey Size"
              id="jerseySize"
              value={jerseyDraft.jerseySize}
              onChange={(v) => updateJerseyDraft('jerseySize', v)}
            />
          </div>

          <fieldset className="fieldset">
            <legend>Sleeve Type</legend>
            <div className="toggle-row">
              {SLEEVE_TYPES.map((type) => (
                <label className="radio" key={type}>
                  <input
                    type="radio"
                    name="sleeveType"
                    checked={jerseyDraft.sleeveType === type}
                    onChange={() => updateJerseyDraft('sleeveType', type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </fieldset>

          {jerseyDraft.jerseyColor === 'Red' && (
            <fieldset className="fieldset">
              <legend>Need Red Dragon?</legend>
              <div className="toggle-row">
                <label className="radio">
                  <input
                    type="radio"
                    name="needDragon"
                    checked={jerseyDraft.needDragon === true}
                    onChange={() => updateJerseyDraft('needDragon', true)}
                  />
                  Yes
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="needDragon"
                    checked={jerseyDraft.needDragon === false}
                    onChange={() => updateJerseyDraft('needDragon', false)}
                  />
                  No
                </label>
              </div>
            </fieldset>
          )}

          {jerseyDraft.jerseyColor === 'Blue' && (
            <fieldset className="fieldset">
              <legend>Need Blue Whale?</legend>
              <div className="toggle-row">
                <label className="radio">
                  <input
                    type="radio"
                    name="needBlueWhale"
                    checked={jerseyDraft.needBlueWhale === true}
                    onChange={() => updateJerseyDraft('needBlueWhale', true)}
                  />
                  Yes
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="needBlueWhale"
                    checked={jerseyDraft.needBlueWhale === false}
                    onChange={() => updateJerseyDraft('needBlueWhale', false)}
                  />
                  No
                </label>
              </div>
            </fieldset>
          )}

          <div className="form-grid">
            <Field
              label="How Many Jerseys?"
              id="quantity"
              value={jerseyDraft.quantity}
              onChange={(v) =>
                updateJerseyDraft('quantity', v.replace(/[^\d]/g, '').slice(0, 2))
              }
              error={jerseyErrors.quantity}
              inputMode="numeric"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('cart')}>
              Back to Order
            </button>
            <button type="submit" className="btn btn--primary">
              Add to Order
            </button>
          </div>
        </form>
      )}

      {step === 'hat' && (
        <form onSubmit={handleSaveHat} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="hatColor">Hat Color</label>
              <select
                id="hatColor"
                value={hatDraft.hatColor}
                onChange={(e) => updateHatDraft('hatColor', e.target.value)}
              >
                {HAT_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
            <SizeSelect
              label="Hat Size"
              id="hatSize"
              value={hatDraft.hatSize}
              onChange={(v) => updateHatDraft('hatSize', v)}
            />
            <Field
              label="How Many Hats?"
              id="hatQuantity"
              value={hatDraft.quantity}
              onChange={(v) => updateHatDraft('quantity', v.replace(/[^\d]/g, '').slice(0, 2))}
              error={hatErrors.quantity}
              inputMode="numeric"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('cart')}>
              Back to Order
            </button>
            <button type="submit" className="btn btn--primary">
              Add to Order
            </button>
          </div>
        </form>
      )}

      {step === 'pants' && (
        <form onSubmit={handleSavePants} noValidate>
          <p className="muted">Cost assessed based on order.</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="pantsColor">Pants Color</label>
              <select
                id="pantsColor"
                value={pantsDraft.pantsColor}
                onChange={(e) => updatePantsDraft('pantsColor', e.target.value)}
              >
                {PANTS_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
            <SizeSelect
              label="Pants Size"
              id="pantsSize"
              value={pantsDraft.pantsSize}
              onChange={(v) => updatePantsDraft('pantsSize', v)}
            />
            <Field
              label="How Many Pants?"
              id="pantsQuantity"
              value={pantsDraft.quantity}
              onChange={(v) => updatePantsDraft('quantity', v.replace(/[^\d]/g, '').slice(0, 2))}
              error={pantsErrors.quantity}
              inputMode="numeric"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('cart')}>
              Back to Order
            </button>
            <button type="submit" className="btn btn--primary">
              Add to Order
            </button>
          </div>
        </form>
      )}

      {step === 'review' && (
        <div>
          <ReviewSummary player={player} jerseys={jerseys} hats={hats} pants={pants} />
          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('cart')}>
              Back to Order
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSubmitOrder}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Order'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, id, value, onChange, error, hint, status, required, inputMode }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={id}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint`}
        required={required}
      />
      <div id={`${id}-hint`} className="field-hint">
        {error ? (
          <span className="field-error">{error}</span>
        ) : status === 'checking' ? (
          <span className="field-status">Checking availability…</span>
        ) : status === 'taken' ? (
          <span className="field-error">Already taken by another player.</span>
        ) : status === 'available' ? (
          <span className="field-ok">Available</span>
        ) : (
          hint
        )}
      </div>
    </div>
  )
}

function SizeSelect({ label, id, value, onChange, compact }) {
  return (
    <div className={`field ${compact ? 'field--compact' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  )
}

function ReviewSummary({ player, jerseys, hats, pants }) {
  return (
    <div className="review-summary">
      <dl>
        <div className="review-row">
          <dt>Name</dt>
          <dd>
            {player.firstName} {player.lastName}
          </dd>
        </div>
        <div className="review-row">
          <dt>Short Name</dt>
          <dd>{player.shortName}</dd>
        </div>
        <div className="review-row">
          <dt>Jersey Number</dt>
          <dd>#{player.jerseyNumber}</dd>
        </div>
        <div className="review-row">
          <dt>Jerseys ({jerseys.length})</dt>
          <dd>
            {jerseys.map((item, idx) => (
              <div key={idx}>{summarizeJerseyItem(item)}</div>
            ))}
          </dd>
        </div>
        <div className="review-row">
          <dt>Hats ({hats.length})</dt>
          <dd>
            {hats.length === 0 ? (
              'None'
            ) : (
              hats.map((item, idx) => <div key={idx}>{summarizeHatItem(item)}</div>)
            )}
          </dd>
        </div>
        <div className="review-row">
          <dt>Pants ({pants.length})</dt>
          <dd>
            {pants.length === 0 ? (
              'None'
            ) : (
              pants.map((item, idx) => <div key={idx}>{summarizePantsItem(item)}</div>)
            )}
          </dd>
        </div>
      </dl>
      <p className="muted">Final cost will be confirmed by the team admin.</p>
    </div>
  )
}
