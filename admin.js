(function () {
    const PIN_VALIDO = 'JDEPIU';
    const colunasObrigatorias = [
        'Nome Área/Processo', 'Atividade', 'Aspecto', 'Impacto', 'Frequência',
        'Severidade', 'Probabilidade', 'Ranking Inicial', 'Significância Inicial',
        'Prevenção', 'Monitoramento', 'Mitigação', 'Frequência_Residual',
        'Severidade_Residual', 'Probabilidade_Residual', 'Ranking Final',
        'Objetivos, Metas e Programas'
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
        formPin: document.querySelector('#form-pin'), pin: document.querySelector('#pin'),
        mensagemPin: document.querySelector('#mensagem-pin'), painelImportacao: document.querySelector('#painel-importacao'),
        arquivo: document.querySelector('#arquivo-excel'), status: document.querySelector('#status-importacao'),
        registros: document.querySelector('#total-registros'), areas: document.querySelector('#total-areas'),
        erros: document.querySelector('#total-erros'), painelErros: document.querySelector('#painel-erros'),
        listaErros: document.querySelector('#lista-erros'), baixar: document.querySelector('#baixar-json')
    };
    let dadosValidados = null;

    function normalizar(valor) {
        return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function encontrarCabecalho(worksheet) {
        const linhas = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });
        const obrigatorias = new Set(colunasObrigatorias.map(normalizar));
        const indice = linhas.findIndex(linha => {
            const encontradas = new Set(linha.map(normalizar));
            return [...obrigatorias].every(coluna => encontradas.has(coluna));
        });
        return indice;
    }

    function converter(linhas) {
        const propriedades = [...new Set(Object.values(mapaColunas))];
        return linhas.map(linha => {
            const registro = propriedades.reduce((resultado, propriedade) => {
                resultado[propriedade] = '';
                return resultado;
            }, {});
            Object.entries(linha).forEach(([cabecalho, valor]) => {
                const propriedade = mapaColunas[normalizar(cabecalho)];
                if (propriedade) registro[propriedade] = typeof valor === 'string' ? valor.trim() : valor;
            });
            return registro;
        }).filter(registro => Object.values(registro).some(Boolean));
    }

    function mostrarErros(erros) {
        elementos.erros.textContent = erros.length;
        elementos.listaErros.innerHTML = '';
        erros.forEach(erro => {
            const item = document.createElement('li');
            item.textContent = erro;
            elementos.listaErros.appendChild(item);
        });
        elementos.painelErros.hidden = erros.length === 0;
    }

    function atualizarResumo(dados) {
        elementos.registros.textContent = dados.length;
        elementos.areas.textContent = new Set(dados.map(registro => String(registro.area ?? '').trim()).filter(Boolean)).size;
    }

    async function validarArquivo(arquivo) {
        if (!window.XLSX) throw new Error('A biblioteca de leitura Excel não foi carregada. Verifique a conexão com a internet.');
        const workbook = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) throw new Error('O arquivo Excel não possui uma aba para leitura.');
        const indiceCabecalho = encontrarCabecalho(worksheet);
        if (indiceCabecalho === -1) return { dados: [], erros: ['As 17 colunas obrigatórias não foram encontradas na mesma linha.'] };

        const linhas = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true, range: indiceCabecalho });
        const cabecalhos = linhas.length ? Object.keys(linhas[0]).map(normalizar) : [];
        const erros = colunasObrigatorias.filter(coluna => !cabecalhos.includes(normalizar(coluna)))
            .map(coluna => `Coluna obrigatória ausente: ${coluna}`);
        const dados = converter(linhas);
        if (!dados.length) erros.push('Nenhum registro preenchido foi encontrado após o cabeçalho.');
        return { dados, erros };
    }

    elementos.formPin.addEventListener('submit', evento => {
        evento.preventDefault();
        if (elementos.pin.value === PIN_VALIDO) {
            elementos.painelImportacao.hidden = false;
            elementos.mensagemPin.className = 'admin-feedback admin-feedback-success';
            elementos.mensagemPin.textContent = 'Acesso validado.';
            elementos.pin.disabled = true;
            evento.submitter.disabled = true;
            elementos.arquivo.focus();
        } else {
            elementos.mensagemPin.className = 'admin-feedback admin-feedback-error';
            elementos.mensagemPin.textContent = 'PIN inválido. Tente novamente.';
            elementos.pin.select();
        }
    });

    elementos.arquivo.addEventListener('change', async () => {
        const arquivo = elementos.arquivo.files[0];
        if (!arquivo) return;
        elementos.status.textContent = `Validando ${arquivo.name}...`;
        elementos.baixar.disabled = true;
        dadosValidados = null;
        try {
            const resultado = await validarArquivo(arquivo);
            atualizarResumo(resultado.dados);
            mostrarErros(resultado.erros);
            if (resultado.erros.length) {
                elementos.status.textContent = 'A validação encontrou problemas. Corrija a planilha e tente novamente.';
            } else {
                dadosValidados = resultado.dados;
                elementos.status.textContent = 'Planilha validada com sucesso. O JSON está pronto para download.';
                elementos.baixar.disabled = false;
            }
        } catch (erro) {
            atualizarResumo([]);
            mostrarErros([erro.message]);
            elementos.status.textContent = 'Não foi possível processar o arquivo selecionado.';
        }
    });

    elementos.baixar.addEventListener('click', () => {
        if (!dadosValidados) return;
        const blob = new Blob([JSON.stringify(dadosValidados, null, 2)], { type: 'application/json;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'laia.json';
        link.click();
        URL.revokeObjectURL(link.href);
    });
})();