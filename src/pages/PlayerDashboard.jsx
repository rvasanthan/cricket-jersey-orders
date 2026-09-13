import { useState } from 'react'
import OrderFormModal from '../components/OrderFormModal'
import OrderCard from '../components/OrderCard'
import ConfirmDialog from '../components/ConfirmDialog'
import CopyButton from '../components/CopyButton'
import Toast from '../components/Toast'
import { EMPTY_FORM } from '../utils/validation'
import { deleteOrder, searchOrders } from '../services/ordersService'

export default function PlayerDashboard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [toast, setToast] = useState(null)

  async function handleSearch(event) {
    event.preventDefault()
    if (!searchTerm.trim()) return
    setSearching(true)
    setSearchError('')
    try {
      const orders = await searchOrders(searchTerm)
      setResults(orders)
      if (orders.length === 0) setSearchError('No order found for that search. You can add a new one below.')
    } catch (err) {
      setSearchError(err.message || 'Something went wrong while searching.')
    } finally {
      setSearching(false)
    }
  }

  function refreshResult(order) {
    setResults((prev) => (prev ? prev.map((o) => (o.id === order.id ? order : o)) : prev))
  }

  async function handleConfirmDelete() {
    const order = pendingDelete
    setPendingDelete(null)
    await deleteOrder(order.id)
    setResults((prev) => (prev ? prev.filter((o) => o.id !== order.id) : prev))
    setToast({ tone: 'success', message: `Order ${order.orderNumber} was deleted.` })
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Team Cricket Jersey Orders</h1>
        <p>Order your jersey, hat, and pants — then track it anytime with your order number.</p>
      </header>

      <section className="card" aria-labelledby="search-heading">
        <h2 id="search-heading">Search Your Order</h2>
        <form className="search-row" onSubmit={handleSearch}>
          <label htmlFor="search-input" className="visually-hidden">
            Search by order number, jersey number, short name, or last name
          </label>
          <input
            id="search-input"
            placeholder="Order number, jersey #, short name, or last name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn btn--primary" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
        {searchError && (
          <p className="form-hint" role="status">
            {searchError}
          </p>
        )}

        {results && results.length > 0 && (
          <div className="order-list">
            {results.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onEdit={() => setEditingOrder(order)}
                onDelete={() => setPendingDelete(order)}
              />
            ))}
          </div>
        )}

        {(!results || results.length === 0) && (
          <button type="button" className="btn btn--primary btn--lg" onClick={() => setShowAddModal(true)}>
            + Add New Order
          </button>
        )}
      </section>

      {showAddModal && (
        <OrderFormModal
          mode="create"
          initialForm={EMPTY_FORM}
          onClose={() => setShowAddModal(false)}
          onSaved={(result) => {
            setShowAddModal(false)
            setConfirmation(result.orderNumber)
          }}
        />
      )}

      {editingOrder && (
        <OrderFormModal
          mode="edit"
          orderId={editingOrder.id}
          initialForm={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={(result) => {
            setEditingOrder(null)
            refreshResult({ ...editingOrder, ...result })
            setToast({ tone: 'success', message: 'Your order was updated.' })
            searchOrders(searchTerm).then(setResults)
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

      {confirmation && (
        <ConfirmationDialog orderNumber={confirmation} onClose={() => setConfirmation(null)} />
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function ConfirmationDialog({ orderNumber, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-panel modal-panel--sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="modal-body confirmation">
          <p className="confirmation__icon" aria-hidden="true">
            ✓
          </p>
          <h2 id="confirm-title">Order Placed!</h2>
          <p>Your order number is</p>
          <p className="confirmation__number">{orderNumber}</p>
          <p className="muted">Save this number to search or edit your order later.</p>
          <div className="modal-actions modal-actions--center">
            <CopyButton value={orderNumber} />
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
