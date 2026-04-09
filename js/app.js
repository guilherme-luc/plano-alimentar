import { auth, db } from './firebase.js'; // Garantindo que o db vem junto!
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let currentUser = null;
// Pega a data de hoje no formato "YYYY-MM-DD" (Ex: "2026-04-09")
const today = new Date().toISOString().split('T')[0];

// ─── PROTEÇÃO DE ROTA E IDENTIDADE ───
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const badge = document.querySelector('.hero-badge');
    if (badge) badge.textContent = `NutriPlan · ${user.email}`;
    
    // Assim que logar, busca os dados salvos de hoje!
    await loadTodayData();
  } else {
    window.location.href = "login.html";
  }
});

const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => signOut(auth));
}

// ─── LÓGICA DO BANCO DE DADOS (FIRESTORE) ───

async function loadTodayData() {
  // Caminho: users -> [UID] -> history -> [Data]
  const docRef = doc(db, "users", currentUser.uid, "history", today);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();

    // 1. Restaura os macros na memória global
    window.eatenKcal = data.kcal || 0;
    window.eatenP = data.p || 0;
    window.eatenC = data.c || 0;
    window.eatenG = data.g || 0;

    // 2. Varre o HTML e pinta de verde as comidas salvas
    if (data.foods) {
      document.querySelectorAll('.food-item').forEach(el => {
        const foodName = el.querySelector('.food-info strong').textContent;
        if (data.foods.includes(foodName)) {
          el.classList.add('eaten');
          if (window.updateMealProgress) window.updateMealProgress(el);
        }
      });
    }

    // 3. Atualiza os gráficos na tela
    if (window.updateTracker) window.updateTracker();
  }
}

// Deixamos essa função "pública" para o HTML conseguir chamar
window.saveToFirebase = async () => {
  if (!currentUser) return;

  // Lê o HTML para ver o que está com a classe 'eaten' agora
  const eatenElements = document.querySelectorAll('.food-item.eaten .food-info strong');
  const eatenFoods = Array.from(eatenElements).map(el => el.textContent);

  const docRef = doc(db, "users", currentUser.uid, "history", today);
  
  // Salva na nuvem silenciosamente
  await setDoc(docRef, {
    kcal: window.eatenKcal,
    p: window.eatenP,
    c: window.eatenC,
    g: window.eatenG,
    foods: eatenFoods
  }, { merge: true }); 
};
