// Importar funciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- CONFIGURACIÓN E INICIALIZACIÓN ---

// 1. Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDLSHJNGDuW69hT9dEEpemp38Pbq0zF_LY",
    authDomain: "granja-de-gallinas-tycoon.firebaseapp.com",
    databaseURL: "https://granja-de-gallinas-tycoon-default-rtdb.firebaseio.com",
    projectId: "granja-de-gallinas-tycoon",
    storageBucket: "granja-de-gallinas-tycoon.appspot.com",
    messagingSenderId: "511126269785",
    appId: "1:511126269785:web:2f4cdb0038c905b340a648"
};

// 2. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 3. Inicializar TON Connect
// ¡MUY IMPORTANTE! DEBES REEMPLAZAR ESTA URL con el enlace PÚBLICO a tu archivo tonconnect-manifest.json
const tonConnectUI = new TON_CONNECT_SDK.TonConnectUI({
    manifestUrl: 'https://URL-PUBLICA-DE-TU-MANIFIESTO/tonconnect-manifest.json',
});

// --- CONSTANTES Y ESTADO DEL JUEGO ---
const USER_ID = 'player1';
const gameRef = ref(database, `gameState/${USER_ID}`);
const DEFAULT_GAME_STATE = {
    gallinas: 0, huevos: 0, monedas: 10, capacidadCorral: 10,
    costoGallinaBase: 10, costoCorralBase: 100,
};
let gameState = { ...DEFAULT_GAME_STATE };

// --- REFERENCIAS AL DOM ---
const gallinasCountEl = document.getElementById('gallinas-count');
const huevosCountEl = document.getElementById('huevos-count');
const monedasCountEl = document.getElementById('monedas-count');
const comprarGallinaBtn = document.getElementById('comprar-gallina-btn');
const costoGallinaEl = document.getElementById('costo-gallina');
const mejorarCorralBtn = document.getElementById('mejorar-corral-btn');
const costoCorralEl = document.getElementById('costo-corral');
const venderHuevosBtn = document.getElementById('vender-huevos-btn');
const valorVentaEl = document.getElementById('valor-venta');
const connectWalletBtn = document.getElementById('connect-wallet-btn');
const walletAddressEl = document.getElementById('wallet-address');
const offlineModal = document.getElementById('offline-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const offlineGallinasEl = document.getElementById('offline-gallinas');
const offlineHuevosEl = document.getElementById('offline-huevos');

// --- LÓGICA DE WALLET ---
tonConnectUI.onStatusChange(wallet => {
    if (wallet) {
        const address = wallet.account.address;
        const userFriendlyAddress = TON_CONNECT_SDK.toUserFriendlyAddress(address);
        walletAddressEl.innerText = `${userFriendlyAddress.slice(0, 4)}...${userFriendlyAddress.slice(-4)}`;
        connectWalletBtn.innerText = "Desconectar";
    } else {
        walletAddressEl.innerText = "";
        connectWalletBtn.innerText = "Conectar Wallet";
    }
});

connectWalletBtn.addEventListener('click', () => {
    if (tonConnectUI.connected) {
        tonConnectUI.disconnect();
    } else {
        tonConnectUI.openModal();
    }
});


// --- LÓGICA DEL JUEGO ---
const calcularCostoGallina = () => Math.floor(gameState.costoGallinaBase * Math.pow(1.15, gameState.gallinas));
const calcularCostoCorral = () => Math.floor(gameState.costoCorralBase * Math.pow(1.8, (gameState.capacidadCorral - 10) / 10));

function updateUI() {
    const costoActualGallina = calcularCostoGallina();
    const costoActualCorral = calcularCostoCorral();

    gallinasCountEl.innerText = `${gameState.gallinas} / ${gameState.capacidadCorral}`;
    huevosCountEl.innerText = gameState.huevos;
    monedasCountEl.innerText = gameState.monedas;
    valorVentaEl.innerText = gameState.huevos;
    costoGallinaEl.innerText = costoActualGallina;
    costoCorralEl.innerText = costoActualCorral;

    comprarGallinaBtn.disabled = gameState.monedas < costoActualGallina || gameState.gallinas >= gameState.capacidadCorral;
    mejorarCorralBtn.disabled = gameState.monedas < costoActualCorral;
    venderHuevosBtn.disabled = gameState.huevos === 0;
}

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
        updateUI();
        saveGame();
    }
}

function venderHuevos() {
    if (gameState.huevos > 0) {
        gameState.monedas += gameState.huevos;
        gameState.huevos = 0;
        updateUI();
        saveGame();
    }
}

// --- PERSISTENCIA DE DATOS (FIREBASE) ---
function saveGame() {
    const gameData = { ...gameState, lastOnline: serverTimestamp() };
    set(gameRef, gameData);
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
                    offlineGallinasEl.innerText = gameState.gallinas;
                    offlineHuevosEl.innerText = huevosProducidosOffline;
                    offlineModal.classList.remove('hidden');
                }
            }
        } else {
            gameState = { ...DEFAULT_GAME_STATE };
        }
    } catch (error) {
        console.error("Error al cargar datos desde Firebase:", error);
        alert("No se pudo conectar a la base de datos. Se iniciará una partida local.");
        gameState = { ...DEFAULT_GAME_STATE };
    }
    updateUI();
}

// --- BUCLES Y EVENTOS ---
setInterval(() => {
    if (gameState.gallinas > 0) {
        gameState.huevos += gameState.gallinas;
        updateUI();
    }
}, 10000);

setInterval(saveGame, 30000);

comprarGallinaBtn.addEventListener('click', comprarGallina);
mejorarCorralBtn.addEventListener('click', mejorarCorral);
venderHuevosBtn.addEventListener('click', venderHuevos);
closeModalBtn.addEventListener('click', () => {
    offlineModal.classList.add('hidden');
});

// Iniciar el juego
loadGame();