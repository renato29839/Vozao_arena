const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxLmX8w2pyMserEOHwo-R1fnValvvol4OWSGqjnsBmjAwrNvlE_SyaYdrVX2SWQDqz5/exec";
const WHATSAPP_RESPONSAVEL = "5585999585222";
const PIX_INFO = "nfservicos@cearasc.com";
const SENHA_ADMIN = "vozao1914";

let modoAdmin = false;
let reservasGlobais = {};
let horarioSelecionado = null;

const seletorData = document.getElementById('data-seletor');
const seletorCampo = document.getElementById('campo-seletor');
const grade = document.getElementById('grade-horarios');
const infoData = document.getElementById('info-data');

// Horários
const HORARIOS_SEMANA = ["21:00", "22:00", "23:00"];
const gerarIntervalo = (ini, fim) => Array.from({length: fim-ini+1}, (_, i) => `${(i+ini).toString().padStart(2, '0')}:00`);
const HORARIOS_SABADO = gerarIntervalo(11, 22);
const HORARIOS_DOMINGO = gerarIntervalo(7, 22);

const hoje = new Date().toISOString().split('T')[0];
seletorData.value = hoje;

async function carregarDados() {
    try {
        const response = await fetch(`${URL_PLANILHA}?t=${Date.now()}`);
        reservasGlobais = await response.json();
        infoData.innerText = "Arena Sincronizada";
        renderizarGrade();
    } catch (error) {
        infoData.innerText = "Conectando à aba 'dados'...";
        renderizarGrade();
    }
}

function renderizarGrade() {
    const dataStr = seletorData.value;
    const campoStr = seletorCampo.value;
    const dataObj = new Date(dataStr + 'T12:00:00'); 
    const diaSemana = dataObj.getDay();

    grade.innerHTML = "";
    let lista = (diaSemana === 0) ? HORARIOS_DOMINGO : (diaSemana === 6) ? HORARIOS_SABADO : HORARIOS_SEMANA;

    lista.forEach(hora => {
        // Chave única incluindo o campo
        const chave = `${dataStr}_${hora.replace(':', '-')}_${campoStr}`;
        const reserva = reservasGlobais[chave];

        const card = document.createElement('div');
        card.className = `card ${reserva ? 'ocupado' : 'disponivel'}`;
        
        let acaoHTML = reserva ? 
            (modoAdmin ? `<button class="btn-acao" style="background:#ff3131; border-color:#ff3131" onclick="excluirReserva('${chave}')">EXCLUIR</button>` : `<button class="btn-acao btn-reservado" disabled>OCUPADO</button>`) :
            `<button class="btn-acao" onclick="abrirModal('${hora}')">RESERVAR</button>`;

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

function abrirModal(hora) {
    horarioSelecionado = hora;
    const campoNome = seletorCampo.options[seletorCampo.selectedIndex].text;
    document.getElementById('modal-texto').innerHTML = `Reservar o <b>${campoNome}</b><br>às <b>${hora}</b>?`;
    document.getElementById('modal-reserva').style.display = 'flex';
}

function fecharModal() { document.getElementById('modal-reserva').style.display = 'none'; }

async function confirmarAgendamento() {
    const nome = prompt("QUAL O NOME DO RESPONSÁVEL?");
    if (nome && nome.trim() !== "") {
        const data = seletorData.value;
        const campo = seletorCampo.value;
        const chave = `${data}_${horarioSelecionado.replace(':', '-')}_${campo}`;
        
        infoData.innerText = "Enviando reserva...";
        
        fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: "SAVE", chave: chave, nome: nome.toUpperCase() })
        });

        const msg = `Vozão! Reserva Arena Fábrica de Craques.%0A*Campo:* ${campo.replace('_',' ')}%0A*Atleta:* ${nome.toUpperCase()}%0A*Data:* ${data.split('-').reverse().join('/')}%0A*Hora:* ${horarioSelecionado}%0A*Pix:* ${PIX_INFO}`;
        window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_RESPONSAVEL}&text=${msg}`, '_blank');
        
        fecharModal();
        reservasGlobais[chave] = { nome: nome.toUpperCase() };
        renderizarGrade();
        setTimeout(carregarDados, 3000);
    }
}

async function excluirReserva(chave) {
    if (confirm("REMOVER RESERVA DO SISTEMA?")) {
        fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: "DELETE", chave: chave })
        });
        delete reservasGlobais[chave];
        renderizarGrade();
        setTimeout(carregarDados, 2000);
    }
}

// Admin 5 cliques
let cliques = 0;
document.getElementById('logo-admin').addEventListener('click', () => {
    cliques++;
    if (cliques === 5) {
        if (prompt("SENHA ADMIN:") === SENHA_ADMIN) {
            modoAdmin = true;
            renderizarGrade();
        }
        cliques = 0;
    }
});

seletorData.addEventListener('change', renderizarGrade);
seletorCampo.addEventListener('change', renderizarGrade);
carregarDados();