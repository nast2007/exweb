// cart.js
const API_BASE = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = '9bcdd3a0-f5ab-4f24-af75-f01ebb79f6c3';

const cartItemsEl = document.getElementById('cartItems');
const emptyMessageEl = document.getElementById('emptyCartMessage');
const orderForm = document.getElementById('orderForm');
const totalPriceEl = document.getElementById('totalPrice');
const deliveryCostEl = document.getElementById('deliveryCost');
const deliveryDateInput = document.getElementById('deliveryDate');
const deliveryIntervalSelect = document.getElementById('deliveryInterval');
const notificationEl = document.getElementById('notification');

let cartGoods = [];

function showNotification(message, type = 'info') {
    notificationEl.textContent = message;
    notificationEl.className = `notification ${type} show`;
    setTimeout(() => {
        notificationEl.classList.remove('show');
    }, 5000);
}

// Загрузка данных товаров по ID из корзины
async function loadCartGoods() {
    const cartIds = JSON.parse(localStorage.getItem('cart')) || [];
    if (cartIds.length === 0) {
        emptyMessageEl.style.display = 'block';
        cartItemsEl.style.display = 'none';
        updateTotalPrice();
        return;
    }

    try {
        const promises = cartIds.map(id =>
            fetch(`${API_BASE}/goods/${id}?api_key=${API_KEY}`).then(res => res.json())
        );
        cartGoods = await Promise.all(promises);
        renderCart();
    } catch (err) {
        console.error(err);
        showNotification('Ошибка загрузки товаров корзины', 'error');
    }
}

function renderCart() {
    cartItemsEl.innerHTML = '';
    emptyMessageEl.style.display = 'none';
    cartItemsEl.style.display = 'grid';

    cartGoods.forEach(good => {
        const card = document.createElement('div');
        card.className = 'good-card';

        const img = document.createElement('img');
        img.src = good.image_url.trim();
        img.alt = good.name;
        img.onerror = () => { img.src = 'assets/placeholder.png'; };

        const content = document.createElement('div');
        content.className = 'good-card-content';

        const title = document.createElement('div');
        title.className = 'good-card-title';
        title.textContent = good.name.length > 50 ? good.name.slice(0, 50) + '...' : good.name;

        const rating = document.createElement('div');
        rating.className = 'good-card-rating';
        rating.innerHTML = `<span>★ ${good.rating}</span>`;

        const priceDiv = document.createElement('div');
        priceDiv.className = 'good-card-price';
        if (good.discount_price !== null) {
            priceDiv.innerHTML = `
                <span class="actual">${good.discount_price} ₽</span>
            `;
        } else {
            priceDiv.innerHTML = `<span class="actual">${good.actual_price} ₽</span>`;
        }

        const btn = document.createElement('button');
        btn.textContent = 'Удалить';
        btn.onclick = () => removeFromCart(good.id);

        content.append(title, rating, priceDiv, btn);
        card.append(img, content);
        cartItemsEl.appendChild(card);
    });

    updateTotalPrice();
}

function removeFromCart(goodId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(id => id !== goodId);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCartGoods();
    showNotification('Товар удалён из корзины', 'info');
}

function getDeliveryCost(deliveryDateStr, interval) {
    const base = 200;
    if (!deliveryDateStr || !interval) return base;

    const date = new Date(deliveryDateStr);
    const dayOfWeek = date.getDay(); // 0 = воскресенье, 6 = суббота
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isEvening = interval === '18:00-22:00';

    if (isWeekend) return base + 300;
    if (isEvening) return base + 200;
    return base;
}

function calculateTotal() {
    const totalGoods = cartGoods.reduce((sum, g) => sum + (g.discount_price ?? g.actual_price), 0);
    const deliveryCost = getDeliveryCost(deliveryDateInput.value, deliveryIntervalSelect.value);
    return { totalGoods, deliveryCost, total: totalGoods + deliveryCost };
}

function updateTotalPrice() {
    const { deliveryCost, total } = calculateTotal();
    deliveryCostEl.textContent = `${deliveryCost} ₽`;
    totalPriceEl.textContent = `${total} ₽`;
}

// Отправка заказа
async function submitOrder(data) {
    try {
        const res = await fetch(`${API_BASE}/orders?api_key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Ошибка сервера');
        }
        return await res.json();
    } catch (err) {
        console.error(err);
        showNotification(`Ошибка: ${err.message}`, 'error');
        return null;
    }
}

// Обработчики
deliveryDateInput.addEventListener('change', updateTotalPrice);
deliveryIntervalSelect.addEventListener('change', updateTotalPrice);

orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (cartGoods.length === 0) {
        showNotification('Корзина пуста!', 'error');
        return;
    }

    const { totalGoods, deliveryCost, total } = calculateTotal();

    const formData = {
        full_name: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        subscribe: document.getElementById('subscribe').checked,
        delivery_address: document.getElementById('deliveryAddress').value,
        delivery_date: deliveryDateInput.value,
        delivery_interval: deliveryIntervalSelect.value,
        comment: document.getElementById('comment').value,
        good_ids: cartGoods.map(g => g.id)
    };

    const result = await submitOrder(formData);
    if (result) {
        localStorage.removeItem('cart');
        showNotification('Заказ успешно оформлен!', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadCartGoods();
});
