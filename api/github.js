const OWNER = 'dmos15';
const REPOSITORY = 'laia-piumhi';
const BRANCH = 'main';
const FILE = 'dados/LAIA.xlsx';
const HISTORY_FILE = 'dados/historico.json';
const CONFIG_FILE = 'dados/configuracoes.json';

function githubUrl() {
    return fileUrl(FILE);
}

function fileUrl(file) {
    return `https://api.github.com/repos/${OWNER}/${REPOSITORY}/contents/${file}`;
}

function headers() {
    return {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28'
    };
}

function responder(res, status, body) {
    res.status(status).json(body);
}

async function obterSha(file) {
    const resposta = await fetch(`${fileUrl(file)}?ref=${BRANCH}`, { headers: headers() });
    if (resposta.status === 404) return null;
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.message || `Falha ao consultar ${file}.`);
    return dados.sha;
}

async function obterArquivoJson(file, padrao) {
    const resposta = await fetch(`${fileUrl(file)}?ref=${BRANCH}`, { headers: headers() });
    if (resposta.status === 404) return padrao;
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.message || `Falha ao consultar ${file}.`);
    return JSON.parse(Buffer.from(dados.content.replace(/\n/g, ''), 'base64').toString('utf8'));
}

function codificarJson(valor) {
    return Buffer.from(JSON.stringify(valor, null, 2), 'utf8').toString('base64');
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (!process.env.GITHUB_TOKEN) return responder(res, 500, { error: 'GITHUB_TOKEN não configurado no servidor.' });

    try {
        if (req.method === 'GET') {
            const resposta = await fetch(`${githubUrl()}?ref=${BRANCH}`, { headers: headers() });
            if (resposta.status === 404) return responder(res, 200, { sha: null });
            const dados = await resposta.json();
            return responder(res, resposta.status, {
                sha: dados.sha,
                content: dados.content,
                commit: dados.commit
            });
        }

        if (req.method !== 'PUT') return responder(res, 405, { error: 'Método não permitido.' });
        const { contentBase64, justificativa, nomeResponsavel, arquivo, registros, areas } = req.body || {};
        if (!String(contentBase64 || '').trim() || !String(justificativa || '').trim() || !String(nomeResponsavel || '').trim()) return responder(res, 400, { error: 'Arquivo Excel, nome completo do responsável e justificativa são obrigatórios.' });
        const agora = new Date();
        const data = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const hora = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
        const registro = {
            data,
            hora,
            arquivo: String(arquivo || 'LAIA.xlsx').trim(),
            quantidadeRegistros: Number(registros) || 0,
            quantidadeAreas: Number(areas) || 0,
            justificativa: String(justificativa).trim(),
            nomeResponsavel: String(nomeResponsavel).trim(),
            status: 'Publicado'
        };
        const historicoAtual = await obterArquivoJson(HISTORY_FILE, []);
        const configuracoesAtuais = await obterArquivoJson(CONFIG_FILE, {});
        const historico = [registro, ...(Array.isArray(historicoAtual) ? historicoAtual : [])].slice(0, 50);
        const configuracoes = {
            ...configuracoesAtuais,
            ultimaAtualizacao: agora.toISOString(),
            ultimoArquivo: registro.arquivo,
            ultimaJustificativa: registro.justificativa,
            versaoSistema: configuracoesAtuais.versaoSistema || '1.0.0'
        };
        const mensagem = `Atualização automática do LAIA - ${registro.nomeResponsavel} - ${registro.justificativa}`;
        const atualizacoes = [
            { file: FILE, content: String(contentBase64).replace(/\s/g, ''), sha: await obterSha(FILE) },
            { file: HISTORY_FILE, content: codificarJson(historico), sha: await obterSha(HISTORY_FILE) },
            { file: CONFIG_FILE, content: codificarJson(configuracoes), sha: await obterSha(CONFIG_FILE) }
        ];
        let resultadoExcel = null;
        for (const atualizacao of atualizacoes) {
            const payload = { message: mensagem, content: atualizacao.content, branch: BRANCH };
            if (atualizacao.sha) payload.sha = atualizacao.sha;
            const publicacao = await fetch(fileUrl(atualizacao.file), {
                method: 'PUT',
                headers: { ...headers(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const resultado = await publicacao.json();
            if (!publicacao.ok) return responder(res, publicacao.status, { error: resultado.message || `Falha ao publicar ${atualizacao.file}.` });
            if (atualizacao.file === FILE) resultadoExcel = resultado;
        }
        return responder(res, 200, { ok: true, sha: resultadoExcel?.content?.sha, historico, configuracoes });
    } catch (erro) {
        return responder(res, 500, { error: erro.message || 'Erro interno na API.' });
    }
};
