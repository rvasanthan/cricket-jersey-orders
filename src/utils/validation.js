export const SIZES = ['S', 'M', 'L', 'XL', 'XXL']

export const JERSEY_COLORS = ['Red', 'Blue']
export const HAT_COLORS = ['Red', 'Blue']
export const PANTS_COLORS = ['Red', 'Blue']

export const SLEEVE_TYPES = ['Half Sleeve', 'Full Sleeve']

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
  jerseyColor: 'Red',
  sleeveType: 'Half Sleeve',
  quantity: 1,
  needDragon: false,
  needBlueWhale: false,
  needHat: false,
  hatSize: 'M',
  needPants: false,
  pantsSize: 'M',
}

export function validatePlayerDetails(player) {
  const errors = {}

  if (!player.firstName || !player.firstName.trim()) errors.firstName = 'First name is required.'
  if (!player.lastName || !player.lastName.trim()) errors.lastName = 'Last name is required.'

  if (!player.shortName || !player.shortName.trim()) {
    errors.shortName = 'Short name is required.'
  } else if (player.shortName.trim().length > 12) {
    errors.shortName = 'Short name must be 12 characters or fewer.'
  }

  if (!player.jerseyNumber || !player.jerseyNumber.toString().trim()) {
    errors.jerseyNumber = 'Jersey number is required.'
  } else if (!/^\d{1,3}$/.test(player.jerseyNumber.toString().trim())) {
    errors.jerseyNumber = 'Jersey number must be 1-3 digits.'
  }

  return errors
}

export function validateJerseyItem(jersey) {
  const errors = {}
  if (!jersey.quantity || Number(jersey.quantity) < 1 || !Number.isInteger(Number(jersey.quantity))) {
    errors.quantity = 'Enter how many jerseys you need (1 or more).'
  }
  return errors
}

export function validateHatItem(hat) {
  const errors = {}
  if (!hat.quantity || Number(hat.quantity) < 1 || !Number.isInteger(Number(hat.quantity))) {
    errors.quantity = 'Enter how many hats you need (1 or more).'
  }
  return errors
}

export function validatePantsItem(pants) {
  const errors = {}
  if (!pants.quantity || Number(pants.quantity) < 1 || !Number.isInteger(Number(pants.quantity))) {
    errors.quantity = 'Enter how many pants you need (1 or more).'
  }
  return errors
}

export function validateForm(form) {
  const errors = validatePlayerDetails(form)
  if (!form.quantity || Number(form.quantity) < 1 || !Number.isInteger(Number(form.quantity))) {
    errors.quantity = 'Enter how many jerseys you need (1 or more).'
  }
  return errors
}

export function normalize(value) {
  return value.toString().trim().toLowerCase()
}
