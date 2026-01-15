const API_BASE = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = '9bcdd3a0-f5ab-4f24-af75-f01ebb79f6c3';

let allGoods = [];
let filteredGoods = [];
let currentSort = 'rating_desc';

const goodsContainer = document.getElementById('goodsContainer');
const categoryFilters = document.getElementById('categoryFilters');
const priceFromInput = document.getElementById('priceFrom');
const priceToInput = document.getElementById('priceTo');
const onlyDiscountCheckbox = document.getElementById('onlyDiscount');
const applyFiltersBtn = document.getElementById('applyFilters');
const sortOrderSelect = document.getElementById('sortOrder');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const notificationEl = document.getElementById('notification');

let displayedCount = 0;
const perPage = 10;

function showNotification(message, type = 'info') {
    notificationEl.textContent = message;
    notificationEl.className = `notification ${type} show`;
    setTimeout(() => notificationEl.classList.remove('show'), 5000);
}

async function fetchAllGoods() {
    try {
        const res = await fetch(`${API_BASE}/goods?api_key=${API_KEY}`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        allGoods = await res.json();
        buildCategoriesFilter();
        applyFiltersAndRender();
    } catch (err) {
        console.error(err);
        showNotification('Не удалось загрузить товары', 'error');
    }
}

function buildCategoriesFilter() {
    const categories = [...new Set(allGoods.map(g => g.main_category).filter(Boolean))];
    categoryFilters.innerHTML = '';
    categories.forEach(cat => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = cat;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(` ${cat}`));
        categoryFilters.appendChild(label);
    });
}

function applyFilters() {
    const selectedCats = Array.from(categoryFilters.querySelectorAll('input:checked')).map(cb => cb.value);
    const priceFrom = priceFromInput.value ? Number(priceFromInput.value) : null;
    const priceTo = priceToInput.value ? Number(priceToInput.value) : null;
    const onlyDiscount = onlyDiscountCheckbox.checked;

    filteredGoods = allGoods.filter(good => {
        if (selectedCats.length && !selectedCats.includes(good.main_category)) return false;
        const price = good.discount_price ?? good.actual_price;
        if (priceFrom !== null && price < priceFrom) return false;
        if (priceTo !== null && price > priceTo) return false;
        if (onlyDiscount && good.discount_price === null) return false;
        return true;
    });
}

function sortGoods(goods) {
    return [...goods].sort((a, b) => {
        const priceA = a.discount_price ?? a.actual_price;
        const priceB = b.discount_price ?? b.actual_price;
        switch (currentSort) {
            case 'rating_asc': return a.rating - b.rating;
            case 'rating_desc': return b.rating - a.rating;
            case 'price_asc': return priceA - priceB;
            case 'price_desc': return priceB - priceA;
            default: return 0;
        }
    });
}

function renderGoods(page = 1) {
    const sorted = sortGoods(filteredGoods);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageGoods = sorted.slice(start, end);

    if (page === 1) goodsContainer.innerHTML = '';

    if (pageGoods.length === 0 && page === 1) {
        goodsContainer.innerHTML = '<p>Нет товаров по вашему запросу</p>';
        loadMoreBtn.style.display = 'none';
        return;
    }

    pageGoods.forEach(good => {
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
        if (good.discount_price !== null) {
            priceDiv.innerHTML = `<span class="actual">${good.discount_price} ₽</span> <span class="discount">${good.actual_price} ₽</span>`;
        } else {
            priceDiv.innerHTML = `<span class="actual">${good.actual_price} ₽</span>`;
        }

        const btn = document.createElement('button');
        btn.textContent = 'Добавить';
        btn.onclick = () => addToCart(good.id);

        content.append(title, rating, priceDiv, btn);
        card.append(img, content);
        goodsContainer.appendChild(card);
    });

    displayedCount = end;
    loadMoreBtn.style.display = displayedCount < filteredGoods.length ? 'block' : 'none';
}

function applyFiltersAndRender() {
    applyFilters();
    renderGoods(1);
}

function addToCart(goodId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (!cart.includes(goodId)) {
        cart.push(goodId);
        localStorage.setItem('cart', JSON.stringify(cart));
        showNotification('Товар добавлен в корзину', 'success');
    }
}

applyFiltersBtn.addEventListener('click', e => {
    e.preventDefault();
    applyFiltersAndRender();
});

sortOrderSelect.addEventListener('change', () => {
    currentSort = sortOrderSelect.value;
    applyFiltersAndRender();
});

loadMoreBtn.addEventListener('click', () => {
    const nextPage = Math.floor(displayedCount / perPage) + 1;
    renderGoods(nextPage);
});

document.addEventListener('DOMContentLoaded', fetchAllGoods);
