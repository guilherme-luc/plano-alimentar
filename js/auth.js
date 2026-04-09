import { auth } from './firebase.js';
// Importamos o provedor do Google e a função de Popup
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const btnGoogleLogin = document.getElementById('btnGoogleLogin');
const errorDiv = document.getElementById('auth-error');

// Instancia o Provedor do Google
const provider = new GoogleAuthProvider();

// Opcional: Força a conta do usuário a escolher o e-mail, útil se tiver várias contas
provider.setCustomParameters({
  prompt: 'select_account'
});

btnGoogleLogin.addEventListener('click', async () => {
  try {
    // Muda o texto para dar feedback
    const originalText = btnGoogleLogin.innerHTML;
    btnGoogleLogin.innerHTML = 'Conectando...';
    
    // Abre o Pop-up de login do Google
    const result = await signInWithPopup(auth, provider);
    
    // Se passar daqui, o usuário logou com sucesso
    const user = result.user;
    console.log("Logado como:", user.displayName);
    
    // Redireciona para o app
    window.location.href = "index.html";

  } catch (error) {
    console.error("Erro no login:", error);
    btnGoogleLogin.innerHTML = 'Continuar com o Google'; // Restaura o botão
    
    // Mostra erro caso o usuário feche a janela sem logar
    if (error.code !== 'auth/popup-closed-by-user') {
       errorDiv.textContent = "Não foi possível concluir o login. Tente novamente.";
       setTimeout(() => { errorDiv.textContent = ""; }, 4000);
    }
  }
});
