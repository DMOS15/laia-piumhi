const resultadosContainer = document.querySelector('#resultados-container');
const statusResultados = document.querySelector('#status-resultados');
const termoBusca = document.querySelector('#termo-busca');

const camposBuscaGlobal = [
    'perspectivaCicloVida', 'area', 'unidadeFabril', 'atividade', 'aspecto', 'impacto',
    'frequencia', 'severidade', 'probabilidade', 'prevencao', 'monitoramento', 'mitigacao',
    'frequenciaResidual', 'severidadeResidual', 'probabilidadeResidual',
    'rankingInicial', 'significanciaInicial', 'rankingFinal', 'significanciaFinal',
    'objetivosMetasProgramas'
];

function textoResultado(valor) {
    return String(valor ?? '').trim();
}

function normalizarBusca(valor) {
    return textoResultado(valor).toLocaleLowerCase('pt-BR');
}

function criarResultado(registro, indice) {
    const link = document.createElement('a');
    link.className = 'resultado-item';
    link.href = `area.html?nome=${encodeURIComponent(textoResultado(registro.area))}&atividade=${encodeURIComponent(textoResultado(registro.atividade))}#atividade-${indice}`;

    const area = document.createElement('strong');
    area.textContent = formatarNumero(textoResultado(registro.area));
    const atividade = document.createElement('span');
    atividade.textContent = formatarNumero(textoResultado(registro.atividade)) || 'Atividade não informada';
    const resumo = document.createElement('span');
    resumo.textContent = `${formatarNumero(textoResultado(registro.aspecto)) || 'Aspecto não informado'} | ${formatarNumero(textoResultado(registro.impacto)) || 'Impacto não informado'}`;
    const significancia = document.createElement('span');
    significancia.className = 'resultado-significancia';
    const significanciaInicial = textoResultado(registro.significanciaInicial) || 'Não informado';
    const significanciaFinal = textoResultado(registro.significanciaFinal) || 'Não informado';
    significancia.textContent = `Inicial: ${formatarNumero(significanciaInicial)} | Final: ${formatarNumero(significanciaFinal)}`;
    const ranking = document.createElement('span');
    ranking.className = 'resultado-ranking';
    const rankingInicial = textoResultado(registro.rankingInicial);
    const rankingFinal = textoResultado(registro.rankingFinal);
    const comparacao = compararRanking(rankingInicial, rankingFinal);
    const inicial = document.createElement('span');
    inicial.className = 'resultado-ranking-inicial';
    inicial.textContent = `Inicial: ${formatarNumero(rankingInicial) || 'Não informado'}`;
    ranking.appendChild(inicial);

    if (comparacao) {
        const final = document.createElement('strong');
        final.className = `ranking-badge ranking-badge-${comparacao.tipo}`;
        final.textContent = `Final: ${formatarNumero(rankingFinal)} ${comparacao.icone}`;
        final.style.setProperty('--ranking-cor', comparacao.cor);
        ranking.appendChild(final);

        const descricao = document.createElement('span');
        descricao.className = 'ranking-descricao';
        descricao.textContent = comparacao.mensagem;
        ranking.appendChild(descricao);

        let textoVariacao = '';
        if (comparacao.tipo !== 'igual') {
            const variacao = document.createElement('span');
            variacao.className = 'ranking-variacao';
            const rotulo = comparacao.tipo === 'melhorou' ? 'Redução' : 'Aumento';
            variacao.textContent = comparacao.percentualVariacao === null
                ? `${rotulo}: não aplicável (Ranking Inicial igual a zero)`
                : `${rotulo}: ${formatarNumero(comparacao.percentualVariacao)}%`;
            textoVariacao = variacao.textContent;
            ranking.appendChild(variacao);
        }

        ranking.title = comparacao.mensagem;
        ranking.setAttribute('aria-label', `Inicial: ${formatarNumero(rankingInicial)}. Final: ${formatarNumero(rankingFinal)}. ${comparacao.icone}. ${comparacao.mensagem}${textoVariacao ? ` ${textoVariacao}` : ''}`);
    } else {
        const final = document.createElement('span');
        final.className = 'resultado-ranking-final';
        final.textContent = `Final: ${formatarNumero(rankingFinal) || 'Não informado'}`;
        ranking.appendChild(final);
        ranking.setAttribute('aria-label', `${inicial.textContent}. ${final.textContent}`);
    }

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