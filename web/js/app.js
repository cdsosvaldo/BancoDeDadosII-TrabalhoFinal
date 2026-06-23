const ICONS = {
    especialidades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/></svg>',
    maes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    medicos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    bebes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>',
};

const ENTITIES = {
    especialidades: {
        label: "Especialidades",
        subtitle: "Áreas de atuação dos médicos",
        pk: "codigo",
        fields: [
            { name: "descricao", label: "Descrição", type: "text" },
        ],
        display: ["codigo", "descricao"],
    },
    maes: {
        label: "Mães",
        subtitle: "Cadastro das mães dos bebês",
        pk: "cpf",
        fields: [
            { name: "cpf", label: "CPF", type: "text" },
            { name: "nome", label: "Nome", type: "text" },
            { name: "endereco", label: "Endereço", type: "text" },
            { name: "telefone", label: "Telefone", type: "text" },
            { name: "data_nascimento", label: "Data de Nascimento", type: "date" },
        ],
        display: ["cpf", "nome", "endereco", "telefone", "data_nascimento"],
    },
    medicos: {
        label: "Médicos",
        subtitle: "Profissionais responsáveis pelos partos",
        pk: "crm",
        fields: [
            { name: "crm", label: "CRM", type: "text" },
            { name: "cpf", label: "CPF", type: "text" },
            { name: "nome", label: "Nome", type: "text" },
            { name: "telefone", label: "Telefone", type: "text" },
            { name: "especialidade_codigo", label: "Especialidade", type: "select", source: "especialidades", optionValue: "codigo", optionLabel: "descricao" },
        ],
        display: ["crm", "cpf", "nome", "telefone", "especialidade_codigo"],
    },
    bebes: {
        label: "Bebês",
        subtitle: "Registro de nascimentos do berçário",
        pk: "registro",
        fields: [
            { name: "nome", label: "Nome", type: "text" },
            { name: "data_nascimento", label: "Data de Nascimento", type: "date" },
            { name: "peso", label: "Peso (kg)", type: "number" },
            { name: "altura", label: "Altura (cm)", type: "number" },
            { name: "mae_cpf", label: "Mãe", type: "select", source: "maes", optionValue: "cpf", optionLabel: "nome" },
            { name: "medico_crm", label: "Médico", type: "select", source: "medicos", optionValue: "crm", optionLabel: "nome" },
        ],
        display: ["registro", "nome", "data_nascimento", "peso", "altura", "mae_cpf", "medico_crm"],
    },
};

const HEADERS = { codigo: "Código", registro: "Registro" };

const navEl = document.getElementById("nav");
const sectionTitle = document.getElementById("section-title");
const sectionSubtitle = document.getElementById("section-subtitle");
const countValue = document.getElementById("count-value");
const fieldsEl = document.getElementById("fields");
const formEl = document.getElementById("form");
const formTitle = document.getElementById("form-title");
const cancelBtn = document.getElementById("cancel-btn");
const theadEl = document.querySelector("#table thead");
const tbodyEl = document.querySelector("#table tbody");
const emptyEl = document.getElementById("empty");
const toastsEl = document.getElementById("toasts");
const modal = document.getElementById("modal");
const modalText = document.getElementById("modal-text");
const modalConfirm = document.getElementById("modal-confirm");
const modalCancel = document.getElementById("modal-cancel");

let current = "especialidades";
let editing = null;
const cache = {};

async function api(path, options) {
    const res = await fetch(path, options);
    if (!res.ok) {
        let message = res.statusText;
        try { message = (await res.json()).detail; } catch (e) {}
        throw new Error(message);
    }
    return res.status === 204 ? null : res.json();
}

async function loadAll() {
    await Promise.all(Object.keys(ENTITIES).map(async name => {
        cache[name] = await api(`/api/${name}`);
    }));
}

function toast(message, type = "success") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    toastsEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

function confirmDialog(text) {
    modalText.textContent = text;
    modal.hidden = false;
    return new Promise(resolve => {
        const finish = value => { modal.hidden = true; resolve(value); };
        modalConfirm.onclick = () => finish(true);
        modalCancel.onclick = () => finish(false);
    });
}

function buildNav() {
    navEl.innerHTML = "";
    for (const [name, cfg] of Object.entries(ENTITIES)) {
        const button = document.createElement("button");
        button.className = "nav-item";
        button.dataset.name = name;
        button.innerHTML = `${ICONS[name]}<span>${cfg.label}</span><span class="nav-count">0</span>`;
        button.onclick = () => selectTab(name);
        navEl.appendChild(button);
    }
}

function updateNavCounts() {
    for (const button of navEl.children) {
        const name = button.dataset.name;
        button.classList.toggle("active", name === current);
        button.querySelector(".nav-count").textContent = (cache[name] || []).length;
    }
}

async function selectTab(name) {
    current = name;
    editing = null;
    await refresh();
}

async function refresh() {
    await loadAll();
    const cfg = ENTITIES[current];
    sectionTitle.textContent = cfg.label;
    sectionSubtitle.textContent = cfg.subtitle;
    countValue.textContent = cache[current].length;
    updateNavCounts();
    renderForm();
    renderTable();
}

function renderForm() {
    const cfg = ENTITIES[current];
    formTitle.textContent = editing ? `Editar ${cfg.label.toLowerCase()}` : `Cadastrar em ${cfg.label.toLowerCase()}`;
    fieldsEl.innerHTML = "";
    for (const field of cfg.fields) {
        const wrapper = document.createElement("label");
        wrapper.textContent = field.label;
        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            input.innerHTML = `<option value="">Selecione...</option>` +
                (cache[field.source] || []).map(r => `<option value="${r[field.optionValue]}">${r[field.optionLabel]}</option>`).join("");
        } else {
            input = document.createElement("input");
            input.type = field.type;
            if (field.type === "number") input.step = "any";
        }
        input.name = field.name;
        if (editing) {
            input.value = editing[field.name] ?? "";
            if (field.name === cfg.pk) input.disabled = true;
        }
        wrapper.appendChild(input);
        fieldsEl.appendChild(wrapper);
    }
    cancelBtn.hidden = !editing;
}

function header(column) {
    const field = ENTITIES[current].fields.find(f => f.name === column);
    return field ? field.label : (HEADERS[column] || column);
}

function cellValue(column, value) {
    const field = ENTITIES[current].fields.find(f => f.name === column);
    if (field && field.type === "select" && cache[field.source]) {
        const ref = cache[field.source].find(r => String(r[field.optionValue]) === String(value));
        if (ref) return ref[field.optionLabel];
    }
    return value ?? "—";
}

function renderTable() {
    const cfg = ENTITIES[current];
    const rows = cache[current];
    emptyEl.hidden = rows.length > 0;
    theadEl.innerHTML = rows.length
        ? "<tr>" + cfg.display.map(c => `<th>${header(c)}</th>`).join("") + "<th></th></tr>"
        : "";
    tbodyEl.innerHTML = rows.map(row => {
        const cells = cfg.display.map(c => `<td>${cellValue(c, row[c])}</td>`).join("");
        return `<tr>${cells}<td><div class="row-actions">
            <button class="icon-btn edit" data-act="edit">Editar</button>
            <button class="icon-btn delete" data-act="del">Excluir</button>
        </div></td></tr>`;
    }).join("");
    [...tbodyEl.querySelectorAll("tr")].forEach((tr, i) => {
        tr.querySelector('[data-act="edit"]').onclick = () => startEdit(rows[i]);
        tr.querySelector('[data-act="del"]').onclick = () => remove(rows[i]);
    });
}

function startEdit(row) {
    editing = row;
    renderForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
    editing = null;
    formEl.reset();
    renderForm();
}

formEl.onsubmit = async event => {
    event.preventDefault();
    const cfg = ENTITIES[current];
    const data = {};
    for (const field of cfg.fields) {
        const value = formEl.elements[field.name].value;
        if (value === "") continue;
        data[field.name] = field.type === "number" ? Number(value) : value;
    }
    try {
        if (editing) {
            delete data[cfg.pk];
            await api(`/api/${current}/${editing[cfg.pk]}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        } else {
            await api(`/api/${current}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        }
        resetForm();
        await refresh();
        toast("Registro salvo com sucesso.");
    } catch (error) {
        toast(error.message, "error");
    }
};

cancelBtn.onclick = resetForm;

async function remove(row) {
    const ok = await confirmDialog("Esta ação não pode ser desfeita. Deseja excluir o registro?");
    if (!ok) return;
    try {
        await api(`/api/${current}/${row[ENTITIES[current].pk]}`, { method: "DELETE" });
        await refresh();
        toast("Registro excluído.");
    } catch (error) {
        toast(error.message, "error");
    }
}

buildNav();
selectTab("especialidades");
