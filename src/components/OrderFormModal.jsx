import { useEffect, useState } from 'react'
import Modal from './Modal'
import { JERSEY_COLORS, SIZES, SLEEVE_TYPES, validateForm } from '../utils/validation'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { checkFieldAvailability, createOrder, updateOrder } from '../services/ordersService'

const FIELD_LABELS = {
  jerseyNumber: 'Jersey number',
  shortName: 'Short name',
}

const EMPTY_JERSEY = {
  firstName: '',
  lastName: '',
  shortName: '',
  jerseyNumber: '',
  jerseySize: 'M',
  jerseyColor: 'Red',
  sleeveType: 'Half Sleeve',
  quantity: 1,
  needDragon: false,
  needBlueWhale: false,
}

const EMPTY_HAT = { hatSize: 'M' }
const EMPTY_PANTS = { pantsSize: 'M' }

// Decomposes a flat order record (as stored in Firestore) into cart items for editing.
function decomposeCart(initialForm, mode) {
  if (mode !== 'edit' || !initialForm) {
    return { jersey: null, hat: null, pants: null }
  }
  const jersey = {
    firstName: initialForm.firstName,
    lastName: initialForm.lastName,
    shortName: initialForm.shortName,
    jerseyNumber: initialForm.jerseyNumber,
    jerseySize: initialForm.jerseySize,
    jerseyColor: initialForm.jerseyColor,
    sleeveType: initialForm.sleeveType,
    quantity: initialForm.quantity,
    needDragon: initialForm.needDragon,
    needBlueWhale: initialForm.needBlueWhale,
  }
  return {
    jersey,
    hat: initialForm.needHat ? { hatSize: initialForm.hatSize } : null,
    pants: initialForm.needPants ? { pantsSize: initialForm.pantsSize } : null,
  }
}

function summarizeJersey(j) {
  const addon = j.jerseyColor === 'Red' ? (j.needDragon ? ' · Dragon' : '') : j.needBlueWhale ? ' · Blue Whale' : ''
  return `#${j.jerseyNumber} · ${j.firstName} ${j.lastName} ("${j.shortName}") · ${j.jerseyColor} · Size ${j.jerseySize} · ${j.sleeveType} · Qty ${j.quantity}${addon}`
}

export default function OrderFormModal({ mode, initialForm, orderId, onClose, onSaved }) {
  const [cart, setCart] = useState(() => decomposeCart(initialForm, mode))
  const [step, setStep] = useState(mode === 'edit' ? 'cart' : 'jersey')
  const [jerseyDraft, setJerseyDraft] = useState(() => decomposeCart(initialForm, mode).jersey ?? EMPTY_JERSEY)
  const [hatDraft, setHatDraft] = useState(() => decomposeCart(initialForm, mode).hat ?? EMPTY_HAT)
  const [pantsDraft, setPantsDraft] = useState(() => decomposeCart(initialForm, mode).pants ?? EMPTY_PANTS)
  const [errors, setErrors] = useState({})
  const [fieldStatus, setFieldStatus] = useState({ jerseyNumber: null, shortName: null })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const debouncedJerseyNumber = useDebouncedValue(jerseyDraft.jerseyNumber)
  const debouncedShortName = useDebouncedValue(jerseyDraft.shortName)

  useEffect(() => {
    let active = true
    if (!jerseyDraft.jerseyNumber.toString().trim()) {
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
    if (!jerseyDraft.shortName.trim()) {
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

  function updateJerseyField(name, value) {
    setJerseyDraft((f) => ({ ...f, [name]: value }))
  }

  function openJerseyStep() {
    setJerseyDraft(cart.jersey ?? EMPTY_JERSEY)
    setErrors({})
    setSubmitError('')
    setStep('jersey')
  }

  function openHatStep() {
    setHatDraft(cart.hat ?? EMPTY_HAT)
    setStep('hat')
  }

  function openPantsStep() {
    setPantsDraft(cart.pants ?? EMPTY_PANTS)
    setStep('pants')
  }

  function handleAddJerseyToOrder(event) {
    event.preventDefault()
    const validationErrors = validateForm(jerseyDraft)
    if (fieldStatus.jerseyNumber === 'taken') {
      validationErrors.jerseyNumber = 'That jersey number is already taken.'
    }
    if (fieldStatus.shortName === 'taken') {
      validationErrors.shortName = 'That short name is already taken.'
    }
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length === 0) {
      setCart((c) => ({ ...c, jersey: jerseyDraft }))
      setStep('cart')
    }
  }

  function handleAddHatToOrder() {
    setCart((c) => ({ ...c, hat: hatDraft }))
    setStep('cart')
  }

  function handleAddPantsToOrder() {
    setCart((c) => ({ ...c, pants: pantsDraft }))
    setStep('cart')
  }

  async function handleSubmitOrder() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const combinedForm = {
        ...cart.jersey,
        needHat: Boolean(cart.hat),
        hatSize: cart.hat?.hatSize ?? 'M',
        needPants: Boolean(cart.pants),
        pantsSize: cart.pants?.pantsSize ?? 'M',
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
      ? cart.jersey
        ? 'Edit Jersey'
        : 'Add Jersey'
      : step === 'hat'
        ? cart.hat
          ? 'Edit Hat'
          : 'Add Hat'
        : step === 'pants'
          ? cart.pants
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
          <p className="muted">
            Add each item to your order, then review and submit when you&rsquo;re ready.
          </p>
          <div className="cart-list">
            <CartItemRow
              label="Jersey"
              required
              summary={cart.jersey ? summarizeJersey(cart.jersey) : null}
              onAdd={openJerseyStep}
              onEdit={openJerseyStep}
            />
            <CartItemRow
              label="Hat"
              summary={cart.hat ? `Size ${cart.hat.hatSize}` : null}
              onAdd={openHatStep}
              onEdit={openHatStep}
              onRemove={() => setCart((c) => ({ ...c, hat: null }))}
            />
            <CartItemRow
              label="Pants"
              summary={cart.pants ? `Size ${cart.pants.pantsSize}` : null}
              onAdd={openPantsStep}
              onEdit={openPantsStep}
              onRemove={() => setCart((c) => ({ ...c, pants: null }))}
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
            <button
              type="button"
              className="btn btn--primary"
              disabled={!cart.jersey}
              onClick={() => setStep('review')}
            >
              Review Order
            </button>
          </div>
        </div>
      )}

      {step === 'jersey' && (
        <form onSubmit={handleAddJerseyToOrder} noValidate>
          <div className="form-grid">
            <Field
              label="First Name"
              id="firstName"
              value={jerseyDraft.firstName}
              onChange={(v) => updateJerseyField('firstName', v)}
              error={errors.firstName}
              required
            />
            <Field
              label="Last Name"
              id="lastName"
              value={jerseyDraft.lastName}
              onChange={(v) => updateJerseyField('lastName', v)}
              error={errors.lastName}
              required
            />
            <Field
              label="Short Name"
              id="shortName"
              value={jerseyDraft.shortName}
              onChange={(v) => updateJerseyField('shortName', v)}
              error={errors.shortName}
              hint="Shown on the back of the jersey. Must be unique."
              status={fieldStatus.shortName}
              required
            />
            <Field
              label="Jersey Number"
              id="jerseyNumber"
              value={jerseyDraft.jerseyNumber}
              onChange={(v) => updateJerseyField('jerseyNumber', v.replace(/[^\d]/g, '').slice(0, 3))}
              error={errors.jerseyNumber}
              hint="Must be unique across the team."
              status={fieldStatus.jerseyNumber}
              inputMode="numeric"
              required
            />
            <SizeSelect
              label="Jersey Size"
              id="jerseySize"
              value={jerseyDraft.jerseySize}
              onChange={(v) => updateJerseyField('jerseySize', v)}
            />
            <div className="field">
              <label htmlFor="jerseyColor">Jersey Color</label>
              <select
                id="jerseyColor"
                value={jerseyDraft.jerseyColor}
                onChange={(e) => updateJerseyField('jerseyColor', e.target.value)}
              >
                {JERSEY_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
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
                    onChange={() => updateJerseyField('sleeveType', type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </fieldset>

          {jerseyDraft.jerseyColor === 'Red' && (
            <fieldset className="fieldset">
              <legend>Need Dragon?</legend>
              <div className="toggle-row">
                <label className="radio">
                  <input
                    type="radio"
                    name="needDragon"
                    checked={jerseyDraft.needDragon === true}
                    onChange={() => updateJerseyField('needDragon', true)}
                  />
                  Yes
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="needDragon"
                    checked={jerseyDraft.needDragon === false}
                    onChange={() => updateJerseyField('needDragon', false)}
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
                    onChange={() => updateJerseyField('needBlueWhale', true)}
                  />
                  Yes
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="needBlueWhale"
                    checked={jerseyDraft.needBlueWhale === false}
                    onChange={() => updateJerseyField('needBlueWhale', false)}
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
              onChange={(v) => updateJerseyField('quantity', v.replace(/[^\d]/g, '').slice(0, 2))}
              error={errors.quantity}
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
            <button type="button" className="btn btn--primary" onClick={handleAddHatToOrder}>
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
            <button type="button" className="btn btn--primary" onClick={handleAddPantsToOrder}>
              Add to Order
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div>
          <ReviewSummary cart={cart} />
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

function ReviewSummary({ cart }) {
  const jersey = cart.jersey
  return (
    <div className="review-summary">
      <h3>Review Your Order</h3>
      <dl>
        <div className="review-row">
          <dt>Name</dt>
          <dd>
            {jersey.firstName} {jersey.lastName}
          </dd>
        </div>
        <div className="review-row">
          <dt>Short Name</dt>
          <dd>{jersey.shortName}</dd>
        </div>
        <div className="review-row">
          <dt>Jersey</dt>
          <dd>
            #{jersey.jerseyNumber} · Size {jersey.jerseySize} · {jersey.jerseyColor}
          </dd>
        </div>
        <div className="review-row">
          <dt>Sleeve Type</dt>
          <dd>{jersey.sleeveType}</dd>
        </div>
        {jersey.jerseyColor === 'Red' && (
          <div className="review-row">
            <dt>Dragon</dt>
            <dd>{jersey.needDragon ? 'Yes' : 'No'}</dd>
          </div>
        )}
        {jersey.jerseyColor === 'Blue' && (
          <div className="review-row">
            <dt>Blue Whale</dt>
            <dd>{jersey.needBlueWhale ? 'Yes' : 'No'}</dd>
          </div>
        )}
        <div className="review-row">
          <dt>Quantity</dt>
          <dd>{jersey.quantity}</dd>
        </div>
        <div className="review-row">
          <dt>Hat</dt>
          <dd>{cart.hat ? `Yes · Size ${cart.hat.hatSize}` : 'No'}</dd>
        </div>
        <div className="review-row">
          <dt>Pants</dt>
          <dd>{cart.pants ? `Yes · Size ${cart.pants.pantsSize}` : 'No'}</dd>
        </div>
      </dl>
      <p className="muted">Final cost will be confirmed by the team admin.</p>
    </div>
  )
}
