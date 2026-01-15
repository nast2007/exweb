const API_BASE = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = '9bcdd3a0-f5ab-4f24-af75-f01ebb79f6c3';

const ordersList = document.getElementById('ordersList');
const viewModal = document.getElementById('viewOrderModal');
const editModal = document.getElementById('editOrderModal');
const deleteModal = document.getElementById('deleteOrderModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const editForm = document.getElementById('editOrderForm');
const notificationEl = document.getElementById('notification');

let currentOrderId = null;
let allOrders = [];

function showNotification(message, type = 'info') {
    notificationEl.textContent = message;
    notificationEl.className = `notification ${type} show`;
    setTimeout(() => notificationEl.classList.remove('show'), 5000);
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal(modal.id);
    });
});

async function fetchOrders() {
    try {
        const res = await fetch(`${API_BASE}/orders?api_key=${API_KEY}`);
        if (!res.ok) throw new Error('Ошибка загрузки заказов');
        allOrders = await res.json();
        renderOrders();
    } catch (err) {
        console.error(err);
        showNotification('Не удалось загрузить заказы', 'error');
    }
}

function renderOrders() {
    ordersList.innerHTML = '';
    allOrders.forEach((order, idx) => {
        const row = document.createElement('tr');
        const goodsNames = order.good_ids.map(id => `ID${id}`).join(', ');
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td>${new Date(order.created_at).toLocaleString('ru-RU')}</td>
            <td title="${goodsNames}">${goodsNames.length > 30 ? goodsNames.slice(0, 30) + '...' : goodsNames}</td>
            <td>${order.total_price || '—'} ₽</td>
            <td>${order.delivery_date} ${order.delivery_interval}</td>
            <td class="action-icons">
                <button class="view" onclick="openViewModal(${order.id})">👁️</button>
                <button class="edit" onclick="openEditModal(${order.id})">✏️</button>
                <button class="delete" onclick="openDeleteModal(${order.id})">🗑️</button>
            </td>
        `;
        ordersList.appendChild(row);
    });
}

async function openViewModal(orderId) {
    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}?api_key=${API_KEY}`);
        if (!res.ok) throw new Error('Заказ не найден');
        const order = await res.json();
        const goodsList = order.good_ids.map(id => `Товар ID${id}`).join('<br>');
        document.getElementById('viewOrderDetails').innerHTML = `
            <p><strong>Имя:</strong> ${order.full_name}</p>
            <p><strong>Email:</strong> ${order.email}</p>
            <p><strong>Телефон:</strong> ${order.phone}</p>
            <p><strong>Адрес:</strong> ${order.delivery_address}</p>
            <p><strong>Дата доставки:</strong> ${order.delivery_date} (${order.delivery_interval})</p>
            <p><strong>Комментарий:</strong> ${order.comment || '—'}</p>
            <p><strong>Состав:</strong><br>${goodsList}</p>
            <p><strong>Итого:</strong> ${order.total_price || '—'} ₽</p>
        `;
        viewModal.style.display = 'flex';
    } catch (err) {
        showNotification(`Ошибка: ${err.message}`, 'error');
    }
}

async function openEditModal(orderId) {
    currentOrderId = orderId;
    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}?api_key=${API_KEY}`);
        if (!res.ok) throw new Error('Заказ не найден');
        const order = await res.json();

        document.getElementById('editOrderCreatedAt').textContent = new Date(order.created_at).toLocaleString('ru-RU');
        document.getElementById('editFullName').value = order.full_name;
        document.getElementById('editEmail').value = order.email;
        document.getElementById('editPhone').value = order.phone;
        document.getElementById('editDeliveryAddress').value = order.delivery_address;
        document.getElementById('editDeliveryDate').value = order.delivery_date;
        document.getElementById('editDeliveryInterval').value = order.delivery_interval;
        document.getElementById('editComment').value = order.comment || '';
        document.getElementById('editOrderGoods').textContent = order.good_ids.join(', ');
        document.getElementById('editOrderTotal').textContent = `${order.total_price || '—'} ₽`;

        editModal.style.display = 'flex';
    } catch (err) {
        showNotification(`Ошибка: ${err.message}`, 'error');
    }
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        full_name: document.getElementById('editFullName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value,
        delivery_address: document.getElementById('editDeliveryAddress').value,
        delivery_date: document.getElementById('editDeliveryDate').value,
        delivery_interval: document.getElementById('editDeliveryInterval').value,
        comment: document.getElementById('editComment').value
    };

    try {
        const res = await fetch(`${API_BASE}/orders/${currentOrderId}?api_key=${API_KEY}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Не удалось сохранить');
        await fetchOrders();
        closeModal('editOrderModal');
        showNotification('Заказ обновлён', 'success');
    } catch (err) {
        showNotification(`Ошибка: ${err.message}`, 'error');
    }
});

function openDeleteModal(orderId) {
    currentOrderId = orderId;
    deleteModal.style.display = 'flex';
}

confirmDeleteBtn.addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_BASE}/orders/${currentOrderId}?api_key=${API_KEY}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Не удалось удалить');
        await fetchOrders();
        closeModal('deleteOrderModal');
        showNotification('Заказ удалён', 'success');
    } catch (err) {
        showNotification(`Ошибка: ${err.message}`, 'error');
    }
});

window.openViewModal = openViewModal;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', fetchOrders);
