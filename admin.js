import {
    GITHUB_API_URL,
    PIN_ADMIN
} from './config.js';

const URL_PUBLICACAO = 'https://dmos15.github.io/laia-piumhi/';
const CHAVE_HISTORICO = 'laiaHistoricoAtualizacoes';
const VERSAO_SISTEMA = '1.0.0';

async function obterShaAtual() {
    if (!GITHUB_API_URL || GITHUB_API_URL === 'COLOCAR_URL_DA_API_VERCEL_AQUI') throw new Error('URL da API de publicação não configurada.');
    const resposta = await fetch(`${GITHUB_API_URL}?acao=sha`);
    if (!resposta.ok) throw new Error(`Não foi possível obter o SHA atual (${resposta.status}).`);
    const resultado = await resposta.json();
    return resultado.sha || null;
}

function converterParaBase64(conteudo) {
    const bytes = new TextEncoder().encode(conteudo);
    let binario = '';
    bytes.forEach(byte => { binario += String.fromCharCode(byte); });
    return btoa(binario);
}

async function atualizarGithub(json, justificativa, informarProgresso = () => {}) {
    informarProgresso('1/3 Buscando a versão atual no GitHub...');
    const shaAtual = await obterShaAtual();
    informarProgresso(shaAtual ? '✅ Arquivo existente encontrado.' : '✅ Criando novo laia.json.');
    if (shaAtual) informarProgresso('✅ SHA localizado.');
    informarProgresso('2/3 Convertendo o JSON para Base64...');
    const conteudo = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    informarProgresso('3/3 Publicando os dados no GitHub...');
    const resposta = await fetch(GITHUB_API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: conteudo, justificativa, sha: shaAtual })
    });
    if (!resposta.ok) throw new Error(`Não foi possível publicar no GitHub (${resposta.status}). URL: ${GITHUB_API_URL}`);
    return resposta.json();
}

(function () {
    const colunasObrigatorias = [
        'Nome Área/Processo', 'Atividade', 'Aspecto', 'Impacto', 'Frequência', 'Severidade',
        'Probabilidade', 'Ranking Inicial', 'Significância Inicial', 'Prevenção', 'Monitoramento',
        'Mitigação', 'Frequência_Residual', 'Severidade_Residual', 'Probabilidade_Residual',
        'Ranking Final', 'Objetivos, Metas e Programas'
    ];
    const mapaColunas = {
        nomeareaprocesso: 'area', atividade: 'atividade', aspecto: 'aspecto', impacto: 'impacto',
        frequencia: 'frequencia', severidade: 'severidade', probabilidade: 'probabilidade',
        rankinginicial: 'rankingInicial', significanciainicial: 'significanciaInicial',
        prevencao: 'prevencao', monitoramento: 'monitoramento', mitigacao: 'mitigacao',
        frequenciaresidual: 'frequenciaResidual', severidaderesidual: 'severidadeResidual',
        probabilidaderesidual: 'probabilidadeResidual', rankingfinal: 'rankingFinal',
        objetivosmetaseprogramas: 'objetivosMetasProgramas'
    };
    const elementos = {
        formPin: document.querySelector('#form-pin'), pin: document.querySelector('#pin'), mensagemPin: document.querySelector('#mensagem-pin'),
        conteudo: document.querySelector('#painel-conteudo'), arquivo: document.querySelector('#arquivo-excel'), status: document.querySelector('#status-importacao'),
        erros: document.querySelector('#painel-erros'), listaErros: document.querySelector('#lista-erros'), resumo: document.querySelector('#resumo-planilha'),
        publicar: document.querySelector('#publicar-github'), justificativa: document.querySelector('#justificativa'), confirmacao: document.querySelector('#modal-confirmacao'),
        confirmacaoResumo: document.querySelector('#confirmacao-resumo'), confirmar: document.querySelector('#confirmar-publicacao'), atual: document.querySelector('#baixar-atual'),
        historico: document.querySelector('#abrir-historico'), modalHistorico: document.querySelector('#modal-historico'), listaHistorico: document.querySelector('#lista-historico'),
        esqueciPin: document.querySelector('#esqueci-pin'), modalPin: document.querySelector('#modal-pin')
    };
    let dadosValidados = null;
    let metadadosPlanilha = null;

    function normalizar(valor) {
        return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function converter(linhas) {
        const propriedades = [...new Set(Object.values(mapaColunas))];
        return linhas.map(linha => {
            const registro = propriedades.reduce((resultado, propriedade) => ({ ...resultado, [propriedade]: '' }), {});
            Object.entries(linha).forEach(([cabecalho, valor]) => {
                const propriedade = mapaColunas[normalizar(cabecalho)];
                if (propriedade) registro[propriedade] = typeof valor === 'string' ? valor.trim() : valor;
            });
            return registro;
        }).filter(registro => Object.values(registro).some(Boolean));
    }

    function estatisticas(dados) {
        return { registros: dados.length, areas: new Set(dados.map(item => String(item.area ?? '').trim()).filter(Boolean)).size, aspectos: new Set(dados.map(item => String(item.aspecto ?? '').trim()).filter(Boolean)).size, impactos: new Set(dados.map(item => String(item.impacto ?? '').trim()).filter(Boolean)).size };
    }

    function mostrarErros(erros) {
        elementos.listaErros.innerHTML = erros.map(erro => `<li>${erro}</li>`).join('');
        elementos.erros.hidden = erros.length === 0;
    }

    function escaparHtml(valor) {
        return String(valor).replace(/[&<>'"]/g, caractere => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[caractere]));
    }

    function formatarData(data) {
        return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data));
    }

    function obterHistorico() {
        try { return JSON.parse(localStorage.getItem(CHAVE_HISTORICO) || '[]'); } catch { return []; }
    }

    function salvarHistorico(registro) {
        localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([registro, ...obterHistorico()].slice(0, 50)));
    }

    function atualizarIndicadores() {
        const ultimo = obterHistorico().find(item => item.status === 'Publicado');
        document.querySelector('#indicador-data').textContent = ultimo ? formatarData(ultimo.data) : 'Ainda não carregada';
        document.querySelector('#indicador-arquivo').textContent = ultimo?.arquivo || 'Nenhum registro';
        document.querySelector('#indicador-registros').textContent = ultimo?.registros || '0';
        document.querySelector('#indicador-areas').textContent = ultimo?.areas || '0';
        document.querySelector('#indicador-justificativa').textContent = ultimo?.justificativa || 'Nenhum registro';
        document.querySelector('#indicador-versao').textContent = VERSAO_SISTEMA;
    }

    function mostrarHistorico() {
        const registros = obterHistorico();
        elementos.listaHistorico.innerHTML = registros.length ? registros.map(item => `<article class="admin-history-item"><div><strong>${item.status === 'Publicado' ? '✅ Publicado' : '❌ Erro'}</strong><time>${formatarData(item.data)}</time></div><p><b>Arquivo:</b> ${escaparHtml(item.arquivo)}</p><p><b>Registros:</b> ${escaparHtml(item.registros)} &nbsp; <b>Áreas:</b> ${escaparHtml(item.areas)}</p><p><b>Justificativa:</b> ${escaparHtml(item.justificativa)}</p></article>`).join('') : '<p class="admin-empty">Nenhuma atualização registrada.</p>';
        elementos.modalHistorico.showModal();
    }

    async function obterVersaoAtual() {
        if (!GITHUB_API_URL || GITHUB_API_URL === 'COLOCAR_URL_DA_API_VERCEL_AQUI') throw new Error('URL da API de publicação não configurada.');
        const resposta = await fetch(`${GITHUB_API_URL}?acao=versao`);
        if (!resposta.ok) throw new Error(`Não foi possível baixar a versão atual (${resposta.status}).`);
        const arquivo = await resposta.json();
        const conteudo = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(arquivo.content.replace(/\n/g, '')), caractere => caractere.charCodeAt(0))));
        const resumo = estatisticas(conteudo);
        const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json;charset=utf-8' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'laia-atual.json'; link.click(); URL.revokeObjectURL(link.href);
        document.querySelector('#painel-versao-atual').hidden = false;
        document.querySelector('#detalhes-versao-atual').innerHTML = `<span>Última atualização: ${formatarData(arquivo.commit?.committer?.date || Date.now())}</span><span>Registros: ${resumo.registros}</span><span>Áreas: ${resumo.areas}</span>`;
    }

    async function validarArquivo(arquivo) {
        if (!arquivo.name.toLowerCase().endsWith('.xlsx')) throw new Error('Selecione um arquivo com extensão .xlsx.');
        if (!window.XLSX) throw new Error('A biblioteca de leitura Excel não foi carregada.');
        const workbook = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) throw new Error('O arquivo Excel não possui uma aba para leitura.');
        const linhasCabecalho = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });
        const obrigatorias = new Set(colunasObrigatorias.map(normalizar));
        const indice = linhasCabecalho.findIndex(linha => [...obrigatorias].every(coluna => new Set(linha.map(normalizar)).has(coluna)));
        if (indice === -1) return { dados: [], erros: ['As 17 colunas obrigatórias não foram encontradas na mesma linha.'] };
        const linhas = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true, range: indice });
        const cabecalhos = linhas.length ? Object.keys(linhas[0]).map(normalizar) : [];
        const erros = colunasObrigatorias.filter(coluna => !cabecalhos.includes(normalizar(coluna))).map(coluna => `Coluna obrigatória ausente: ${coluna}`);
        const dados = converter(linhas);
        if (!dados.length) erros.push('Nenhum registro preenchido foi encontrado após o cabeçalho.');
        return { dados, erros };
    }

    elementos.formPin.addEventListener('submit', evento => {
        evento.preventDefault();
        if (elementos.pin.value !== PIN_ADMIN) { elementos.mensagemPin.className = 'admin-feedback admin-feedback-error'; elementos.mensagemPin.textContent = 'PIN inválido. Tente novamente.'; elementos.pin.select(); return; }
        elementos.mensagemPin.className = 'admin-feedback admin-feedback-success'; elementos.mensagemPin.textContent = 'Acesso validado.'; elementos.pin.disabled = true; evento.submitter.disabled = true; elementos.conteudo.hidden = false; atualizarIndicadores();
    });

    elementos.arquivo.addEventListener('change', async () => {
        const arquivo = elementos.arquivo.files[0]; if (!arquivo) return;
        elementos.publicar.disabled = true; dadosValidados = null; elementos.resumo.hidden = true; mostrarErros([]); elementos.status.textContent = `Validando ${arquivo.name}...`;
        try {
            const resultado = await validarArquivo(arquivo); mostrarErros(resultado.erros);
            if (resultado.erros.length) { elementos.status.textContent = 'A validação encontrou problemas. Corrija a planilha e tente novamente.'; return; }
            dadosValidados = resultado.dados; const resumo = estatisticas(dadosValidados);
            metadadosPlanilha = { arquivo: arquivo.name, ...resumo, dataAnalise: arquivo.lastModified || Date.now() };
            Object.entries({ arquivo: arquivo.name, registros: resumo.registros, areas: resumo.areas, aspectos: resumo.aspectos, impactos: resumo.impactos, data: formatarData(metadadosPlanilha.dataAnalise) }).forEach(([chave, valor]) => { document.querySelector(`#resumo-${chave}`).textContent = valor; });
            elementos.resumo.hidden = false; elementos.status.textContent = 'Planilha validada com sucesso. Preencha a justificativa para publicar.'; elementos.publicar.disabled = false;
        } catch (erro) { mostrarErros([erro.message]); elementos.status.textContent = 'Não foi possível processar o arquivo selecionado.'; }
    });

    elementos.publicar.addEventListener('click', () => {
        if (!dadosValidados || !elementos.justificativa.value.trim()) { elementos.justificativa.reportValidity(); return; }
        elementos.confirmacaoResumo.innerHTML = `<p><b>Arquivo:</b> ${escaparHtml(metadadosPlanilha.arquivo)}</p><p><b>Registros:</b> ${escaparHtml(metadadosPlanilha.registros)} &nbsp; <b>Áreas:</b> ${escaparHtml(metadadosPlanilha.areas)}</p><p><b>Justificativa:</b> ${escaparHtml(elementos.justificativa.value.trim())}</p>`;
        elementos.confirmacao.showModal();
    });

    elementos.confirmar.addEventListener('click', async evento => {
        evento.preventDefault(); elementos.confirmacao.close(); elementos.publicar.disabled = true; elementos.status.className = 'admin-status admin-status-loading';
        const registro = { ...metadadosPlanilha, justificativa: elementos.justificativa.value.trim(), data: Date.now(), status: 'Erro' };
        try { await atualizarGithub(dadosValidados, registro.justificativa, mensagem => { elementos.status.textContent = mensagem; }); elementos.status.className = 'admin-status admin-status-success'; elementos.status.innerHTML = `✅ Publicação concluída<br><a href="${URL_PUBLICACAO}" target="_blank" rel="noopener">${URL_PUBLICACAO}</a><small class="admin-api-url">URL utilizada: ${GITHUB_API_URL}</small>`; registro.status = 'Publicado'; salvarHistorico(registro); atualizarIndicadores(); }
        catch (erro) { elementos.status.className = 'admin-status admin-status-error'; elementos.status.textContent = `❌ Erro na publicação: ${erro.message}`; salvarHistorico(registro); }
        finally { elementos.publicar.disabled = false; }
    });

    elementos.atual.addEventListener('click', async () => { elementos.atual.disabled = true; try { await obterVersaoAtual(); } catch (erro) { elementos.status.textContent = `❌ ${erro.message}`; } finally { elementos.atual.disabled = false; } });
    elementos.historico.addEventListener('click', mostrarHistorico);
    elementos.esqueciPin.addEventListener('click', evento => { evento.preventDefault(); elementos.modalPin.showModal(); });
    document.querySelector('#versao-recuperacao').textContent = VERSAO_SISTEMA;
})();

export { obterShaAtual, atualizarGithub };
