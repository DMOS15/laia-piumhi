function compararRanking(rankingInicial, rankingFinal) {
    function converterRanking(valor) {
        if (valor === null || valor === undefined || String(valor).trim() === '') return null;

        const texto = String(valor).trim().replace(',', '.');
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(texto)) return null;

        const numero = Number(texto);
        return Number.isFinite(numero) ? numero : null;
    }

    const inicial = converterRanking(rankingInicial);
    const final = converterRanking(rankingFinal);
    if (inicial === null || final === null) return null;

    if (final < inicial) {
        return {
            tipo: 'melhorou',
            cor: '#6B7C43',
            icone: '▼',
            mensagem: 'Risco reduzido após aplicação dos controles.',
            percentualVariacao: inicial === 0 ? null : ((inicial - final) / Math.abs(inicial)) * 100
        };
    }

    if (final > inicial) {
        return {
            tipo: 'piorou',
            cor: '#A04830',
            icone: '▲',
            mensagem: 'Risco aumentou após avaliação residual.',
            percentualVariacao: inicial === 0 ? null : ((final - inicial) / Math.abs(inicial)) * 100
        };
    }

    return {
        tipo: 'igual',
        cor: '#808080',
        icone: '=',
        mensagem: 'Sem alteração no nível de risco.',
        percentualVariacao: 0
    };
}
