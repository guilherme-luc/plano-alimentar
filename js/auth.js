import { auth } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const btnGoogleLogin = document.getElementById('btnGoogleLogin');
const errorDiv = document.getElementById('auth-error');

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

if (btnGoogleLogin) {
  btnGoogleLogin.addEventListener('click', async () => {
    try {
      const originalText = btnGoogleLogin.innerHTML;
      btnGoogleLogin.innerHTML = 'Conectando...';
      
      const result = await signInWithPopup(auth, provider);
      console.log("Logado com sucesso!", result.user.email);
      window.location.href = "index.html";

    } catch (error) {
      console.error("Erro no login:", error);
      btnGoogleLogin.innerHTML = 'Continuar com o Google';
      
      if (error.code !== 'auth/popup-closed-by-user') {
         errorDiv.textContent = "Não foi possível concluir o login. Tente novamente.";
         setTimeout(() => { errorDiv.textContent = ""; }, 4000);
      }
    }
  });
}
