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
          <dt>Jersey Number</dt>
          <dd>#{order.jerseyNumber}</dd>
        </div>
        <div>
          <dt>Jerseys ({(order.jerseys || []).length})</dt>
          <dd>
            {(order.jerseys || []).map((j, idx) => {
              const addon =
                j.jerseyColor === 'Red'
                  ? j.needDragon
                    ? ' · Dragon'
                    : ''
                  : j.needBlueWhale
                    ? ' · Blue Whale'
                    : ''
              return (
                <div key={idx} className="jersey-item-summary">
                  {j.jerseyColor} · Size {j.jerseySize} · {j.sleeveType} · Qty {j.quantity}{addon}
                </div>
              )
            })}
          </dd>
        </div>
        <div>
          <dt>Hats ({(order.hats || (order.needHat ? [{ hatColor: order.hatColor || 'Red', hatSize: order.hatSize || 'M', quantity: order.hatQuantity || 1 }] : [])).length})</dt>
          <dd>
            {(order.hats && order.hats.length > 0)
              ? order.hats.map((h, idx) => (
                  <div key={idx} className="jersey-item-summary">
                    {h.hatColor} · Size {h.hatSize} · Qty {h.quantity}
                  </div>
                ))
              : order.needHat
                ? `${order.hatColor || 'Red'} · Size ${order.hatSize} · Qty ${order.hatQuantity || 1}`
                : 'No'}
          </dd>
        </div>
        <div>
          <dt>Pants ({(order.pants || (order.needPants ? [{ pantsColor: order.pantsColor || 'Red', pantsSize: order.pantsSize || 'M', quantity: order.pantsQuantity || 1 }] : [])).length})</dt>
          <dd>
            {(order.pants && order.pants.length > 0)
              ? order.pants.map((p, idx) => (
                  <div key={idx} className="jersey-item-summary">
                    {p.pantsColor} · Size {p.pantsSize} · Qty {p.quantity}
                  </div>
                ))
              : order.needPants
                ? `${order.pantsColor || 'Red'} · Size ${order.pantsSize} · Qty ${order.pantsQuantity || 1}`
                : 'No'}
          </dd>
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
