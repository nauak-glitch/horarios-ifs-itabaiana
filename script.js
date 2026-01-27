// ==========================================================
// CONFIGURAÇÃO
// ==========================================================
// Substitua pela URL gerada no Google Apps Script (Executável)
const URL_DA_API = "https://script.google.com/macros/s/AKfycbycRSW8--vZv-CiEqPQQ3VeLrCXpG3IuYCLm2BUN6s2DnKTMcj4_AU7sIqKvTaoiDhb/exec"; 

// Estrutura de Horários Fixa (Baseado no PDF)
const HORARIOS = [
    { label: "07:30 - 08:20", id: "07:30" },
    { label: "08:20 - 09:10", id: "08:20" },
    { label: "09:10 - 10:00", id: "09:10" },
    { label: "10:10 - 11:00", id: "10:10" },
    { label: "11:00 - 11:50", id: "11:00" },
    { label: "ALMOÇO", id: " almoco", type: "break" }, // Intervalo
    { label: "13:00 - 13:50", id: "13:00" },
    { label: "13:50 - 14:40", id: "13:50" },
    { label: "14:40 - 15:30", id: "14:40" },
    { label: "15:40 - 16:30", id: "15:40" },
    { label: "16:30 - 17:20", id: "16:30" },
    { label: "JANTAR", id: "jantar", type: "break" }, // Intervalo
    { label: "18:50 - 19:40", id: "18:50" },
    { label: "19:40 - 20:30", id: "19:40" },
    { label: "20:40 - 21:30", id: "20:40" },
    { label: "21:30 - 22:20", id: "21:30" }
];

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

// Estado da Aplicação
let dadosGlobais = [];
let salaAtual = null;
let isAdmin = false;
let senhaAdminCache = "";
let dadosEdicaoAtual = {};

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarTema();
    inicializarApp();
    
    // Listeners
    document.getElementById("themeToggle").addEventListener("click", alternarTema);
    document.getElementById("btnAdmin").addEventListener("click", () => document.getElementById("modal-login").classList.remove("hidden"));
});

async function inicializarApp() {
    mostrarLoading(true);
    
    try {
        // Tenta pegar do cache primeiro para ser rápido
        const cache = localStorage.getItem("ifs_horarios_cache");
        if (cache) {
            dadosGlobais = JSON.parse(cache);
        }

        // Fetch dados atualizados do Google Sheets
        await atualizarDados();

        // Roteamento via URL
        const params = new URLSearchParams(window.location.search);
        const salaParam = params.get("sala");

        if (salaParam) {
            abrirSala(decodeURIComponent(salaParam));
        } else {
            renderizarHome();
        }

    } catch (error) {
        console.error("Erro ao carregar:", error);
        alert("Erro ao conectar com o servidor. Verifique sua internet.");
    } finally {
        mostrarLoading(false);
    }
}

async function atualizarDados() {
    try {
        const response = await fetch(URL_DA_API);
        const json = await response.json();
        
        if (json.status === "success") {
            dadosGlobais = json.data;
            localStorage.setItem("ifs_horarios_cache", JSON.stringify(dadosGlobais));
        }
    } catch (e) {
        console.warn("Falha ao buscar dados frescos, usando cache se existir.");
    }
}

// ==========================================================
// RENDERIZAÇÃO
// ==========================================================

function renderizarHome() {
    document.getElementById("view-home").classList.remove("hidden");
    document.getElementById("view-grade").classList.add("hidden");
    history.pushState(null, "", window.location.pathname); // Limpa URL

    const container = document.getElementById("lista-salas");
    container.innerHTML = "";

    // Extrair salas únicas
    const salas = [...new Set(dadosGlobais.map(item => item.Sala))].sort();

    if (salas.length === 0) {
        document.getElementById("msg-vazio").classList.remove("hidden");
        return;
    }

    salas.forEach(sala => {
        const btn = document.createElement("div");
        btn.className = "bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-ifs-green flex flex-col items-center justify-center text-center group";
        btn.onclick = () => abrirSala(sala);
        btn.innerHTML = `
            <i class="fa-solid fa-chalkboard-user text-3xl mb-3 text-gray-400 group-hover:text-ifs-green transition"></i>
            <h3 class="font-bold text-lg dark:text-white">${sala}</h3>
            <p class="text-xs text-gray-500 mt-1">Ver horários</p>
        `;
        container.appendChild(btn);
    });
}

function abrirSala(sala) {
    salaAtual = sala;
    document.getElementById("view-home").classList.add("hidden");
    document.getElementById("view-grade").classList.remove("hidden");
    document.getElementById("titulo-sala").innerText = sala;
    
    // Atualiza URL sem recarregar
    const novaURL = `${window.location.pathname}?sala=${encodeURIComponent(sala)}`;
    history.pushState(null, "", novaURL);

    const tbody = document.getElementById("corpo-tabela");
    tbody.innerHTML = "";

    HORARIOS.forEach(horarioObj => {
        const tr = document.createElement("tr");
        
        // Verifica se é intervalo
        if (horarioObj.type === "break") {
            tr.className = "bg-gray-100 dark:bg-gray-700";
            tr.innerHTML = `<td colspan="7" class="px-4 py-2 text-center font-bold text-xs uppercase text-gray-500 dark:text-gray-300 tracking-wider">${horarioObj.label}</td>`;
            tbody.appendChild(tr);
            return;
        }

        tr.className = "border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition";
        
        // Coluna Horário
        const tdHorario = document.createElement("td");
        tdHorario.className = "px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap bg-gray-50 dark:bg-gray-800";
        tdHorario.innerText = horarioObj.label;
        tr.appendChild(tdHorario);

        // Colunas Dias
        DIAS.forEach(dia => {
            const td = document.createElement("td");
            td.className = "px-4 py-3 border-l border-gray-100 dark:border-gray-700 relative group min-h-[60px]";
            
            // Buscar dados para esta célula
            const aula = dadosGlobais.find(d => 
                d.Sala === salaAtual && 
                d.Dia === dia && 
                d.Horario_Inicio === horarioObj.id
            );

            if (aula) {
                td.innerHTML = `
                    <div class="flex flex-col gap-1">
                        <span class="font-bold text-ifs-green text-sm leading-tight">${aula.Disciplina}</span>
                        <span class="text-xs text-gray-600 dark:text-gray-300"><i class="fa-solid fa-user-tie mr-1"></i>${aula.Professor}</span>
                        <span class="text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-1 rounded w-fit">${aula.Turma}</span>
                    </div>
                `;
            } else {
                td.innerHTML = `<span class="text-gray-300 text-xs select-none">-</span>`;
            }

            // Ação de Edição (Só Admin)
            td.onclick = () => {
                if (isAdmin) abrirModalEdicao(dia, horarioObj.id, aula);
            };

            // Indicador visual de editável
            if (isAdmin) {
                td.classList.add("cursor-pointer", "hover:bg-green-50", "dark:hover:bg-green-900/20");
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function voltarHome() {
    renderizarHome();
}

// ==========================================================
// ADMINISTRAÇÃO E EDIÇÃO
// ==========================================================

function logarAdmin() {
    const passInput = document.getElementById("adminPass").value;
    // Validação básica Front, a real acontece no backend
    if (passInput) {
        senhaAdminCache = passInput;
        isAdmin = true;
        document.getElementById("btnAdmin").classList.add("bg-red-500", "border-red-500", "text-white");
        document.getElementById("btnAdmin").innerText = "Sair";
        document.getElementById("btnAdmin").onclick = logoutAdmin; // Muda ação do botão
        
        fecharModal("modal-login");
        
        // Re-renderiza para ativar cliques na tabela
        if (salaAtual) abrirSala(salaAtual);
        
        alert("Modo Edição Ativado. Clique nas células para editar.");
    }
}

function logoutAdmin() {
    isAdmin = false;
    senhaAdminCache = "";
    location.reload();
}

function abrirModalEdicao(dia, horario, dadosAtuais) {
    dadosEdicaoAtual = { dia, horario, sala: salaAtual };
    
    document.getElementById("edit-info").innerText = `${salaAtual} | ${dia} | ${horario}`;
    document.getElementById("input-disciplina").value = dadosAtuais ? dadosAtuais.Disciplina : "";
    document.getElementById("input-professor").value = dadosAtuais ? dadosAtuais.Professor : "";
    document.getElementById("input-turma").value = dadosAtuais ? dadosAtuais.Turma : "";
    
    document.getElementById("modal-editar").classList.remove("hidden");
}

async function salvarAula(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-salvar");
    const spinner = document.getElementById("save-spinner");
    
    // UI Loading
    btn.disabled = true;
    spinner.classList.remove("hidden");

    const payload = {
        action: "update",
        senha: senhaAdminCache,
        sala: dadosEdicaoAtual.sala,
        dia: dadosEdicaoAtual.dia,
        horario: dadosEdicaoAtual.horario,
        disciplina: document.getElementById("input-disciplina").value,
        professor: document.getElementById("input-professor").value,
        turma: document.getElementById("input-turma").value
    };

    try {
        // Envia para o Apps Script (usando no-cors para evitar erro simples, ou POST normal)
        // Nota: Apps Script doPost com fetch requer configuração especial.
        // Vamos usar uma stringify simples.
        
        const response = await fetch(URL_DA_API, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (result.status === "success") {
            // Atualiza localmente para não precisar recarregar tudo
            atualizarCacheLocal(payload);
            fecharModal("modal-editar");
            abrirSala(salaAtual); // Re-renderiza tabela
            alert("Salvo com sucesso!");
        } else {
            alert("Erro: " + result.message);
        }

    } catch (err) {
        console.error(err);
        alert("Erro ao salvar. Verifique a senha ou a conexão.");
    } finally {
        btn.disabled = false;
        spinner.classList.add("hidden");
    }
}

function atualizarCacheLocal(novosDados) {
    // Remove entrada antiga se existir
    dadosGlobais = dadosGlobais.filter(d => 
        !(d.Sala === novosDados.sala && d.Dia === novosDados.dia && d.Horario_Inicio === novosDados.horario)
    );
    
    // Adiciona nova (se não estiver vazia)
    if (novosDados.disciplina) {
        dadosGlobais.push({
            Sala: novosDados.sala,
            Dia: novosDados.dia,
            Horario_Inicio: novosDados.horario,
            Disciplina: novosDados.disciplina,
            Professor: novosDados.professor,
            Turma: novosDados.turma
        });
    }
}

// ==========================================================
// UTILITÁRIOS
// ==========================================================

function mostrarLoading(show) {
    const el = document.getElementById("loading");
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
}

function fecharModal(id) {
    document.getElementById(id).classList.add("hidden");
}

function alternarTema() {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
        html.classList.remove("dark");
        localStorage.setItem("theme", "light");
    } else {
        html.classList.add("dark");
        localStorage.setItem("theme", "dark");
    }
}

function carregarTema() {
    const theme = localStorage.getItem("theme");
    if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.documentElement.classList.add("dark");
    }

}
