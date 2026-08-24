const cardsContainer = document.querySelector('.cards-container');
const searchInput = document.querySelector('#busca');
const ordenacaoAreas = document.querySelector('#ordenacao-areas');
const filtroRisco = document.querySelector('#filtro-risco');
const botaoBusca = document.querySelector('#botao-busca');

const camposBusca = [
	'area', 'atividade', 'aspecto', 'impacto', 'prevencao',
	'monitoramento', 'mitigacao', 'objetivosMetasProgramas'
];

let areas = [];
let registros = [];

// Carrega as áreas disponíveis no arquivo de dados.
async function carregarAreas() {
	try {
		const dados = await ExcelService.carregarDados();
		registros = dados;
		areas = obterAreasUnicas(dados);
		atualizarIndicadores(dados);
		renderizarCards(areas);
	} catch (erro) {
		console.error(erro);
		cardsContainer.innerHTML = '<p class="mensagem-erro">Não foi possível carregar o arquivo LAIA.xlsx. Verifique se ele está na pasta dados.</p>';
	}
}

// Mantém somente áreas válidas, sem duplicatas e em ordem alfabética.
function obterAreasUnicas(dados) {
	const nomes = dados
		.map(item => item.area?.trim())
		.filter(Boolean);

	return [...new Set(nomes)].sort((a, b) =>
		a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
	);
}

function texto(valor) {
	return String(valor ?? '').trim();
}

function categoriaRisco(significancia) {
	const valor = texto(significancia).toLocaleLowerCase('pt-BR');
	if (valor.includes('muito alto')) return 'muito-alto';
	if (valor.includes('alto risco') || valor.includes('significativo')) return 'significativo';
	return 'insignificante';
}

function obterEstatisticasArea(area) {
	const registrosArea = registros.filter(registro => texto(registro.area) === area);
	const aspectos = new Set(registrosArea.map(registro => texto(registro.aspecto)).filter(Boolean));
	const impactos = new Set(registrosArea.map(registro => texto(registro.impacto)).filter(Boolean));
	const riscos = { insignificante: 0, significativo: 0, 'muito-alto': 0 };

	registrosArea.forEach(registro => riscos[categoriaRisco(registro.significanciaInicial)]++);
	return { quantidade: registrosArea.length, aspectos: aspectos.size, impactos: impactos.size, riscos };
}

function criarResumoItem(textoItem, valor, classe = '') {
	const item = document.createElement('span');
	item.className = classe;
	const destaque = document.createElement('strong');
	destaque.textContent = valor;
	item.append(destaque, document.createTextNode(` ${textoItem}`));
	return item;
}

function atualizarIndicadores(dados) {
	const aspectos = new Set(dados.map(registro => texto(registro.aspecto)).filter(Boolean));
	const impactos = new Set(dados.map(registro => texto(registro.impacto)).filter(Boolean));
	const riscos = { insignificante: 0, significativo: 0, 'muito-alto': 0 };

	dados.forEach(registro => riscos[categoriaRisco(registro.significanciaInicial)]++);
	document.querySelector('#total-areas').textContent = areas.length;
	document.querySelector('#total-atividades').textContent = dados.length;
	document.querySelector('#total-aspectos').textContent = aspectos.size;
	document.querySelector('#total-impactos').textContent = impactos.size;
	document.querySelector('#total-insignificantes').textContent = riscos.insignificante;
	document.querySelector('#total-significativos').textContent = riscos.significativo;
	document.querySelector('#total-muito-altos').textContent = riscos['muito-alto'];
}

// Cria os cards a partir da lista recebida.
function renderizarCards(areasParaExibir) {
	cardsContainer.innerHTML = '';
	const direcao = ordenacaoAreas.value === 'za' ? -1 : 1;
	const areasOrdenadas = [...areasParaExibir].sort((a, b) =>
		a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) * direcao
	);

	areasOrdenadas.forEach(area => {
		const card = document.createElement('div');
		const estatisticas = obterEstatisticasArea(area);
		const maiorRisco = estatisticas.riscos['muito-alto'] > 0 ? 'vermelho' :
			estatisticas.riscos.significativo > 0 ? 'amarelo' : 'verde';
		card.className = `card-area card-risco-${maiorRisco}`;
		card.tabIndex = 0;
		card.setAttribute('role', 'button');

		const titulo = document.createElement('h2');
		titulo.textContent = area;
		card.appendChild(titulo);

		const icone = document.createElement('span');
		icone.className = 'icone-area';
		icone.textContent = 'LA';
		card.insertBefore(icone, titulo);

		const resumo = document.createElement('div');
		resumo.className = 'resumo-area';
		resumo.append(
			criarResumoItem('atividades', estatisticas.quantidade),
			criarResumoItem('aspectos', estatisticas.aspectos),
			criarResumoItem('impactos', estatisticas.impactos)
		);
		card.appendChild(resumo);

		const riscos = document.createElement('div');
		riscos.className = 'riscos-area';
		riscos.append(
			criarResumoItem('insignificantes', estatisticas.riscos.insignificante, 'risco-pill verde'),
			criarResumoItem('significativos', estatisticas.riscos.significativo, 'risco-pill amarelo'),
			criarResumoItem('muito altos', estatisticas.riscos['muito-alto'], 'risco-pill vermelho')
		);
		card.appendChild(riscos);

		const botao = document.createElement('a');
		botao.className = 'botao-ver-area';
		botao.href = `area.html?nome=${encodeURIComponent(area)}`;
		botao.textContent = 'Ver Área';
		botao.addEventListener('click', evento => evento.stopPropagation());
		card.appendChild(botao);

		card.addEventListener('click', () => abrirArea(area));
		card.addEventListener('keydown', evento => {
			if (evento.key === 'Enter' || evento.key === ' ') {
				evento.preventDefault();
				abrirArea(area);
			}
		});

		cardsContainer.appendChild(card);
	});
}

// Abre a página da área mantendo caracteres especiais corretamente.
function abrirArea(area) {
	window.location.href = `area.html?nome=${encodeURIComponent(area)}`;
}

// Atualiza os cards enquanto o usuário digita.
function filtrarAreas() {
	const termo = searchInput.value.trim().toLocaleLowerCase('pt-BR');
	const risco = filtroRisco.value;
	const areasFiltradas = areas.filter(area => {
		const registrosArea = registros.filter(registro => texto(registro.area) === area);
		const correspondeBusca = !termo || registrosArea.some(registro =>
			camposBusca.some(campo => texto(registro[campo]).toLocaleLowerCase('pt-BR').includes(termo))
		);
		const estatisticas = obterEstatisticasArea(area);
		const correspondeRisco = risco === 'todas' ||
			(risco === 'muito-alto' && estatisticas.riscos['muito-alto'] > 0) ||
			(risco === 'significativo' && (estatisticas.riscos.significativo > 0 || estatisticas.riscos['muito-alto'] > 0)) ||
			(risco === 'sem-significativo' && estatisticas.riscos.significativo === 0 && estatisticas.riscos['muito-alto'] === 0);
		return correspondeBusca && correspondeRisco;
	});

	renderizarCards(areasFiltradas);
}

function abrirBuscaGlobal() {
	const termo = searchInput.value.trim();
	if (termo) window.location.href = `resultados.html?busca=${encodeURIComponent(termo)}`;
}

searchInput.addEventListener('input', filtrarAreas);
ordenacaoAreas.addEventListener('change', () => filtrarAreas());
filtroRisco.addEventListener('change', () => filtrarAreas());
botaoBusca.addEventListener('click', abrirBuscaGlobal);
searchInput.addEventListener('keydown', evento => {
	if (evento.key === 'Enter') abrirBuscaGlobal();
});
carregarAreas();
