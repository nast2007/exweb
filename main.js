const API_BASE = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = '9bcdd3a0-f5ab-4f24-af75-f01ebb79f6c3';

let allGoods = [];
let filteredGoods = [];
let currentSort = 'rating_desc';
let categoriesSet = new Set();

// DOM Elements
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

// Уведомление
function showNotification(message, type = 'info') {
    notificationEl.textContent = message;
    notificationEl.className = `notification ${type} show`;
    setTimeout(() => {
        notificationEl.classList.remove('show');
    }, 5000);
}

// Получение всех товаров
async function fetchAllGoods() {
    try {
        const url = `${API_BASE}/goods?api_key=${API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Ошибка загрузки товаров');
        allGoods = await res.json();
        buildCategoriesFilter();
        applyFiltersAndRender();
    } catch (err) {
        console.error(err);
        showNotification('Не удалось загрузить товары', 'error');
    }
}

// Построение списка категорий
function buildCategoriesFilter() {
    categoriesSet.clear();
    categoryFilters.innerHTML = '';
    allGoods.forEach(good => {
        if (good.main_category) categoriesSet.add(good.main_category);
    });

    categoriesSet.forEach(cat => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = cat;
        checkbox.id = `cat-${cat.replace(/\s+/g, '-')}`;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${cat}`));
        categoryFilters.appendChild(label);
    });
}

// Фильтрация товаров
function applyFilters() {
    const selectedCategories = Array.from(categoryFilters.querySelectorAll('input:checked')).map(cb => cb.value);
    const priceFrom = priceFromInput.value ? Number(priceFromInput.value) : null;
    const priceTo = priceToInput.value ? Number(priceToInput.value) : null;
    const onlyDiscount = onlyDiscountCheckbox.checked;

    filteredGoods = allGoods.filter(good => {
        // Фильтр по категории
        if (selectedCategories.length > 0 && !selectedCategories.includes(good.main_category)) return false;

        // Фильтр по цене
        const price = good.discount_price !== null ? good.discount_price : good.actual_price;
        if (priceFrom !== null && price < priceFrom) return false;
        if (priceTo !== null && price > priceTo) return false;

        // Фильтр по скидке
        if (onlyDiscount && good.discount_price === null) return false;

        return true;
    });
}

// Сортировка
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

// Отображение товаров (с пагинацией)
function renderGoods(page = 1) {
    const sorted = sortGoods(filteredGoods);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageGoods = sorted.slice(start, end);

    if (page === 1) goodsContainer.innerHTML = '';

    if (pageGoods.length === 0 && page === 1) {
        goodsContainer.innerHTML = '<p>Нет товаров, соответствующих вашему запросу</p>';
        loadMoreBtn.style.display = 'none';
        return;
    }

    pageGoods.forEach(good => {
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
                <span class="discount">${good.actual_price} ₽</span>
            `;
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

// Обработчики событий
applyFiltersBtn.addEventListener('click', (e) => {
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    fetchAllGoods();
});
