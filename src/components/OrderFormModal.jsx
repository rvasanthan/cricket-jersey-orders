import { useEffect, useState } from 'react'
import Modal from './Modal'
import { EMPTY_FORM, JERSEY_COLORS, SIZES, SLEEVE_TYPES, validateForm } from '../utils/validation'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { checkFieldAvailability, createOrder, updateOrder } from '../services/ordersService'

const FIELD_LABELS = {
  jerseyNumber: 'Jersey number',
  shortName: 'Short name',
}

export default function OrderFormModal({ mode, initialForm, orderId, onClose, onSaved }) {
  const [step, setStep] = useState('form')
  const [form, setForm] = useState(initialForm ?? EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [fieldStatus, setFieldStatus] = useState({ jerseyNumber: null, shortName: null })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const debouncedJerseyNumber = useDebouncedValue(form.jerseyNumber)
  const debouncedShortName = useDebouncedValue(form.shortName)

  useEffect(() => {
    let active = true
    if (!form.jerseyNumber.toString().trim()) {
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
    if (!form.shortName.trim()) {
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

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleContinue(event) {
    event.preventDefault()
    const validationErrors = validateForm(form)
    if (fieldStatus.jerseyNumber === 'taken') {
      validationErrors.jerseyNumber = 'That jersey number is already taken.'
    }
    if (fieldStatus.shortName === 'taken') {
      validationErrors.shortName = 'That short name is already taken.'
    }
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length === 0) {
      setStep('review')
    }
  }

  async function handleConfirm() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const result =
        mode === 'edit' ? await updateOrder(orderId, form) : await createOrder(form)

      if (!result.success) {
        const fields = [...new Set(result.conflicts.map((c) => FIELD_LABELS[c.field]))]
        setSubmitError(
          `Someone already has that ${fields.join(' / ')}. Please choose different values.`,
        )
        setStep('form')
        return
      }
      onSaved(result)
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong while saving your order.')
    } finally {
      setSubmitting(false)
    }
  }

  const title = mode === 'edit' ? 'Edit Your Order' : 'New Jersey Order'

  return (
    <Modal title={title} onClose={onClose}>
      {step === 'form' ? (
        <form onSubmit={handleContinue} noValidate>
          <div className="form-grid">
            <Field
              label="First Name"
              id="firstName"
              value={form.firstName}
              onChange={(v) => updateField('firstName', v)}
              error={errors.firstName}
              required
            />
            <Field
              label="Last Name"
              id="lastName"
              value={form.lastName}
              onChange={(v) => updateField('lastName', v)}
              error={errors.lastName}
              required
            />
            <Field
              label="Short Name"
              id="shortName"
              value={form.shortName}
              onChange={(v) => updateField('shortName', v)}
              error={errors.shortName}
              hint="Shown on the back of the jersey. Must be unique."
              status={fieldStatus.shortName}
              required
            />
            <Field
              label="Jersey Number"
              id="jerseyNumber"
              value={form.jerseyNumber}
              onChange={(v) => updateField('jerseyNumber', v.replace(/[^\d]/g, '').slice(0, 3))}
              error={errors.jerseyNumber}
              hint="Must be unique across the team."
              status={fieldStatus.jerseyNumber}
              inputMode="numeric"
              required
            />
            <SizeSelect
              label="Jersey Size"
              id="jerseySize"
              value={form.jerseySize}
              onChange={(v) => updateField('jerseySize', v)}
            />
            <div className="field">
              <label htmlFor="jerseyColor">Jersey Color</label>
              <select
                id="jerseyColor"
                value={form.jerseyColor}
                onChange={(e) => updateField('jerseyColor', e.target.value)}
              >
                {JERSEY_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="How Many Jerseys?"
              id="quantity"
              value={form.quantity}
              onChange={(v) => updateField('quantity', v.replace(/[^\d]/g, '').slice(0, 2))}
              error={errors.quantity}
              inputMode="numeric"
              required
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
                    checked={form.sleeveType === type}
                    onChange={() => updateField('sleeveType', type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </fieldset>

          {form.jerseyColor === 'Red' && (
            <fieldset className="fieldset">
              <legend>Need Dragon?</legend>
              <div className="toggle-row">
                <label className="radio">
                  <input
                    type="radio"
                    name="needDragon"
                    checked={form.needDragon === true}
                    onChange={() => updateField('needDragon', true)}
                  />
                  Yes
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="needDragon"
                    checked={form.needDragon === false}
                    onChange={() => updateField('needDragon', false)}
                  />
                  No
                </label>
              </div>
            </fieldset>
          )}

          {form.jerseyColor === 'Blue' && (
            <fieldset className="fieldset">
              <legend>Need Blue Whale?</legend>
              <div className="toggle-row">
                <label className="radio">
                  <input
                    type="radio"
                    name="needBlueWhale"
                    checked={form.needBlueWhale === true}
                    onChange={() => updateField('needBlueWhale', true)}
                  />
                  Yes
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="needBlueWhale"
                    checked={form.needBlueWhale === false}
                    onChange={() => updateField('needBlueWhale', false)}
                  />
                  No
                </label>
              </div>
            </fieldset>
          )}

          <fieldset className="fieldset">
            <legend>Need Hats?</legend>
            <div className="toggle-row">
              <label className="radio">
                <input
                  type="radio"
                  name="needHat"
                  checked={form.needHat === true}
                  onChange={() => updateField('needHat', true)}
                />
                Yes
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="needHat"
                  checked={form.needHat === false}
                  onChange={() => updateField('needHat', false)}
                />
                No
              </label>
              {form.needHat && (
                <SizeSelect
                  label="Hat Size"
                  id="hatSize"
                  value={form.hatSize}
                  onChange={(v) => updateField('hatSize', v)}
                  compact
                />
              )}
            </div>
          </fieldset>

          <fieldset className="fieldset">
            <legend>Need Pants? <span className="muted">(cost assessed based on order)</span></legend>
            <div className="toggle-row">
              <label className="radio">
                <input
                  type="radio"
                  name="needPants"
                  checked={form.needPants === true}
                  onChange={() => updateField('needPants', true)}
                />
                Yes
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="needPants"
                  checked={form.needPants === false}
                  onChange={() => updateField('needPants', false)}
                />
                No
              </label>
              {form.needPants && (
                <SizeSelect
                  label="Pants Size"
                  id="pantsSize"
                  value={form.pantsSize}
                  onChange={(v) => updateField('pantsSize', v)}
                  compact
                />
              )}
            </div>
          </fieldset>

          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Review Order
            </button>
          </div>
        </form>
      ) : (
        <div>
          <ReviewSummary form={form} />
          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('form')}>
              Back to Edit
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? 'Placing Order…' : mode === 'edit' ? 'Save Changes' : 'Place Order'}
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

function ReviewSummary({ form }) {
  return (
    <div className="review-summary">
      <h3>Review Your Order</h3>
      <dl>
        <div className="review-row">
          <dt>Name</dt>
          <dd>
            {form.firstName} {form.lastName}
          </dd>
        </div>
        <div className="review-row">
          <dt>Short Name</dt>
          <dd>{form.shortName}</dd>
        </div>
        <div className="review-row">
          <dt>Jersey</dt>
          <dd>
            #{form.jerseyNumber} · Size {form.jerseySize} · {form.jerseyColor}
          </dd>
        </div>
        <div className="review-row">
          <dt>Sleeve Type</dt>
          <dd>{form.sleeveType}</dd>
        </div>
        <div className="review-row">
          <dt>Quantity</dt>
          <dd>{form.quantity}</dd>
        </div>
        {form.jerseyColor === 'Red' && (
          <div className="review-row">
            <dt>Dragon</dt>
            <dd>{form.needDragon ? 'Yes' : 'No'}</dd>
          </div>
        )}
        {form.jerseyColor === 'Blue' && (
          <div className="review-row">
            <dt>Blue Whale</dt>
            <dd>{form.needBlueWhale ? 'Yes' : 'No'}</dd>
          </div>
        )}
        <div className="review-row">
          <dt>Hat</dt>
          <dd>{form.needHat ? `Yes · Size ${form.hatSize}` : 'No'}</dd>
        </div>
        <div className="review-row">
          <dt>Pants</dt>
          <dd>{form.needPants ? `Yes · Size ${form.pantsSize}` : 'No'}</dd>
        </div>
      </dl>
      <p className="muted">Final cost will be confirmed by the team admin.</p>
    </div>
  )
}
