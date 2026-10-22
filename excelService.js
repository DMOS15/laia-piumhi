(function () {
    const arquivoExcel = new URL('./dados/LAIA.xlsx', document.baseURI).href;
    let dadosCompartilhados = null;

    const mapaColunas = {
        perspectivadeciclodevida: 'perspectivaCicloVida',
        nomeareaprocesso: 'area',
        unidadefabril: 'unidadeFabril',
        atividade: 'atividade',
        aspecto: 'aspecto',
        impacto: 'impacto',
        frequencia: 'frequencia',
        severidade: 'severidade',
        probabilidade: 'probabilidade',
        rankinginicial: 'rankingInicial',
        significanciainicial: 'significanciaInicial',
        significanciafinal: 'significanciaFinal',
        prevencao: 'prevencao',
        monitoramento: 'monitoramento',
        mitigacao: 'mitigacao',
        frequenciaresidual: 'frequenciaResidual',
        severidaderesidual: 'severidadeResidual',
        probabilidaderesidual: 'probabilidadeResidual',
        rankingfinal: 'rankingFinal',
        objetivosmetaseprogramas: 'objetivosMetasProgramas'
    };

    const propriedades = [...new Set(Object.values(mapaColunas))];
    const colunasObrigatorias = [
        'PERSPECTIVA DE CICLO DE VIDA', 'NOME ÁREA/ PROCESSO', 'UNIDADE FABRIL',
        'ATIVIDADE', 'ASPECTO', 'IMPACTO', 'RANKING INICIAL',
        'SIGNIFICÂNCIA INICIAL', 'PREVENÇÃO', 'MONITORAMENTO', 'MITIGAÇÃO',
        'RANKING FINAL', 'SIGNIFICÂNCIA FINAL', 'OBJETIVOS, METAS E PROGRAMAS'
    ];

    function normalizarCabecalho(valor) {
        return String(valor ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    }

    function limparValor(valor) {
        return typeof valor === 'string' ? valor.trim() : valor;
    }

    function validarEstruturaExcel(cabecalhos) {
        const chavesDetectadas = new Set(cabecalhos.map(normalizarCabecalho));
        const colunasFaltando = colunasObrigatorias.filter(coluna =>
            !chavesDetectadas.has(normalizarCabecalho(coluna))
        );

        if (colunasFaltando.length > 0) {
            console.warn('[LAIA] Colunas obrigatórias não encontradas:');
            colunasFaltando.forEach(coluna => console.warn(`- ${coluna}`));
        } else {
            console.log('[LAIA] Estrutura validada: todas as colunas obrigatórias foram encontradas.');
        }

        return colunasFaltando;
    }

    function lerPlanilha(worksheet) {
        const linhasCabecalho = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: true
        });
        const indiceCabecalho = linhasCabecalho.findIndex(linha =>
            linha.some(celula => normalizarCabecalho(celula) === 'nomeareaprocesso')
        );

        if (indiceCabecalho === -1) {
            throw new Error('A coluna "NOME ÁREA/ PROCESSO" não foi encontrada na planilha.');
        }

        return {
            cabecalhos: linhasCabecalho[indiceCabecalho],
            linhas: XLSX.utils.sheet_to_json(worksheet, {
                defval: '',
                raw: true,
                range: indiceCabecalho
            })
        };
    }

    function converterLinhas(linhas) {
        return linhas.map(linha => {
            const registro = propriedades.reduce((resultado, propriedade) => {
                resultado[propriedade] = '';
                return resultado;
            }, {});

            Object.entries(linha).forEach(([cabecalho, valor]) => {
                const propriedade = mapaColunas[normalizarCabecalho(cabecalho)];
                if (propriedade) registro[propriedade] = limparValor(valor);
            });

            return registro;
        }).filter(registro => Object.values(registro).some(Boolean));
    }

    async function carregarDados() {
        if (dadosCompartilhados) return dadosCompartilhados;

        if (!window.XLSX) {
            throw new Error('A biblioteca SheetJS não foi carregada. Verifique a conexão com a internet e o script CDN no HTML.');
        }

        console.log(`[LAIA] Tentando carregar Excel em: ${arquivoExcel}`);
        const resposta = await fetch(arquivoExcel, { cache: 'no-store' });
        if (!resposta.ok) {
            throw new Error(`Arquivo Excel não encontrado ou indisponível (HTTP ${resposta.status}). Caminho: ${arquivoExcel}`);
        }

        const arquivo = await resposta.arrayBuffer();
        if (arquivo.byteLength === 0) throw new Error('O arquivo LAIA.xlsx está vazio.');
        const workbook = XLSX.read(arquivo, { type: 'array' });
        const primeiraAba = workbook.Sheets[workbook.SheetNames[0]];
        if (!primeiraAba) throw new Error('O arquivo Excel não possui abas.');

        const { cabecalhos, linhas } = lerPlanilha(primeiraAba);
        const areas = new Set();

        validarEstruturaExcel(cabecalhos);
        console.log(`[LAIA] Quantidade total de linhas carregadas: ${linhas.length}`);
        console.log('[LAIA] Nome das colunas detectadas:', cabecalhos);
        console.log('[LAIA] Primeira linha encontrada:', linhas[0] ?? 'Nenhuma linha encontrada');

        dadosCompartilhados = converterLinhas(linhas);
        dadosCompartilhados.forEach(registro => {
            if (registro.area) areas.add(String(registro.area).trim());
        });
        console.log(`[LAIA] Quantidade total de áreas encontradas: ${areas.size}`);
        return dadosCompartilhados;
    }

    window.ExcelService = {
        carregarDados,
        converterLinhas,
        lerPlanilha,
        colunasObrigatorias,
        normalizarCabecalho,
        validarEstruturaExcel
    };
})();