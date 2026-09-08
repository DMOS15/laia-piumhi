const URL_CONFIGURACOES = new URL('./dados/configuracoes.json', document.baseURI).href;

(function () {
    const elementos = {
        versao: document.querySelectorAll('[data-versao-sistema]'),
        atualizacao: document.querySelectorAll('[data-ultima-atualizacao]'),
        registros: document.querySelectorAll('[data-total-registros]'),
        areas: document.querySelectorAll('[data-total-areas]')
    };

    function preencher(elementosPagina, valor) {
        elementosPagina.forEach(elemento => {
            elemento.textContent = valor;
        });
    }

    fetch(URL_CONFIGURACOES, { cache: 'no-store' })
        .then(resposta => {
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            return resposta.json();
        })
        .then(configuracoes => {
            const versaoSistema = configuracoes.versaoSistema || 'Não disponível';
            const dataUltimaAtualizacao = configuracoes.ultimaAtualizacao
                ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(configuracoes.ultimaAtualizacao))
                : 'Ainda não carregada';
            window.LAIA_CONFIG = { versaoSistema, dataUltimaAtualizacao };
            preencher(elementos.versao, versaoSistema);
            preencher(elementos.atualizacao, dataUltimaAtualizacao);
        })
        .catch(erro => {
            console.error('[LAIA] Não foi possível carregar as configurações compartilhadas.', erro);
            preencher(elementos.versao, 'Não disponível');
            preencher(elementos.atualizacao, 'Não disponível');
        });

    ExcelService.carregarDados()
        .then(dados => {
            const areas = new Set(
                dados.map(registro => String(registro.area ?? '').trim()).filter(Boolean)
            );
            preencher(elementos.registros, dados.length);
            preencher(elementos.areas, areas.size);
        })
        .catch(erro => {
            console.error('[LAIA] Não foi possível carregar as métricas do rodapé.', erro);
            preencher(elementos.registros, 'Não disponível');
            preencher(elementos.areas, 'Não disponível');
        });
})();
