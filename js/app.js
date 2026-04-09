import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let currentUser = null;
const today = new Date().toISOString().split('T')[0];

// ─── PROTEÇÃO DE ROTA E BANCO DE DADOS ───
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const badge = document.querySelector('.hero-badge');
    if (badge) badge.textContent = `NutriPlan · ${user.displayName || user.email}`;
    
    await loadTodayData();
    document.body.classList.add('auth-checked'); // Mostra a página!
  } else {
    window.location.href = "login.html"; // Intruso? Volta pro login!
  }
});

async function loadTodayData() {
  const docRef = doc(db, "users", currentUser.uid, "history", today);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    window.eatenKcal = data.kcal || 0;
    window.eatenP = data.p || 0;
    window.eatenC = data.c || 0;
    window.eatenG = data.g || 0;

    if (data.foods) {
      document.querySelectorAll('.food-item').forEach(el => {
        const foodName = el.querySelector('.food-info strong').textContent;
        if (data.foods.includes(foodName)) {
          el.classList.add('eaten');
          window.updateMealProgress(el);
        }
      });
    }
    window.updateTracker();
  }
}

window.saveToFirebase = async () => {
  if (!currentUser) return;
  const eatenElements = document.querySelectorAll('.food-item.eaten .food-info strong');
  const eatenFoods = Array.from(eatenElements).map(el => el.textContent);
  
  const docRef = doc(db, "users", currentUser.uid, "history", today);
  await setDoc(docRef, {
    kcal: window.eatenKcal,
    p: window.eatenP,
    c: window.eatenC,
    g: window.eatenG,
    foods: eatenFoods
  }, { merge: true }); 
};

// ─── LÓGICA DO BOTÃO SAIR ───
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => signOut(auth));
}

// ─── LÓGICA DA INTERFACE (MIGRADA DO HTML) ───

// Dados da Lista de Compras
const SHOP_DATA = {
  "🥩 Proteínas & Laticínios": [
    { name: "Peito de Frango", emoji: "🍗" }, { name: "Carne Moída Magra", emoji: "🥩" }, { name: "Ovos", emoji: "🥚" }, { name: "Iogurte Natural Integral", emoji: "🥛" }, { name: "Leite Desnatado", emoji: "🥛" }, { name: "Requeijão Light", emoji: "🧀" },
  ],
  "🌾 Carboidratos & Grãos": [
    { name: "Arroz Branco", emoji: "🍚" }, { name: "Pão Integral", emoji: "🍞" }, { name: "Torradas Integrais", emoji: "🍞" }, { name: "Granola", emoji: "🥣" },
  ],
  "🍎 Frutas & Legumes": [
    { name: "Banana", emoji: "🍌" }, { name: "Abacaxi", emoji: "🍍" }, { name: "Maçã", emoji: "🍎" }, { name: "Batata Doce", emoji: "🍠" }, { name: "Tomate", emoji: "🍅" }, { name: "Cenoura", emoji: "🥕" }, { name: "Vagem", emoji: "🫛" }, { name: "Abobrinha", emoji: "🥒" }, { name: "Alface / Rúcula", emoji: "🥬" }, { name: "Cebola", emoji: "🧅" }, { name: "Alho", emoji: "🧄" },
  ],
  "🫒 Gorduras & Condimentos": [
    { name: "Azeite Extra Virgem", emoji: "🫒" }, { name: "Pasta de Amendoim", emoji: "🥜" }, { name: "Manteiga", emoji: "🧈" }, { name: "Castanhas de Caju", emoji: "🥜" }, { name: "Mel", emoji: "🍯" },
  ],
  "💊 Suplementos": [
    { name: "Creatina Monoidratada", emoji: "💊" }, { name: "Whey Protein", emoji: "🥤" },
  ]
};

// Variáveis Globais
window.selectedShopItems = new Set();
window.eatenKcal = 0; window.eatenP = 0; window.eatenC = 0; window.eatenG = 0;
const TOTAL_KCAL = 2200, TOTAL_P = 165, TOTAL_C = 275, TOTAL_G = 73;
const MEAL_KCAL = { 1: 430, 2: 660, 3: 440, 4: 530 };

// Lista de Compras
function buildShopList() {
  const container = document.getElementById('shop-list-container');
  if(!container) return;
  container.innerHTML = '';
  Object.entries(SHOP_DATA).forEach(([cat, items]) => {
    const catId = 'cat_' + cat.replace(/\W/g,'_');
    const div = document.createElement('div');
    div.className = 'shop-category';
    div.id = catId;
    const selectedInCat = items.filter(i => window.selectedShopItems.has(i.name)).length;
    div.innerHTML = `
      <div class="shop-cat-header" onclick="window.toggleCategory('${catId}')">
        <span class="shop-cat-icon">${cat.split(' ')[0]}</span>
        <span class="shop-cat-name">${cat.split(' ').slice(1).join(' ')}</span>
        <span class="shop-cat-count" id="${catId}_count">${selectedInCat}/${items.length}</span>
        <span class="shop-cat-chevron">▼</span>
      </div>
      <div class="shop-cat-body">
        ${items.map(item => `
          <div class="shop-item ${window.selectedShopItems.has(item.name) ? 'selected' : ''}" data-name="${item.name}" onclick="window.toggleShopItem(this, '${item.name}')">
            <div class="shop-check"><svg fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>
            <span class="shop-item-emoji">${item.emoji}</span>
            <span class="shop-item-name">${item.name}</span>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(div);
  });
}

window.toggleCategory = (id) => document.getElementById(id).classList.toggle('collapsed');

window.toggleShopItem = (el, name) => {
  el.classList.toggle('selected');
  if (el.classList.contains('selected')) window.selectedShopItems.add(name);
  else window.selectedShopItems.delete(name);
  updateShopCounts();
};

function updateShopCounts() {
  const total = window.selectedShopItems.size;
  document.getElementById('shop-count-badge').textContent = total + ' selecionados';
  document.getElementById('gen-label').textContent = total + ' ite' + (total === 1 ? 'm selecionado' : 'ns selecionados');
  Object.entries(SHOP_DATA).forEach(([cat, items]) => {
    const catId = 'cat_' + cat.replace(/\W/g,'_');
    const el = document.getElementById(catId + '_count');
    if (el) {
      const sel = items.filter(i => window.selectedShopItems.has(i.name)).length;
      el.textContent = sel + '/' + items.length;
      el.style.background = sel > 0 ? 'var(--green)' : 'var(--green-xl)';
      el.style.color = sel > 0 ? 'white' : 'var(--green)';
    }
  });
}

window.selectAllShop = () => {
  Object.values(SHOP_DATA).flat().forEach(i => window.selectedShopItems.add(i.name));
  document.querySelectorAll('.shop-item').forEach(el => el.classList.add('selected'));
  updateShopCounts();
  window.showToast('✓ Todos selecionados');
};

window.selectNoneShop = () => {
  window.selectedShopItems.clear();
  document.querySelectorAll('.shop-item').forEach(el => el.classList.remove('selected'));
  updateShopCounts();
  window.showToast('✕ Seleção limpa');
};

window.selectFromDiet = () => window.selectAllShop();

window.filterShopItems = () => {
  const q = document.getElementById('shop-search-input').value.toLowerCase();
  document.querySelectorAll('.shop-item').forEach(el => {
    const match = el.querySelector('.shop-item-name').textContent.toLowerCase().includes(q);
    el.style.display = match ? '' : 'none';
  });
};

window.generateShoppingList = (format) => {
  if (window.selectedShopItems.size === 0) return window.showToast('⚠️ Selecione ao menos 1 item!');
  if (format === 'txt') {
    const lines = ['╔════════════════════════════════╗','║    NutriPlan - Lista de Compras ║','╚════════════════════════════════╝', `  Data: ${today}  |  ${window.selectedShopItems.size} itens`, ''];
    Object.entries(SHOP_DATA).forEach(([cat, items]) => {
      const sel = items.filter(i => window.selectedShopItems.has(i.name));
      if (sel.length === 0) return;
      lines.push(`── ${cat} ──`);
      sel.forEach(i => lines.push(`  ${i.emoji}  ${i.name}`));
      lines.push('');
    });
    lines.push('─────────────────────────────────\n  Plano: 2200 kcal | P:165g C:275g G:73g\n  Gerado pela NutriPlan');
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      window.openModal('📋', 'TXT Copiado!', `${window.selectedShopItems.size} itens copiados! Cole onde quiser.`, [{ label: '✓ Fechar', cls: 'modal-btn-primary', fn: 'window.closeModal()' }]);
    }).catch(() => {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      window.openModal('📋','TXT Copiado!',`Copiado!`,[{label:'Fechar',cls:'modal-btn-primary',fn:'window.closeModal()'}]);
    });
  } else {
    // Para funcionar o PDF, você precisa manter a importação do jspdf no index.html
    window.showToast('⚠️ O PDF exige a biblioteca jsPDF.');
  }
};

// Modal e Toast
window.openModal = (icon, title, desc, btns) => {
  document.getElementById('modal-icon').textContent = icon; document.getElementById('modal-title').textContent = title; document.getElementById('modal-desc').textContent = desc;
  document.getElementById('modal-actions').innerHTML = btns.map(b => `<button class="modal-btn ${b.cls}" onclick="${b.fn}">${b.label}</button>`).join('');
  document.getElementById('modal-overlay').classList.add('open');
};
window.closeModal = () => document.getElementById('modal-overlay').classList.remove('open');
document.getElementById('modal-overlay')?.addEventListener('click', function(e) { if (e.target === this) window.closeModal(); });

window.showToast = (msg) => {
  const t = document.getElementById('toast');
  document.getElementById('toast-text').textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
};

// Interatividade da Dieta
window.toggleFood = (el) => {
  const wasEaten = el.classList.contains('eaten');
  el.classList.toggle('eaten');
  const kcal = parseInt(el.dataset.kcal) || 0, p = parseInt(el.dataset.p) || 0, c = parseInt(el.dataset.c) || 0, g = parseInt(el.dataset.g) || 0;
  if (!wasEaten) {
    window.eatenKcal += kcal; window.eatenP += p; window.eatenC += c; window.eatenG += g;
    const msgs = ['Boa! 💪', 'Foco total!', 'Na dieta! 🥗', 'Registrado! ✅'];
    window.showToast(msgs[Math.floor(Math.random() * msgs.length)]);
  } else {
    window.eatenKcal -= kcal; window.eatenP -= p; window.eatenC -= c; window.eatenG -= g;
  }
  window.updateTracker();
  window.updateMealProgress(el);
  window.saveToFirebase(); // Salva na nuvem a cada clique!
};

window.updateTracker = () => {
  window.eatenKcal = Math.max(0, window.eatenKcal); window.eatenP = Math.max(0, window.eatenP); window.eatenC = Math.max(0, window.eatenC); window.eatenG = Math.max(0, window.eatenG);
  document.getElementById('kcal-consumed').textContent = window.eatenKcal;
  const pct = Math.min(window.eatenKcal / TOTAL_KCAL, 1);
  const ring = document.getElementById('kcal-ring');
  if(ring) {
    ring.style.strokeDashoffset = 188.5 - (188.5 * pct);
    if (pct < 0.5) ring.style.stroke = '#52B788'; else if (pct < 0.85) ring.style.stroke = '#F4A261'; else if (pct <= 1) ring.style.stroke = '#52B788'; else ring.style.stroke = '#E76F51';
  }
  document.getElementById('stat-p').textContent = window.eatenP + 'g'; document.getElementById('stat-c').textContent = window.eatenC + 'g'; document.getElementById('stat-g').textContent = window.eatenG + 'g';
  document.getElementById('bar-p').style.width = Math.min(window.eatenP / TOTAL_P * 100, 100) + '%'; document.getElementById('bar-c').style.width = Math.min(window.eatenC / TOTAL_C * 100, 100) + '%'; document.getElementById('bar-g').style.width = Math.min(window.eatenG / TOTAL_G * 100, 100) + '%';
};

window.updateMealProgress = (foodEl) => {
  const card = foodEl.closest('.meal-card');
  if (!card) return;
  const mealId = card.dataset.meal;
  const totalMealKcal = MEAL_KCAL[mealId] || 1;
  const eatenInMeal = Array.from(card.querySelectorAll('.food-item.eaten')).reduce((sum, el) => sum + (parseInt(el.dataset.kcal) || 0), 0);
  const bar = document.getElementById('mp-' + mealId);
  if (bar) bar.style.width = Math.min(eatenInMeal / totalMealKcal * 100, 100) + '%';
};

window.switchOpt = (btn, meal, opt) => {
  btn.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['a','b','c'].forEach(o => { const el = document.getElementById(meal + '-' + o); if (el) el.classList.remove('visible'); });
  const target = document.getElementById(meal + '-' + opt);
  if (target) { target.classList.add('visible'); target.style.animation = 'none'; target.offsetHeight; target.style.animation = 'slideUp .3s both'; }
};

window.filterMeal = (id, btn) => {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  document.querySelectorAll('.meal-card').forEach(card => card.style.display = (id === 'all' || card.dataset.meal === id) ? '' : 'none');
};

window.showPage = (page, btn) => {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active')); document.getElementById('page-' + page).classList.add('active');
};

window.imgFallback = (img, emoji) => {
  const ph = document.createElement('div'); ph.className = 'food-img-placeholder'; ph.textContent = emoji; img.replaceWith(ph);
};

window.printPlan = () => { document.querySelectorAll('.food-panel').forEach(p => p.classList.add('visible')); window.print(); };
window.copyPlan = () => {
  navigator.clipboard.writeText(`NutriPlan – 2200kcal\nP 165g | C 275g | G 73g\nTotal: 2200kcal`).then(() => window.showToast('📋 Copiado!')).catch(() => window.showToast('Erro ao copiar.'));
};

// Scroll
window.addEventListener('scroll', () => {
  const d = document.documentElement;
  document.getElementById('progress-bar').style.width = ((d.scrollTop / (d.scrollHeight - d.clientHeight)) * 100) + '%';
});

// Start
document.addEventListener('DOMContentLoaded', () => {
  buildShopList();
  document.querySelectorAll('.meal-card').forEach((c, i) => c.style.animationDelay = (i * 0.08) + 's');
});
