const resultadosContainer = document.querySelector('#resultados-container');
const statusResultados = document.querySelector('#status-resultados');
const termoBusca = document.querySelector('#termo-busca');

const camposBuscaGlobal = [
    'area', 'atividade', 'aspecto', 'impacto', 'prevencao',
    'monitoramento', 'mitigacao', 'objetivosMetasProgramas'
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
    area.textContent = textoResultado(registro.area);
    const atividade = document.createElement('span');
    atividade.textContent = textoResultado(registro.atividade) || 'Atividade não informada';
    const resumo = document.createElement('span');
    resumo.textContent = `${textoResultado(registro.aspecto) || 'Aspecto não informado'} | ${textoResultado(registro.impacto) || 'Impacto não informado'}`;
    const significancia = document.createElement('span');
    significancia.className = 'resultado-significancia';
    significancia.textContent = textoResultado(registro.significanciaInicial) || 'Significância não informada';

    link.append(area, atividade, resumo, significancia);
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