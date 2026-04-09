import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// ─── PROTEÇÃO DE ROTA E IDENTIDADE ───
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuário está logado! 
    console.log("Logado como:", user.email);
    
    // 1. Personaliza a interface com o e-mail dele
    const badge = document.querySelector('.hero-badge');
    if (badge) badge.textContent = `NutriPlan · ${user.email}`;
    
  } else {
    // 2. IMPEDIR INTRUSOS: Se não houver usuário, manda de volta para o login
    window.location.href = "login.html";
  }
});

// ─── LÓGICA DO BOTÃO SAIR ───
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
      // Após sair, o onAuthStateChanged vai detectar e redirecionar automaticamente,
      // mas podemos forçar aqui para ser mais rápido:
      window.location.href = "login.html";
    }).catch((error) => {
      console.error("Erro ao sair:", error);
    });
  });
}
