import { useEffect, useState } from 'react'
import Modal from './Modal'
import {
  JERSEY_COLORS,
  SIZES,
  SLEEVE_TYPES,
  validateJerseyItem,
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

const DEFAULT_HAT = { hatSize: 'M' }
const DEFAULT_PANTS = { pantsSize: 'M' }

function decomposeCart(initialForm, mode) {
  if (mode !== 'edit' || !initialForm) {
    return {
      player: { firstName: '', lastName: '', shortName: '', jerseyNumber: '' },
      jerseys: [],
      hat: null,
      pants: null,
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

  return {
    player,
    jerseys,
    hat: initialForm.needHat ? { hatSize: initialForm.hatSize || 'M' } : null,
    pants: initialForm.needPants ? { pantsSize: initialForm.pantsSize || 'M' } : null,
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

export default function OrderFormModal({ mode, initialForm, orderId, onClose, onSaved }) {
  const initial = decomposeCart(initialForm, mode)
  const [player, setPlayer] = useState(initial.player)
  const [jerseys, setJerseys] = useState(initial.jerseys)
  const [hat, setHat] = useState(initial.hat)
  const [pants, setPants] = useState(initial.pants)

  const [step, setStep] = useState('cart') // cart | jersey | hat | pants | review
  const [editingJerseyIndex, setEditingJerseyIndex] = useState(null)
  const [jerseyDraft, setJerseyDraft] = useState(DEFAULT_JERSEY_ITEM)
  const [hatDraft, setHatDraft] = useState(DEFAULT_HAT)
  const [pantsDraft, setPantsDraft] = useState(DEFAULT_PANTS)

  const [playerErrors, setPlayerErrors] = useState({})
  const [jerseyErrors, setJerseyErrors] = useState({})
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

  function openHatStep() {
    setHatDraft(hat ?? DEFAULT_HAT)
    setStep('hat')
  }

  function openPantsStep() {
    setPantsDraft(pants ?? DEFAULT_PANTS)
    setStep('pants')
  }

  function handleSaveHat() {
    setHat(hatDraft)
    setStep('cart')
  }

  function handleSavePants() {
    setPants(pantsDraft)
    setStep('cart')
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
        needHat: Boolean(hat),
        hatSize: hat?.hatSize ?? 'M',
        needPants: Boolean(pants),
        pantsSize: pants?.pantsSize ?? 'M',
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
        ? hat
          ? 'Edit Hat'
          : 'Add Hat'
        : step === 'pants'
          ? pants
            ? 'Edit Pants'
            : 'Add Pants'
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
              <h3>Hat</h3>
            </div>
            <CartItemRow
              summary={hat ? `Size ${hat.hatSize}` : null}
              onAdd={openHatStep}
              onEdit={openHatStep}
              onRemove={() => setHat(null)}
            />
          </div>

          <div className="cart-section">
            <div className="cart-section__header">
              <h3>Track Pants</h3>
            </div>
            <CartItemRow
              summary={pants ? `Size ${pants.pantsSize}` : null}
              onAdd={openPantsStep}
              onEdit={openPantsStep}
              onRemove={() => setPants(null)}
            />
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
        <div>
          <SizeSelect
            label="Hat Size"
            id="hatSize"
            value={hatDraft.hatSize}
            onChange={(v) => setHatDraft({ hatSize: v })}
          />
          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('cart')}>
              Back to Order
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSaveHat}>
              Add to Order
            </button>
          </div>
        </div>
      )}

      {step === 'pants' && (
        <div>
          <p className="muted">Cost assessed based on order.</p>
          <SizeSelect
            label="Pants Size"
            id="pantsSize"
            value={pantsDraft.pantsSize}
            onChange={(v) => setPantsDraft({ pantsSize: v })}
          />
          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('cart')}>
              Back to Order
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSavePants}>
              Add to Order
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div>
          <ReviewSummary player={player} jerseys={jerseys} hat={hat} pants={pants} />
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

function CartItemRow({ label, required, summary, onAdd, onEdit, onRemove }) {
  return (
    <div className="cart-item">
      <div className="cart-item__info">
        <p className="cart-item__label">
          {label} {required && <span className="muted">(required)</span>}
        </p>
        <p className={summary ? 'cart-item__summary' : 'muted'}>{summary ?? 'Not added yet'}</p>
      </div>
      <div className="cart-item__actions">
        {summary ? (
          <>
            <button type="button" className="btn btn--outline btn--sm" onClick={onEdit}>
              Edit
            </button>
            {onRemove && (
              <button type="button" className="btn btn--danger btn--sm" onClick={onRemove}>
                Remove
              </button>
            )}
          </>
        ) : (
          <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
            + Add {label}
          </button>
        )}
      </div>
    </div>
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

function ReviewSummary({ player, jerseys, hat, pants }) {
  return (
    <div className="review-summary">
      <h3>Review Your Order</h3>
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
          <dt>Hat</dt>
          <dd>{hat ? `Yes · Size ${hat.hatSize}` : 'No'}</dd>
        </div>
        <div className="review-row">
          <dt>Pants</dt>
          <dd>{pants ? `Yes · Size ${pants.pantsSize}` : 'No'}</dd>
        </div>
      </dl>
      <p className="muted">Final cost will be confirmed by the team admin.</p>
    </div>
  )
}
