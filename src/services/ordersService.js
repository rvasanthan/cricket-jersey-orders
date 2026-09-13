import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { generateOrderNumber } from '../utils/orderNumber'
import { normalize } from '../utils/validation'

const ORDERS = 'orders'
const SETTINGS = 'settings'
const PRICING_DOC = 'pricing'

const DEFAULT_PRICING = { jerseyPrice: 25, hatPrice: 12, pantsPrice: 20 }

function toOrder(docSnap) {
  const data = docSnap.data()
  const jerseys =
    Array.isArray(data.jerseys) && data.jerseys.length > 0
      ? data.jerseys
      : [
          {
            jerseySize: data.jerseySize || 'M',
            jerseyColor: data.jerseyColor || 'Red',
            sleeveType: data.sleeveType || 'Half Sleeve',
            quantity: Math.max(1, Number(data.quantity) || 1),
            needDragon: Boolean(data.needDragon),
            needBlueWhale: Boolean(data.needBlueWhale),
          },
        ]

  return {
    id: docSnap.id,
    ...data,
    jerseys,
    hatColor: data.hatColor || 'Red',
    hatQuantity: Math.max(1, Number(data.hatQuantity) || 1),
    pantsColor: data.pantsColor || 'Black',
    pantsQuantity: Math.max(1, Number(data.pantsQuantity) || 1),
    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : null,
    updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : null,
  }
}

export async function getPricing() {
  const snap = await getDoc(doc(db, SETTINGS, PRICING_DOC))
  return snap.exists() ? { ...DEFAULT_PRICING, ...snap.data() } : DEFAULT_PRICING
}

export async function savePricing(pricing) {
  await setDoc(doc(db, SETTINGS, PRICING_DOC), pricing, { merge: true })
}

export function computeTotalCost(form, pricing) {
  const jerseys =
    Array.isArray(form.jerseys) && form.jerseys.length > 0
      ? form.jerseys
      : form.jerseyColor
        ? [form]
        : []
  const totalJerseyQty = jerseys.reduce(
    (sum, j) => sum + Math.max(1, Number(j.quantity) || 1),
    0,
  )
  let total = pricing.jerseyPrice * totalJerseyQty
  if (form.needHat) {
    total += pricing.hatPrice * Math.max(1, Number(form.hatQuantity) || 1)
  }
  if (form.needPants) {
    total += pricing.pantsPrice * Math.max(1, Number(form.pantsQuantity) || 1)
  }
  return total
}

// Finds existing orders that would collide with this form's unique fields (jersey number / short name).
export async function findConflicts(form, excludeId) {
  const jerseyNumber = form.jerseyNumber.toString().trim()
  const shortNameLower = normalize(form.shortName)

  const [byJersey, byShortName] = await Promise.all([
    getDocs(query(collection(db, ORDERS), where('jerseyNumber', '==', jerseyNumber))),
    getDocs(query(collection(db, ORDERS), where('shortNameLower', '==', shortNameLower))),
  ])

  const conflicts = []
  byJersey.forEach((d) => {
    if (d.id !== excludeId) conflicts.push({ field: 'jerseyNumber', order: toOrder(d) })
  })
  byShortName.forEach((d) => {
    if (d.id !== excludeId) conflicts.push({ field: 'shortName', order: toOrder(d) })
  })
  return conflicts
}

// Lightweight single-field check used for live inline validation while typing.
export async function checkFieldAvailability(field, value, excludeId) {
  if (!value.toString().trim()) return true
  const fieldName = field === 'jerseyNumber' ? 'jerseyNumber' : 'shortNameLower'
  const fieldValue = field === 'jerseyNumber' ? value.toString().trim() : normalize(value)
  const snap = await getDocs(query(collection(db, ORDERS), where(fieldName, '==', fieldValue)))
  return snap.docs.every((d) => d.id === excludeId)
}

export async function createOrder(form) {
  const pricing = await getPricing()
  const conflicts = await findConflicts(form, null)
  if (conflicts.length > 0) {
    return { success: false, conflicts }
  }

  let orderNumber = generateOrderNumber()
  // Guard against the astronomically unlikely event of a collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await getDocs(
      query(collection(db, ORDERS), where('orderNumber', '==', orderNumber)),
    )
    if (existing.empty) break
    orderNumber = generateOrderNumber()
  }

  const jerseys =
    Array.isArray(form.jerseys) && form.jerseys.length > 0
      ? form.jerseys.map((j) => ({
          jerseySize: j.jerseySize || 'M',
          jerseyColor: j.jerseyColor || 'Red',
          sleeveType: j.sleeveType || 'Half Sleeve',
          quantity: Math.max(1, Number(j.quantity) || 1),
          needDragon: j.jerseyColor === 'Red' ? Boolean(j.needDragon) : false,
          needBlueWhale: j.jerseyColor === 'Blue' ? Boolean(j.needBlueWhale) : false,
        }))
      : [
          {
            jerseySize: form.jerseySize || 'M',
            jerseyColor: form.jerseyColor || 'Red',
            sleeveType: form.sleeveType || 'Half Sleeve',
            quantity: Math.max(1, Number(form.quantity) || 1),
            needDragon: form.jerseyColor === 'Red' ? Boolean(form.needDragon) : false,
            needBlueWhale: form.jerseyColor === 'Blue' ? Boolean(form.needBlueWhale) : false,
          },
        ]

  const firstJersey = jerseys[0]
  const totalJerseyQty = jerseys.reduce((sum, j) => sum + j.quantity, 0)

  const payload = {
    orderNumber,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    lastNameLower: normalize(form.lastName),
    shortName: form.shortName.trim(),
    shortNameLower: normalize(form.shortName),
    jerseyNumber: form.jerseyNumber.toString().trim(),
    jerseys,
    // Top-level fallbacks for backward compatibility
    jerseySize: firstJersey.jerseySize,
    jerseyColor: firstJersey.jerseyColor,
    sleeveType: firstJersey.sleeveType,
    quantity: totalJerseyQty,
    needDragon: jerseys.some((j) => j.needDragon),
    needBlueWhale: jerseys.some((j) => j.needBlueWhale),
    needHat: Boolean(form.needHat),
    hatSize: form.needHat ? form.hatSize : null,
    hatColor: form.needHat ? form.hatColor : null,
    hatQuantity: form.needHat ? Math.max(1, Number(form.hatQuantity) || 1) : 0,
    needPants: Boolean(form.needPants),
    pantsSize: form.needPants ? form.pantsSize : null,
    pantsColor: form.needPants ? form.pantsColor : null,
    pantsQuantity: form.needPants ? Math.max(1, Number(form.pantsQuantity) || 1) : 0,
    totalCost: computeTotalCost({ ...form, jerseys }, pricing),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, ORDERS), payload)
  return { success: true, id: docRef.id, orderNumber }
}

export async function updateOrder(id, form) {
  const pricing = await getPricing()
  const conflicts = await findConflicts(form, id)
  if (conflicts.length > 0) {
    return { success: false, conflicts }
  }

  const jerseys =
    Array.isArray(form.jerseys) && form.jerseys.length > 0
      ? form.jerseys.map((j) => ({
          jerseySize: j.jerseySize || 'M',
          jerseyColor: j.jerseyColor || 'Red',
          sleeveType: j.sleeveType || 'Half Sleeve',
          quantity: Math.max(1, Number(j.quantity) || 1),
          needDragon: j.jerseyColor === 'Red' ? Boolean(j.needDragon) : false,
          needBlueWhale: j.jerseyColor === 'Blue' ? Boolean(j.needBlueWhale) : false,
        }))
      : [
          {
            jerseySize: form.jerseySize || 'M',
            jerseyColor: form.jerseyColor || 'Red',
            sleeveType: form.sleeveType || 'Half Sleeve',
            quantity: Math.max(1, Number(form.quantity) || 1),
            needDragon: form.jerseyColor === 'Red' ? Boolean(form.needDragon) : false,
            needBlueWhale: form.jerseyColor === 'Blue' ? Boolean(form.needBlueWhale) : false,
          },
        ]

  const firstJersey = jerseys[0]
  const totalJerseyQty = jerseys.reduce((sum, j) => sum + j.quantity, 0)

  const payload = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    lastNameLower: normalize(form.lastName),
    shortName: form.shortName.trim(),
    shortNameLower: normalize(form.shortName),
    jerseyNumber: form.jerseyNumber.toString().trim(),
    jerseys,
    jerseySize: firstJersey.jerseySize,
    jerseyColor: firstJersey.jerseyColor,
    sleeveType: firstJersey.sleeveType,
    quantity: totalJerseyQty,
    needDragon: jerseys.some((j) => j.needDragon),
    needBlueWhale: jerseys.some((j) => j.needBlueWhale),
    needHat: Boolean(form.needHat),
    hatSize: form.needHat ? form.hatSize : null,
    hatColor: form.needHat ? form.hatColor : null,
    hatQuantity: form.needHat ? Math.max(1, Number(form.hatQuantity) || 1) : 0,
    needPants: Boolean(form.needPants),
    pantsSize: form.needPants ? form.pantsSize : null,
    pantsColor: form.needPants ? form.pantsColor : null,
    pantsQuantity: form.needPants ? Math.max(1, Number(form.pantsQuantity) || 1) : 0,
    totalCost: computeTotalCost({ ...form, jerseys }, pricing),
    updatedAt: serverTimestamp(),
  }

  await updateDoc(doc(db, ORDERS, id), payload)
  return { success: true, id }
}

export async function updateOrderStatus(id, status) {
  await updateDoc(doc(db, ORDERS, id), { status, updatedAt: serverTimestamp() })
}

export async function deleteOrder(id) {
  await deleteDoc(doc(db, ORDERS, id))
}

export async function getAllOrders() {
  const snap = await getDocs(query(collection(db, ORDERS), orderBy('createdAt', 'desc')))
  return snap.docs.map(toOrder)
}

// Searches by exact order number first, then falls back to jersey number / short name / last name matches.
export async function searchOrders(term) {
  const raw = term.trim()
  if (!raw) return []

  const upper = raw.toUpperCase()
  if (/^CRK-/.test(upper)) {
    const snap = await getDocs(query(collection(db, ORDERS), where('orderNumber', '==', upper)))
    return snap.docs.map(toOrder)
  }

  const lower = normalize(raw)
  const [byJersey, byShortName, byLastName] = await Promise.all([
    getDocs(query(collection(db, ORDERS), where('jerseyNumber', '==', raw))),
    getDocs(query(collection(db, ORDERS), where('shortNameLower', '==', lower))),
    getDocs(query(collection(db, ORDERS), where('lastNameLower', '==', lower))),
  ])

  const byId = new Map()
  ;[...byJersey.docs, ...byShortName.docs, ...byLastName.docs].forEach((d) => {
    byId.set(d.id, toOrder(d))
  })
  return [...byId.values()]
}
