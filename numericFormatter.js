function formatarNumero(valor) {
    const texto = String(valor ?? '');
    const numeroTexto = texto.trim().replace(',', '.');
    if (!numeroTexto) return texto;

    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(numeroTexto)) {
        return texto;
    }

    const numero = Number(numeroTexto);
    if (!Number.isFinite(numero)) return texto;

    const casasDecimais = Number.isInteger(numero) ? 0 : 2;
    return numero.toLocaleString('pt-BR', {
        minimumFractionDigits: casasDecimais,
        maximumFractionDigits: casasDecimais
    });
}
