const nomeArea = document.querySelector('#nome-area');
const statusArea = document.querySelector('#status-area');
const atividadesContainer = document.querySelector('#atividades-container');
const registrosFiltrados = document.querySelectorAll('.filtros select');
const ordenacaoAtividades = document.querySelector('#ordenacao-atividades');

let atividades = [];

const camposFiltro = {

    'filtro-atividade': ['atividade'],
    'filtro-aspecto': ['aspecto'],
    'filtro-impacto': ['impacto'],
    'filtro-significancia': ['significancia', 'significância', 'significancia inicial', 'significância inicial']
};

const aliasesCampos = {
    area: ['area', 'área'],
    atividade: ['atividade'],
    aspecto: ['aspecto'],
    impacto: ['impacto'],
    significancia: ['significancia', 'significância', 'significancia inicial', 'significância inicial'],
    frequencia: ['frequencia', 'frequência'],
    severidade: ['severidade'],
    probabilidade: ['probabilidade'],
    rankingInicial: ['ranking inicial', 'ranking_inicial', 'rankingInicial'],
    significanciaInicial: ['significancia inicial', 'significância inicial', 'significancia', 'significância'],
    prevencao: ['prevencao', 'prevenção'],
    monitoramento: ['monitoramento'],
    mitigacao: ['mitigacao', 'mitigação'],
    frequenciaResidual: ['frequencia residual', 'frequência residual'],
    severidadeResidual: ['severidade residual'],
    probabilidadeResidual: ['probabilidade residual'],
    rankingFinal: ['ranking final', 'ranking_final', 'rankingFinal'],
    objetivosMetasProgramas: ['objetivos metas e programas', 'objetivosMetasProgramas', 'objetivos', 'metas', 'programas']
};

function normalizarChave(valor) {
    return String(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function obterValor(registro, nomes) {
    const chaves = Object.keys(registro);
    const chaveEncontrada = chaves.find(chave =>
        nomes.some(nome => normalizarChave(nome) === normalizarChave(chave))
    );

    return chaveEncontrada ? registro[chaveEncontrada] : '';
}

function textoValor(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return 'Não informado';
    }

    if (Array.isArray(valor)) {
        return valor.join(', ');
    }

    if (typeof valor === 'object') {
        return Object.values(valor).join(', ');
    }

    return String(valor);
}

function valorCampo(registro, campo) {
    return obterValor(registro, aliasesCampos[campo]);
}

function valorParaFiltro(registro, nomes) {
    if (nomes.length > 1 && nomes.includes('prevencao')) {
        return [
            valorCampo(registro, 'prevencao'),
            valorCampo(registro, 'monitoramento'),
            valorCampo(registro, 'mitigacao')
        ].map(textoValor).join(' | ');
    }

    return textoValor(obterValor(registro, nomes));
}

function valoresDisponiveisParaFiltro(nomes) {
    if (nomes.length > 1 && nomes.includes('prevencao')) {
        return atividades.flatMap(registro => [
            textoValor(valorCampo(registro, 'prevencao')),
            textoValor(valorCampo(registro, 'monitoramento')),
            textoValor(valorCampo(registro, 'mitigacao'))
        ]);
    }

    return atividades.map(registro => valorParaFiltro(registro, nomes));
}

function criarOpcoesFiltros() {
    Object.entries(camposFiltro).forEach(([id, nomes]) => {
        const select = document.querySelector(`#${id}`);
        const valores = [...new Set(valoresDisponiveisParaFiltro(nomes))]
            .filter(valor => valor !== 'Não informado')
            .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

        valores.forEach(valor => {
            const opcao = document.createElement('option');
            opcao.value = valor;
            opcao.textContent = valor;
            select.appendChild(opcao);
        });
    });
}

function criarCampo(titulo, valor, classe = '') {
    const item = document.createElement('div');
    item.className = `detalhe-item ${classe}`.trim();

    const rotulo = document.createElement('dt');
    rotulo.textContent = titulo;
    const conteudo = document.createElement('dd');
    conteudo.textContent = textoValor(valor);

    item.append(rotulo, conteudo);
    return item;
}

function criarGrupo(titulo, campos, registro) {
    const grupo = document.createElement('section');
    grupo.className = 'detalhe-grupo';

    const subtitulo = document.createElement('h3');
    subtitulo.textContent = titulo;
    const lista = document.createElement('dl');
    lista.className = 'detalhes-lista';

    campos.forEach(([rotulo, campo, classe]) => lista.appendChild(criarCampo(rotulo, valorCampo(registro, campo), classe)));
    grupo.append(subtitulo, lista);
    return grupo;
}

function criarCard(registro) {
    const card = document.createElement('article');
    card.className = 'atividade-card';
    card.id = `atividade-${atividades.indexOf(registro)}`;
    card.dataset.atividade = textoValor(valorCampo(registro, 'atividade'));

    const titulo = document.createElement('h2');
    titulo.textContent = textoValor(valorCampo(registro, 'atividade'));
    card.appendChild(titulo);

    const badge = document.createElement('span');
    badge.className = 'badge-significancia';
    badge.textContent = textoValor(valorCampo(registro, 'significanciaInicial'));
    card.appendChild(badge);

    card.appendChild(criarGrupo('Identificação', [
        ['Área', 'area'],
        ['Atividade', 'atividade'],
        ['Aspecto', 'aspecto'],
        ['Impacto', 'impacto']
    ], registro));
    card.appendChild(criarGrupo('Risco Inicial', [
        ['Frequência', 'frequencia'],
        ['Severidade', 'severidade'],
        ['Probabilidade', 'probabilidade'],
        ['Ranking Inicial', 'rankingInicial', 'ranking-destaque'],
        ['Significância Inicial', 'significanciaInicial']
    ], registro));
    card.appendChild(criarGrupo('Controles', [
        ['Prevenção', 'prevencao'],
        ['Monitoramento', 'monitoramento'],
        ['Mitigação', 'mitigacao']
    ], registro));
    card.appendChild(criarGrupo('Risco Residual', [
        ['Frequência Residual', 'frequenciaResidual'],
        ['Severidade Residual', 'severidadeResidual'],
        ['Probabilidade Residual', 'probabilidadeResidual'],
        ['Ranking Final', 'rankingFinal', 'ranking-destaque']
    ], registro));
    card.appendChild(criarGrupo('Objetivos, Metas e Programas', [
        ['Objetivos, Metas e Programas', 'objetivosMetasProgramas']
    ], registro));

    aplicarCorSignificancia(card, valorCampo(registro, 'significanciaInicial'));
    return card;
}

function aplicarCorSignificancia(card, significancia) {
    const valor = textoValor(significancia).toLocaleLowerCase('pt-BR');
    if (valor.includes('insignificante')) {
        card.classList.add('significancia-verde');
        card.querySelector('.badge-significancia').classList.add('badge-verde');
    } else if (valor.includes('muito alto')) {
        card.classList.add('significancia-vermelha');
        card.querySelector('.badge-significancia').classList.add('badge-vermelha');
    } else if (valor.includes('alto risco')) {
        card.classList.add('significancia-amarela');
        card.querySelector('.badge-significancia').classList.add('badge-amarela');
    }
}

function renderizarAtividades() {
    const filtros = [...registrosFiltrados].reduce((resultado, select) => {
        resultado[select.id] = select.value.toLocaleLowerCase('pt-BR');
        return resultado;
    }, {});

    const resultado = atividades.filter(registro =>
        Object.entries(camposFiltro).every(([id, nomes]) => {
            const filtro = filtros[id];
            if (!filtro) return true;
            return valorParaFiltro(registro, nomes).toLocaleLowerCase('pt-BR') === filtro;
        })
    );

    const direcao = ordenacaoAtividades.value === 'za' ? -1 : 1;
    resultado.sort((a, b) =>
        textoValor(valorCampo(a, 'atividade')).localeCompare(
            textoValor(valorCampo(b, 'atividade')), 'pt-BR', { sensitivity: 'base' }
        ) * direcao
    );

    atividadesContainer.innerHTML = '';
    resultado.forEach(registro => atividadesContainer.appendChild(criarCard(registro)));
    statusArea.textContent = `${resultado.length} atividade(s) encontrada(s).`;

    const atividadeAlvo = new URLSearchParams(window.location.search).get('atividade');
    const hash = window.location.hash;
    const cardAlvo = atividadeAlvo
        ? [...document.querySelectorAll('.atividade-card')].find(card => card.dataset.atividade === atividadeAlvo)
        : hash ? document.querySelector(hash) : null;
    if (cardAlvo) {
        cardAlvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function carregarDetalhes() {
    const nomeRecebido = new URLSearchParams(window.location.search).get('nome')?.trim();

    if (!nomeRecebido) {
        nomeArea.textContent = 'Área não informada';
        statusArea.textContent = 'Use um link de área válido para consultar os detalhes.';
        return;
    }

    nomeArea.textContent = nomeRecebido;

    try {
        const dados = await ExcelService.carregarDados();
        atividades = dados.filter(registro =>
            textoValor(valorCampo(registro, 'area')).trim() === nomeRecebido
        );

        criarOpcoesFiltros();
        renderizarAtividades();
    } catch (erro) {
        console.error(erro);
        statusArea.textContent = 'Não foi possível carregar o arquivo LAIA.xlsx. Verifique se ele está na pasta dados.';
    }
}

registrosFiltrados.forEach(select => select.addEventListener('change', renderizarAtividades));
ordenacaoAtividades.addEventListener('change', renderizarAtividades);
carregarDetalhes();