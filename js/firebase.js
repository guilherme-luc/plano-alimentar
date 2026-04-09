// Importações oficiais do Firebase (versão modular atualizada)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// TODO: SUBSTITUA O OBJETO ABAIXO PELAS SUAS CHAVES DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCqEIIrZV_WSOb0qy4kEJobqL7O7ORIdVc",
  authDomain: "nutriplan-bd0fa.firebaseapp.com",
  projectId: "nutriplan-bd0fa",
  storageBucket: "nutriplan-bd0fa.firebasestorage.app",
  messagingSenderId: "653202902488",
  appId: "1:653202902488:web:be46f114ba2b1bb19276ad"
};

// Inicializando o Firebase
const app = initializeApp(firebaseConfig);

// Exportando a Autenticação e o Banco de Dados para usarmos nos outros arquivos
export const auth = getAuth(app);
export const db = getFirestore(app);
