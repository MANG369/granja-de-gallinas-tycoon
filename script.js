// ===================================================================================
//  GRANJA TYCOON - SCRIPT PRINCIPAL
//  Versión: 3.1 - Conexión de Wallet Corregida
// ===================================================================================

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
    // ===== ¡CAMBIO IMPORTANTE REALIZADO AQUÍ! =====
    // Se ha insertado la URL "Raw" correcta de tu manifiesto.
    tonConnectUI = new TON_CONNECT_SDK.TonConnectUI({
        manifestUrl: 'https://gist.githubusercontent.com/MANG369/f2096a69828c41f7204de27f0f65f81f/raw/tonconnect-manifest.json',
    });
    // ===============================================

    tonConnectUI.restoreConnection();
} catch (error) {
    console.error("Error al inicializar TON Connect:", error);
    showNotification("Error de Wallet", "error");
}

// ... (El resto del código JavaScript es exactamente el mismo que en la versión anterior,
//      ya que la lógica del juego ya era correcta. Solo la URL del manifiesto necesitaba
//      ser actualizada.)

// --- CONSTANTES Y ESTADO DEL JUEGO ---
const USER_ID = 'player1';
const gameRef = ref(database, `gameState/${USER_ID}`);
const DEFAULT_GAME_STATE = {
    gallinas: 0, huevos: 0, monedas: 10, capacidadCorral: 10,
    costoGallinaBase: 10, costoCorralBase: 100,
    corralUpgrades: 0, ventasRealizadas: 0, eggValueLevel: 0,
    walletRewardClaimed: false, playerLevel: 1, playerXp: 0,
};
let gameState = { ...DEFAULT_GAME_STATE };

// --- REFERENCIAS AL DOM ---
const domElements = {
    playerLevelDisplay: document.getElementById('player-level-display'),
    eggValueDisplay: document.getElementById('egg-value-display'),
    productionRateDisplay: document.getElementById('production-rate-display'),
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

function checkLevelUp() {
    const xpParaSiguienteNivel = Math.floor(100 * Math.pow(1.5, gameState.playerLevel - 1));
    if (gameState.playerXp >= xpParaSiguienteNivel) {
        gameState.playerLevel++;
        gameState.playerXp -= xpParaSiguienteNivel;
        const recompensa = 100 * gameState.playerLevel;
        gameState.monedas += recompensa;
        showNotification(`¡Nivel ${gameState.playerLevel}! +${recompensa} monedas!`);
        checkLevelUp();
    }
}

function addXp(amount) {
    gameState.playerXp += amount;
    checkLevelUp();
}

function updateUI() {
    const costoActualGallina = calcularCostoGallina();
    const costoActualCorral = calcularCostoCorral();
    const costoActualMejoraHuevo = calcularCostoMejoraHuevo();
    const valorActualPorHuevo = 1 + gameState.eggValueLevel;
    const valorTotalVenta = gameState.huevos * valorActualPorHuevo;

    domElements.playerLevelDisplay.innerText = gameState.playerLevel;
    domElements.eggValueDisplay.innerText = `${valorActualPorHuevo}💰`;
    domElements.productionRateDisplay.innerText = `${gameState.gallinas}🥚`;
    domElements.gallinasCapacity.innerText = `${gameState.gallinas}/${gameState.capacidadCorral}`;
    domElements.huevosCount.innerText = gameState.huevos;
    domElements.monedasCount.innerText = gameState.monedas;
    domElements.gallinasTotal.innerText = gameState.gallinas;
    domElements.corralUpgrades.innerText = gameState.corralUpgrades;
    domElements.ventasCount.innerText = gameState.ventasRealizadas;
    domElements.huevoLevelDisplay.innerText = gameState.eggValueLevel;
    domElements.costoGallina.innerText = costoActualGallina;
    domElements.costoCorral.innerText = costoActualCorral;
    domElements.costoMejoraHuevo.innerText = costoActualMejoraHuevo;
    domElements.valorVenta.innerText = valorTotalVenta;

    domElements.comprarGallinaBtn.disabled = gameState.monedas < costoActualGallina || gameState.gallinas >= gameState.capacidadCorral;
    domElements.mejorarCorralBtn.disabled = gameState.monedas < costoActualCorral;
    domElements.venderHuevosBtn.disabled = gameState.huevos === 0;
    domElements.mejorarHuevoBtn.disabled = gameState.monedas < costoActualMejoraHuevo;
}

function comprarGallina() {
    const costo = calcularCostoGallina();
    if (gameState.monedas >= costo && gameState.gallinas < gameState.capacidadCorral) {
        gameState.monedas -= costo;
        gameState.gallinas++;
        addXp(1);
        updateUI();
        saveGame();
    }
}

function mejorarHuevo() {
    const costo = calcularCostoMejoraHuevo();
    if (gameState.monedas >= costo) {
        gameState.monedas -= costo;
        gameState.eggValueLevel++;
        addXp(10);
        updateUI();
        saveGame();
    }
}

function mejorarCorral() {
    const costo = calcularCostoCorral();
    if (gameState.monedas >= costo) {
        gameState.monedas -= costo;
        gameState.capacidadCorral += 10;
        gameState.corralUpgrades++;
        addXp(15);
        updateUI();
        saveGame();
    }
}

function venderHuevos() {
    if (gameState.huevos > 0) {
        const valorPorHuevo = 1 + gameState.eggValueLevel;
        gameState.monedas += gameState.huevos * valorPorHuevo;
        gameState.huevos = 0;
        gameState.ventasRealizadas++;
        updateUI();
        saveGame();
    }
}

async function saveGame() {
    try {
        const gameData = { ...gameState, lastOnline: serverTimestamp() };
        await set(gameRef, gameData);
    } catch (error) {
        console.error("Error al guardar el progreso:", error);
    }
}

async function loadGame() {
    try {
        const snapshot = await get(gameRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.assign(gameState, { ...DEFAULT_GAME_STATE, ...data });

            const lastOnline = data.lastOnline || Date.now();
            const secondsOffline = Math.floor((Date.now() - lastOnline) / 1000);
            
            if (secondsOffline > 10 && gameState.gallinas > 0) {
                const huevosProducidosOffline = Math.floor(secondsOffline / 10) * gameState.gallinas;
                if (huevosProducidosOffline > 0) {
                    gameState.huevos += huevosProducidosOffline;
                    domElements.offlineGallinas.innerText = gameState.gallinas;
                    domElements.offlineHuevos.innerText = huevosProducidosOffline;
                    domElements.offlineModal.classList.remove('hidden');
                }
            }
        }
    } catch (error) {
        console.error("Error crítico al cargar datos desde Firebase:", error);
        showNotification("Error de conexión con la base de datos", "error");
    }
    updateUI();
}

setInterval(() => {
    if (gameState.gallinas > 0) {
        gameState.huevos += gameState.gallinas;
        updateUI();
    }
}, 10000);

setInterval(saveGame, 30000);

domElements.comprarGallinaBtn.addEventListener('click', comprarGallina);
domElements.mejorarHuevoBtn.addEventListener('click', mejorarHuevo);
domElements.mejorarCorralBtn.addEventListener('click', mejorarCorral);
domElements.venderHuevosBtn.addEventListener('click', venderHuevos);
domElements.closeModalBtn.addEventListener('click', () => domElements.offlineModal.classList.add('hidden'));
domElements.connectWalletBtn.addEventListener('click', () => {
    if (tonConnectUI && tonConnectUI.connected) {
        tonConnectUI.disconnect();
    } else if (tonConnectUI) {
        tonConnectUI.openModal();
    }
});

loadGame();