// CONFIGURAÇÕES GERAIS
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxG3Myj-1iTFMGpGRMKsefVwixwxZ3K0a70OtFyNMarXvEwMdfnj9hvGUEU0gfDI9G7/exec";
const WHATSAPP_RESPONSAVEL = "55859996475654";
const PIX_INFO = "xxxxxx";
const SENHA_ADMIN = "vozao1914";

// ESTADO DA APLICAÇÃO
let modoAdmin = false;
let reservasGlobais = {};
let horarioSelecionado = null;

// ELEMENTOS DOM
const seletorData = document.getElementById('data-seletor');
const seletorCampo = document.getElementById('campo-seletor');
const grade = document.getElementById('grade-horarios');
const infoData = document.getElementById('info-data');

// LÓGICA DE HORÁRIOS
const gerarIntervalo = (ini, fim) => Array.from({length: fim-ini+1}, (_, i) => `${(i+ini).toString().padStart(2, '0')}:00`);
const HORARIOS_SEMANA = ["21:00", "22:00", "23:00"];
const HORARIOS_SABADO = gerarIntervalo(11, 22);
const HORARIOS_DOMINGO = gerarIntervalo(7, 22);

// Inicializa com a data de hoje
seletorData.value = new Date().toISOString().split('T')[0];

/**
 * Busca dados da Planilha Google
 */
async function carregarDados() {
    infoData.innerText = "Sincronizando com a Arena...";
    try {
        const response = await fetch(`${URL_PLANILHA}?t=${Date.now()}`);
        reservasGlobais = await response.json();
        infoData.innerText = "Arena Atualizada ✅";
        renderizarGrade();
    } catch (error) {
        console.error("Erro ao carregar:", error);
        infoData.innerText = "Erro ao sincronizar. Verifique a conexão.";
        renderizarGrade();
    }
}

/**
 * Renderiza os cards de horário na tela
 */
function renderizarGrade() {
    const dataStr = seletorData.value;
    const campoStr = seletorCampo.value;
    const dataObj = new Date(dataStr + 'T12:00:00'); 
    const diaSemana = dataObj.getDay();

    grade.innerHTML = "";
    let lista = (diaSemana === 0) ? HORARIOS_DOMINGO : (diaSemana === 6) ? HORARIOS_SABADO : HORARIOS_SEMANA;

    lista.forEach(hora => {
        const chave = `${dataStr}_${hora.replace(':', '-')}_${campoStr}`;
        const reserva = reservasGlobais[chave];

        const card = document.createElement('div');
        card.className = `card ${reserva ? 'ocupado' : 'disponivel'}`;
        
        // Define o botão baseado no status e no modo Admin
        let acaoHTML = "";
        if (reserva) {
            acaoHTML = modoAdmin 
                ? `<button class="btn-acao" style="background:#ff3131; border-color:#ff3131" onclick="excluirReserva('${chave}')">EXCLUIR</button>` 
                : `<button class="btn-acao btn-reservado" disabled>OCUPADO</button>`;
        } else {
            acaoHTML = `<button class="btn-acao" onclick="abrirModal('${hora}')">RESERVAR</button>`;
        }

        card.innerHTML = `
            <div class="card-info">
                <span class="status">${reserva ? 'ATLETA: ' + reserva.nome : campoStr.replace('_',' ')}</span>
                <span class="hora">${hora}</span>
            </div>
            ${acaoHTML}
        `;
        grade.appendChild(card);
    });
}

/**
 * Gerenciamento do Modal
 */
function abrirModal(hora) {
    horarioSelecionado = hora;
    const campoNome = seletorCampo.options[seletorCampo.selectedIndex].text;
    document.getElementById('modal-texto').innerHTML = `Reservar o <b>${campoNome}</b><br>às <b>${hora}</b>?`;
    document.getElementById('modal-reserva').style.display = 'flex';
}

function fecharModal() { 
    document.getElementById('modal-reserva').style.display = 'none'; 
}

/**
 * Processa a reserva, envia para a planilha e abre WhatsApp
 */
async function confirmarAgendamento() {
    const nomeInput = prompt("QUAL O NOME DO RESPONSÁVEL?");
    if (!nomeInput || nomeInput.trim() === "") return;

    const nome = nomeInput.toUpperCase();
    const btnConfirmar = document.querySelector('.btn-confirmar');
    const originalText = btnConfirmar.innerText;

    try {
        // Bloqueia o botão para evitar duplicidade (Melhoria UX)
        btnConfirmar.disabled = true;
        btnConfirmar.innerText = "GERANDO ID E SALVANDO...";

        const dataRaw = seletorData.value;
        const campo = seletorCampo.value;
        const chave = `${dataRaw}_${horarioSelecionado.replace(':', '-')}_${campo}`;

        // Envia para o Google Apps Script
        await fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ 
                action: "SAVE", 
                chave: chave, 
                nome: nome,
                dataRaw: dataRaw, // Enviado para formatar DD/MM/AAAA no back-end
                hora: horarioSelecionado
            })
        });

        // Prepara mensagem do WhatsApp
        const msg = [
            ` *PEDIDO DE RESERVA - ARENA FÁBRICA*`,
            `-----------------------------------`,
            ` *Campo:* ${seletorCampo.options[seletorCampo.selectedIndex].text}`,
            ` *Atleta:* ${nome}`,
            ` *Data:* ${dataRaw.split('-').reverse().join('/')}`,
            ` *Hora:* ${horarioSelecionado}`,
            `-----------------------------------`,
            ` *Valor:* R$ 150 (1h) / R$ 225 (1h30)`,
            ` *PIX:* ${PIX_INFO}`,
            `\Traje permitido: Apenas Brasil ou Ceará._`
        ].join('%0A');

        // Abre WhatsApp e limpa interface
        window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_RESPONSAVEL}&text=${msg}`, '_blank');
        
        fecharModal();
        reservasGlobais[chave] = { nome: nome }; // Atualiza localmente para feedback imediato
        renderizarGrade();
        
        // Atualiza os dados da planilha após 3 segundos
        setTimeout(carregarDados, 3000);

    } catch (error) {
        alert("Erro ao processar reserva. Tente novamente.");
        console.error(error);
    } finally {
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = originalText;
    }
}

/**
 * Exclui uma reserva (Apenas modo Admin)
 */
async function excluirReserva(chave) {
    if (confirm("REMOVER ESTA RESERVA DEFINITIVAMENTE DO SISTEMA?")) {
        try {
            infoData.innerText = "Removendo...";
            await fetch(URL_PLANILHA, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ action: "DELETE", chave: chave })
            });
            delete reservasGlobais[chave];
            renderizarGrade();
            setTimeout(carregarDados, 2000);
        } catch (error) {
            alert("Erro ao excluir.");
        }
    }
}

/**
 * Sistema de Admin (5 Cliques no Logo)
 */
let cliquesAdmin = 0;
document.getElementById('logo-admin').addEventListener('click', () => {
    cliquesAdmin++;
    if (cliquesAdmin === 5) {
        const pass = prompt("SENHA ADMINISTRATIVA:");
        if (pass === SENHA_ADMIN) {
            modoAdmin = true;
            renderizarGrade();
            alert("MODO ADMIN ATIVADO: Agora você pode excluir horários.");
        } else {
            alert("Senha incorreta.");
        }
        cliquesAdmin = 0;
    }
});

// EVENTOS DE MUDANÇA
seletorData.addEventListener('change', renderizarGrade);
seletorCampo.addEventListener('change', renderizarGrade);

// INÍCIO
carregarDados();
