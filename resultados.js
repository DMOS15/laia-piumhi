const resultadosContainer = document.querySelector('#resultados-container');
const statusResultados = document.querySelector('#status-resultados');
const termoBusca = document.querySelector('#termo-busca');

const camposBuscaGlobal = [
    'area', 'atividade', 'aspecto', 'impacto', 'prevencao',
    'monitoramento', 'mitigacao', 'significanciaInicial', 'significanciaFinal', 'objetivosMetasProgramas'
];

function textoResultado(valor) {
    return String(valor ?? '').trim();
}

function normalizarBusca(valor) {
    return textoResultado(valor).toLocaleLowerCase('pt-BR');
}

function numeroRanking(valor) {
    const numero = Number(textoResultado(valor).replace(',', '.').match(/-?\d+(?:\.\d+)?/)?.[0]);
    return Number.isFinite(numero) ? numero : null;
}

function compararRankings(registro) {
    const inicial = numeroRanking(registro.rankingInicial);
    const final = numeroRanking(registro.rankingFinal);
    if (inicial === null || final === null) return { estado: 'indisponivel', icone: '', texto: 'Comparação indisponível.' };
    if (final < inicial) return { estado: 'reduzido', icone: '↓', texto: 'Risco reduzido após aplicação dos controles.' };
    if (final > inicial) return { estado: 'aumentado', icone: '↑', texto: 'Risco aumentou após avaliação residual.' };
    return { estado: 'igual', icone: '=', texto: 'Sem alteração no nível de risco.' };
}

function criarResultado(registro, indice) {
    const link = document.createElement('a');
    link.className = 'resultado-item';
    link.href = `area.html?nome=${encodeURIComponent(textoResultado(registro.area))}&atividade=${encodeURIComponent(textoResultado(registro.atividade))}#atividade-${indice}`;

    const area = document.createElement('strong');
    area.textContent = textoResultado(registro.area);
    const atividade = document.createElement('span');
    atividade.textContent = textoResultado(registro.atividade) || 'Atividade não informada';
    const resumo = document.createElement('span');
    resumo.textContent = `${textoResultado(registro.aspecto) || 'Aspecto não informado'} | ${textoResultado(registro.impacto) || 'Impacto não informado'}`;
    const significancia = document.createElement('span');
    significancia.className = 'resultado-significancia';
    const significanciaInicial = textoResultado(registro.significanciaInicial) || 'Não informado';
    const significanciaFinal = textoResultado(registro.significanciaFinal) || 'Não informado';
    significancia.textContent = `Inicial: ${significanciaInicial} | Final: ${significanciaFinal}`;
    const comparacao = compararRankings(registro);
    const ranking = document.createElement('span');
    ranking.className = `resultado-ranking resultado-ranking-${comparacao.estado}`;
    ranking.title = comparacao.texto;
    ranking.textContent = `Inicial: ${textoResultado(registro.rankingInicial) || 'Não informado'} | Final: ${textoResultado(registro.rankingFinal) || 'Não informado'} ${comparacao.icone}`.trim();
    ranking.setAttribute('aria-label', `${ranking.textContent}. ${comparacao.texto}`);

    link.append(area, atividade, resumo, significancia, ranking);
    return link;
}

async function carregarResultados() {
    const termo = new URLSearchParams(window.location.search).get('busca')?.trim() || '';
    termoBusca.textContent = termo ? `Pesquisando por: ${termo}` : 'Informe um termo de busca.';

    if (!termo) return;

    try {
        const dados = await ExcelService.carregarDados();
        const busca = normalizarBusca(termo);
        const resultados = dados
            .map((registro, indice) => ({ registro, indice }))
            .filter(({ registro }) => camposBuscaGlobal.some(campo =>
                normalizarBusca(registro[campo]).includes(busca)
            ));

        resultadosContainer.innerHTML = '';
        resultados.forEach(({ registro, indice }) =>
            resultadosContainer.appendChild(criarResultado(registro, indice))
        );
        statusResultados.textContent = `${resultados.length} resultado(s) encontrado(s).`;
    } catch (erro) {
        console.error(erro);
        statusResultados.textContent = 'Não foi possível carregar o arquivo LAIA.xlsx. Verifique se ele está na pasta dados.';
    }
}

carregarResultados();