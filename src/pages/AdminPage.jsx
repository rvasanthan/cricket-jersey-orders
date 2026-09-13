import { useEffect, useMemo, useState } from 'react'
import OrderFormModal from '../components/OrderFormModal'
import ConfirmDialog from '../components/ConfirmDialog'
import Toast from '../components/Toast'
import { ORDER_STATUSES } from '../utils/validation'
import { downloadCsv, ordersToCsv } from '../utils/csv'
import {
  deleteOrder,
  getAllOrders,
  getPricing,
  savePricing,
  updateOrderStatus,
} from '../services/ordersService'

const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || 'change-me'
const SESSION_KEY = 'cjo_admin_unlocked'

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true')

  if (!unlocked) {
    return <AdminGate onUnlock={() => setUnlocked(true)} />
  }
  return <AdminPanel />
}

function AdminGate({ onUnlock }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (passcode === ADMIN_PASSCODE) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      onUnlock()
    } else {
      setError('Incorrect passcode.')
    }
  }

  return (
    <div className="page page--centered">
      <form className="card card--narrow" onSubmit={handleSubmit}>
        <h1>Admin Access</h1>
        <div className="field">
          <label htmlFor="passcode">Passcode</label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="passcode-hint"
            autoFocus
          />
          <div id="passcode-hint" className="field-hint">
            {error && <span className="field-error">{error}</span>}
          </div>
        </div>
        <button type="submit" className="btn btn--primary btn--lg">
          Unlock
        </button>
      </form>
    </div>
  )
}

function AdminPanel() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [pricing, setPricing] = useState({ jerseyPrice: 0, hatPrice: 0, pantsPrice: 0 })
  const [pricingSaving, setPricingSaving] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadOrders()
    getPricing().then(setPricing)
  }, [])

  async function loadOrders() {
    setLoading(true)
    const all = await getAllOrders()
    setOrders(all)
    setLoading(false)
  }

  const filteredOrders = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return orders
    return orders.filter((o) =>
      [o.orderNumber, o.firstName, o.lastName, o.shortName, o.jerseyNumber, o.status]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [orders, filter])

  const summary = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0)
    const hats = orders.filter((o) => o.needHat).length
    const pants = orders.filter((o) => o.needPants).length
    const totalJerseys = orders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0)
    const redCount = orders.filter((o) => o.jerseyColor === 'Red').length
    const blueCount = orders.filter((o) => o.jerseyColor === 'Blue').length
    const halfSleeve = orders.filter((o) => o.sleeveType === 'Half Sleeve').length
    const fullSleeve = orders.filter((o) => o.sleeveType === 'Full Sleeve').length
    const dragons = orders.filter((o) => o.needDragon).length
    const blueWhales = orders.filter((o) => o.needBlueWhale).length
    return {
      count: orders.length,
      totalRevenue,
      hats,
      pants,
      totalJerseys,
      redCount,
      blueCount,
      halfSleeve,
      fullSleeve,
      dragons,
      blueWhales,
    }
  }, [orders])

  async function handleStatusChange(order, status) {
    await updateOrderStatus(order.id, status)
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)))
  }

  async function handleConfirmDelete() {
    const order = pendingDelete
    setPendingDelete(null)
    await deleteOrder(order.id)
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
    setToast({ tone: 'success', message: `Order ${order.orderNumber} was deleted.` })
  }

  async function handleSavePricing(event) {
    event.preventDefault()
    setPricingSaving(true)
    await savePricing(pricing)
    setPricingSaving(false)
    setToast({ tone: 'success', message: 'Pricing updated.' })
  }

  function handleExportCsv() {
    downloadCsv(`jersey-orders-${Date.now()}.csv`, ordersToCsv(filteredOrders))
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    window.location.reload()
  }

  return (
    <div className="page">
      <header className="hero hero--admin">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage every jersey order for the team.</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={handleLogout}>
          Log Out
        </button>
      </header>

      <section className="stat-grid">
        <div className="stat-card">
          <p className="stat-card__value">{summary.count}</p>
          <p className="stat-card__label">Total Orders</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{summary.totalJerseys}</p>
          <p className="stat-card__label">Total Jerseys</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">${summary.totalRevenue.toFixed(2)}</p>
          <p className="stat-card__label">Total Cost Summary</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{summary.hats}</p>
          <p className="stat-card__label">Hats Requested</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{summary.pants}</p>
          <p className="stat-card__label">Pants Requested</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{summary.redCount} / {summary.blueCount}</p>
          <p className="stat-card__label">Red / Blue Jerseys</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{summary.halfSleeve} / {summary.fullSleeve}</p>
          <p className="stat-card__label">Half / Full Sleeve</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{summary.dragons}</p>
          <p className="stat-card__label">Dragons Requested</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{summary.blueWhales}</p>
          <p className="stat-card__label">Blue Whales Requested</p>
        </div>
      </section>

      <section className="card">
        <h2>Pricing Settings</h2>
        <form className="pricing-form" onSubmit={handleSavePricing}>
          <div className="field field--compact">
            <label htmlFor="jerseyPrice">Jersey Price ($)</label>
            <input
              id="jerseyPrice"
              type="number"
              min="0"
              step="0.01"
              value={pricing.jerseyPrice}
              onChange={(e) => setPricing((p) => ({ ...p, jerseyPrice: Number(e.target.value) }))}
            />
          </div>
          <div className="field field--compact">
            <label htmlFor="hatPrice">Hat Price ($)</label>
            <input
              id="hatPrice"
              type="number"
              min="0"
              step="0.01"
              value={pricing.hatPrice}
              onChange={(e) => setPricing((p) => ({ ...p, hatPrice: Number(e.target.value) }))}
            />
          </div>
          <div className="field field--compact">
            <label htmlFor="pantsPrice">Pants Price ($)</label>
            <input
              id="pantsPrice"
              type="number"
              min="0"
              step="0.01"
              value={pricing.pantsPrice}
              onChange={(e) => setPricing((p) => ({ ...p, pantsPrice: Number(e.target.value) }))}
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={pricingSaving}>
            {pricingSaving ? 'Saving…' : 'Save Pricing'}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="table-toolbar">
          <h2>All Orders</h2>
          <div className="table-toolbar__actions">
            <label htmlFor="admin-filter" className="visually-hidden">
              Filter orders
            </label>
            <input
              id="admin-filter"
              placeholder="Filter by name, order #, jersey #, status…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button type="button" className="btn btn--outline" onClick={handleExportCsv}>
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading orders…</p>
        ) : (
          <div className="table-scroll">
            <table className="orders-table">
              <thead>
                <tr>
                  <th scope="col">Order #</th>
                  <th scope="col">Player</th>
                  <th scope="col">Jersey</th>
                  <th scope="col">Sleeve</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Add-on</th>
                  <th scope="col">Hat</th>
                  <th scope="col">Pants</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td data-label="Order #">{order.orderNumber}</td>
                    <td data-label="Player">
                      {order.firstName} {order.lastName} ({order.shortName})
                    </td>
                    <td data-label="Jersey">
                      #{order.jerseyNumber} / {order.jerseySize} / {order.jerseyColor}
                    </td>
                    <td data-label="Sleeve">{order.sleeveType}</td>
                    <td data-label="Qty">{order.quantity}</td>
                    <td data-label="Add-on">
                      {order.jerseyColor === 'Red' && (order.needDragon ? 'Dragon' : '—')}
                      {order.jerseyColor === 'Blue' && (order.needBlueWhale ? 'Blue Whale' : '—')}
                    </td>
                    <td data-label="Hat">{order.needHat ? order.hatSize : '—'}</td>
                    <td data-label="Pants">{order.needPants ? order.pantsSize : '—'}</td>
                    <td data-label="Cost">${order.totalCost?.toFixed(2)}</td>
                    <td data-label="Status">
                      <label htmlFor={`status-${order.id}`} className="visually-hidden">
                        Status for order {order.orderNumber}
                      </label>
                      <select
                        id={`status-${order.id}`}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Actions" className="actions-cell">
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditingOrder(order)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => setPendingDelete(order)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      No orders match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingOrder && (
        <OrderFormModal
          mode="edit"
          orderId={editingOrder.id}
          initialForm={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={() => {
            setEditingOrder(null)
            loadOrders()
            setToast({ tone: 'success', message: 'Order updated.' })
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete Order"
          message={`Are you sure you want to delete order ${pendingDelete.orderNumber}? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}
