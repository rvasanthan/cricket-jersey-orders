import CopyButton from './CopyButton'

const STATUS_LABEL = { pending: 'Pending', fulfilled: 'Fulfilled', paid: 'Paid' }

export default function OrderCard({ order, onEdit, onDelete }) {
  return (
    <div className="order-card">
      <div className="order-card__header">
        <div>
          <p className="order-card__number">{order.orderNumber}</p>
          <p className="order-card__name">
            {order.firstName} {order.lastName} · &ldquo;{order.shortName}&rdquo;
          </p>
        </div>
        <span className={`status-badge status-badge--${order.status}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <dl className="order-card__details">
        <div>
          <dt>Jersey</dt>
          <dd>
            #{order.jerseyNumber} · Size {order.jerseySize}
          </dd>
        </div>
        <div>
          <dt>Hat</dt>
          <dd>{order.needHat ? `Yes · Size ${order.hatSize}` : 'No'}</dd>
        </div>
        <div>
          <dt>Pants</dt>
          <dd>{order.needPants ? `Yes · Size ${order.pantsSize}` : 'No'}</dd>
        </div>
        <div>
          <dt>Total Cost</dt>
          <dd>${order.totalCost?.toFixed(2)}</dd>
        </div>
      </dl>

      <div className="order-card__actions">
        <CopyButton value={order.orderNumber} />
        <button type="button" className="btn btn--primary" onClick={onEdit}>
          Edit Order
        </button>
        <button type="button" className="btn btn--danger" onClick={onDelete}>
          Delete Order
        </button>
      </div>
    </div>
  )
}
