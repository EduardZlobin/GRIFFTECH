// main.js - полная версия со всеми улучшениями

let products = [];
let cart = JSON.parse(localStorage.getItem('griftech_cart')) || []; // массив заказов
let promoCode = null;
let appliedDiscount = 0;

// DOM элементы
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const cartToggle = document.getElementById('cartToggle');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartDiscount = document.getElementById('cartDiscount');
const cartTotal = document.getElementById('cartTotal');
const promoInput = document.getElementById('promoInput');
const applyPromoBtn = document.getElementById('applyPromoBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartCountSpan = document.getElementById('cartCount');
const breadcrumbsSpan = document.getElementById('breadcrumbs');

// Модалка товара
const productModal = document.getElementById('productModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.querySelector('#productModal .close-modal');

// Загрузка товаров
async function loadProducts() {
    const stored = localStorage.getItem('griftech_products');
    if (!stored) {
        const response = await fetch('products.json');
        products = await response.json();
        localStorage.setItem('griftech_products', JSON.stringify(products));
    } else {
        products = JSON.parse(stored);
    }
    renderProducts();
    updateCartUI();
}

// Сохранение продуктов (для админки)
function saveProducts() {
    localStorage.setItem('griftech_products', JSON.stringify(products));
}

// Обновление счётчика корзины
function updateCartCounter() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountSpan.textContent = totalItems;
    localStorage.setItem('griftech_cart', JSON.stringify(cart));
}

// Добавление в корзину с анимацией fly
function addToCartWithFly(product, color, quantity, buttonElement) {
    const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        selectedColor: color,
        quantity: quantity,
        image: product.colors?.find(c => c.name === color)?.image || product.image,
        status: 'pending' // статус заказа
    };
    const existingIndex = cart.findIndex(item => item.id === product.id && item.selectedColor === color);
    if (existingIndex !== -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push(cartItem);
    }
    updateCartCounter();
    updateCartUI();

    // Анимация fly (если есть кнопка)
    if (buttonElement) {
        const flyElement = buttonElement.cloneNode(true);
        flyElement.style.position = 'fixed';
        flyElement.style.pointerEvents = 'none';
        flyElement.style.zIndex = '9999';
        const rect = buttonElement.getBoundingClientRect();
        flyElement.style.left = rect.left + 'px';
        flyElement.style.top = rect.top + 'px';
        flyElement.style.width = rect.width + 'px';
        flyElement.style.height = rect.height + 'px';
        document.body.appendChild(flyElement);
        const targetRect = cartToggle.getBoundingClientRect();
        flyElement.animate([
            { transform: 'scale(1)', opacity: 1, left: rect.left + 'px', top: rect.top + 'px' },
            { transform: 'scale(0.2)', opacity: 0, left: targetRect.left + 'px', top: targetRect.top + 'px' }
        ], { duration: 500, easing: 'cubic-bezier(0.2, 0.9, 0.4, 1.1)' }).onfinish = () => flyElement.remove();
    }

    // Визуальное уведомление
    showNotification('Товар добавлен в корзину', 'success');
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Обновление интерфейса корзины (выдвижная панель)
function updateCartUI() {
    if (!cartItemsContainer) return;
    let subtotal = 0;
    cartItemsContainer.innerHTML = cart.map(item => {
        subtotal += item.price * item.quantity;
        return `
            <div class="cart-item" data-id="${item.id}" data-color="${item.selectedColor}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-color">${item.selectedColor || 'Стандарт'}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)} x ${item.quantity}</div>
                    <div class="cart-item-status">${getStatusText(item.status)}</div>
                </div>
                <div class="cart-item-actions">
                    <button class="cart-item-inc" data-id="${item.id}" data-color="${item.selectedColor}">+</button>
                    <span class="cart-item-qty">${item.quantity}</span>
                    <button class="cart-item-dec" data-id="${item.id}" data-color="${item.selectedColor}">-</button>
                    <button class="cart-item-remove" data-id="${item.id}" data-color="${item.selectedColor}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
    const discountAmount = appliedDiscount;
    const total = subtotal - discountAmount;
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartDiscount.textContent = discountAmount > 0 ? `-$${discountAmount.toFixed(2)}` : '$0.00';
    cartTotal.textContent = `$${total.toFixed(2)}`;

    // Обработчики для кнопок в корзине
    document.querySelectorAll('.cart-item-inc').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const color = btn.dataset.color;
            const item = cart.find(i => i.id === id && i.selectedColor === color);
            if (item) {
                item.quantity++;
                updateCartCounter();
                updateCartUI();
            }
        });
    });
    document.querySelectorAll('.cart-item-dec').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const color = btn.dataset.color;
            const item = cart.find(i => i.id === id && i.selectedColor === color);
            if (item && item.quantity > 1) {
                item.quantity--;
                updateCartCounter();
                updateCartUI();
            } else if (item && item.quantity === 1) {
                cart = cart.filter(i => !(i.id === id && i.selectedColor === color));
                updateCartCounter();
                updateCartUI();
            }
        });
    });
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const color = btn.dataset.color;
            cart = cart.filter(i => !(i.id === id && i.selectedColor === color));
            updateCartCounter();
            updateCartUI();
        });
    });
}

// Получить текст статуса
function getStatusText(status) {
    const map = {
        pending: 'Ожидает обработки',
        processing: 'Готовится к отправке',
        shipped: 'Отправлен',
        delivered: 'Доставлен'
    };
    return map[status] || 'В обработке';
}

// Оформление заказа
function checkout() {
    if (cart.length === 0) {
        showNotification('Корзина пуста', 'error');
        return;
    }
    // Создаём заказ с датой и статусами
    const order = {
        id: Date.now(),
        items: [...cart],
        subtotal: cart.reduce((s, i) => s + i.price * i.quantity, 0),
        discount: appliedDiscount,
        total: cart.reduce((s, i) => s + i.price * i.quantity, 0) - appliedDiscount,
        promoCode: promoCode,
        date: new Date().toISOString(),
        status: 'pending'
    };
    let orders = JSON.parse(localStorage.getItem('griftech_orders')) || [];
    orders.push(order);
    localStorage.setItem('griftech_orders', JSON.stringify(orders));
    // Очищаем корзину
    cart = [];
    promoCode = null;
    appliedDiscount = 0;
    updateCartCounter();
    updateCartUI();
    showNotification('Заказ оформлен! Габен упаковывает ваш продукт', 'success');
    // Закрыть панель
    closeCartSidebar();
}

// Применение промокода
function applyPromo() {
    const code = promoInput.value.trim().toUpperCase();
    const promos = {
        'GRIFTECH10': 0.1,
        'WELCOME20': 0.2,
        'FREESHIP': 5
    };
    if (promos[code]) {
        if (typeof promos[code] === 'number' && promos[code] < 1) {
            // процентная скидка
            const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
            appliedDiscount = subtotal * promos[code];
        } else {
            appliedDiscount = promos[code];
        }
        promoCode = code;
        showNotification(`Промокод ${code} активирован!`, 'success');
        updateCartUI();
    } else {
        showNotification('Неверный промокод', 'error');
    }
}

// Открыть/закрыть корзину
function openCartSidebar() {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('open');
}
function closeCartSidebar() {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('open');
}

// Хлебные крошки
function updateBreadcrumbs() {
    const category = categorySelect.value;
    const search = searchInput.value;
    let bread = '<a href="#" id="breadHome">Главная</a>';
    if (category !== 'all') {
        bread += ` / <span>${getCategoryName(category)}</span>`;
    }
    if (search) {
        bread += ` / <span>Поиск: "${search}"</span>`;
    }
    if (!search && category === 'all') {
        bread += ' / <span>Все товары</span>';
    }
    breadcrumbsSpan.innerHTML = bread;
    document.getElementById('breadHome')?.addEventListener('click', (e) => {
        e.preventDefault();
        categorySelect.value = 'all';
        searchInput.value = '';
        renderProducts();
    });
}

// Рендер товаров (с рейтингом, сортировкой)
function renderProducts() {
    let filtered = [...products];
    const searchTerm = searchInput.value.toLowerCase();
    const category = categorySelect.value;
    const sort = sortSelect.value;

    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm) || (p.description && p.description.toLowerCase().includes(searchTerm)));
    }
    if (category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
    }
    // Сортировка
    if (sort === 'price-asc') {
        filtered.sort((a,b) => a.price - b.price);
    } else if (sort === 'price-desc') {
        filtered.sort((a,b) => b.price - a.price);
    } else if (sort === 'rating') {
        filtered.sort((a,b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'newest') {
        filtered.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    if (filtered.length === 0) {
        productsGrid.innerHTML = '<div class="loader">Товары не найдены</div>';
        updateBreadcrumbs();
        return;
    }

    productsGrid.innerHTML = filtered.map(product => {
        const mainImage = product.colors && product.colors.length ? product.colors[0].image : (product.image || 'https://via.placeholder.com/300');
        const rating = product.rating || 0;
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        return `
            <div class="product-card" data-id="${product.id}">
                <img class="product-image" src="${mainImage}" alt="${product.name}" loading="lazy">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <div class="product-rating">${stars} <span>(${product.reviews?.length || 0})</span></div>
                    <div class="product-category">${getCategoryName(product.category)}</div>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const id = parseInt(card.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) openProductModal(product);
        });
    });
    updateBreadcrumbs();
}

// Получить имя категории
function getCategoryName(cat) {
    const map = { mouse: 'Мышь', keyboard: 'Клавиатура', monitor: 'Монитор', headphones: 'Наушники', videocard: 'Видеокарта' };
    return map[cat] || cat;
}

// Открыть модалку товара (с отзывами и рейтингом)
function openProductModal(product) {
    let selectedColor = product.colors && product.colors.length ? product.colors[0].name : null;
    let quantity = 1;
    const specs = product.specifications || [];
    const reviews = product.reviews || [];

    const renderModalContent = () => {
        const currentColorObj = product.colors?.find(c => c.name === selectedColor);
        const currentImage = currentColorObj?.image || product.image || 'https://via.placeholder.com/300';
        const avgRating = product.rating || 0;
        const stars = '★'.repeat(Math.floor(avgRating)) + '☆'.repeat(5 - Math.floor(avgRating));

        modalBody.innerHTML = `
            <div class="modal-product">
                <div class="modal-gallery">
                    <div class="main-image">
                        <img src="${currentImage}" alt="${product.name}" id="modalProductImage">
                    </div>
                    ${product.colors && product.colors.length > 1 ? `
                        <div class="color-thumbnails">
                            ${product.colors.map(c => `
                                <div class="color-thumb ${c.name === selectedColor ? 'active' : ''}" data-color="${c.name}">
                                    <img src="${c.image}" alt="${c.name}">
                                    <span>${c.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="modal-info">
                    <div class="product-badge">${getCategoryName(product.category)}</div>
                    <h2 class="product-title-modal">${product.name}</h2>
                    <div class="product-price-modal">$${product.price.toFixed(2)}</div>
                    <div class="product-rating-modal">${stars} (${reviews.length} отзывов)</div>
                    <div class="product-description">${product.description || 'Описание отсутствует'}</div>
                    
                    <div class="specs-section">
                        <h3><i class="fas fa-microchip"></i> Характеристики</h3>
                        <ul class="specs-list">
                            ${specs.map(spec => `<li><i class="fas fa-check-circle"></i> ${spec}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="reviews-section">
                        <h3><i class="fas fa-star"></i> Отзывы (${reviews.length})</h3>
                        <div class="reviews-list">
                            ${reviews.map(r => `
                                <div class="review-item">
                                    <div class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                                    <div class="review-text">${r.text}</div>
                                    <div class="review-author">— ${r.author || 'Покупатель'}</div>
                                </div>
                            `).join('')}
                            ${reviews.length === 0 ? '<p>Пока нет отзывов. Будьте первым!</p>' : ''}
                        </div>
                        <div class="add-review">
                            <textarea id="reviewText" placeholder="Ваш отзыв..." rows="2"></textarea>
                            <div class="review-stars">
                                <span>Оценка:</span>
                                ${[1,2,3,4,5].map(s => `<span class="star-select" data-star="${s}">☆</span>`).join('')}
                            </div>
                            <button id="submitReviewBtn" class="btn-secondary">Оставить отзыв</button>
                        </div>
                    </div>
                    
                    <div class="purchase-section">
                        <div class="quantity-selector">
                            <label>Количество:</label>
                            <div class="quantity-control">
                                <button class="qty-btn minus" type="button">-</button>
                                <input type="number" id="modalQuantity" min="1" max="99" value="${quantity}">
                                <button class="qty-btn plus" type="button">+</button>
                            </div>
                        </div>
                        <button id="modalBuyBtn" class="btn-primary btn-buy">
                            <i class="fas fa-shopping-cart"></i> Купить сейчас
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Обработчики цвета
        if (product.colors && product.colors.length > 1) {
            document.querySelectorAll('.color-thumb').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    selectedColor = thumb.dataset.color;
                    renderModalContent();
                });
            });
        }

        // Обработчики количества
        const qtyInput = document.getElementById('modalQuantity');
        const minusBtn = document.querySelector('.qty-btn.minus');
        const plusBtn = document.querySelector('.qty-btn.plus');
        if (minusBtn && plusBtn) {
            minusBtn.addEventListener('click', () => {
                let val = parseInt(qtyInput.value);
                if (val > 1) qtyInput.value = val - 1;
            });
            plusBtn.addEventListener('click', () => {
                let val = parseInt(qtyInput.value);
                if (val < 99) qtyInput.value = val + 1;
            });
        }

        // Кнопка покупки
        const buyBtn = document.getElementById('modalBuyBtn');
        buyBtn.addEventListener('click', (e) => {
            const qty = parseInt(document.getElementById('modalQuantity').value);
            if (qty > 0) {
                addToCartWithFly(product, selectedColor, qty, buyBtn);
                productModal.style.display = 'none';
            }
        });

        // Отзыв
        let selectedStar = 0;
        const starSpans = document.querySelectorAll('.star-select');
        starSpans.forEach((span, idx) => {
            span.addEventListener('click', () => {
                selectedStar = idx + 1;
                starSpans.forEach((s, i) => {
                    s.textContent = i < selectedStar ? '★' : '☆';
                });
            });
        });
        const submitReview = document.getElementById('submitReviewBtn');
        submitReview.addEventListener('click', () => {
            const text = document.getElementById('reviewText').value.trim();
            if (!text || selectedStar === 0) {
                showNotification('Заполните отзыв и выберите оценку', 'error');
                return;
            }
            const newReview = {
                rating: selectedStar,
                text: text,
                author: 'Покупатель',
                date: new Date().toISOString()
            };
            product.reviews = product.reviews || [];
            product.reviews.push(newReview);
            // Пересчитываем средний рейтинг
            const total = product.reviews.reduce((sum, r) => sum + r.rating, 0);
            product.rating = total / product.reviews.length;
            // Сохраняем в localStorage
            const productIndex = products.findIndex(p => p.id === product.id);
            if (productIndex !== -1) products[productIndex] = product;
            saveProducts();
            showNotification('Спасибо за отзыв!', 'success');
            renderModalContent(); // обновляем модалку
        });
    };
    renderModalContent();
    productModal.style.display = 'flex';
}

// Инициализация событий
function initEvents() {
    if (searchInput) searchInput.addEventListener('input', renderProducts);
    if (categorySelect) categorySelect.addEventListener('change', renderProducts);
    if (sortSelect) sortSelect.addEventListener('change', renderProducts);
    if (cartToggle) cartToggle.addEventListener('click', openCartSidebar);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartSidebar);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartSidebar);
    if (applyPromoBtn) applyPromoBtn.addEventListener('click', applyPromo);
    if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);
    if (closeModal) closeModal.addEventListener('click', () => productModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === productModal) productModal.style.display = 'none';
    });
}

// Запуск
loadProducts();
initEvents();