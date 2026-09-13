export const SIZES = ['S', 'M', 'L', 'XL', 'XXL']

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'paid', label: 'Paid' },
]

export const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  shortName: '',
  jerseyNumber: '',
  jerseySize: 'M',
  needHat: false,
  hatSize: 'M',
  needPants: false,
  pantsSize: 'M',
}

export function validateForm(form) {
  const errors = {}

  if (!form.firstName.trim()) errors.firstName = 'First name is required.'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.'

  if (!form.shortName.trim()) {
    errors.shortName = 'Short name is required.'
  } else if (form.shortName.trim().length > 12) {
    errors.shortName = 'Short name must be 12 characters or fewer.'
  }

  if (!form.jerseyNumber.toString().trim()) {
    errors.jerseyNumber = 'Jersey number is required.'
  } else if (!/^\d{1,3}$/.test(form.jerseyNumber.toString().trim())) {
    errors.jerseyNumber = 'Jersey number must be 1-3 digits.'
  }

  return errors
}

export function normalize(value) {
  return value.toString().trim().toLowerCase()
}
