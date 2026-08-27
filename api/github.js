const OWNER = 'dmos15';
const REPOSITORY = 'laia-piumhi';
const BRANCH = 'main';
const FILE = 'dados/laia.json';

function githubUrl() {
    return `https://api.github.com/repos/${OWNER}/${REPOSITORY}/contents/${FILE}`;
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

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://dmos15.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
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
        const { json, justificativa } = req.body || {};
        if (!Array.isArray(json) || !String(justificativa || '').trim()) return responder(res, 400, { error: 'JSON e justificativa são obrigatórios.' });

        const consulta = await fetch(`${githubUrl()}?ref=${BRANCH}`, { headers: headers() });
        const arquivoAtual = consulta.status === 404 ? null : await consulta.json();
        if (!consulta.ok && consulta.status !== 404) return responder(res, consulta.status, { error: arquivoAtual?.message || 'Falha ao consultar o arquivo atual.' });

        const payload = {
            message: `Atualização automática do LAIA - ${String(justificativa).trim()}`,
            content: Buffer.from(JSON.stringify(json, null, 2), 'utf8').toString('base64'),
            branch: BRANCH
        };
        if (arquivoAtual?.sha) payload.sha = arquivoAtual.sha;

        const publicacao = await fetch(githubUrl(), {
            method: 'PUT',
            headers: { ...headers(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const resultado = await publicacao.json();
        return responder(res, publicacao.status, publicacao.ok ? { ok: true, sha: resultado.content?.sha } : { error: resultado.message || 'Falha na publicação.' });
    } catch (erro) {
        return responder(res, 500, { error: erro.message || 'Erro interno na API.' });
    }
};
