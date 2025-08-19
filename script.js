// ===================================================================================
//  GRANJA TYCOON - SCRIPT PRINCIPAL
//  Autor: MANG369
//  Versión: 2.0 - Edición de Excelencia
// ===================================================================================

// --- IMPORTACIONES DE MÓDULOS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- CONFIGURACIÓN E INICIALIZACIÓN ---

const firebaseConfig = {
    apiKey: "AIzaSyDLSHJNGDuW69hT9dEEpemp38Pbq0zF_LY",
    authDomain: "granja-de-gallinas-tycoon.firebaseapp.com",
    databaseURL: "https://granja-de-gallinas-tycoon-default-rtdb.firebaseio.com",
    projectId: "granja-de-gallinas-tycoon",
    storageBucket: "granja-de-gallinas-tycoon.appspot.com",
    messagingSenderId: "511126269785",
    appId: "1:511126269785:web:2f4cdb0038c905b340a648"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let tonConnectUI;
try {
    tonConnectUI = new TON_CONNECT_SDK.TonConnectUI({
        manifestUrl: 'https://URL-PUBLICA-DE-TU-MANIFIESTO/tonconnect-manifest.json',
    });
    tonConnectUI.restoreConnection();
} catch (error) {
    console.error("Error al inicializar TON Connect (revisa la URL del manifiesto):", error);
    showNotification("Error de Wallet", "error");
}

// --- CONSTANTES Y ESTADO DEL JUEGO ---
const USER_ID = 'player1';
const gameRef = ref(database, `gameState/${USER_ID}`);
const DEFAULT_GAME_STATE = {
    gallinas: 0, huevos: 0, monedas: 10, capacidadCorral: 10,
    costoGallinaBase: 10, costoCorralBase: 100,
    corralUpgrades: 0, ventasRealizadas: 0, eggValueLevel: 0,
    walletRewardClaimed: false,
};
let gameState = { ...DEFAULT_GAME_STATE };

// --- REFERENCIAS AL DOM ---
const domElements = {
    gallinasCapacity: document.getElementById('gallinas-capacity-display'),
    huevosCount: document.getElementById('huevos-count'),
    monedasCount: document.getElementById('monedas-count'),
    gallinasTotal: document.getElementById('gallinas-total-display'),
    corralUpgrades: document.getElementById('corral-upgrades-display'),
    ventasCount: document.getElementById('ventas-count-display'),
    costoGallina: document.getElementById('costo-gallina'),
    costoCorral: document.getElementById('costo-corral'),
    valorVenta: document.getElementById('valor-venta'),
    comprarGallinaBtn: document.getElementById('comprar-gallina-btn'),
    mejorarCorralBtn: document.getElementById('mejorar-corral-btn'),
    venderHuevosBtn: document.getElementById('vender-huevos-btn'),
    connectWalletBtn: document.getElementById('connect-wallet-btn'),
    walletAddress: document.getElementById('wallet-address'),
    offlineModal: document.getElementById('offline-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    offlineGallinas: document.getElementById('offline-gallinas'),
    offlineHuevos: document.getElementById('offline-huevos'),
    notificationContainer: document.getElementById('notification-container'),
    mejorarHuevoBtn: document.getElementById('mejorar-huevo-btn'),
    costoMejoraHuevo: document.getElementById('costo-mejora-huevo'),
    huevoLevelDisplay: document.getElementById('huevo-level-display'),
};

// --- LÓGICA DE WALLET Y NOTIFICACIONES ---
function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerText = message;
    domElements.notificationContainer.appendChild(notif);
    setTimeout(() => { notif.remove(); }, 5000);
}

if (tonConnectUI) {
    tonConnectUI.onStatusChange(wallet => {
        if (wallet) {
            const address = TON_CONNECT_SDK.toUserFriendlyAddress(wallet.account.address);
            domElements.walletAddress.innerText = `${address.slice(0, 4)}...${address.slice(-4)}`;
            domElements.connectWalletBtn.innerText = "Desconectar";
            if (!gameState.walletRewardClaimed) {
                const recompensa = 500;
                gameState.monedas += recompensa;
                gameState.walletRewardClaimed = true;
                showNotification(`+${recompensa} monedas por conectar!`);
                updateUI();
                saveGame();
            }
        } else {
            domElements.walletAddress.innerText = "";
            domElements.connectWalletBtn.innerText = "Conectar Wallet";
        }
    });
}

// --- LÓGICA PRINCIPAL DEL JUEGO ---
const calcularCostoGallina = () => Math.floor(gameState.costoGallinaBase * Math.pow(1.15, gameState.gallinas));
const calcularCostoCorral = () => Math.floor(gameState.costoCorralBase * Math.pow(1.8, gameState.corralUpgrades));
const calcularCostoMejoraHuevo = () => Math.floor(250 * Math.pow(1.95, gameState.eggValueLevel));

function updateUI() {
    // ... (El resto de la función se mantiene igual que en la versión anterior)
}

// ... (Las funciones comprarGallina, mejorarHuevo, mejorarCorral, venderHuevos, saveGame, loadGame y los setInterval se mantienen igual)

// --- EVENT LISTENERS ---
domElements.connectWalletBtn.addEventListener('click', () => {
    if (tonConnectUI && tonConnectUI.connected) {
        tonConnectUI.disconnect();
    } else if (tonConnectUI) {
        tonConnectUI.openModal();
    }
});
// ... (resto de listeners)

// --- INICIO DEL JUEGO ---
loadGame();