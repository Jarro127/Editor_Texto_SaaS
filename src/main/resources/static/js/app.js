const API_BASE = '/api/documentos';
let documentoActualId = null;
let documentosCache = [];
let toastBS = null;
let loginModalBS = null;
let paymentModalBS = null;
let currentUser = null;
let trialTimeLeft = 60;
let trialTimerInterval = null;
let isPro = false;

document.addEventListener('DOMContentLoaded', () => {
  const toastElement = document.getElementById('appToast');
  if (toastElement) {
    toastBS = new bootstrap.Toast(toastElement, { delay: 3500 });
  }

  const loginEl = document.getElementById('loginModal');
  if (loginEl) {
    loginModalBS = new bootstrap.Modal(loginEl);
  }

  const paymentEl = document.getElementById('paymentModal');
  if (paymentEl) {
    paymentModalBS = new bootstrap.Modal(paymentEl);
  }

  document.getElementById('btnGuardar').addEventListener('click', guardarDocumento);
  document.getElementById('btnNuevo').addEventListener('click', nuevoDocumento);
  document.getElementById('btnUpgrade').addEventListener('click', abrirModalPago);
  document.getElementById('btnOpenPaymentFromOverlay').addEventListener('click', abrirModalPago);

  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
  document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);

  const editor = document.getElementById('docContenido');
  editor.addEventListener('input', () => {
    actualizarMetricas();
    marcarComoNoSincronizado();
  });

  document.getElementById('docTitulo').addEventListener('input', marcarComoNoSincronizado);
  document.getElementById('searchDesktop').addEventListener('input', (e) => filtrarLista(e.target.value));
  document.getElementById('searchMobile').addEventListener('input', (e) => filtrarLista(e.target.value));

  verificarEstadoUsuario();
});

function verificarEstadoUsuario() {
  const storedUser = localStorage.getItem('saas_user');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    document.getElementById('userEmailText').textContent = currentUser.email;

    if (currentUser.isPro) {
      isPro = true;
      desbloquearServicio();
    } else {
      const elapsedSeconds = Math.floor((Date.now() - currentUser.trialStarted) / 1000);
      trialTimeLeft = Math.max(0, 60 - elapsedSeconds);
      if (trialTimeLeft <= 0) {
        bloquearServicio();
      } else {
        iniciarTemporizadorPrueba();
      }
    }
  } else {
    if (loginModalBS) {
      loginModalBS.show();
    }
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) return;

  currentUser = {
    email: email,
    isPro: false,
    trialStarted: Date.now()
  };

  localStorage.setItem('saas_user', JSON.stringify(currentUser));
  document.getElementById('userEmailText').textContent = currentUser.email;

  if (loginModalBS) loginModalBS.hide();

  trialTimeLeft = 60;
  iniciarTemporizadorPrueba();
  cargarListaDocumentos();
  mostrarNotificacion(`Bienvenido ${email}. Tu prueba gratuita de 1 minuto ha iniciado.`, 'info');
}

function iniciarTemporizadorPrueba() {
  if (trialTimerInterval) clearInterval(trialTimerInterval);

  actualizarUIPrueba();

  trialTimerInterval = setInterval(() => {
    trialTimeLeft--;
    actualizarUIPrueba();

    if (trialTimeLeft <= 0) {
      clearInterval(trialTimerInterval);
      bloquearServicio();
    }
  }, 1000);
}

function actualizarUIPrueba() {
  const mins = Math.floor(trialTimeLeft / 60);
  const secs = trialTimeLeft % 60;
  const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const timerText = document.getElementById('trialTimer');
  if (timerText) timerText.textContent = formatted;

  const trialBadge = document.getElementById('trialBadge');
  if (trialBadge) {
    if (trialTimeLeft <= 10) {
      trialBadge.className = 'badge bg-danger text-white border border-danger d-none d-md-inline-flex align-items-center gap-1';
    } else {
      trialBadge.className = 'badge bg-warning text-dark border border-warning d-none d-md-inline-flex align-items-center gap-1';
    }
  }
}

function bloquearServicio() {
  if (isPro) return;

  const editor = document.getElementById('docContenido');
  editor.setAttribute('contenteditable', 'false');
  editor.classList.add('locked');

  document.getElementById('docTitulo').disabled = true;
  document.getElementById('btnGuardar').disabled = true;

  const overlay = document.getElementById('serviceLockOverlay');
  if (overlay) overlay.classList.remove('d-none');

  const trialBadge = document.getElementById('trialBadge');
  if (trialBadge) {
    trialBadge.className = 'badge bg-danger text-white border border-danger d-none d-md-inline-flex align-items-center gap-1';
    document.getElementById('trialTimer').textContent = 'EXPIRADO';
  }

  mostrarNotificacion('La prueba de 1 minuto ha finalizado. Actualiza a Plan Pro.', 'danger');

  if (paymentModalBS) paymentModalBS.show();
}

function abrirModalPago() {
  if (paymentModalBS) paymentModalBS.show();
}

function handlePaymentSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitPayment');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Procesando pago...`;

  setTimeout(() => {
    isPro = true;
    if (currentUser) {
      currentUser.isPro = true;
      localStorage.setItem('saas_user', JSON.stringify(currentUser));
    }

    if (trialTimerInterval) clearInterval(trialTimerInterval);
    if (paymentModalBS) paymentModalBS.hide();

    desbloquearServicio();

    btn.disabled = false;
    btn.innerHTML = originalHtml;

    mostrarNotificacion('¡Pago realizado con éxito! Tu Plan Pro está activo.', 'success');
  }, 1000);
}

function desbloquearServicio() {
  const editor = document.getElementById('docContenido');
  editor.setAttribute('contenteditable', 'true');
  editor.classList.remove('locked');

  document.getElementById('docTitulo').disabled = false;
  document.getElementById('btnGuardar').disabled = false;

  const overlay = document.getElementById('serviceLockOverlay');
  if (overlay) overlay.classList.add('d-none');

  const trialBadge = document.getElementById('trialBadge');
  if (trialBadge) {
    trialBadge.className = 'badge bg-success text-white border border-success d-none d-md-inline-flex align-items-center gap-1';
    trialBadge.innerHTML = '<i class="bi bi-star-fill"></i> PLAN PRO';
  }

  const btnUpgrade = document.getElementById('btnUpgrade');
  if (btnUpgrade) {
    btnUpgrade.className = 'btn btn-outline-warning btn-sm disabled';
    btnUpgrade.innerHTML = '<i class="bi bi-check-circle-fill"></i> Pro Activo';
  }
}

function formatDoc(command, value = null) {
  if (!isPro && trialTimeLeft <= 0) return;
  document.execCommand(command, false, value);
  document.getElementById('docContenido').focus();
  actualizarMetricas();
}

function insertarHipervinculo() {
  if (!isPro && trialTimeLeft <= 0) return;
  const url = prompt('Ingrese el enlace URL (ejemplo: https://google.com):');
  if (url && url.trim() !== '') {
    formatDoc('createLink', url.trim());
  }
}

async function cargarListaDocumentos() {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error('Error al conectar con la API REST');
    documentosCache = await response.json();
    renderizarListas(documentosCache);
    document.getElementById('totalDocsBadge').textContent = documentosCache.length;
  } catch (err) {
    mostrarNotificacion('Error de red al cargar documentos', 'danger');
    console.error(err);
  }
}

function renderizarListas(docs) {
  const contenedorDesktop = document.getElementById('listaDocsDesktop');
  const contenedorMobile = document.getElementById('listaDocsMobile');

  if (docs.length === 0) {
    const vacioHtml = `<div class="text-center text-muted p-4 fs-xs"><i class="bi bi-folder-x fs-2 d-block mb-1"></i>Sin documentos aún</div>`;
    contenedorDesktop.innerHTML = vacioHtml;
    contenedorMobile.innerHTML = vacioHtml;
    return;
  }

  const generarHtmlItem = (doc) => `
    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-2 rounded mb-1 border-0 ${doc.id === documentoActualId ? 'bg-primary-subtle text-primary border-start border-3 border-primary' : 'bg-transparent'}">
      <div class="overflow-hidden me-2 cursor-pointer flex-grow-1" onclick="cargarDocumentoPorId(${doc.id})">
        <div class="fw-semibold text-truncate fs-sm">${doc.titulo || 'Sin Título'}</div>
        <small class="text-muted fs-xs d-block">${doc.fechaModificacion ? new Date(doc.fechaModificacion).toLocaleDateString() : (doc.fechaCreacion ? new Date(doc.fechaCreacion).toLocaleDateString() : 'Borrador')}</small>
      </div>
      <button class="btn btn-outline-danger btn-sm border-0 p-1 rounded-circle" onclick="eliminarDocumento(event, ${doc.id})" title="Eliminar">
        <i class="bi bi-trash fs-xs"></i>
      </button>
    </div>
  `;

  const htmlFinal = docs.map(generarHtmlItem).join('');
  contenedorDesktop.innerHTML = `<div class="list-group list-group-flush">${htmlFinal}</div>`;
  contenedorMobile.innerHTML = `<div class="list-group list-group-flush">${htmlFinal}</div>`;
}

async function cargarDocumentoPorId(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) throw new Error('Documento no encontrado');
    const doc = await response.json();

    documentoActualId = doc.id;
    document.getElementById('docTitulo').value = doc.titulo || '';
    document.getElementById('docContenido').innerHTML = doc.contenido || '';

    const offcanvasEl = document.getElementById('offcanvasSidebar');
    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
    if (bsOffcanvas) bsOffcanvas.hide();

    actualizarMetricas();
    marcarComoSincronizado();
    renderizarListas(documentosCache);
    mostrarNotificacion(`Documento "${doc.titulo}" cargado`, 'info');
  } catch (err) {
    mostrarNotificacion('Error al obtener documento', 'danger');
  }
}

async function guardarDocumento() {
  if (!isPro && trialTimeLeft <= 0) {
    bloquearServicio();
    return;
  }

  const titulo = document.getElementById('docTitulo').value.trim() || 'Documento sin título';
  const contenido = document.getElementById('docContenido').innerHTML;
  const docPayload = { titulo, contenido, autor: currentUser ? currentUser.email : 'Alumno FullStack' };
  const btn = document.getElementById('btnGuardar');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Guardando...`;

  try {
    let response;
    if (documentoActualId) {
      response = await fetch(`${API_BASE}/${documentoActualId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docPayload)
      });
    } else {
      response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docPayload)
      });
    }
    if (!response.ok) throw new Error('Error al guardar en el servidor');
    const guardado = await response.json();
    documentoActualId = guardado.id;

    marcarComoSincronizado();
    await cargarListaDocumentos();
    mostrarNotificacion('Documento sincronizado con éxito en la nube SaaS', 'success');
  } catch (err) {
    mostrarNotificacion('Fallo en la persistencia del documento', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function eliminarDocumento(e, id) {
  e.stopPropagation();
  if (!confirm('¿Está seguro de eliminar este documento de la nube?')) return;
  try {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('No se pudo eliminar');

    if (documentoActualId === id) {
      nuevoDocumento();
    }
    await cargarListaDocumentos();
    mostrarNotificacion('Documento eliminado correctamente', 'warning');
  } catch (err) {
    mostrarNotificacion('Error al eliminar', 'danger');
  }
}

function nuevoDocumento() {
  if (!isPro && trialTimeLeft <= 0) {
    bloquearServicio();
    return;
  }
  documentoActualId = null;
  document.getElementById('docTitulo').value = '';
  document.getElementById('docContenido').innerHTML = '';
  actualizarMetricas();
  marcarComoSincronizado('Nuevo borrador');
  renderizarListas(documentosCache);
}

function actualizarMetricas() {
  const texto = document.getElementById('docContenido').innerText.trim();
  const numPalabras = texto ? texto.split(/\s+/).length : 0;
  const numCaracteres = texto.length;
  document.getElementById('lblPalabras').textContent = numPalabras;
  document.getElementById('lblCaracteres').textContent = numCaracteres;
}

function marcarComoNoSincronizado() {
  const badge = document.getElementById('syncBadge');
  badge.className = 'badge bg-warning-subtle text-warning border border-warning-subtle d-none d-md-inline-flex align-items-center gap-1';
  badge.innerHTML = '<i class="bi bi-clock-history"></i> Cambios no guardados';
  document.getElementById('lblUltimaModificacion').textContent = 'Edición en curso...';
}

function marcarComoSincronizado(textoCustom = 'Sincronizado') {
  const badge = document.getElementById('syncBadge');
  badge.className = 'badge bg-secondary-subtle text-secondary border border-secondary-subtle d-none d-md-inline-flex align-items-center gap-1';
  badge.innerHTML = `<i class="bi bi-cloud-check"></i> ${textoCustom}`;
  document.getElementById('lblUltimaModificacion').textContent = 'Guardado ' + new Date().toLocaleTimeString();
}

function filtrarLista(texto) {
  const query = texto.toLowerCase();
  const filtrados = documentosCache.filter(d => (d.titulo || '').toLowerCase().includes(query));
  renderizarListas(filtrados);
}

function mostrarNotificacion(msg, tipo = 'success') {
  if (!toastBS) return;
  const toastEl = document.getElementById('appToast');
  const msgEl = document.getElementById('toastMessage');

  let icono = 'bi-check-circle-fill text-success';
  if (tipo === 'danger') icono = 'bi-exclamation-triangle-fill text-danger';
  if (tipo === 'warning') icono = 'bi-exclamation-circle-fill text-warning';
  if (tipo === 'info') icono = 'bi-info-circle-fill text-info';
  msgEl.innerHTML = `<i class="bi ${icono} fs-5"></i> ${msg}`;
  toastBS.show();
}
