import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// ─── DARK MODE ───
window.toggleTheme = () => {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  if (isDark) {
    html.removeAttribute('data-theme');
    localStorage.setItem('nutriplan-theme', 'light');
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('nutriplan-theme', 'dark');
  }
  updateThemeIcon();
};

function updateThemeIcon() {
  const btn = document.getElementById('btnTheme');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
}

// Set correct icon on load
document.addEventListener('DOMContentLoaded', updateThemeIcon);

let currentUser = null;

// Mantém a data de hoje para facilitar
const today = new Date();
today.setHours(0, 0, 0, 0);

// Esta é a data que o usuário está visualizando na tela (pode ser o passado)
let currentViewDate = new Date(today);

// === COLE AQUI ===
window.waterConsumed = 0;
const WATER_GOAL = 3500;
// =================

// ─── PROTEÇÃO DE ROTA E BANCO DE DADOS ───
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const badge = document.querySelector('.hero-badge');
    if (badge) badge.textContent = `NutriPlan · ${user.displayName || user.email}`;
    
    updateDateDisplay();
    await loadDataForDate(currentViewDate);
    document.body.classList.add('auth-checked'); 
  } else {
    window.location.href = "login.html"; 
  }
});

// ─── SISTEMA DE CALENDÁRIO ───
window.changeDate = async (days) => {
  if (!currentUser) return;
  
  // Muda a data
  currentViewDate.setDate(currentViewDate.getDate() + days);
  
  // Impede de ver o futuro (opcional, comente se quiser liberar)
  if (currentViewDate > today) {
    currentViewDate.setDate(currentViewDate.getDate() - days);
    window.showToast("Você não pode prever o futuro! 🔮");
    return;
  }

  updateDateDisplay();
  
  // Limpa a tela visualmente antes de carregar o novo dia
  resetUI();
  await loadDataForDate(currentViewDate);
};

function updateDateDisplay() {
  const display = document.getElementById('date-display');
  if (!display) return;

  const diffTime = Math.abs(today - currentViewDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  if (currentViewDate.getTime() === today.getTime()) {
    display.textContent = "Hoje";
  } else if (currentViewDate < today && diffDays === 1) {
    display.textContent = "Ontem";
  } else {
    // Formata a data bonitinha (Ex: 05 de Abril)
    const options = { day: '2-digit', month: 'long' };
    display.textContent = currentViewDate.toLocaleDateString('pt-BR', options);
  }
}

// Limpa todas as variáveis e desmarca os itens na tela
function resetUI() {
  window.eatenKcal = 0; window.eatenP = 0; window.eatenC = 0; window.eatenG = 0;
  
  document.querySelectorAll('.food-item').forEach(el => {
    el.classList.remove('eaten');
    window.updateMealProgress(el);
  });
  
  window.updateTracker();
}

// ─── COMUNICAÇÃO COM O FIRESTORE ───

// Formata a data para a chave do banco de dados (YYYY-MM-DD)
function getFormattedDateString(dateObj) {
  // Evita problemas de fuso horário
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadDataForDate(targetDate) {
  const dateStr = getFormattedDateString(targetDate);
  const docRef = doc(db, "users", currentUser.uid, "history", dateStr);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    window.eatenKcal = data.kcal || 0;
    window.eatenP = data.p || 0;
    window.eatenC = data.c || 0;
    window.eatenG = data.g || 0;
    window.waterConsumed = data.water || 0; // NOVA LINHA

    if (data.foods) {
      // Pega todas as comidas na ordem em que aparecem no HTML
      const allFoods = Array.from(document.querySelectorAll('.food-item'));
      
      data.foods.forEach(item => {
        // Novo formato seguro: Carrega pela posição exata (número)
        if (typeof item === 'number' && allFoods[item]) {
          allFoods[item].classList.add('eaten');
          window.updateMealProgress(allFoods[item]);
        } 
        // Formato antigo (legado): Mantido para não quebrar o que você já salvou hoje
        else if (typeof item === 'string') {
          allFoods.forEach(el => {
            if (el.querySelector('.food-info strong').textContent === item) {
              el.classList.add('eaten');
              window.updateMealProgress(el);
            }
          });
        }
      });
    }
  }
  window.updateTracker();
}

window.saveToFirebase = async () => {
  if (!currentUser) return;
  
  const allFoods = Array.from(document.querySelectorAll('.food-item'));
  
  // Em vez de salvar nomes, salva a posição exata (índice) das que estão marcadas
  const eatenIndexes = allFoods
    .map((el, index) => el.classList.contains('eaten') ? index : -1)
    .filter(index => index !== -1);
  
  const dateStr = getFormattedDateString(currentViewDate);
  const docRef = doc(db, "users", currentUser.uid, "history", dateStr);
  
  await setDoc(docRef, {
    kcal: window.eatenKcal,
    p: window.eatenP,
    c: window.eatenC,
    g: window.eatenG,
    foods: eatenIndexes, // Agora salva números como [0, 5, 12]
    water: window.waterConsumed // NOVA LINHA
  }, { merge: true }); 
};

// ─── LÓGICA DO BOTÃO SAIR ───
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => signOut(auth));
}

// ─── LÓGICA DA INTERFACE (MIGRADA DO HTML) ───

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

window.selectedShopItems = new Set();
window.eatenKcal = 0; window.eatenP = 0; window.eatenC = 0; window.eatenG = 0;
const TOTAL_KCAL = 2200, TOTAL_P = 165, TOTAL_C = 275, TOTAL_G = 73;
const MEAL_KCAL = { 1: 430, 2: 660, 3: 440, 4: 530 };

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
  
  const dateStr = getFormattedDateString(currentViewDate);
  
  if (format === 'txt') {
    const lines = ['╔════════════════════════════════╗','║    NutriPlan - Lista de Compras ║','╚════════════════════════════════╝', `  Data: ${dateStr}  |  ${window.selectedShopItems.size} itens`, ''];
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
      window.openModal('📋','TXT Copiado!','Copiado!',[{label:'Fechar',cls:'modal-btn-primary',fn:'window.closeModal()'}]);
    });
  } else if (format === 'pdf') {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const m = 18; // margin
      const cw = W - m * 2;
      let y = m;

      // ─── FULL-WIDTH DARK HEADER ───
      doc.setFillColor(29, 29, 31);
      doc.rect(0, 0, W, 44, 'F');

      // Green accent line
      doc.setFillColor(48, 209, 88);
      doc.rect(0, 44, W, 1.5, 'F');

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('NutriPlan', m, 18);

      // Subtitle
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 165);
      doc.text('Lista de Compras', m, 26);

      // Right side: date + count
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(dateStr, W - m, 18, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(48, 209, 88);
      doc.text(window.selectedShopItems.size + ' itens', W - m, 26, { align: 'right' });

      // Macro row in header
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 135);
      doc.text('2200 kcal', m, 37);
      doc.setTextColor(10, 132, 255);
      doc.text('P: 165g', m + 28, 37);
      doc.setTextColor(255, 159, 10);
      doc.text('C: 275g', m + 50, 37);
      doc.setTextColor(255, 69, 58);
      doc.text('G: 73g', m + 72, 37);

      y = 54;

      // Category colors (no emojis needed)
      const catColors = {
        0: [10, 132, 255],   // blue - Proteinas
        1: [255, 159, 10],   // orange - Carboidratos
        2: [48, 209, 88],    // green - Frutas
        3: [255, 204, 0],    // yellow - Gorduras
        4: [175, 82, 222],   // purple - Suplementos
      };

      let catIdx = 0;
      Object.entries(SHOP_DATA).forEach(([cat, items]) => {
        const sel = items.filter(i => window.selectedShopItems.has(i.name));
        if (sel.length === 0) { catIdx++; return; }

        const rowH = 7;
        const blockH = 10 + sel.length * rowH + 4;

        // New page check
        if (y + blockH > H - 20) {
          doc.addPage();
          y = m;
        }

        // Category accent bar + name
        const color = catColors[catIdx] || [110, 110, 115];
        doc.setFillColor(...color);
        doc.roundedRect(m, y, 2, 8, 1, 1, 'F');

        const catName = cat.replace(/^[^\s]+\s*/, ''); // Remove emoji prefix
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(29, 29, 31);
        doc.text(catName, m + 6, y + 6);

        // Count
        doc.setFontSize(9);
        doc.setTextColor(160, 160, 165);
        doc.text(sel.length + ' itens', W - m, y + 6, { align: 'right' });

        y += 12;

        // Light separator
        doc.setDrawColor(235, 235, 240);
        doc.setLineWidth(0.3);
        doc.line(m, y, W - m, y);
        y += 3;

        // Items in compact rows
        sel.forEach((item, idx) => {
          if (y > H - 18) {
            doc.addPage();
            y = m;
          }

          // Alternating row background
          if (idx % 2 === 0) {
            doc.setFillColor(248, 248, 250);
            doc.rect(m, y - 2, cw, rowH, 'F');
          }

          // Circle checkbox
          doc.setDrawColor(200, 200, 205);
          doc.setLineWidth(0.35);
          doc.circle(m + 4, y + 1.5, 2, 'S');

          // Item name
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 55);
          doc.text(item.name, m + 10, y + 2.5);

          y += rowH;
        });

        y += 6;
        catIdx++;
      });

      // ─── FOOTER ───
      const footerY = H - 12;
      doc.setDrawColor(220, 220, 225);
      doc.setLineWidth(0.2);
      doc.line(m, footerY - 4, W - m, footerY - 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 165);
      doc.text('NutriPlan - Este plano e informativo. Consulte sempre um nutricionista.', m, footerY);
      doc.text(dateStr, W - m, footerY, { align: 'right' });

      // Save
      doc.save('NutriPlan_Lista_' + dateStr + '.pdf');
      
      window.openModal('\u{1F4C4}', 'PDF Gerado!', 'Sua lista com ' + window.selectedShopItems.size + ' itens foi baixada.', [{ label: 'Fechar', cls: 'modal-btn-primary', fn: 'window.closeModal()' }]);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      window.showToast('\u26A0\uFE0F Erro ao gerar PDF. Tente novamente.');
    }
  }
};

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
  window.saveToFirebase(); 
};

window.updateTracker = () => {
  window.eatenKcal = Math.max(0, window.eatenKcal); window.eatenP = Math.max(0, window.eatenP); window.eatenC = Math.max(0, window.eatenC); window.eatenG = Math.max(0, window.eatenG);
  document.getElementById('kcal-consumed').textContent = window.eatenKcal;
  const pct = Math.min(window.eatenKcal / TOTAL_KCAL, 1);
  const ring = document.getElementById('kcal-ring');
  if(ring) {
    ring.style.strokeDashoffset = 213.6 - (213.6 * pct);
    if (pct < 0.5) ring.style.stroke = '#34C759'; else if (pct < 0.85) ring.style.stroke = '#FF9500'; else if (pct <= 1) ring.style.stroke = '#34C759'; else ring.style.stroke = '#FF3B30';
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
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  // Sync bottom nav
  const bottomBtns = document.querySelectorAll('.bottom-nav-item');
  bottomBtns.forEach(b => b.classList.remove('active'));
  if (page === 'diet' && bottomBtns[0]) bottomBtns[0].classList.add('active');
  if (page === 'water' && bottomBtns[1]) bottomBtns[1].classList.add('active');
  if (page === 'shop' && bottomBtns[2]) bottomBtns[2].classList.add('active');
};

window.navTo = (page, btn) => {
  // Sync desktop nav tabs
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(t => t.classList.remove('active'));
  if (page === 'diet' && tabs[0]) tabs[0].classList.add('active');
  if (page === 'shop' && tabs[1]) tabs[1].classList.add('active');
  // Sync bottom nav
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Switch page
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.imgFallback = (img, emoji) => {
  const ph = document.createElement('div'); ph.className = 'food-img-placeholder'; ph.textContent = emoji; img.replaceWith(ph);
};

window.printPlan = () => { document.querySelectorAll('.food-panel').forEach(p => p.classList.add('visible')); window.print(); };
window.copyPlan = () => {
  navigator.clipboard.writeText(`NutriPlan – 2200kcal\nP 165g | C 275g | G 73g\nTotal: 2200kcal`).then(() => window.showToast('📋 Copiado!')).catch(() => window.showToast('Erro ao copiar.'));
};

window.addEventListener('scroll', () => {
  const d = document.documentElement;
  document.getElementById('progress-bar').style.width = ((d.scrollTop / (d.scrollHeight - d.clientHeight)) * 100) + '%';
});

document.addEventListener('DOMContentLoaded', () => {
  buildShopList();
  document.querySelectorAll('.meal-card').forEach((c, i) => c.style.animationDelay = (i * 0.08) + 's');
});

// Garante que a água zere ao mudar de dia no calendário
const originalResetUI = resetUI;
resetUI = function() {
  originalResetUI();
  window.waterConsumed = 0;
  window.updateWaterUI();
};

window.addWater = () => {
  const amount = parseInt(document.getElementById('water-amount').value) || 0;
  if (amount <= 0) return;
  
  window.waterConsumed += amount;
  window.updateWaterUI();
  window.saveToFirebase();
  window.showToast(`💧 +${amount}ml registrados!`);
};

window.undoWater = () => {
  const amount = parseInt(document.getElementById('water-amount').value) || 0;
  window.waterConsumed = Math.max(0, window.waterConsumed - amount); // Não deixa ficar negativo
  window.updateWaterUI();
  window.saveToFirebase();
};

window.openWaterModal = () => {
  document.getElementById('water-modal').classList.add('open');
  window.updateWaterUI();
};

window.closeWaterModal = () => {
  document.getElementById('water-modal').classList.remove('open');
};

window.updateWaterUI = () => {
  const fillEl = document.getElementById('water-fill');
  const textEl = document.getElementById('water-text');
  const btnTextEl = document.getElementById('water-btn-text');
  const statusEl = document.getElementById('water-status');
  
  if (!fillEl || !textEl) return;

  // Atualiza os textos com a quantidade bebida
  textEl.textContent = window.waterConsumed;
  if (btnTextEl) btnTextEl.textContent = window.waterConsumed;

  // A matemática perfeita para o preenchimento e para as metas
  const pct = (window.waterConsumed / WATER_GOAL) * 100;
  const visualPct = Math.min(pct, 100); // Trava a água visualmente em 100% para não vazar pela cabeça
  
  fillEl.style.height = visualPct + '%';

  // Lógica inteligente de status e avisos
  if (pct >= 100) {
    const excess = (pct - 100).toFixed(0);
    if (excess > 0) {
      statusEl.style.color = 'var(--amber)';
      statusEl.style.background = '#FFF7ED';
      statusEl.innerHTML = `Meta atingida! 🎉 (+${excess}% excedido)`;
    } else {
      statusEl.style.color = 'var(--green)';
      statusEl.style.background = 'var(--green-xl)';
      statusEl.innerHTML = `Meta atingida perfeitamente! 🎉`;
    }
  } else {
    statusEl.style.color = 'var(--mid)';
    statusEl.style.background = 'var(--light)';
    statusEl.innerHTML = `Faltam ${WATER_GOAL - window.waterConsumed} ml`;
  }
};

