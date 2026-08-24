const versaoSistema = "1.0.0";
const dataUltimaAtualizacao = "24/08/2026";

window.LAIA_CONFIG = {
    versaoSistema,
    dataUltimaAtualizacao
};

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

    preencher(elementos.versao, versaoSistema);
    preencher(elementos.atualizacao, dataUltimaAtualizacao);

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
