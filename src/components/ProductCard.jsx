import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

/**
 * Tarjeta de producto reutilizable.
 * La imagen y el título enlazan a la página de detalle.
 * @param {Object} product - Datos del producto
 * @param {Function} onAddToCart - Callback al agregar al carrito
 * @param {boolean} [showPromoBadge] - Mostrar badge de oferta
 */
export default function ProductCard({ product, onAddToCart, showPromoBadge = false }) {
  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0;

  return (
    <div className={`product-card ${showPromoBadge ? 'promo-card' : ''}`}>
      {/* Badge de oferta */}
      {showPromoBadge && (
        <div className="promo-badge">
          <Star size={14} fill="#fff" /> OFERTA
        </div>
      )}

      {/* Badge de categoría desde la relación */}
      {product.categories?.name && (
        <div className="category-badge">
          {product.categories.icon && <span>{product.categories.icon}</span>} {product.categories.name}
        </div>
      )}

      {/* Badge de agotado */}
      {isOutOfStock && (
        <div className="out-of-stock-badge">Agotado</div>
      )}

      {/* Imagen — enlaza al detalle */}
      <Link to={`/producto/${product.id}`} className="card-image-link">
        <div className="card-image">
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2Y1ZjBlOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjYWE5OTg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U2luIEltYWdlbjwvdGV4dD48L3N2Zz4=';
            }}
          />
        </div>
      </Link>

      {/* Contenido */}
      <div className="card-content">
        <div className="card-info">
          {/* Título enlazado */}
          <Link to={`/producto/${product.id}`} className="card-title-link">
            <h3 className="card-title">{product.title}</h3>
          </Link>
          <p className="card-price">${product.price?.toFixed(2) || '0.00'}</p>
          <p className="card-description">{product.description}</p>

          {/* Alerta de stock bajo */}
          {product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5 && (
            <p className="stock-low">⚡ ¡Solo quedan {product.stock}!</p>
          )}
        </div>

        <div className="card-btns">
          <button
            className="btn-order"
            onClick={() => !isOutOfStock && onAddToCart(product)}
            disabled={isOutOfStock}
            style={isOutOfStock ? { opacity: 0.5, cursor: 'not-allowed', background: '#aaa' } : {}}
          >
            {isOutOfStock ? 'Agotado' : 'Añadir al Carrito'}
          </button>
          <Link to={`/producto/${product.id}`} className="btn-detail">
            Ver detalles
          </Link>
        </div>
      </div>
    </div>
  );
}
