// ===================================================================================
//  GRANJA TYCOON - SCRIPT PRINCIPAL
//  Autor: Gemini (con la dirección del usuario)
//  Versión: 1.0 - Edición de Excelencia
// ===================================================================================

// --- IMPORTACIONES DE MÓDULOS ---
// Se importan las funciones necesarias de los SDK para mantener el código modular.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- CONFIGURACIÓN E INICIALIZACIÓN ---

// Configuración de Firebase: Las llaves para conectar con la base de datos en la nube.
const firebaseConfig = {
    apiKey: "AIzaSyDLSHJNGDuW69hT9dEEpemp38Pbq0zF_LY",
    authDomain: "granja-de-gallinas-tycoon.firebaseapp.com",
    databaseURL: "https://granja-de-gallinas-tycoon-default-rtdb.firebaseio.com",
    projectId: "granja-de-gallinas-tycoon",
    storageBucket: "granja-de-gallinas-tycoon.appspot.com",
    messagingSenderId: "511126269785",
    appId: "1:511126269785:web:2f4cdb0038c905b340a648"
};

// Inicialización de los servicios.
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Inicialización de TON Connect: Prepara la interfaz para conectar la wallet.
// ¡IMPORTANTE! El usuario debe reemplazar la URL del manifiesto por una propia.
const tonConnectUI = new TON_CONNECT_SDK.TonConnectUI({
    manifestUrl: 'https://URL-PUBLICA-DE-TU-MANIFIESTO/tonconnect-manifest.json',
});

// --- CONSTANTES Y ESTADO DEL JUEGO ---

const USER_ID = 'player1'; // Se usa un ID estático. En una app real, esto provendría de un sistema de login.
const gameRef = ref(database, `gameState/${USER_ID}`); // Ruta donde se guardan los datos del jugador.

// Define el estado inicial para cualquier jugador nuevo o para resetear la partida.
const DEFAULT_GAME_STATE = {
    gallinas: 0,
    huevos: 0,
    monedas: 10,
    capacidadCorral: 10,
    costoGallinaBase: 10,
    costoCorralBase: 100,
    corralUpgrades: 0,
    ventasRealizadas: 0,
};

// 'gameState' es el objeto principal que contiene toda la información de la partida actual.
let gameState = { ...DEFAULT_GAME_STATE };

// --- REFERENCIAS AL DOM ---
// Se guardan los elementos de la página en constantes para un acceso más rápido.
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
};

// --- LÓGICA DE WALLET ---

/**
 * Se suscribe a los cambios de estado de la wallet para actualizar la UI.
 * @param {import('@tonconnect/sdk').WalletInfo | null} wallet - La información de la wallet conectada, o null si está desconectada.
 */
tonConnectUI.onStatusChange(wallet => {
    if (wallet) {
        const address = TON_CONNECT_SDK.toUserFriendlyAddress(wallet.account.address);
        domElements.walletAddress.innerText = `${address.slice(0, 4)}...${address.slice(-4)}`;
        domElements.connectWalletBtn.innerText = "Desconectar";
    } else {
        domElements.walletAddress.innerText = "";
        domElements.connectWalletBtn.innerText = "Conectar Wallet";
    }
});

// --- LÓGICA PRINCIPAL DEL JUEGO ---

/**
 * Calcula el costo de la próxima gallina basado en una fórmula exponencial.
 * @returns {number} El costo en monedas.
 */
const calcularCostoGallina = () => Math.floor(gameState.costoGallinaBase * Math.pow(1.15, gameState.gallinas));

/**
 * Calcula el costo de la próxima mejora del corral.
 * @returns {number} El costo en monedas.
 */
const calcularCostoCorral = () => Math.floor(gameState.costoCorralBase * Math.pow(1.8, gameState.corralUpgrades));

/**
 * Función central que actualiza toda la interfaz de usuario con los valores actuales de `gameState`.
 */
function updateUI() {
    const costoActualGallina = calcularCostoGallina();
    const costoActualCorral = calcularCostoCorral();

    // Actualiza los textos
    domElements.gallinasCapacity.innerText = `${gameState.gallinas}/${gameState.capacidadCorral}`;
    domElements.huevosCount.innerText = gameState.huevos;
    domElements.monedasCount.innerText = gameState.monedas;
    domElements.gallinasTotal.innerText = gameState.gallinas;
    domElements.corralUpgrades.innerText = gameState.corralUpgrades;
    domElements.ventasCount.innerText = gameState.ventasRealizadas;
    domElements.costoGallina.innerText = costoActualGallina;
    domElements.costoCorral.innerText = costoActualCorral;
    domElements.valorVenta.innerText = gameState.huevos;

    // Lógica para habilitar/deshabilitar botones
    domElements.comprarGallinaBtn.disabled = gameState.monedas < costoActualGallina || gameState.gallinas >= gameState.capacidadCorral;
    domElements.mejorarCorralBtn.disabled = gameState.monedas < costoActualCorral;
    domElements.venderHuevosBtn.disabled = gameState.huevos === 0;
}

// --- ACCIONES DEL JUGADOR ---

function comprarGallina() {
    const costo = calcularCostoGallina();
    if (gameState.monedas >= costo && gameState.gallinas < gameState.capacidadCorral) {
        gameState.monedas -= costo;
        gameState.gallinas++;
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
        updateUI();
        saveGame();
    }
}

function venderHuevos() {
    if (gameState.huevos > 0) {
        gameState.monedas += gameState.huevos;
        gameState.huevos = 0;
        gameState.ventasRealizadas++;
        updateUI();
        saveGame();
    }
}

// --- PERSISTENCIA DE DATOS (FIREBASE) ---

/**
 * Guarda el estado actual del juego en la base de datos de Firebase.
 * Usa un bloque try-catch para manejar posibles errores de red.
 */
async function saveGame() {
    try {
        const gameData = { ...gameState, lastOnline: serverTimestamp() };
        await set(gameRef, gameData);
    } catch (error) {
        console.error("Error al guardar el progreso:", error);
    }
}

/**
 * Carga el estado del juego desde Firebase al iniciar.
 * Si no hay datos, inicia una partida nueva. Calcula las ganancias offline.
 */
async function loadGame() {
    try {
        const snapshot = await get(gameRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Combina los datos guardados con el estado por defecto para evitar errores si faltan propiedades.
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
        alert("No se pudo conectar a la base de datos para cargar tu progreso. Se iniciará una partida local.");
    }
    updateUI();
}

// --- BUCLES DE JUEGO Y EVENT LISTENERS ---

// Bucle principal que genera huevos cada 10 segundos.
setInterval(() => {
    if (gameState.gallinas > 0) {
        gameState.huevos += gameState.gallinas;
        updateUI();
    }
}, 10000);

// Bucle de auto-guardado para asegurar el progreso cada 30 segundos.
setInterval(saveGame, 30000);

// Asignación de eventos a los elementos interactivos.
domElements.comprarGallinaBtn.addEventListener('click', comprarGallina);
domElements.mejorarCorralBtn.addEventListener('click', mejorarCorral);
domElements.venderHuevosBtn.addEventListener('click', venderHuevos);
domElements.closeModalBtn.addEventListener('click', () => domElements.offlineModal.classList.add('hidden'));
domElements.connectWalletBtn.addEventListener('click', () => {
    tonConnectUI.connected ? tonConnectUI.disconnect() : tonConnectUI.openModal();
});

// --- INICIO DEL JUEGO ---
// La primera acción al cargar la página es cargar la partida guardada.
loadGame();