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
    setTimeout(() => notificationEl.classList.remove('show'), 5000);
}

// Преобразует YYYY-MM-DD → dd.mm.yyyy
function formatDateForAPI(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

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
        console.error('Ошибка загрузки товаров:', err);
        showNotification('Не удалось загрузить товары корзины', 'error');
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
        img.onerror = () => img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 24 24"><rect fill="%23eee" width="24" height="24"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="4" fill="%23999">No image</text></svg>';

        const content = document.createElement('div');
        content.className = 'good-card-content';

        const title = document.createElement('div');
        title.className = 'good-card-title';
        title.textContent = good.name.length > 50 ? good.name.slice(0, 50) + '...' : good.name;

        const rating = document.createElement('div');
        rating.className = 'good-card-rating';
        rating.textContent = `★ ${good.rating}`;

        const priceDiv = document.createElement('div');
        priceDiv.className = 'good-card-price';
        priceDiv.innerHTML = `<span class="actual">${good.discount_price ?? good.actual_price} ₽</span>`;

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

function getDeliveryCost(dateStr, interval) {
    const base = 200;
    if (!dateStr || !interval) return base;
    const date = new Date(dateStr);
    const day = date.getDay(); // 0 = воскресенье
    const isWeekend = day === 0 || day === 6;
    const isEvening = interval === '18:00-22:00';
    if (isWeekend) return base + 300;
    if (isEvening) return base + 200;
    return base;
}

function updateTotalPrice() {
    const totalGoods = cartGoods.reduce((sum, g) => sum + (g.discount_price ?? g.actual_price), 0);
    const deliveryCost = getDeliveryCost(deliveryDateInput.value, deliveryIntervalSelect.value);
    totalPriceEl.textContent = `${totalGoods + deliveryCost} ₽`;
    deliveryCostEl.textContent = `${deliveryCost} ₽`;
}

async function submitOrder(data) {
    try {
        const res = await fetch(`${API_BASE}/orders?api_key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.error || 'Ошибка сервера');
        }

        return result;
    } catch (err) {
        console.error('Ошибка при оформлении заказа:', err);
        showNotification(`Ошибка: ${err.message}`, 'error');
        return null;
    }
}

// Обновление цены при изменении даты или интервала
deliveryDateInput.addEventListener('change', updateTotalPrice);
deliveryIntervalSelect.addEventListener('change', updateTotalPrice);

// Отправка формы
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (cartGoods.length === 0) {
        showNotification('Корзина пуста!', 'error');
        return;
    }

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('deliveryAddress').value.trim();
    const date = deliveryDateInput.value;
    const interval = deliveryIntervalSelect.value;

    if (!fullName || !email || !phone || !address) {
        showNotification('Заполните все обязательные поля', 'error');
        return;
    }

    if (!date) {
        showNotification('Выберите дату доставки', 'error');
        return;
    }

    if (!interval) {
        showNotification('Выберите интервал доставки', 'error');
        return;
    }

    // Подготовка данных в точном соответствии с API
    const formData = {
        full_name: fullName,
        email: email,
        phone: phone,
        subscribe: document.getElementById('subscribe').checked,
        delivery_address: address,
        delivery_date: formatDateForAPI(date), // ← КЛЮЧЕВОЙ МОМЕНТ
        delivery_interval: interval,
        comment: document.getElementById('comment').value.trim(),
        good_ids: cartGoods.map(g => g.id) // массив чисел
    };

    const result = await submitOrder(formData);
    if (result) {
        localStorage.removeItem('cart');
        showNotification('Заказ успешно оформлен!', 'success');
        setTimeout(() => window.location.href = 'index.html', 1500);
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadCartGoods();
});
