// Importamos o 'auth' que você configurou no firebase.js
import { auth } from './firebase.js';
// Importamos as funções de login e cadastro direto do Google
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// Pegando os elementos da tela
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const errorDiv = document.getElementById('auth-error');

// Função rápida para mostrar mensagens de erro na tela
const showError = (msg) => {
  errorDiv.textContent = msg;
  setTimeout(() => { errorDiv.textContent = ""; }, 4000); // Some após 4 segundos
};

// ─── LÓGICA DE LOGIN ───
btnLogin.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    return showError("Por favor, preencha e-mail e senha.");
  }

  try {
    btnLogin.textContent = "Entrando..."; // Dá um feedback visual
    // Tenta fazer o login no Firebase
    await signInWithEmailAndPassword(auth, email, password);
    // Se passar da linha acima, deu certo! Redireciona para a dieta:
    window.location.href = "index.html"; 
  } catch (error) {
    btnLogin.textContent = "Entrar";
    console.error(error);
    // Traduzindo os erros mais comuns
    if (error.code === 'auth/invalid-credential') showError("E-mail ou senha incorretos.");
    else showError("Erro ao entrar. Tente novamente.");
  }
});

// ─── LÓGICA DE CADASTRO ───
btnRegister.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    return showError("Por favor, preencha e-mail e senha.");
  }
  
  if (password.length < 6) {
    return showError("A senha deve ter pelo menos 6 caracteres.");
  }

  try {
    btnRegister.textContent = "Criando...";
    // Cria a conta no Firebase (e já faz o login automático)
    await createUserWithEmailAndPassword(auth, email, password);
    // Redireciona para a dieta
    window.location.href = "index.html";
  } catch (error) {
    btnRegister.textContent = "Criar Nova Conta";
    console.error(error);
    if (error.code === 'auth/email-already-in-use') showError("Este e-mail já está em uso.");
    else showError("Erro ao criar conta.");
  }
});
