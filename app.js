/**
 * Plagueo en Café - ABC Geomática
 * Premium PWA Monitoring System
 * Version 2.3 - Added Weeds Monitoring & Detailed Thresholds
 */

const APP_STATE = {
    currentView: 'dashboard',
    user: JSON.parse(localStorage.getItem('abc_user') || 'null'),
    deferredPrompt: null,
    editingRecordIdx: null,
    collections: {
        ciclos: JSON.parse(localStorage.getItem('abc_ciclos') || '[]'),
        fincas: JSON.parse(localStorage.getItem('abc_fincas') || '[]'),
        lotes: JSON.parse(localStorage.getItem('abc_lotes') || '[]'),
    },
    monitoring: {
        coords: null,
        header: { finca: "", lote: "", variedad: "Caturra", plaguero: "" },
        pests: {},
        diseases: {},
        weeds: {},
        growth: { fenologia: "Vegetativo", altura: 0, nudos: 0 }
    }
};

const PEST_DB = [
    { id: "broca", name: "Broca del Café", icon: "🪲", type: "pest" },
    { id: "minador", name: "Minador de la Hoja", icon: "🍃", type: "pest" },
    { id: "cochinilla", name: "Cochinillas", icon: "⚪", type: "pest" },
    { id: "aranita", name: "Arañita Roja", icon: "🕷️", type: "pest" },
    { id: "joboto", name: "Joboto", icon: "🐛", type: "pest" },
    { id: "avispas", name: "Avispas (Beneficiosas)", icon: "🐝", type: "beneficial" }
];

const DISEASE_DB = [
    { id: "roya", name: "Roya (Hemileia)", icon: "🦠" },
    { id: "ojogallo", name: "Ojo de Gallo", icon: "👁️" },
    { id: "antracnosis", name: "Antracnosis", icon: "🍂" },
    { id: "cercospora", name: "Cercospora", icon: "🌑" },
    { id: "malhilachas", name: "Mal de Hilachas", icon: "🧵" }
];

const WEED_DB = [
    { id: "gramineas", name: "Gramíneas (Zacate)", icon: "🌱" },
    { id: "hojaancha", name: "Hoja Ancha", icon: "🍀" },
    { id: "cyperaceas", name: "Cyperáceas", icon: "🎋" },
    { id: "helechos", name: "Helechos", icon: "🌿" }
];

const THRESHOLDS_DATA = {
    broca: {
        name: "Broca del Café",
        rows: [
            { cond: "Incidencia (30 granos/rama)", n1: "0-1%", n2: "2%", n3: ">2%", obs: "Muestreo sistemático. >2% requiere control." }
        ]
    },
    minador: {
        name: "Minador de la Hoja",
        rows: [
            { cond: "Hojas con larva viva", n1: "<10%", n2: "15%", n3: ">15%", obs: "Puntaje crítico si >15% de incidencia." }
        ]
    },
    cochinilla: {
        name: "Cochinillas",
        rows: [
            { cond: "Presencia en racimos", n1: "<2%", n2: "5%", n3: ">5%", obs: "Revisar nudos y frutos tiernos." }
        ]
    },
    aranita: {
        name: "Arañita Roja",
        rows: [
            { cond: "Ácaros por hoja", n1: "1-5", n2: "10", n3: ">15", obs: "Común en época seca y orilla de caminos." }
        ]
    },
    joboto: {
        name: "Joboto",
        rows: [
            { cond: "Larvas por planta", n1: "0.5", n2: "1", n3: ">1", obs: "Crítico en renovaciones y plantas jóvenes." }
        ]
    },
    roya: {
        name: "Roya (Hemileia vastatrix)",
        rows: [
            { cond: "Zonas Altas (>1200m)", n1: "<5%", n2: "10%", n3: ">10%", obs: "Manejo preventivo." },
            { cond: "Zonas Bajas (<1000m)", n1: "<10%", n2: "15%", n3: ">15%", obs: "Alta presión de inóculo." }
        ]
    },
    ojogallo: {
        name: "Ojo de Gallo",
        rows: [
            { cond: "Hojas afectadas", n1: "<5%", n2: "10%", n3: ">10%", obs: "Zonas húmedas y con mucha sombra." }
        ]
    },
    antracnosis: {
        name: "Antracnosis",
        rows: [
            { cond: "Ramas piedrosas", n1: "<5%", n2: "10%", n3: ">15%", obs: "Asociado a muerte descendente." }
        ]
    },
    cercospora: {
        name: "Cercospora",
        rows: [
            { cond: "Incidencia en hojas", n1: "<10%", n2: "15%", n3: ">20%", obs: "Indicador de baja nutrición (Nitrógeno)." }
        ]
    },
    gramineas: {
        name: "Zacates (Gramíneas)",
        rows: [
            { cond: "Cobertura de suelo", n1: "<15%", n2: "25%", n3: ">30%", obs: "Alta competencia por nutrientes." }
        ]
    },
    hojaancha: {
        name: "Hoja Ancha",
        rows: [
            { cond: "Cobertura de suelo", n1: "<20%", n2: "40%", n3: ">50%", obs: "Competencia media." }
        ]
    },
    cyperaceas: {
        name: "Cyperáceas (Coyolillo)",
        rows: [
            { cond: "Presencia", n1: "Manchones", n2: "Medio", n3: "General", obs: "Muy difícil control, compite agresivamente." }
        ]
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPWA();
    getLocation();
    renderView('dashboard');
});

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const dest = item.getAttribute('data-view');
            document.querySelectorAll('.nav-item').forEach(v => v.classList.remove('active'));
            item.classList.add('active');
            renderView(dest);
        });
    });
}

function initPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        APP_STATE.deferredPrompt = e;
        if (APP_STATE.currentView === 'dashboard') renderView('dashboard');
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA instalado');
        APP_STATE.deferredPrompt = null;
        renderView('dashboard');
    });
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                APP_STATE.monitoring.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            },
            () => console.log('Sin GPS')
        );
    }
}

// --- View Engine ---
function renderView(viewName) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    if (!APP_STATE.user && viewName !== 'registration') {
        mainContent.innerHTML = renderRegistration();
        return;
    }

    APP_STATE.currentView = viewName;
    window.scrollTo(0, 0);

    switch (viewName) {
        case 'dashboard': mainContent.innerHTML = renderDashboard(); break;
        case 'records': mainContent.innerHTML = renderRecords(); break;
        case 'admin': mainContent.innerHTML = renderAdmin(); break;
        case 'admin_ciclos': mainContent.innerHTML = renderAdminCiclos(); break;
        case 'admin_fincas': mainContent.innerHTML = renderAdminFincas(); break;
        case 'admin_lotes': mainContent.innerHTML = renderAdminLotes(); break;
        case 'monitor_header': mainContent.innerHTML = renderMonitorHeader(); break;
        case 'monitor_pests': mainContent.innerHTML = renderMonitorPests(); break;
        case 'monitor_diseases': mainContent.innerHTML = renderMonitorDiseases(); break;
        case 'monitor_weeds': mainContent.innerHTML = renderMonitorWeeds(); break;
        case 'monitor_growth': mainContent.innerHTML = renderMonitorGrowth(); break;
        default: mainContent.innerHTML = renderDashboard();
    }
    
    if (window.lucide) window.lucide.createIcons();
    
    // Auto-trigger lotes for header
    if (viewName === 'monitor_header') {
        setTimeout(updateLotesSelect, 50);
    }
}

function renderRegistration() {
    return `
        <div class="card slide-up">
            <h2 class="view-title">Bienvenido</h2>
            <p style="margin-bottom: 2rem; opacity: 0.7;">Registre su dispositivo para continuar.</p>
            <div class="field-group">
                <input type="text" id="reg-name" class="input-modern" placeholder="Nombre completo">
            </div>
            <div class="field-group">
                <input type="email" id="reg-email" class="input-modern" placeholder="Email institucional">
            </div>
            <button class="btn btn-primary" style="width:100%" onclick="saveReg()">REGISTRARSE</button>
        </div>
    `;
}

function saveReg() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    if (name && email) {
        APP_STATE.user = { name, email };
        localStorage.setItem('abc_user', JSON.stringify(APP_STATE.user));
        renderView('dashboard');
    }
}

function changeUser() {
    if (confirm('¿Cerrar sesión y cambiar de usuario?')) {
        localStorage.removeItem('abc_user');
        APP_STATE.user = null;
        renderView('registration');
    }
}

function renderDashboard() {
    const records = JSON.parse(localStorage.getItem('abc_monitoring_records') || '[]');
    const pending = records.filter(r => !r.synced).length;
    const name = APP_STATE.user?.name?.split(' ')[0] || 'Usuario';
    
    return `
        <div class="dashboard-hero">
            <div class="card" style="padding: 2rem 1.75rem;">
                <div class="dashboard-title-mini">☕ Sistema Monitoreo de Café</div>
                <div class="dashboard-greeting">
                    <span style="font-weight: 800; font-size: 1.5rem;">Hola, ${name} 👋</span>
                </div>
            </div>
            
            <div class="card" style="display: flex; flex-direction: column; gap: 1rem; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05);">
                <button class="btn btn-orange" style="width: 100%; justify-content: flex-start;" onclick="initNewMon()">
                    <i data-lucide="rocket"></i> INICIAR MONITOREO
                </button>
                
                <button class="btn btn-celeste" style="width: 100%; justify-content: flex-start;" onclick="renderView('records')">
                    <i data-lucide="list"></i> ${pending} REGISTROS PENDIENTES
                </button>
            </div>

            <div class="sync-section" style="margin-top: 1rem;">
                <button id="sync-btn" class="btn btn-celeste" style="width:100%; background: var(--accent-celeste) !important; color: white !important;" onclick="syncData()">
                    <i data-lucide="cloud-lightning"></i> SINCRONIZAR AHORA
                </button>
            </div>
            
            ${APP_STATE.deferredPrompt ? `
                <div class="card install-card">
                    <p style="margin-bottom:1rem">📲 Instale la App para acceso rápido.</p>
                    <button class="btn btn-primary btn-small" style="width:100%" onclick="installPWA()">
                        <i data-lucide="download"></i> INSTALAR APP
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// --- Monitoring Engine ---
function initNewMon() {
    if (APP_STATE.collections.fincas.length === 0) {
        alert("Primero registre una Finca en Administración.");
        renderView('admin');
        return;
    }
    APP_STATE.editingRecordIdx = null;
    APP_STATE.monitoring.pests = {};
    APP_STATE.monitoring.diseases = {};
    APP_STATE.monitoring.weeds = {};
    APP_STATE.monitoring.header.plaguero = APP_STATE.user.name;
    renderView('monitor_header');
}

function updateLotesSelect() {
    const fincaEl = document.getElementById('mon-finca');
    const loteEl = document.getElementById('mon-lote');
    if (!fincaEl || !loteEl) return;

    const fid = fincaEl.value;
    const lotes = APP_STATE.collections.lotes.filter(l => l.fincaId === fid);
    const currentLote = APP_STATE.monitoring.header.lote;

    loteEl.innerHTML = lotes.map(l => 
        `<option ${l.nombre === currentLote ? 'selected' : ''} value="${l.nombre}">${l.nombre}</option>`
    ).join('') || '<option value="">Sin lotes</option>';
}

function renderMonitorHeader() {
    const h = APP_STATE.monitoring.header;
    return `
        <div class="view-header"><h2>Encabezado</h2></div>
        <div class="card">
            <div class="field-group">
                <label>Finca</label>
                <select id="mon-finca" class="input-modern" onchange="updateLotesSelect()">
                    ${APP_STATE.collections.fincas.map(f => `<option value="${f.id}" ${h.finca === f.nombre ? 'selected' : ''}>${f.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="field-group">
                <label>Lote</label>
                <select id="mon-lote" class="input-modern"></select>
            </div>
            <div class="field-group">
                <label>Variedad</label>
                <select id="mon-var" class="input-modern">
                    <option ${h.variedad === 'Caturra' ? 'selected' : ''}>Caturra</option>
                    <option ${h.variedad === 'Catuaí' ? 'selected' : ''}>Catuaí</option>
                    <option ${h.variedad === 'Villasarchí' ? 'selected' : ''}>Villasarchí</option>
                    <option ${h.variedad === 'Obatá' ? 'selected' : ''}>Obatá</option>
                    <option ${h.variedad === 'Híbridos' ? 'selected' : ''}>Híbridos</option>
                </select>
            </div>
            <button class="btn btn-primary" style="width:100%" onclick="saveHeaderStep()">
                SIGUIENTE PLAGAS <i data-lucide="arrow-right"></i>
            </button>
        </div>
    `;
}

function saveHeaderStep() {
    const f = document.getElementById('mon-finca');
    APP_STATE.monitoring.header = {
        finca: f.options[f.selectedIndex].text,
        lote: document.getElementById('mon-lote').value,
        variedad: document.getElementById('mon-var').value,
        plaguero: APP_STATE.user.name
    };
    renderView('monitor_pests');
}

function renderMonitorPests() {
    return `
        <div class="monitor-steps">
            <div class="step-item" onclick="renderView('monitor_header')">📁</div>
            <div class="step-item active">🕷️</div>
            <div class="step-item" onclick="renderView('monitor_diseases')">🦠</div>
            <div class="step-item" onclick="renderView('monitor_weeds')">🌿</div>
        </div>
        ${PEST_DB.map(p => renderPestCard(p)).join('')}
        <div style="height: 100px;"></div>
        <div class="sticky-footer" style="position:fixed; bottom: 80px; left: 1rem; right: 1rem;">
            <button class="btn btn-primary" style="width:100%" onclick="renderView('monitor_diseases')">SIGUIENTE <i data-lucide="arrow-right"></i></button>
        </div>
    `;
}

function renderPestCard(p) {
    const level = APP_STATE.monitoring.pests[p.id] || 0;
    return `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="pest-icon-badge" onclick="showThreshold('${p.id}')">${p.icon}</div>
                    <span style="font-weight: 800;">${p.name}</span>
                </div>
                <div class="threshold-indicator">
                    <div class="threshold-dot green ${level > 0 ? 'active' : ''}"></div>
                    <div class="threshold-dot yellow ${level > 1 ? 'active' : ''}"></div>
                    <div class="threshold-dot red ${level > 2 ? 'active' : ''}"></div>
                </div>
            </div>
            <div class="level-selector-premium">
                ${['N', 'B', 'M', 'A'].map((l, i) => `
                    <div class="level-card ${level === i ? 'active' : ''} ${i === 1 ? 'bajo' : (i === 2 ? 'medio' : (i === 3 ? 'alto' : 'nulo'))}" onclick="setPestLevel('${p.id}', ${i})">
                        <span>${l}</span>
                        <small>${i === 0 ? '0%' : (i === 1 ? '2%' : (i === 2 ? '10%' : '20%'))}</small>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function setPestLevel(id, lvl) {
    APP_STATE.monitoring.pests[id] = lvl;
    renderView('monitor_pests');
}

function renderMonitorDiseases() {
    return `
        <div class="monitor-steps">
            <div class="step-item" onclick="renderView('monitor_header')">📁</div>
            <div class="step-item" onclick="renderView('monitor_pests')">🕷️</div>
            <div class="step-item active">🦠</div>
            <div class="step-item" onclick="renderView('monitor_weeds')">🌿</div>
        </div>
        ${DISEASE_DB.map(d => renderDiseaseCard(d)).join('')}
        <div style="height: 100px;"></div>
        <div class="sticky-footer" style="position:fixed; bottom: 80px; left: 1rem; right: 1rem;">
            <button class="btn btn-primary" style="width:100%" onclick="renderView('monitor_weeds')">SIGUIENTE <i data-lucide="arrow-right"></i></button>
        </div>
    `;
}

function renderDiseaseCard(d) {
    const level = APP_STATE.monitoring.diseases[d.id] || 0;
    return `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="disease-icon-badge" onclick="showThreshold('${d.id}')">${d.icon}</div>
                    <span style="font-weight: 800;">${d.name}</span>
                </div>
                <div class="threshold-indicator">
                    <div class="threshold-dot green ${level > 0 ? 'active' : ''}"></div>
                    <div class="threshold-dot yellow ${level > 1 ? 'active' : ''}"></div>
                    <div class="threshold-dot red ${level > 2 ? 'active' : ''}"></div>
                </div>
            </div>
            <div class="level-selector-premium">
                ${['N', 'B', 'M', 'A'].map((l, i) => `
                    <div class="level-card ${level === i ? 'active' : ''} ${i === 1 ? 'bajo' : (i === 2 ? 'medio' : (i === 3 ? 'alto' : 'nulo'))}" onclick="setDiseaseLevel('${d.id}', ${i})">
                        <span>${l}</span>
                        <small>${i === 0 ? '0%' : (i === 1 ? '5%' : (i === 2 ? '15%' : '25%'))}</small>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function setDiseaseLevel(id, lvl) {
    APP_STATE.monitoring.diseases[id] = lvl;
    renderView('monitor_diseases');
}

function renderMonitorWeeds() {
    return `
        <div class="monitor-steps">
            <div class="step-item" onclick="renderView('monitor_header')">📁</div>
            <div class="step-item" onclick="renderView('monitor_pests')">🕷️</div>
            <div class="step-item" onclick="renderView('monitor_diseases')">🦠</div>
            <div class="step-item active">🌿</div>
        </div>
        ${WEED_DB.map(w => renderWeedCard(w)).join('')}
        <div style="height: 100px;"></div>
        <div class="sticky-footer" style="position:fixed; bottom: 80px; left: 1rem; right: 1rem;">
            <button class="btn btn-primary" style="width:100%" onclick="renderView('monitor_growth')">CONTINUAR <i data-lucide="arrow-right"></i></button>
        </div>
    `;
}

function renderWeedCard(w) {
    const level = APP_STATE.monitoring.weeds[w.id] || 0;
    return `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="weed-icon-badge" onclick="showThreshold('${w.id}')">${w.icon}</div>
                    <span style="font-weight: 800;">${w.name}</span>
                </div>
                <div class="threshold-indicator">
                    <div class="threshold-dot green ${level > 0 ? 'active' : ''}"></div>
                    <div class="threshold-dot yellow ${level > 1 ? 'active' : ''}"></div>
                    <div class="threshold-dot red ${level > 2 ? 'active' : ''}"></div>
                </div>
            </div>
            <div class="level-selector-premium">
                ${['N', 'B', 'M', 'A'].map((l, i) => `
                    <div class="level-card ${level === i ? 'active' : ''} ${i === 1 ? 'bajo' : (i === 2 ? 'medio' : (i === 3 ? 'alto' : 'nulo'))}" onclick="setWeedLevel('${w.id}', ${i})">
                        <span>${l}</span>
                        <small>${i === 0 ? '0%' : (i === 1 ? '20%' : (i === 2 ? '40%' : '50%'))}</small>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function setWeedLevel(id, lvl) {
    APP_STATE.monitoring.weeds[id] = lvl;
    renderView('monitor_weeds');
}

function renderMonitorGrowth() {
    const g = APP_STATE.monitoring.growth;
    return `
        <div class="view-header"><h2>Fenología</h2></div>
        <div class="card">
            <div class="field-group">
                <label>Estado Fenológico</label>
                <select id="mon-fen" class="input-modern">
                    <option ${g.fenologia === 'Vegetativo' ? 'selected' : ''}>Vegetativo</option>
                    <option ${g.fenologia === 'Floración' ? 'selected' : ''}>Floración</option>
                    <option ${g.fenologia === 'Llenado de grano' ? 'selected' : ''}>Llenado de grano</option>
                    <option ${g.fenologia === 'Cosecha' ? 'selected' : ''}>Cosecha</option>
                </select>
            </div>
            <div class="field-group">
                <label>Nudos totales promedio</label>
                <input type="number" id="mon-nud" class="input-modern" placeholder="Ej: 12" value="${g.nudos || ''}">
            </div>
            <button class="btn btn-primary" style="width:100%" onclick="saveFin()">FINALIZAR MONITOREO</button>
        </div>
    `;
}

function saveFin() {
    const records = JSON.parse(localStorage.getItem('abc_monitoring_records') || '[]');
    const currentGrowth = { 
        fen: document.getElementById('mon-fen').value, 
        nud: document.getElementById('mon-nud').value 
    };

    if (APP_STATE.editingRecordIdx !== null) {
        // EDICIÓN
        const idx = APP_STATE.editingRecordIdx;
        records[idx].h = APP_STATE.monitoring.header;
        records[idx].p = APP_STATE.monitoring.pests;
        records[idx].d = APP_STATE.monitoring.diseases;
        records[idx].w = APP_STATE.monitoring.weeds;
        records[idx].g = currentGrowth;
        records[idx].editedAt = new Date().toISOString();
        records[idx].synced = false;
        localStorage.setItem('abc_monitoring_records', JSON.stringify(records));
        alert("✓ Registro actualizado");
    } else {
        // NUEVO
        let counter = parseInt(localStorage.getItem('abc_record_counter') || '0') + 1;
        localStorage.setItem('abc_record_counter', counter.toString());
        
        const r = {
            id: Date.now().toString(),
            num: counter,
            h: APP_STATE.monitoring.header,
            p: APP_STATE.monitoring.pests,
            d: APP_STATE.monitoring.diseases,
            w: APP_STATE.monitoring.weeds || {},
            g: currentGrowth,
            t: new Date().toISOString(),
            coords: APP_STATE.monitoring.coords,
            synced: false
        };
        records.push(r);
        localStorage.setItem('abc_monitoring_records', JSON.stringify(records));
        alert(`✓ Registro #${counter} guardado`);
    }

    APP_STATE.editingRecordIdx = null;
    renderView('records');
}

// --- Admin Section ---
function renderAdmin() {
    const counts = {
        ciclos: APP_STATE.collections.ciclos.length,
        fincas: APP_STATE.collections.fincas.length,
        lotes: APP_STATE.collections.lotes.length
    };
    
    return `
        <div class="admin-header-row">
            <div class="admin-title-wrap">
                <i data-lucide="settings" style="color: var(--accent-blue)"></i>
                <h2 style="margin:0; font-size: 1.5rem; font-weight: 800;">Administración</h2>
            </div>
            <button class="btn btn-secondary btn-small" onclick="renderView('dashboard')">
                <i data-lucide="arrow-left"></i> VOLVER
            </button>
        </div>

        <div class="admin-grid">
            <div class="admin-card-btn celeste" onclick="renderView('admin_ciclos')">
                <div class="admin-card-icon"><i data-lucide="refresh-cw"></i></div>
                <div class="admin-card-content">
                    <span class="admin-card-title">Ciclos Agrícolas</span>
                    <span class="admin-card-subtitle">${counts.ciclos} Registrados</span>
                </div>
            </div>

            <div class="admin-card-btn green" onclick="renderView('admin_fincas')">
                <div class="admin-card-icon"><i data-lucide="home"></i></div>
                <div class="admin-card-content">
                    <span class="admin-card-title">Fincas</span>
                    <span class="admin-card-subtitle">${counts.fincas} Registradas</span>
                </div>
            </div>

            <div class="admin-card-btn blue" onclick="renderView('admin_lotes')">
                <div class="admin-card-icon"><i data-lucide="map-pin"></i></div>
                <div class="admin-card-content">
                    <span class="admin-card-title">Lotes/Parcelas</span>
                    <span class="admin-card-subtitle">${counts.lotes} Registrados</span>
                </div>
            </div>

            <div class="admin-card-btn red" onclick="confirmDeleteSynced()">
                <div class="admin-card-icon"><i data-lucide="trash-2"></i></div>
                <div class="admin-card-content">
                    <span class="admin-card-title">Limpieza de datos</span>
                    <span class="admin-card-subtitle">Borrar registros sincronizados</span>
                </div>
            </div>

            <div class="admin-card-btn yellow" style="cursor: default;">
                <div class="admin-card-icon"><i data-lucide="user"></i></div>
                <div class="admin-card-content">
                    <span class="admin-card-title">${APP_STATE.user.name}</span>
                    <span class="admin-card-subtitle">${APP_STATE.user.email}</span>
                   <button class="btn btn-secondary btn-small" style="margin-top: 0.75rem; width: 100%; background: rgba(255,255,255,0.1) !important;" onclick="changeUser()">CAMBIAR USUARIO</button>
                </div>
            </div>
        </div>
    `;
}

function renderAdminCiclos() {
    return `
        <div class="view-header">
            <h2>Ciclos Agrícolas</h2>
            <button class="btn btn-secondary btn-small" onclick="renderView('admin')">Volver</button>
        </div>
        <div class="card">
            <input type="text" id="cy-name" class="input-modern" placeholder="Ej: Cosecha 2024-2025">
            <button class="btn btn-primary" style="width:100%; margin-top:1rem" onclick="addCiclo()">AÑADIR CICLO</button>
        </div>
        <div class="list-container">
            ${APP_STATE.collections.ciclos.map(c => `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${c.nombre}</span>
                    <button class="btn-icon-only delete" onclick="deleteItem('ciclos', '${c.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            `).join('')}
        </div>
    `;
}

function addCiclo() {
    const n = document.getElementById('cy-name').value;
    if (!n) return;
    APP_STATE.collections.ciclos.push({ id: Date.now().toString(), nombre: n });
    localStorage.setItem('abc_ciclos', JSON.stringify(APP_STATE.collections.ciclos));
    renderView('admin_ciclos');
}

function renderAdminFincas() {
    return `
        <div class="view-header"><h2>Fincas</h2><button class="btn btn-secondary btn-small" onclick="renderView('admin')">Volver</button></div>
        <div class="card">
            <input type="text" id="fn-name" class="input-modern" placeholder="Nombre de Finca">
            <button class="btn btn-primary" style="width:100%; margin-top:1rem" onclick="addFin()">AÑADIR FINCA</button>
        </div>
        <div class="list-container">
            ${APP_STATE.collections.fincas.map(f => `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${f.nombre}</span>
                    <button class="btn-icon-only delete" onclick="deleteItem('fincas', '${f.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            `).join('')}
        </div>
    `;
}

function addFin() {
    const n = document.getElementById('fn-name').value;
    if (!n) return;
    APP_STATE.collections.fincas.push({ id: Date.now().toString(), nombre: n });
    localStorage.setItem('abc_fincas', JSON.stringify(APP_STATE.collections.fincas));
    renderView('admin_fincas');
}

function renderAdminLotes() {
    return `
        <div class="view-header"><h2>Lotes</h2><button class="btn btn-secondary btn-small" onclick="renderView('admin')">Volver</button></div>
        <div class="card">
            <select id="lt-fin" class="input-modern">
                ${APP_STATE.collections.fincas.map(f => `<option value="${f.id}">${f.nombre}</option>`).join('')}
            </select>
            <input type="text" id="lt-name" class="input-modern" placeholder="Nombre de Lote" style="margin-top:1rem">
            <button class="btn btn-primary" style="width:100%; margin-top:1rem" onclick="addLot()">AÑADIR LOTE</button>
        </div>
        <div class="list-container">
            ${APP_STATE.collections.lotes.map(l => `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${l.nombre}</span>
                    <button class="btn-icon-only delete" onclick="deleteItem('lotes', '${l.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            `).join('')}
        </div>
    `;
}

function addLot() {
    const f = document.getElementById('lt-fin').value;
    const n = document.getElementById('lt-name').value;
    if (!f || !n) return;
    APP_STATE.collections.lotes.push({ id: Date.now().toString(), nombre: n, fincaId: f });
    localStorage.setItem('abc_lotes', JSON.stringify(APP_STATE.collections.lotes));
    renderView('admin_lotes');
}

function deleteItem(coll, id) {
    if (!confirm('¿Eliminar item?')) return;
    APP_STATE.collections[coll] = APP_STATE.collections[coll].filter(i => i.id !== id);
    localStorage.setItem('abc_' + coll, JSON.stringify(APP_STATE.collections[coll]));
    renderView('admin_' + coll);
}

function confirmDeleteSynced() {
    const records = JSON.parse(localStorage.getItem('abc_monitoring_records') || '[]');
    const synced = records.filter(r => r.synced).length;
    if (synced === 0) {
        alert("No hay registros sincronizados para borrar.");
        return;
    }
    if (confirm(`¿Borrar permanentemente ${synced} registros sincronizados?`)) {
        const remaining = records.filter(r => !r.synced);
        localStorage.setItem('abc_monitoring_records', JSON.stringify(remaining));
        alert("✓ Registros borrados.");
        renderView('admin');
    }
}

// --- Historical Records ---
function renderRecords() {
    const records = JSON.parse(localStorage.getItem('abc_monitoring_records') || '[]');
    const pending = records.filter(r => !r.synced).length;
    
    return `
        <div class="view-header">
            <h2>Historial</h2>
            <div style="font-size:0.75rem; opacity:0.6;">${records.length} TOTAL</div>
        </div>

        ${pending > 0 ? `
            <div class="card pending-summary-card">
                <p>Tienes <span class="neon-text">${pending}</span> registros pendientes</p>
                <button class="btn btn-primary btn-small" style="width:100%; margin-top:1rem;" onclick="syncData()">
                    <i data-lucide="cloud-upload"></i> SINCRONIZAR TODO
                </button>
            </div>
        ` : ''}

        ${records.slice().reverse().map((r, i) => {
            const originalIdx = records.length - 1 - i;
            const date = new Date(r.t);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const getChip = (label, val, icon) => {
                const names = ["N", "B", "M", "A"];
                const cats = ["nulo", "low", "medium", "high"];
                return `<div class="chip ${cats[val]}">${icon} ${label}: ${names[val]}</div>`;
            };

            const pestsChips = Object.entries(r.p || {}).filter(([,v])=>v>0)
                .map(([id,v]) => getChip(PEST_DB.find(p=>p.id===id)?.name || id, v, "🕷️")).join('');
            
            const diseaseChips = Object.entries(r.d || {}).filter(([,v])=>v>0)
                .map(([id,v]) => getChip(DISEASE_DB.find(d=>d.id===id)?.name || id, v, "🦠")).join('');
                
            const weedsChips = Object.entries(r.w || {}).filter(([,v])=>v>0)
                .map(([id,v]) => getChip(WEED_DB.find(w=>w.id===id)?.name || id, v, "🌿")).join('');

            return `
                <div class="card record-card ${r.synced ? 'synced' : 'pending'}">
                    <div class="record-header">
                        <div class="record-info">
                            <div class="record-icon-wrap"><i data-lucide="map-pin"></i></div>
                            <div class="record-text">
                                <div class="record-title">#${r.num || '?'} ${r.h.lote}</div>
                                <div class="record-meta"><i data-lucide="calendar"></i> ${dateStr} • ${timeStr}</div>
                            </div>
                        </div>
                        <div class="record-status-badge ${r.synced ? 'synced' : 'pending'}">${r.synced ? 'SINC' : 'PEND'}</div>
                    </div>

                    <div class="record-grid">
                        <div class="grid-item"><strong>Finca:</strong> ${r.h.finca}</div>
                        <div class="grid-item"><strong>Var:</strong> ${r.h.variedad}</div>
                        <div class="grid-item"><strong>Plaguero:</strong> ${r.h.plaguero}</div>
                        <div class="grid-item"><strong>Fen:</strong> ${r.g.fen}</div>
                    </div>

                    ${pestsChips || diseaseChips || weedsChips ? `
                        <div class="record-details">
                            ${pestsChips ? `<div class="record-detail-section"><div class="record-detail-chips">${pestsChips}</div></div>` : ''}
                            ${diseaseChips ? `<div class="record-detail-section"><div class="record-detail-chips">${diseaseChips}</div></div>` : ''}
                            ${weedsChips ? `<div class="record-detail-section"><div class="record-detail-chips">${weedsChips}</div></div>` : ''}
                        </div>
                    ` : ''}

                    <div class="record-actions">
                        ${!r.synced ? `<button class="btn btn-secondary btn-small" onclick="editRecord(${originalIdx})"><i data-lucide="edit-3"></i> EDITAR</button>` : ''}
                        <button class="btn btn-secondary btn-small delete-btn" onclick="deleteRecord(${originalIdx})" style="color:#ef4444; border-color:rgba(239,68,68,0.2);">
                            <i data-lucide="trash-2"></i> ELIMINAR
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<p style="text-align:center; opacity:0.6">No hay registros aún.</p>'}
    `;
}

function deleteRecord(idx) {
    if (!confirm('¿Eliminar este registro local?')) return;
    const records = JSON.parse(localStorage.getItem('abc_monitoring_records') || '[]');
    records.splice(idx, 1);
    localStorage.setItem('abc_monitoring_records', JSON.stringify(records));
    renderView('records');
}

function editRecord(idx) {
    const records = JSON.parse(localStorage.getItem('abc_monitoring_records') || '[]');
    const r = records[idx];
    if (!r) return;
    APP_STATE.editingRecordIdx = idx;
    APP_STATE.monitoring.header = r.h;
    APP_STATE.monitoring.pests = r.p;
    APP_STATE.monitoring.diseases = r.d;
    APP_STATE.monitoring.weeds = r.w || {};
    APP_STATE.monitoring.growth = { fenologia: r.g.fen, nudos: r.g.nud };
    APP_STATE.monitoring.coords = r.coords;
    renderView('monitor_header');
}

// --- Threshold Modal Logic ---
function showThreshold(id) {
    const data = THRESHOLDS_DATA[id];
    if (!data) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'threshold-modal-overlay';
    overlay.innerHTML = `
        <div class="threshold-modal-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem">
                <h3 style="margin:0">Guía: ${data.name}</h3>
                <button onclick="this.closest('.threshold-modal-overlay').remove()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer">×</button>
            </div>
            <table class="threshold-table">
                <thead><tr><th>Variable/Condición</th><th>Bajo</th><th>Medio</th><th>Alto</th></tr></thead>
                <tbody>
                    ${data.rows.map(r => `<tr><td>${r.cond}</td><td style="color:#52b788">${r.n1}</td><td style="color:#f59e0b">${r.n2}</td><td style="color:#ef4444">${r.n3}</td></tr>`).join('')}
                </tbody>
            </table>
            <button class="btn btn-primary" style="width:100%; margin-top:1.5rem" onclick="this.closest('.threshold-modal-overlay').remove()">ENTENDIDO</button>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function syncData() {
    const records = JSON.parse(localStorage.getItem('abc_monitoring_records') || '[]');
    const toSync = records.filter(r => !r.synced);
    if (toSync.length === 0) {
        alert("No hay registros pendientes.");
        return;
    }
    alert("✓ Enviando datos al servidor...");
    setTimeout(() => {
        toSync.forEach(r => r.synced = true);
        localStorage.setItem('abc_monitoring_records', JSON.stringify(records));
        alert("✓ Registros sincronizados correctamente.");
        renderView('dashboard');
    }, 1500);
}

function installPWA() {
    if (!APP_STATE.deferredPrompt) return;
    APP_STATE.deferredPrompt.prompt();
    APP_STATE.deferredPrompt.userChoice.then(() => APP_STATE.deferredPrompt = null);
}
