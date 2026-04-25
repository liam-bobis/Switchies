const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxbsGc9Y3ig_yNOQVTeGemPGPTHQZ7VKLcA3j_P_eAa4xUmQB2q7RvbPivaCEAG7teB/exec";

const state = {
  allProducts: [],
  filteredProducts: [],
  visibleCount: 12,
  viewMode: "grid"
};

const topSearchInput = document.getElementById("topSearchInput");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const subcategoryFilter = document.getElementById("subcategoryFilter");
const shopFilter = document.getElementById("shopFilter");
const sortFilter = document.getElementById("sortFilter");
const searchButton = document.getElementById("searchButton");
const clearFilters = document.getElementById("clearFilters");
const productGrid = document.getElementById("productGrid");
const resultsText = document.getElementById("resultsText");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const gridViewBtn = document.getElementById("gridViewBtn");
const listViewBtn = document.getElementById("listViewBtn");

async function loadProducts() {
  try {
    if (!SHEET_API_URL || SHEET_API_URL.includes("https://script.google.com/macros/s/AKfycbxbsGc9Y3ig_yNOQVTeGemPGPTHQZ7VKLcA3j_P_eAa4xUmQB2q7RvbPivaCEAG7teB/exec")) {
      throw new Error("Google Sheets API URL has not been added yet.");
    }

    const response = await fetch(SHEET_API_URL);

    if (!response.ok) {
      throw new Error("Could not fetch products from Google Sheets.");
    }

    const data = await response.json();
    const rows = Array.isArray(data) ? data : data.products;

    state.allProducts = rows && rows.length ? rows.map(normalizeProduct) : [];
  } catch (error) {
    console.error(error.message);
    state.allProducts = [];
  }

  buildFilters();
  applyFilters();
}

function normalizeProduct(product) {
  return {
    id: Number(product.id || Date.now() + Math.random()),
    name: String(product.name || "Untitled Product"),
    category: String(product.category || "Others"),
    subcategory: String(product.subcategory || "General"),
    price: Number(product.price || 0),
    shop: String(product.shop || "Shop"),
    stock: String(product.stock || "In Stock"),
    image: String(product.image || ""),
    description: String(product.description || ""),
    link: String(product.link || product.affiliateLink || "#"),
    featured: String(product.featured).toLowerCase() === "true" || product.featured === true
  };
}

function buildFilters() {
  const categories = [...new Set(state.allProducts.map(product => product.category))].sort();
  const shops = [...new Set(state.allProducts.map(product => product.shop))].sort();

  categoryFilter.innerHTML =
    `<option value="all">All Categories</option>` +
    categories.map(category => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`).join("");

  shopFilter.innerHTML =
    `<option value="all">All Shops</option>` +
    shops.map(shop => `<option value="${escapeAttribute(shop)}">${escapeHtml(shop)}</option>`).join("");

  updateSubcategoryOptions();
}

function updateSubcategoryOptions() {
  const selectedCategory = categoryFilter.value;

  let products = [...state.allProducts];

  if (selectedCategory !== "all") {
    products = products.filter(product => product.category === selectedCategory);
  }

  const subcategories = [...new Set(products.map(product => product.subcategory))].sort();

  subcategoryFilter.innerHTML =
    `<option value="all">All Subcategories</option>` +
    subcategories.map(subcategory => `<option value="${escapeAttribute(subcategory)}">${escapeHtml(subcategory)}</option>`).join("");
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const subcategory = subcategoryFilter.value;
  const shop = shopFilter.value;
  const sort = sortFilter.value;

  let products = [...state.allProducts].filter(product => {
    const searchableText = [
      product.name,
      product.category,
      product.subcategory,
      product.shop,
      product.description
    ].join(" ").toLowerCase();

    const matchesSearch = !query || searchableText.includes(query);
    const matchesCategory = category === "all" || product.category === category;
    const matchesSubcategory = subcategory === "all" || product.subcategory === subcategory;
    const matchesShop = shop === "all" || product.shop === shop;

    return matchesSearch && matchesCategory && matchesSubcategory && matchesShop;
  });

  if (sort === "low-high") {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === "high-low") {
    products.sort((a, b) => b.price - a.price);
  } else if (sort === "name") {
    products.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    products.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
  }

  state.filteredProducts = products;
  renderProducts();
}

function renderProducts() {
  const visibleProducts = state.filteredProducts.slice(0, state.visibleCount);

  resultsText.textContent = `${state.filteredProducts.length} product${state.filteredProducts.length === 1 ? "" : "s"} found`;

  productGrid.classList.toggle("list-view", state.viewMode === "list");

  if (!visibleProducts.length) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <h3>No products available yet</h3>
        <p>Add products to your Google Sheet, then refresh this page.</p>
      </div>
    `;

    loadMoreBtn.style.display = "none";
    return;
  }

  productGrid.innerHTML = visibleProducts.map(product => `
    <article class="product-card">
      <div class="product-image">
        ${product.image ? `<img src="${escapeAttribute(product.image)}" alt="${escapeAttribute(product.name)}" loading="lazy">` : ""}
        ${product.featured ? `<span class="featured-badge">FEATURED</span>` : ""}
        <span class="heart">♡</span>
      </div>

      <div class="product-body">
        <h3>${escapeHtml(product.name)}</h3>

        <div class="breadcrumb">
          ${escapeHtml(product.category)} <span>›</span> ${escapeHtml(product.subcategory)}
        </div>

        <div class="price">₱${formatPrice(product.price)}</div>

        <div class="meta">
          <span>${escapeHtml(product.shop)}</span>
          <span class="divider">|</span>
          <span class="stock ${product.stock.toLowerCase().includes("limited") ? "limited" : ""}">
            ${escapeHtml(product.stock)}
          </span>
        </div>

        <a class="product-btn" href="${escapeAttribute(product.link)}" target="_blank" rel="nofollow sponsored noopener">
          View Product
        </a>
      </div>
    </article>
  `).join("");

  loadMoreBtn.style.display = state.visibleCount < state.filteredProducts.length ? "inline-flex" : "none";
}

function clearAllFilters() {
  searchInput.value = "";
  topSearchInput.value = "";
  categoryFilter.value = "all";
  updateSubcategoryOptions();
  subcategoryFilter.value = "all";
  shopFilter.value = "all";
  sortFilter.value = "featured";
  state.visibleCount = 12;
  applyFilters();
}

function setSearchValue(value) {
  searchInput.value = value;
  topSearchInput.value = value;
  state.visibleCount = 12;
  applyFilters();
}

function formatPrice(price) {
  return Number(price).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

topSearchInput.addEventListener("input", () => {
  setSearchValue(topSearchInput.value);
});

searchInput.addEventListener("input", () => {
  setSearchValue(searchInput.value);
});

searchButton.addEventListener("click", applyFilters);

categoryFilter.addEventListener("change", () => {
  updateSubcategoryOptions();
  subcategoryFilter.value = "all";
  state.visibleCount = 12;
  applyFilters();
});

subcategoryFilter.addEventListener("change", () => {
  state.visibleCount = 12;
  applyFilters();
});

shopFilter.addEventListener("change", () => {
  state.visibleCount = 12;
  applyFilters();
});

sortFilter.addEventListener("change", () => {
  state.visibleCount = 12;
  applyFilters();
});

clearFilters.addEventListener("click", clearAllFilters);

loadMoreBtn.addEventListener("click", () => {
  state.visibleCount += 12;
  renderProducts();
});

gridViewBtn.addEventListener("click", () => {
  state.viewMode = "grid";
  gridViewBtn.classList.add("active");
  listViewBtn.classList.remove("active");
  renderProducts();
});

listViewBtn.addEventListener("click", () => {
  state.viewMode = "list";
  listViewBtn.classList.add("active");
  gridViewBtn.classList.remove("active");
  renderProducts();
});

loadProducts();