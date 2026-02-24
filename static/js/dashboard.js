/* Dashboard JS - Extraido de dashboard_novo.html */
// Estado global
let clientes = [];
let documentos = [];
let viewAtual = 'clientes';
let ordenacaoAtual = { campo: 'total', direcao: 'desc' };

// ============================================
//  CONFIGURACOES: LOGO E MASCOTE
// ============================================

async function carregarLogoMascote() {
    try {
        const response = await fetch('/api/config/logo-mascote');
        if (!response.ok) return;
        const data = await response.json();

        if (data.logo) {
            mostrarPreviewImagem('logo', data.logo);
        }
        if (data.mascote) {
            mostrarPreviewImagem('mascote', data.mascote);
        }
        if (data.alvara) {
            mostrarPreviewImagem('alvara', data.alvara);
        }
    } catch (error) {
        console.error('Erro ao carregar logo/mascote/alvara:', error);
    }
}

function mostrarPreviewImagem(tipo, caminho) {
    const img = document.getElementById(`${tipo}-preview-img`);
    const empty = document.getElementById(`${tipo}-preview-empty`);
    const btnRemover = document.getElementById(`btn-remover-${tipo}`);

    if (img && caminho) {
        img.src = caminho + '?t=' + Date.now();
        img.classList.remove('hidden');
        if (empty) empty.classList.add('hidden');
        if (btnRemover) btnRemover.classList.remove('hidden');

        // Atualizar logo na navbar se for logo
        if (tipo === 'logo') {
            atualizarLogoNavbar(caminho);
        }
    }
}

function esconderPreviewImagem(tipo) {
    const img = document.getElementById(`${tipo}-preview-img`);
    const empty = document.getElementById(`${tipo}-preview-empty`);
    const btnRemover = document.getElementById(`btn-remover-${tipo}`);

    if (img) {
        img.src = '';
        img.classList.add('hidden');
    }
    if (empty) empty.classList.remove('hidden');
    if (btnRemover) btnRemover.classList.add('hidden');

    if (tipo === 'logo') {
        atualizarLogoNavbar('');
    }
}

function atualizarLogoNavbar(caminho) {
    const navbarLogo = document.getElementById('navbar-logo');
    const navbarLogoText = document.getElementById('navbar-logo-text');

    if (caminho) {
        if (navbarLogo) {
            navbarLogo.src = caminho + '?t=' + Date.now();
            navbarLogo.classList.remove('hidden');
        }
        if (navbarLogoText) navbarLogoText.classList.add('hidden');
    } else {
        if (navbarLogo) navbarLogo.classList.add('hidden');
        if (navbarLogoText) navbarLogoText.classList.remove('hidden');
    }
}

async function uploadImagem(tipo, input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('arquivo', file);

    try {
        const response = await fetch('/api/config/upload-imagem', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.sucesso) {
            mostrarPreviewImagem(tipo, data.caminho);
            const nomesTipos = { logo: 'Logo', mascote: 'Mascote', alvara: 'Alvara Sanitario' };
            showToast(`${nomesTipos[tipo] || tipo} salvo com sucesso!`, 'success');
        } else {
            showToast('Erro: ' + (data.erro || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error(`Erro ao enviar ${tipo}:`, error);
        showToast('Erro ao enviar imagem: ' + error.message, 'error');
    }

    input.value = '';
    lucide.createIcons();
}

async function removerImagem(tipo) {
    const nomesTipos = { logo: 'a logo', mascote: 'o mascote', alvara: 'o alvara sanitario' };
    if (!confirm(`Deseja realmente remover ${nomesTipos[tipo] || tipo}?`)) return;

    try {
        const response = await fetch('/api/config/remover-imagem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo })
        });

        const data = await response.json();

        if (response.ok && data.sucesso) {
            esconderPreviewImagem(tipo);
            const nomesRemover = { logo: 'Logo', mascote: 'Mascote', alvara: 'Alvara Sanitario' };
            showToast(`${nomesRemover[tipo] || tipo} removido com sucesso!`, 'success');
        } else {
            showToast('Erro: ' + (data.erro || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error(`Erro ao remover ${tipo}:`, error);
        showToast('Erro ao remover: ' + error.message, 'error');
    }

    lucide.createIcons();
}

// ============================================
//  GERENCIAMENTO DE USUARIOS
// ============================================

async function carregarUsuarios() {
    try {
        const response = await fetch('/api/usuarios');
        if (response.status === 403) {
            document.getElementById('tabela-usuarios').innerHTML =
                '<tr><td colspan="6" class="px-6 py-8 text-center text-amber-600 font-semibold">Acesso restrito a administradores</td></tr>';
            return;
        }
        if (!response.ok) return;
        const usuarios = await response.json();
        renderizarUsuarios(usuarios);
    } catch (error) {
        console.error('Erro ao carregar usuarios:', error);
    }
}

function renderizarUsuarios(usuarios) {
    const tbody = document.getElementById('tabela-usuarios');
    if (!tbody) return;

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">Nenhum usuario cadastrado</td></tr>';
        return;
    }

    tbody.innerHTML = usuarios.map(u => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-6 py-3">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full ${u.perfil === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'} flex items-center justify-center font-bold text-xs">
                        ${u.nome.charAt(0).toUpperCase()}
                    </div>
                    <span class="font-semibold text-gray-800">${u.nome}</span>
                </div>
            </td>
            <td class="px-6 py-3 text-sm text-gray-600">${u.email}</td>
            <td class="px-6 py-3 text-center">
                <span class="px-2 py-1 rounded-full text-xs font-bold ${u.perfil === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                    ${u.perfil === 'admin' ? 'Admin' : 'Operador'}
                </span>
            </td>
            <td class="px-6 py-3 text-center">
                <span class="px-2 py-1 rounded-full text-xs font-bold ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                    ${u.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td class="px-6 py-3 text-center text-sm text-gray-500">
                ${u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('pt-BR') : 'Nunca'}
            </td>
            <td class="px-6 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                    <button onclick="editarUsuario(${u.id}, '${u.nome.replace(/'/g, "\\'")}', '${u.email}', '${u.perfil}', ${u.ativo})"
                            class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition" title="Editar">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button onclick="toggleUsuario(${u.id}, ${u.ativo})"
                            class="p-1.5 ${u.ativo ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} rounded-lg transition"
                            title="${u.ativo ? 'Desativar' : 'Ativar'}">
                        <i data-lucide="${u.ativo ? 'user-x' : 'user-check'}" class="w-4 h-4"></i>
                    </button>
                    <button onclick="excluirUsuario(${u.id}, '${u.nome.replace(/'/g, "\\'")}')"
                            class="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Excluir">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function abrirModalNovoUsuario() {
    document.getElementById('modal-usuario-titulo').textContent = 'Novo Usuario';
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuario-nome').value = '';
    document.getElementById('usuario-email').value = '';
    document.getElementById('usuario-senha').value = '';
    document.getElementById('usuario-senha').required = true;
    document.getElementById('senha-hint').textContent = '(minimo 4 caracteres)';
    document.getElementById('usuario-perfil').value = 'operador';
    document.getElementById('modal-usuario').classList.remove('hidden');
    lucide.createIcons();
}

function editarUsuario(id, nome, email, perfil, ativo) {
    document.getElementById('modal-usuario-titulo').textContent = 'Editar Usuario';
    document.getElementById('usuario-id').value = id;
    document.getElementById('usuario-nome').value = nome;
    document.getElementById('usuario-email').value = email;
    document.getElementById('usuario-senha').value = '';
    document.getElementById('usuario-senha').required = false;
    document.getElementById('senha-hint').textContent = '(deixe vazio para manter a atual)';
    document.getElementById('usuario-perfil').value = perfil;
    document.getElementById('modal-usuario').classList.remove('hidden');
    lucide.createIcons();
}

function fecharModalUsuario() {
    document.getElementById('modal-usuario').classList.add('hidden');
}

async function salvarUsuario(event) {
    event.preventDefault();
    const id = document.getElementById('usuario-id').value;
    const dados = {
        nome: document.getElementById('usuario-nome').value,
        email: document.getElementById('usuario-email').value,
        senha: document.getElementById('usuario-senha').value,
        perfil: document.getElementById('usuario-perfil').value
    };

    try {
        const url = id ? `/api/usuarios/${id}` : '/api/usuarios';
        const method = id ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const data = await response.json();
        if (response.ok && data.sucesso) {
            showToast(data.mensagem, 'success');
            fecharModalUsuario();
            await carregarUsuarios();
        } else {
            showToast('Erro: ' + (data.erro || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        showToast('Erro: ' + error.message, 'error');
    }
}

async function toggleUsuario(id, ativoAtual) {
    const acao = ativoAtual ? 'desativar' : 'ativar';
    if (!confirm(`Deseja ${acao} este usuario?`)) return;

    try {
        const response = await fetch(`/api/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ativo: ativoAtual ? 0 : 1 })
        });
        const data = await response.json();
        if (response.ok) {
            await carregarUsuarios();
        } else {
            showToast('Erro: ' + (data.erro || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        showToast('Erro: ' + error.message, 'error');
    }
}

async function excluirUsuario(id, nome) {
    if (!confirm(`Deseja excluir o usuario "${nome}"? Esta acao nao pode ser desfeita.`)) return;

    try {
        const response = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok && data.sucesso) {
            showToast(data.mensagem, 'success');
            await carregarUsuarios();
        } else {
            showToast('Erro: ' + (data.erro || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        showToast('Erro: ' + error.message, 'error');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await carregarEstatisticas();
    await carregarClientes();
    await carregarModelos();
    await carregarLogoMascote();

    // Verificar parametro ?view= na URL
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const ultimaView = viewParam || localStorage.getItem('ultimaView') || 'clientes';
    mostrarView(ultimaView);

    lucide.createIcons();
});

// Carregar estatísticas
let carregandoEstatisticas = false;
async function carregarEstatisticas() {
    if (carregandoEstatisticas) return;
    carregandoEstatisticas = true;

    try {
        const responseClientes = await fetch('/api/clientes');
        if (!responseClientes.ok) throw new Error('Erro na requisição');
        const dataClientes = await responseClientes.json();
        document.getElementById('stat-clientes').textContent = dataClientes.length;
        document.getElementById('stat-ativos').textContent = dataClientes.length;

        const responseDocs = await fetch('/api/documentos-gerados');
        const dataDocs = await responseDocs.json();
        document.getElementById('stat-documentos').textContent = dataDocs.length;

        // Calcular receita estimada (exemplo)
        const receita = dataDocs.reduce((sum, doc) => sum + (doc.valor_total || 0), 0);
        document.getElementById('stat-receita').textContent = `R$ ${receita.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    } finally {
        carregandoEstatisticas = false;
    }
}

// Carregar clientes
let carregandoClientes = false;
async function carregarClientes() {
    if (carregandoClientes) return;
    carregandoClientes = true;

    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) throw new Error('Erro na requisição');
        clientes = await response.json();
        renderizarClientes(clientes);
        preencherSelectClientes(clientes);

        // Carregar avisos de garantia
        await carregarAvisosGarantia();
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    } finally {
        carregandoClientes = false;
    }
}

// ============================================
//  AVISOS DE GARANTIA
// ============================================

async function carregarAvisosGarantia() {
    try {
        const response = await fetch('/api/garantias/vencimentos?dias_antecedencia=30');
        if (!response.ok) throw new Error('Erro ao carregar avisos');

        const data = await response.json();

        if (data.sucesso && data.total > 0) {
            renderizarAvisosGarantia(data.avisos, data.resumo);
            document.getElementById('avisos-garantia-container').classList.remove('hidden');
        } else {
            document.getElementById('avisos-garantia-container').classList.add('hidden');
        }
    } catch (error) {
        console.error('Erro ao carregar avisos de garantia:', error);
    }
}

function renderizarAvisosGarantia(avisos, resumo) {
    // Atualizar resumo
    document.getElementById('resumo-vencidas').textContent = resumo.vencidas;
    document.getElementById('resumo-esta-semana').textContent = resumo.esta_semana;
    document.getElementById('resumo-proximas').textContent = resumo.proximas;

    // Renderizar lista de avisos
    const lista = document.getElementById('lista-avisos-garantia');
    lista.innerHTML = '';

    avisos.forEach(aviso => {
        const corUrgencia = {
            'critico': 'bg-red-600',
            'urgente': 'bg-orange-600',
            'atencao': 'bg-yellow-600'
        }[aviso.urgencia];

        const iconeStatus = {
            'vencida': 'x-circle',
            'vence_esta_semana': 'alert-circle',
            'proxima_vencer': 'clock'
        }[aviso.status];

        const textoStatus = {
            'vencida': `Vencida há ${Math.abs(aviso.dias_restantes)} dias`,
            'vence_esta_semana': `Vence em ${aviso.dias_restantes} dias`,
            'proxima_vencer': `Vence em ${aviso.dias_restantes} dias`
        }[aviso.status];

        const div = document.createElement('div');
        div.className = `${corUrgencia} bg-opacity-20 border-2 border-white/30 rounded-lg p-3`;
        div.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 flex-1">
                    <div class="${corUrgencia} rounded-full p-2">
                        <i data-lucide="${iconeStatus}" class="w-4 h-4 text-white"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-bold text-white">${aviso.cliente_nome}</p>
                        <p class="text-sm text-white/80">${aviso.cidade || 'Sem cidade'} • ${textoStatus}</p>
                        <p class="text-xs text-white/60 mt-1">Garantia desde: ${formatarData(aviso.data_garantia)} • Período: ${aviso.periodo_meses} meses</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="ligarCliente('${aviso.telefone}')" class="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 transition" title="Ligar">
                        <i data-lucide="phone" class="w-4 h-4 text-white"></i>
                    </button>
                    <button onclick="renovarGarantia(${aviso.cliente_id}, '${aviso.cliente_nome}')" class="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 transition" title="Renovar Garantia">
                        <i data-lucide="refresh-cw" class="w-4 h-4 text-white"></i>
                    </button>
                </div>
            </div>
        `;
        lista.appendChild(div);
    });

    lucide.createIcons();
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

function ligarCliente(telefone) {
    if (!telefone) {
        showToast('Telefone não cadastrado', 'info');
        return;
    }
    window.open(`tel:${telefone}`);
}

async function renovarGarantia(clienteId, clienteNome) {
    const dataHoje = new Date().toISOString().split('T')[0];
    const confirmar = confirm(`Renovar garantia de "${clienteNome}"?\n\nNova data de garantia: ${formatarData(dataHoje)}\nPeríodo: 12 meses`);

    if (!confirmar) return;

    try {
        const response = await fetch(`/api/clientes/${clienteId}/garantia`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data_garantia: dataHoje,
                periodo_garantia_meses: 12
            })
        });

        const data = await response.json();

        if (response.ok && data.sucesso) {
            showToast('✅ Garantia renovada com sucesso!', 'success');
            await carregarAvisosGarantia(); // Recarregar avisos
        } else {
            showToast('Erro: ' + (data.erro || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error('Erro ao renovar garantia:', error);
        showToast('Erro ao renovar garantia', 'error');
    }
}

async function recarregarAvisosGarantia() {
    await carregarAvisosGarantia();
    showToast('🔄 Avisos de garantia atualizados', 'info');
}

// Renderizar tabela de clientes
function renderizarClientes(lista) {
    const tbody = document.getElementById('tbody-clientes');
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">Nenhum cliente cadastrado</td></tr>';
        return;
    }

    lista.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-indigo-50 transition cursor-pointer';

        // Tornar a linha clicável para abrir detalhes
        tr.onclick = () => mostrarDetalhesCliente(cliente.id);

        tr.innerHTML = `
            <td class="px-4 py-3">
                <div class="font-bold text-gray-800">${cliente.nome_fantasia}</div>
                <div class="text-xs text-gray-600">${cliente.razao_social || '-'}</div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-700">${cliente.cnpj || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${cliente.cidade || '-'}/${cliente.uf || ''}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${cliente.telefone || '-'}</td>
            <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
                <div class="flex gap-1.5 justify-center flex-wrap">
                    <button onclick="mostrarDetalhesCliente(${cliente.id})" class="px-2.5 py-1.5 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition" title="Ver Detalhes">
                        <i data-lucide="eye" class="w-3.5 h-3.5 inline"></i>
                    </button>
                    <button onclick="irParaDocumentosCliente('${cliente.nome_fantasia}')" class="px-2.5 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition" title="Ver Documentos">
                        <i data-lucide="files" class="w-3.5 h-3.5 inline"></i>
                    </button>
                    <button onclick="mostrarView('administracao')" class="px-2.5 py-1.5 bg-cyan-600 text-white rounded text-xs font-bold hover:bg-cyan-700 transition" title="Administracao">
                        <i data-lucide="settings" class="w-3.5 h-3.5 inline"></i>
                    </button>
                    <button onclick="editarCliente(${cliente.id})" class="px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition" title="Editar">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5 inline"></i>
                    </button>
                    <button onclick="gerarDocumentoRapido(${cliente.id})" class="px-2.5 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition" title="Gerar Documento">
                        <i data-lucide="file-plus" class="w-3.5 h-3.5 inline"></i>
                    </button>
                    <button onclick="excluirCliente(${cliente.id})" class="px-2.5 py-1.5 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition" title="Excluir">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

// Preencher select de clientes
function preencherSelectClientes(lista) {
    // Select antigo (se existir)
    const select = document.getElementById('select-cliente');
    if (select) {
        select.innerHTML = '<option value="">Selecione um cliente...</option>';
        lista.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = `${cliente.nome_fantasia} - ${cliente.cnpj || 'Sem CNPJ'}`;
            select.appendChild(option);
        });
    }

    // Renderizar cards de clientes para seleção na geração de documentos
    renderizarCardsClientesSelecao(lista);
}

// Renderizar cards de clientes para seleção
let todosClientesCards = [];
function renderizarCardsClientesSelecao(lista) {
    todosClientesCards = lista;
    const grid = document.getElementById('grid-clientes-selecao');
    if (!grid) return;

    if (!lista || lista.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i data-lucide="user-x" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                <p class="font-semibold">Nenhum cliente cadastrado</p>
                <p class="text-sm mt-1">Cadastre um cliente primeiro</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    grid.innerHTML = lista.map(cliente => {
        const cidade = cliente.cidade || 'Não informada';
        const cnpj = cliente.cnpj || 'Sem CNPJ';
        const nomeEscaped = (cliente.nome_fantasia || '').replace(/'/g, "\\'");
        const cnpjEscaped = cnpj.replace(/'/g, "\\'");
        const cidadeEscaped = cidade.replace(/'/g, "\\'");

        return `
            <div class="card-cliente-selecao border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-indigo-500 hover:shadow-lg transition-all transform hover:scale-105 bg-white"
                 data-cliente-id="${cliente.id}"
                 onclick="selecionarClienteCard(${cliente.id}, '${nomeEscaped}', '${cnpjEscaped}', '${cidadeEscaped}')">
                <div class="flex items-start gap-3">
                    <div class="bg-indigo-100 rounded-full p-2 flex-shrink-0">
                        <i data-lucide="building-2" class="w-5 h-5 text-indigo-600"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-gray-800 truncate text-sm mb-1">${cliente.nome_fantasia}</h4>
                        <p class="text-xs text-gray-600 truncate"><i data-lucide="file-text" class="w-3 h-3 inline"></i> ${cnpj}</p>
                        <p class="text-xs text-indigo-600 truncate mt-1"><i data-lucide="map-pin" class="w-3 h-3 inline"></i> ${cidade}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// Filtrar cards de clientes
function filtrarClientesCards(termoPesquisa) {
    const termo = termoPesquisa.toLowerCase().trim();

    if (!termo) {
        renderizarCardsClientesSelecao(todosClientesCards);
        return;
    }

    const filtrados = todosClientesCards.filter(cliente => {
        return (
            cliente.nome_fantasia?.toLowerCase().includes(termo) ||
            cliente.razao_social?.toLowerCase().includes(termo) ||
            cliente.cnpj?.includes(termo) ||
            cliente.cidade?.toLowerCase().includes(termo)
        );
    });

    renderizarCardsClientesSelecao(filtrados);
}

// Cliente selecionado completo (dados completos do banco)
let clienteSelecionadoCompleto = null;

// Selecionar cliente via card
function selecionarClienteCard(id, nome, cnpj, cidade) {
    // Preencher input hidden
    document.getElementById('cliente-id-selecionado').value = id;

    // Buscar dados completos do cliente no array local
    clienteSelecionadoCompleto = todosClientesCards.find(c => c.id === id) || null;

    // Mostrar display de cliente selecionado
    document.getElementById('nome-cliente-selecionado').textContent = nome;
    document.getElementById('info-cliente-selecionado').textContent = `${cnpj} • ${cidade}`;
    document.getElementById('cliente-selecionado-display').classList.remove('hidden');

    // Esconder grid de clientes
    document.getElementById('grid-clientes-selecao').classList.add('hidden');
    document.getElementById('pesquisa-cliente').parentElement.classList.add('hidden');

    // Atualizar previews de cliente nos blocos de Recibo e Orcamento
    atualizarPreviewClienteDocumentos();

    lucide.createIcons();
}

// Atualizar preview dos dados do cliente nos blocos de Recibo e Orcamento
function atualizarPreviewClienteDocumentos() {
    if (!clienteSelecionadoCompleto) return;

    const cliente = clienteSelecionadoCompleto;
    const nomeFantasia = (cliente.nome_fantasia || '').toUpperCase();
    const cnpj = cliente.cnpj || 'Sem CNPJ';
    const endereco = (cliente.endereco_completo || cliente.rua || '').replace('4445', 'Divinopolis');

    // Atualizar preview no bloco Orcamento
    const orcInfo = document.getElementById('orcamento-cliente-info');
    if (orcInfo) {
        document.getElementById('orcamento-cliente-nome').textContent = nomeFantasia;
        document.getElementById('orcamento-cliente-cnpj').textContent = cnpj;
        document.getElementById('orcamento-cliente-endereco').textContent = endereco;
        orcInfo.classList.remove('hidden');
    }

    // Atualizar preview no bloco Recibo
    const recInfo = document.getElementById('recibo-cliente-info');
    if (recInfo) {
        document.getElementById('recibo-cliente-nome').textContent = nomeFantasia;
        document.getElementById('recibo-cliente-cnpj').textContent = cnpj;
        document.getElementById('recibo-cliente-endereco').textContent = endereco;
        recInfo.classList.remove('hidden');
    }

    lucide.createIcons();
}

// Abrir geradores visuais em nova aba com dados do cliente
function abrirGeradorRecibo() {
    if (clienteSelecionadoCompleto) {
        sessionStorage.setItem('clienteDocumento', JSON.stringify(clienteSelecionadoCompleto));
    }
    window.open('/gerador/recibo', '_blank');
}

function abrirGeradorOrcamento() {
    if (clienteSelecionadoCompleto) {
        sessionStorage.setItem('clienteDocumento', JSON.stringify(clienteSelecionadoCompleto));
    }
    window.open('/gerador/orcamento', '_blank');
}

function abrirGeradorLaudo() {
    if (clienteSelecionadoCompleto) {
        sessionStorage.setItem('clienteDocumento', JSON.stringify(clienteSelecionadoCompleto));
    }
    window.open('/gerador/laudo', '_blank');
}

// Limpar previews de cliente nos blocos de documento
function limparPreviewClienteDocumentos() {
    clienteSelecionadoCompleto = null;

    const orcInfo = document.getElementById('orcamento-cliente-info');
    if (orcInfo) orcInfo.classList.add('hidden');

    const recInfo = document.getElementById('recibo-cliente-info');
    if (recInfo) recInfo.classList.add('hidden');
}

// Limpar seleção de cliente
function limparSelecaoCliente() {
    // Limpar input hidden
    document.getElementById('cliente-id-selecionado').value = '';

    // Esconder display
    document.getElementById('cliente-selecionado-display').classList.add('hidden');

    // Limpar previews de cliente nos blocos de documento
    limparPreviewClienteDocumentos();

    // Mostrar grid novamente
    document.getElementById('grid-clientes-selecao').classList.remove('hidden');
    document.getElementById('pesquisa-cliente').parentElement.classList.remove('hidden');
    document.getElementById('pesquisa-cliente').value = '';

    // Renderizar todos os clientes novamente
    renderizarCardsClientesSelecao(todosClientesCards);

    lucide.createIcons();
}

// ============================================
//  SELEÇÃO DE MODELOS POR CATEGORIA
// ============================================

// Toggle categoria de documento
function toggleCategoria(categoria) {
    const areaSubmodelos = document.getElementById('area-submodelos');
    const gridSubmodelos = document.getElementById('grid-submodelos');
    const tituloCategoria = document.getElementById('titulo-categoria-expandida');

    // Filtrar modelos por categoria
    let modelosFiltrados = [];
    let tituloCat = '';

    if (categoria === 'laudos') {
        tituloCat = 'Selecione um Laudo';
        modelosFiltrados = modelosDisponiveis.filter(m =>
            m.nome.toLowerCase().includes('laudo')
        );
    } else if (categoria === 'recibos') {
        tituloCat = 'Selecione um Recibo';
        modelosFiltrados = modelosDisponiveis.filter(m =>
            m.nome.toLowerCase().includes('recibo')
        );
    } else if (categoria === 'orcamentos') {
        tituloCat = 'Selecione um Orçamento';
        modelosFiltrados = modelosDisponiveis.filter(m =>
            m.nome.toLowerCase().includes('orcamento') || m.nome.toLowerCase().includes('orçamento')
        );
    }

    // Atualizar título
    tituloCategoria.textContent = tituloCat;

    // Renderizar submodelos
    if (modelosFiltrados.length === 0) {
        gridSubmodelos.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i data-lucide="file-x" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                <p class="font-semibold">Nenhum modelo encontrado</p>
                <p class="text-sm mt-1">Adicione modelos desta categoria</p>
            </div>
        `;
    } else {
        gridSubmodelos.innerHTML = modelosFiltrados.map(modelo => {
            const nomeEscaped = modelo.nome.replace(/'/g, "\\'");
            const arquivoEscaped = modelo.arquivo.replace(/'/g, "\\'");

            return `
                <div class="card-submodelo border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all transform hover:scale-105 bg-white"
                     onclick="selecionarModelo('${arquivoEscaped}', '${nomeEscaped}', ${modelo.total_variaveis})">
                    <div class="flex items-start gap-3">
                        <div class="bg-purple-100 rounded-full p-2 flex-shrink-0">
                            <i data-lucide="file-text" class="w-5 h-5 text-purple-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-gray-800 text-sm mb-1 truncate">${modelo.nome}</h4>
                            <p class="text-xs text-purple-600"><i data-lucide="database" class="w-3 h-3 inline"></i> ${modelo.total_variaveis} variáveis</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Mostrar área de submodelos
    areaSubmodelos.classList.remove('hidden');

    lucide.createIcons();
}

// Fechar área de submodelos
function fecharSubmodelos() {
    document.getElementById('area-submodelos').classList.add('hidden');
}

// Selecionar modelo
function selecionarModelo(arquivo, nome, totalVariaveis) {
    // Preencher input hidden
    document.getElementById('modelo-selecionado').value = arquivo;

    // Mostrar display de modelo selecionado
    document.getElementById('nome-modelo-selecionado').textContent = nome;
    document.getElementById('info-modelo-selecionado').textContent = `${totalVariaveis} variáveis detectadas`;
    document.getElementById('modelo-selecionado-display').classList.remove('hidden');

    // Esconder categorias e submodelos
    document.querySelectorAll('.card-categoria').forEach(card => {
        card.style.display = 'none';
    });
    document.getElementById('area-submodelos').classList.add('hidden');

    // Carregar variáveis do modelo
    carregarVariaveisModeloNovo(arquivo);

    lucide.createIcons();
}

// Limpar seleção de modelo
function limparSelecaoModelo() {
    // Limpar input hidden
    document.getElementById('modelo-selecionado').value = '';

    // Esconder display
    document.getElementById('modelo-selecionado-display').classList.add('hidden');

    // Mostrar cards de categoria novamente
    document.querySelectorAll('.card-categoria').forEach(card => {
        card.style.display = 'block';
    });

    // Esconder container de variáveis
    document.getElementById('container-variaveis').classList.add('hidden');

    lucide.createIcons();
}

// Carregar variáveis do modelo (nova função para o novo sistema)
function carregarVariaveisModeloNovo(arquivo) {
    const modelo = modelosDisponiveis.find(m => m.arquivo === arquivo);

    if (!modelo) {
        console.error('Modelo não encontrado:', arquivo);
        return;
    }

    // Atualizar modeloSelecionado
    modeloSelecionado = modelo;

    // Chamar função existente de carregamento de variáveis
    const container = document.getElementById('container-variaveis');
    container.classList.remove('hidden');

    // Exibir blocos específicos baseado no tipo de modelo
    const blocoPragas = document.getElementById('bloco-pragas');
    const blocoOrcamento = document.getElementById('bloco-orcamento');
    const blocoTabelaItens = document.getElementById('bloco-tabela-itens');
    const campoGarantia = document.getElementById('campo-garantia-container');

    // Esconder todos primeiro
    if (blocoPragas) blocoPragas.classList.add('hidden');
    if (blocoOrcamento) blocoOrcamento.classList.add('hidden');
    if (blocoTabelaItens) blocoTabelaItens.classList.add('hidden');

    // Mostrar blocos conforme o tipo de documento
    if (modelo.nome.toLowerCase().includes('laudo')) {
        if (blocoPragas) blocoPragas.classList.remove('hidden');
        if (campoGarantia) campoGarantia.style.display = 'block';
    } else if (modelo.nome.toLowerCase().includes('orcamento') || modelo.nome.toLowerCase().includes('orçamento')) {
        if (blocoOrcamento) blocoOrcamento.classList.remove('hidden');
        if (campoGarantia) campoGarantia.style.display = 'none';
    } else if (modelo.nome.toLowerCase().includes('recibo')) {
        if (blocoTabelaItens) blocoTabelaItens.classList.remove('hidden');
        if (campoGarantia) campoGarantia.style.display = 'block';
    }

    // Atualizar previews do cliente se ja houver um selecionado
    if (clienteSelecionadoCompleto) {
        atualizarPreviewClienteDocumentos();
    }

    lucide.createIcons();
}

// Buscar clientes
async function buscarClientes() {
    const nome = document.getElementById('filtro-nome').value.toLowerCase();
    const cidade = document.getElementById('filtro-cidade').value.toLowerCase();
    const cnpj = document.getElementById('filtro-cnpj').value.toLowerCase();

    const filtrados = clientes.filter(c => {
        const matchNome = !nome || c.nome_fantasia.toLowerCase().includes(nome);
        const matchCidade = !cidade || (c.cidade && c.cidade.toLowerCase().includes(cidade));
        const matchCnpj = !cnpj || (c.cnpj && c.cnpj.includes(cnpj));
        return matchNome && matchCidade && matchCnpj;
    });

    renderizarClientes(filtrados);
}

// Mostrar view
function mostrarView(view) {
    // Redirecionar views removidas
    if (view === 'analise' || view === 'configuracoes') {
        view = 'administracao';
    }

    // Esconder todas as views
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));

    // Mostrar view selecionada
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) {
        viewEl.classList.remove('hidden');
    } else {
        document.getElementById('view-clientes')?.classList.remove('hidden');
        view = 'clientes';
    }

    // Atualizar botões
    document.querySelectorAll('[id^="btn-"]').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('text-gray-600', 'hover:bg-gray-100');
    });

    const btnAtivo = document.getElementById(`btn-${view}`);
    if (btnAtivo) {
        btnAtivo.classList.add('bg-indigo-600', 'text-white');
        btnAtivo.classList.remove('text-gray-600', 'hover:bg-gray-100');
    }

    viewAtual = view;

    // Salvar última view no localStorage para persistir após refresh
    localStorage.setItem('ultimaView', view);

    // Carregar dados específicos da view
    if (view === 'administracao') {
        carregarLogoMascote();
        carregarUsuarios();
    } else if (view === 'documentos') {
        buscarDocumentos();
    }

    lucide.createIcons();
}

// Form: Cadastrar cliente
document.getElementById('form-cliente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dados = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            showToast('Cliente cadastrado com sucesso!', 'success');
            e.target.reset();
            await carregarClientes();
            await carregarEstatisticas();
            mostrarView('clientes');
        } else {
            const error = await response.json();
            showToast('Erro: ' + (error.erro || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error('Erro ao cadastrar cliente:', error);
        showToast('Erro ao cadastrar cliente', 'error');
    }
});

// Handler do formulário de edição de cliente
document.getElementById('form-editar-cliente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dados = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            showToast('Cliente atualizado com sucesso!', 'success');
            await carregarClientes();
            await carregarEstatisticas();
            mostrarView('clientes');
        } else {
            const error = await response.json();
            showToast('Erro: ' + (error.erro || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao cadastrar cliente', 'error');
    }
});

// ========== GERAÇÃO INTELIGENTE DE DOCUMENTOS ==========

let modelosDisponiveis = [];
let modeloSelecionado = null;

// Carregar modelos disponíveis
let carregandoModelos = false;
async function carregarModelos() {
    if (carregandoModelos) return; // Evita múltiplas chamadas simultâneas
    carregandoModelos = true;

    try {
        const response = await fetch('/api/modelos/listar');
        if (!response.ok) throw new Error('Erro na requisição');
        const data = await response.json();
        modelosDisponiveis = data.modelos;

        // CÓDIGO ANTIGO DO SELECT - Agora usamos sistema de cards
        // Mantido comentado caso precise reverter
        /*
        const select = document.getElementById('select-modelo');
        select.innerHTML = '<option value="">Selecione um modelo...</option>';
        ... código do select antigo removido ...
        */

        // Modelos agora são exibidos via sistema de cards (toggleCategoria)
    } catch (error) {
        console.error('Erro ao carregar modelos:', error);
        // Apenas mostra erro se for um problema real, não de múltiplas chamadas
        if (error.message !== 'Erro na requisição') {
            showToast('Erro ao carregar modelos de documentos', 'error');
        }
    } finally {
        carregandoModelos = false;
    }
}

// Carregar variáveis do modelo selecionado
// FUNÇÃO ANTIGA - Agora usamos carregarVariaveisModeloNovo() com sistema de cards
function carregarVariaveisModelo() {
    // Esta função foi substituída e não deve mais ser chamada
    console.warn('[AVISO] carregarVariaveisModelo() é obsoleta. Use carregarVariaveisModeloNovo()');
    return; // Função desativada

    /* CÓDIGO ANTIGO DESATIVADO - Agora usamos sistema de cards
    // Variáveis que serão preenchidas automaticamente
    const variaveisAuto = [
        // Identificação do cliente
        'nome', 'nome_fantasia', 'nome_razao_social', 'razao_social', 'cliente', 'empresa',
        // Documentos
        'cnpj', 'cnpj_cliente', 'cnae', 'cnae_cliente',
        // Endereço
        'rua', 'numero', 'bairro', 'cidade', 'uf', 'cep',
        'endereco', 'endereco_completo', 'endereco_cliente',
        // Contato
        'telefone', 'email',
        // Datas (DATA será campo especial)
        'data', 'data_hoje', 'data_atual', 'mes', 'ano', 'hora',
        // Cálculos automáticos (baseados em variáveis extras)
        'Proximo_servico_caixa',  // Sempre +6 meses
        'Proximo_servico',        // Calculado baseado em numero_meses
        'valortotal', 'valortotal1', 'valortotal2', 'valortotal3',  // quant * valor
        'valorsomatotal'          // Soma de todos os valortotal
    ];

    // Variáveis de pragas (controladas por checkboxes, não campos de texto)
    const variaveisPragas = ['B', 'C', 'F', 'M', 'O', 'P', 'R', 'V', 'W'];

    // Variáveis com campos especiais (não aparecem como campos normais)
    const variaveisEspeciais = ['DATA', 'numero_meses'];

    // Separar variáveis extras (que não são automáticas, pragas ou especiais)
    const extras = variaveis.filter(v =>
        !variaveisAuto.includes(v) &&
        !variaveisPragas.includes(v) &&
        !variaveisEspeciais.includes(v)
    );

    // Variáveis extras agora estão no card expansível de detalhamento
    // Não precisamos mais criar campos dinamicamente aqui

    document.getElementById('container-variaveis').classList.remove('hidden');

    // Preencher campo de data com a data de hoje
    const campoData = document.getElementById('campo-data-servico');
    if (campoData) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        campoData.value = `${ano}-${mes}-${dia}`;
    }

    // RENDERIZAÇÃO CONDICIONAL: Mostrar Pragas (Laudos), Tabela (Recibos) ou Orçamento
    const nomeModelo = modeloSelecionado.nome.toLowerCase();
    const blocoPragas = document.getElementById('bloco-pragas');
    const blocoTabela = document.getElementById('bloco-tabela-itens');
    const blocoOrcamento = document.getElementById('bloco-orcamento');
    const campoGarantia = document.getElementById('campo-garantia-container');

    if (nomeModelo.includes('laudo')) {
        // LAUDO: Mostrar pragas e garantia, ocultar tabela e orçamento
        blocoPragas.classList.remove('hidden');
        blocoTabela.classList.add('hidden');
        blocoOrcamento.classList.add('hidden');
        if (campoGarantia) campoGarantia.classList.remove('hidden');
    } else if (nomeModelo.includes('orcamento') || nomeModelo.includes('orçamento')) {
        // ORÇAMENTO: Mostrar bloco de orçamento, ocultar pragas e tabela
        blocoPragas.classList.add('hidden');
        blocoTabela.classList.add('hidden');
        blocoOrcamento.classList.remove('hidden');
        if (campoGarantia) campoGarantia.classList.add('hidden');  // Orçamentos não têm garantia
    } else if (nomeModelo.includes('recibo')) {
        // RECIBO: Mostrar tabela e garantia, ocultar pragas e orçamento
        blocoPragas.classList.add('hidden');
        blocoTabela.classList.remove('hidden');
        blocoOrcamento.classList.add('hidden');
        if (campoGarantia) campoGarantia.classList.remove('hidden');
    } else {
        // Padrão: Mostrar pragas, ocultar resto
        blocoPragas.classList.remove('hidden');
        blocoTabela.classList.add('hidden');
        blocoOrcamento.classList.add('hidden');
        if (campoGarantia) campoGarantia.classList.remove('hidden');
    }

    lucide.createIcons();
    */ // FIM DO CÓDIGO ANTIGO COMENTADO
}

// Função para calcular totais em tempo real
// Função para expandir/colapsar detalhamento de recibo
function toggleDetalhamento() {
    const conteudo = document.getElementById('conteudo-detalhamento');
    const icon = document.getElementById('icon-toggle-detalhamento');

    if (conteudo.classList.contains('hidden')) {
        conteudo.classList.remove('hidden');
        icon.setAttribute('data-lucide', 'chevron-up');
    } else {
        conteudo.classList.add('hidden');
        icon.setAttribute('data-lucide', 'chevron-down');
    }

    // Recriar ícones do Lucide
    lucide.createIcons();
}

// Função para converter número em extenso (0-999)
function numeroParaExtenso999(num) {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezADezenove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    if (num === 0) return '';
    if (num === 100) return 'cem';

    let resultado = '';

    // Centenas
    let c = Math.floor(num / 100);
    let resto = num % 100;

    if (c > 0) {
        resultado = centenas[c];
        if (resto > 0) resultado += ' e ';
    }

    // Dezenas e unidades
    if (resto >= 10 && resto < 20) {
        resultado += dezADezenove[resto - 10];
    } else {
        let d = Math.floor(resto / 10);
        let u = resto % 10;

        if (d > 0) {
            resultado += dezenas[d];
            if (u > 0) resultado += ' e ';
        }

        if (u > 0) {
            resultado += unidades[u];
        }
    }

    return resultado;
}

// Função para converter valor monetário completo para extenso
function valorParaExtenso(valor) {
    // Valor vem em centavos (ex: 100000 = R$ 1.000,00)
    let reais = Math.floor(valor / 100);
    let centavos = valor % 100;

    if (reais === 0 && centavos === 0) {
        return 'zero reais';
    }

    let resultado = '';

    // Processar milhares
    let milhares = Math.floor(reais / 1000);
    let restanteReais = reais % 1000;

    // REGRA ESPECIAL: "Hum" para 1.000 até 1.999
    if (reais >= 1000 && reais < 2000) {
        resultado = 'Hum mil';
        if (restanteReais > 0) {
            resultado += ' ' + numeroParaExtenso999(restanteReais);
        }
    } else if (milhares > 0) {
        if (milhares === 1) {
            resultado = 'mil';
        } else {
            resultado = numeroParaExtenso999(milhares) + ' mil';
        }

        if (restanteReais > 0) {
            resultado += ' ' + numeroParaExtenso999(restanteReais);
        }
    } else {
        resultado = numeroParaExtenso999(reais);
    }

    // Adicionar "reais" ou "real"
    if (reais === 1) {
        resultado += ' real';
    } else {
        resultado += ' reais';
    }

    // Processar centavos
    if (centavos > 0) {
        resultado += ' e ' + numeroParaExtenso999(centavos);
        if (centavos === 1) {
            resultado += ' centavo';
        } else {
            resultado += ' centavos';
        }
    }

    return resultado;
}

// Função para formatar valor monetário automaticamente
function formatarValorMonetario(input) {
    // Pegar apenas números do valor digitado
    let valor = input.value.replace(/\D/g, '');

    // Se vazio, limpar campos
    if (valor === '') {
        input.value = '';
        document.querySelector('input[name="extra_escrito"]').value = '';
        return;
    }

    // Converter para número
    let numero = parseInt(valor);

    // Formatar como moeda brasileira
    // Dividir por 100 para adicionar os centavos
    let valorFormatado = (numero / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    });

    // Converter para extenso
    let valorExtenso = valorParaExtenso(numero);

    // Atualizar os campos
    input.value = valorFormatado;
    document.querySelector('input[name="extra_escrito"]').value = valorExtenso;
}

function calcularTotais() {
    let somaTotal = 0;

    // Linha 1
    const quant = parseFloat(document.querySelector('input[name="extra_quant"]')?.value) || 0;
    const valor = parseFloat(document.querySelector('input[name="extra_valor"]')?.value) || 0;
    const valortotal = quant * valor;
    const displayTotal = document.getElementById('valortotal-display');
    if (displayTotal) {
        displayTotal.value = `R$ ${valortotal.toFixed(2).replace('.', ',')}`;
    }
    somaTotal += valortotal;

    // Linha 2
    const quant1 = parseFloat(document.querySelector('input[name="extra_quant1"]')?.value) || 0;
    const valor1 = parseFloat(document.querySelector('input[name="extra_valor1"]')?.value) || 0;
    const valortotal1 = quant1 * valor1;
    const displayTotal1 = document.getElementById('valortotal1-display');
    if (displayTotal1) {
        displayTotal1.value = `R$ ${valortotal1.toFixed(2).replace('.', ',')}`;
    }
    somaTotal += valortotal1;

    // Linha 3
    const quant2 = parseFloat(document.querySelector('input[name="extra_quant2"]')?.value) || 0;
    const valor2 = parseFloat(document.querySelector('input[name="extra_valor2"]')?.value) || 0;
    const valortotal2 = quant2 * valor2;
    const displayTotal2 = document.getElementById('valortotal2-display');
    if (displayTotal2) {
        displayTotal2.value = `R$ ${valortotal2.toFixed(2).replace('.', ',')}`;
    }
    somaTotal += valortotal2;

    // Linha 4
    const quant3 = parseFloat(document.querySelector('input[name="extra_quant3"]')?.value) || 0;
    const valor3 = parseFloat(document.querySelector('input[name="extra_valor3"]')?.value) || 0;
    const valortotal3 = quant3 * valor3;
    const displayTotal3 = document.getElementById('valortotal3-display');
    if (displayTotal3) {
        displayTotal3.value = `R$ ${valortotal3.toFixed(2).replace('.', ',')}`;
    }
    somaTotal += valortotal3;

    // Atualizar total geral
    const displaySomaTotal = document.getElementById('valorsomatotal-display');
    if (displaySomaTotal) {
        displaySomaTotal.textContent = `R$ ${somaTotal.toFixed(2).replace('.', ',')}`;
    }
}

// Form: Gerar documento inteligente
document.getElementById('form-gerar-documento')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Pegar valores dos inputs hidden (novo sistema de cards)
    const clienteId = document.getElementById('cliente-id-selecionado').value;
    const modelo = document.getElementById('modelo-selecionado').value;

    if (!clienteId || !modelo) {
        showToast('Selecione cliente e modelo', 'error');
        return;
    }

    // Verificar tipo de documento
    const nomeModelo = modeloSelecionado?.nome?.toLowerCase() || '';
    const isOrcamento = nomeModelo.includes('orcamento') || nomeModelo.includes('orçamento');
    const isRecibo = nomeModelo.includes('recibo');

    // Redirecionar para geradores visuais se for recibo ou orçamento
    if (isRecibo || isOrcamento) {
        // Salvar dados do cliente no sessionStorage para o gerador
        if (clienteSelecionadoCompleto) {
            sessionStorage.setItem('clienteDocumento', JSON.stringify(clienteSelecionadoCompleto));
        }
        const url = isRecibo ? '/gerador/recibo' : '/gerador/orcamento';
        window.open(url, '_blank');
        return;
    }

    // Coletar variáveis extras
    const formData = new FormData(e.target);
    const variaveisExtras = {};

    for (const [key, value] of formData.entries()) {
        if (key.startsWith('extra_') && value.trim()) {
            const varName = key.replace('extra_', '');

            // Formatar DATA
            if (varName === 'DATA') {
                const [ano, mes, dia] = value.split('-');

                // Se for ORÇAMENTO, converter para extenso
                if (isOrcamento) {
                    const meses = [
                        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
                    ];
                    const diaFormatado = dia.padStart(2, '0');
                    const mesExtenso = meses[parseInt(mes) - 1];
                    variaveisExtras[varName] = `${diaFormatado} de ${mesExtenso} de ${ano}`;
                } else {
                    // Para outros modelos, usar DD/MM/YYYY
                    variaveisExtras[varName] = `${dia}/${mes}/${ano}`;
                }
            } else {
                variaveisExtras[varName] = value;
            }
        }
    }

    // Coletar pragas controladas (checkboxes)
    const pragas = {
        'B': document.querySelector('input[name="praga_B"]')?.checked || false,
        'R': document.querySelector('input[name="praga_R"]')?.checked || false,
        'C': document.querySelector('input[name="praga_C"]')?.checked || false,
        'P': document.querySelector('input[name="praga_P"]')?.checked || false,
        'W': document.querySelector('input[name="praga_W"]')?.checked || false,
        'V': document.querySelector('input[name="praga_V"]')?.checked || false,
        'M': document.querySelector('input[name="praga_M"]')?.checked || false,
        'F': document.querySelector('input[name="praga_F"]')?.checked || false,
        'O': document.querySelector('input[name="praga_O"]')?.checked || false
    };

    // Adicionar as pragas como variáveis extras (X se marcado, vazio se não)
    for (const [letra, marcado] of Object.entries(pragas)) {
        variaveisExtras[letra] = marcado ? 'X' : '';
    }

    // Calcular e adicionar totais para Recibos/Orçamentos
    if (variaveisExtras.quant && variaveisExtras.valor) {
        const quant = parseFloat(variaveisExtras.quant);
        const valor = parseFloat(variaveisExtras.valor);
        const total = quant * valor;

        // Formatar valores para o padrão brasileiro
        variaveisExtras.valortotal = `R$ ${total.toFixed(2).replace('.', ',')}`;
        variaveisExtras.valorsomatotal = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    try {
        const btn = document.getElementById('btn-gerar-doc-inteligente');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 inline mr-2 animate-spin"></i> Gerando documento...';
        lucide.createIcons();


        const response = await fetch('/api/documento/gerar-inteligente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                cliente_id: parseInt(clienteId),
                modelo: modelo,
                variaveis_extras: variaveisExtras
            })
        });

        const data = await response.json();

        if (response.ok && data.sucesso) {
            // Mostrar resultado
            document.getElementById('resultado-arquivo').textContent = data.arquivo;
            document.getElementById('resultado-download').href = `/download/${encodeURIComponent(data.arquivo)}`;
            document.getElementById('resultado-download').download = data.arquivo;
            document.getElementById('resultado-visualizar').onclick = () => visualizarDocumento(data.arquivo);
            document.getElementById('resultado-geracao').classList.remove('hidden');

            // Abrir documento automaticamente no navegador (convertido para HTML)
            window.open(`/api/visualizar-documento/${encodeURIComponent(data.arquivo)}`, '_blank');

            // Limpar formulário
            e.target.reset();
            document.getElementById('container-variaveis').classList.add('hidden');

            showToast('Documento gerado com sucesso!', 'success');
            lucide.createIcons();
        } else {
            showToast('Erro: ' + (data.erro || data.detalhes || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao gerar documento: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('btn-gerar-doc-inteligente');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles" class="w-6 h-6 inline mr-2"></i> Gerar Documento Inteligente <i data-lucide="arrow-right" class="w-5 h-5 inline ml-2"></i>';
        lucide.createIcons();
    }
});

// Excluir cliente
async function excluirCliente(id) {
    if (!confirm('Deseja realmente excluir este cliente?')) return;

    try {
        const response = await fetch(`/api/clientes/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Cliente excluído!', 'success');
            await carregarClientes();
            await carregarEstatisticas();
        } else {
            showToast('Erro ao excluir cliente', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao excluir cliente', 'error');
    }
}

// Gerar documento rápido
function gerarDocumentoRapido(clienteId) {
    // Pré-selecionar cliente no novo sistema de cards
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
        selecionarClienteCard(cliente.id, cliente.nome_fantasia, cliente.cnpj || '', cliente.cidade || '');
    }

    // Limpar seleção de modelo e resultados
    limparSelecaoModelo();
    document.getElementById('container-variaveis')?.classList.add('hidden');
    document.getElementById('resultado-geracao')?.classList.add('hidden');

    mostrarView('gerar-documento');
}

// Editar cliente
async function editarCliente(clienteId) {
    try {
        // Buscar dados do cliente
        const cliente = clientes.find(c => c.id === clienteId);

        if (!cliente) {
            showToast('Cliente não encontrado', 'error');
            return;
        }

        // Preencher formulário de edição
        document.getElementById('edit-cliente-id').value = cliente.id;
        document.getElementById('edit-nome-fantasia').value = cliente.nome_fantasia || '';
        document.getElementById('edit-razao-social').value = cliente.razao_social || '';
        document.getElementById('edit-cnpj').value = cliente.cnpj || '';
        document.getElementById('edit-cnae').value = cliente.cnae || '';
        document.getElementById('edit-rua').value = cliente.rua || '';
        document.getElementById('edit-numero').value = cliente.numero || '';
        document.getElementById('edit-bairro').value = cliente.bairro || '';

        // Formatar cidade (substituir 4445 por Divinópolis)
        let cidadeEdit = cliente.cidade || '';
        if (cidadeEdit === '4445') {
            cidadeEdit = 'Divinópolis';
        }
        document.getElementById('edit-cidade').value = cidadeEdit;

        document.getElementById('edit-uf').value = cliente.uf || '';
        document.getElementById('edit-cep').value = cliente.cep || '';
        document.getElementById('edit-telefone').value = cliente.telefone || '';
        document.getElementById('edit-email').value = cliente.email || '';

        // Mostrar view de edição
        mostrarView('editar-cliente');

    } catch (error) {
        console.error('Erro ao carregar cliente para edição:', error);
        showToast('Erro ao carregar dados do cliente', 'error');
    }
}

// Variável global para guardar cliente atual
let clienteAtual = null;

// Mostrar detalhes do cliente em modal
async function mostrarDetalhesCliente(clienteId) {
    try {
        // Buscar dados completos do cliente
        const cliente = clientes.find(c => c.id === clienteId);

        if (!cliente) {
            showToast('Cliente não encontrado', 'error');
            return;
        }

        clienteAtual = cliente;

        // Formatar cidade (substituir código 4445 por Divinópolis)
        let cidadeFormatada = cliente.cidade || '-';
        if (cidadeFormatada === '4445') {
            cidadeFormatada = 'Divinópolis';
        }

        // Preencher modal com dados do cliente
        document.getElementById('modal-cliente-nome').textContent = cliente.nome_fantasia || 'Sem nome';
        document.getElementById('modal-cliente-razao').textContent = cliente.razao_social || 'Não informado';

        // Informações básicas
        document.getElementById('modal-cliente-cnpj').textContent = formatarCNPJ(cliente.cnpj) || 'Não informado';
        document.getElementById('modal-cliente-cnae').textContent = formatarCNAE(cliente.cnae) || 'Não informado';

        // Buscar descrição do CNAE
        buscarDescricaoCNAE(cliente.cnae);

        // Endereço
        const enderecoCompleto = montarEnderecoCompleto(cliente, cidadeFormatada);
        document.getElementById('modal-cliente-endereco-completo').textContent = enderecoCompleto;
        document.getElementById('modal-cliente-rua').textContent = cliente.rua || '-';
        document.getElementById('modal-cliente-numero').textContent = cliente.numero || '-';
        document.getElementById('modal-cliente-bairro').textContent = cliente.bairro || '-';
        document.getElementById('modal-cliente-cep').textContent = cliente.cep || '-';

        // Contato
        document.getElementById('modal-cliente-telefone').textContent = cliente.telefone || 'Não informado';
        document.getElementById('modal-cliente-email').textContent = cliente.email || 'Não informado';

        // Mostrar modal
        document.getElementById('modal-detalhes-cliente').classList.remove('hidden');

        // Recarregar ícones do Lucide
        lucide.createIcons();

    } catch (error) {
        console.error('Erro ao mostrar detalhes:', error);
        showToast('Erro ao carregar detalhes do cliente', 'error');
    }
}

// Fechar modal de detalhes
function fecharModalDetalhes() {
    document.getElementById('modal-detalhes-cliente').classList.add('hidden');
    clienteAtual = null;
}

// Buscar descrição do CNAE
async function buscarDescricaoCNAE(cnae) {
    const elementoDescricao = document.getElementById('modal-cliente-cnae-descricao');

    if (!cnae) {
        elementoDescricao.textContent = 'CNAE não informado';
        return;
    }

    try {
        elementoDescricao.textContent = 'Buscando descrição...';

        // Limpar CNAE (apenas números)
        const cnaeLimpo = cnae.replace(/\D/g, '');

        // Buscar na API
        const response = await fetch(`/api/cnae/descricao/${cnaeLimpo}`);
        const data = await response.json();

        if (data.erro) {
            elementoDescricao.textContent = 'Descrição não disponível';
            return;
        }

        // Mostrar descrição completa
        elementoDescricao.textContent = data.descricao;
        elementoDescricao.classList.remove('italic');
        elementoDescricao.classList.add('font-semibold');

    } catch (error) {
        console.error('Erro ao buscar descrição CNAE:', error);
        elementoDescricao.textContent = 'Erro ao carregar descrição';
    }
}

// Formatar CNPJ
function formatarCNPJ(cnpj) {
    if (!cnpj) return '';

    // Se já estiver formatado, retorna
    if (cnpj.includes('.') || cnpj.includes('/') || cnpj.includes('-')) {
        return cnpj;
    }

    // Formata: XX.XXX.XXX/XXXX-XX
    const limpo = cnpj.replace(/\D/g, '');
    if (limpo.length === 14) {
        return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    return cnpj;
}

// Formatar CNAE
function formatarCNAE(cnae) {
    if (!cnae) return '';

    // Se já estiver formatado, retorna
    if (cnae.includes('.') || cnae.includes('-')) {
        return cnae;
    }

    // Formata: XX.XX-X-XX
    const limpo = cnae.replace(/\D/g, '');
    if (limpo.length === 7) {
        return limpo.replace(/^(\d{2})(\d{2})(\d{1})(\d{2})$/, '$1.$2-$3-$4');
    }

    return cnae;
}

// Montar endereço completo formatado
function montarEnderecoCompleto(cliente, cidadeFormatada) {
    const partes = [];

    if (cliente.rua) partes.push(cliente.rua);
    if (cliente.numero) partes.push(cliente.numero);
    if (cliente.bairro) partes.push(cliente.bairro);

    const primeiraLinha = partes.join(', ');

    const cidadeUF = [];
    if (cidadeFormatada && cidadeFormatada !== '-') cidadeUF.push(cidadeFormatada);
    if (cliente.uf) cidadeUF.push(cliente.uf);

    const segundaLinha = cidadeUF.join('/');

    if (primeiraLinha && segundaLinha) {
        return `${primeiraLinha} - ${segundaLinha}`;
    } else if (primeiraLinha) {
        return primeiraLinha;
    } else if (segundaLinha) {
        return segundaLinha;
    }

    return 'Endereço não informado';
}

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal-detalhes-cliente');
    if (e.target === modal) {
        fecharModalDetalhes();
    }
});

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        fecharModalDetalhes();
    }
});

// ============================================
// FUNÇÕES PARA ABA DE ARQUIVOS/DOCUMENTOS
// ============================================

let todosDocumentos = [];
let modoVisualizacao = 'grade'; // Modo padrão: grade, lista ou detalhes

// Função para mudar o modo de visualização
function mudarVisualizacao(modo) {
    modoVisualizacao = modo;

    // Atualizar botões ativos
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('view-btn-active');
    });
    document.getElementById(`btn-view-${modo}`).classList.add('view-btn-active');

    // Aplicar classe ao container
    const container = document.getElementById('view-documentos');
    container.classList.remove('view-grade', 'view-lista', 'view-detalhes');
    container.classList.add(`view-${modo}`);

    // Re-renderizar documentos com o novo modo
    renderizarDocumentos(todosDocumentos);

    // Salvar preferência no localStorage
    localStorage.setItem('modoVisualizacaoDocumentos', modo);

    lucide.createIcons();
}

// Restaurar preferência de visualização ao carregar
document.addEventListener('DOMContentLoaded', () => {
    const modoSalvo = localStorage.getItem('modoVisualizacaoDocumentos');
    if (modoSalvo && ['grade', 'lista', 'detalhes'].includes(modoSalvo)) {
        mudarVisualizacao(modoSalvo);
    } else {
        // Aplicar modo padrão
        document.getElementById('view-documentos').classList.add('view-grade');
    }

    // Adicionar listeners aos filtros de documentos
    const filtroCliente = document.getElementById('filtro-doc-cliente');
    const filtroTipo = document.getElementById('filtro-doc-tipo');
    const filtroCategoria = document.getElementById('filtro-doc-categoria');

    if (filtroCliente) {
        filtroCliente.addEventListener('input', () => {
            buscarDocumentos();
        });
    }

    if (filtroTipo) {
        filtroTipo.addEventListener('change', () => {
            buscarDocumentos();
        });
    }

    if (filtroCategoria) {
        filtroCategoria.addEventListener('change', () => {
            buscarDocumentos();
        });
    }

    // Adicionar listener ao filtro de análise
    const filtroAnaliseCliente = document.getElementById('filtro-analise-cliente');
    if (filtroAnaliseCliente) {
        filtroAnaliseCliente.addEventListener('change', (e) => {
            aplicarFiltroAnalise(e.target.value);
        });
    }

    // Adicionar listener à pesquisa de clientes na análise
    const pesquisaClienteAnalise = document.getElementById('pesquisa-cliente-analise');
    const sugestoesDropdown = document.getElementById('sugestoes-cliente-analise');
    const limparPesquisaBtn = document.getElementById('limpar-pesquisa-cliente');

    if (pesquisaClienteAnalise && filtroAnaliseCliente && sugestoesDropdown && limparPesquisaBtn) {
        // Listener para mostrar sugestões enquanto digita
        pesquisaClienteAnalise.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();

            // Mostrar/ocultar botão de limpar
            if (searchTerm) {
                limparPesquisaBtn.classList.remove('hidden');
            } else {
                limparPesquisaBtn.classList.add('hidden');
            }

            if (!searchTerm) {
                // Se campo vazio, limpar filtro e ocultar sugestões
                sugestoesDropdown.classList.add('hidden');
                filtroAnaliseCliente.value = '';
                filtroAnaliseCliente.dispatchEvent(new Event('change'));
                return;
            }

            // Filtrar clientes que correspondem à pesquisa
            const clientesFiltrados = todosClientesAnalise.filter(cliente =>
                cliente.nome_fantasia.toLowerCase().includes(searchTerm) ||
                (cliente.cidade && cliente.cidade.toLowerCase().includes(searchTerm))
            );

            // Mostrar sugestões
            if (clientesFiltrados.length > 0) {
                sugestoesDropdown.innerHTML = `
                    <div class="p-2 bg-violet-50 border-b border-violet-200 text-xs font-semibold text-violet-700">
                        ${clientesFiltrados.length} cliente(s) encontrado(s)
                    </div>
                    ${clientesFiltrados.map(cliente => `
                        <div class="px-4 py-3 hover:bg-violet-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                             data-cliente="${cliente.nome_fantasia}">
                            <div class="font-medium text-gray-900">${cliente.nome_fantasia}</div>
                            <div class="text-xs text-gray-500 mt-0.5">
                                <i data-lucide="map-pin" class="w-3 h-3 inline"></i> ${cliente.cidade || 'Sem cidade'}
                            </div>
                        </div>
                    `).join('')}
                `;
                sugestoesDropdown.classList.remove('hidden');
                lucide.createIcons();
            } else {
                sugestoesDropdown.innerHTML = `
                    <div class="p-4 text-center text-gray-500">
                        <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-gray-400"></i>
                        <div class="text-sm">Nenhum cliente encontrado</div>
                    </div>
                `;
                sugestoesDropdown.classList.remove('hidden');
                lucide.createIcons();
            }
        });

        // Listener para clicar em uma sugestão
        sugestoesDropdown.addEventListener('click', (e) => {
            const item = e.target.closest('[data-cliente]');
            if (item) {
                const clienteNome = item.dataset.cliente;
                pesquisaClienteAnalise.value = clienteNome;
                filtroAnaliseCliente.value = clienteNome;
                filtroAnaliseCliente.dispatchEvent(new Event('change'));
                sugestoesDropdown.classList.add('hidden');
            }
        });

        // Ocultar sugestões ao clicar fora
        document.addEventListener('click', (e) => {
            if (!pesquisaClienteAnalise.contains(e.target) && !sugestoesDropdown.contains(e.target)) {
                sugestoesDropdown.classList.add('hidden');
            }
        });

        // Mostrar sugestões ao focar no campo
        pesquisaClienteAnalise.addEventListener('focus', () => {
            if (pesquisaClienteAnalise.value.trim()) {
                pesquisaClienteAnalise.dispatchEvent(new Event('input'));
            }
        });

        // Botão de limpar pesquisa
        limparPesquisaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            pesquisaClienteAnalise.value = '';
            limparPesquisaBtn.classList.add('hidden');
            sugestoesDropdown.classList.add('hidden');
            filtroAnaliseCliente.value = '';
            filtroAnaliseCliente.dispatchEvent(new Event('change'));
            pesquisaClienteAnalise.focus();
        });

        // Navegação por teclado nas sugestões
        let selectedIndex = -1;
        pesquisaClienteAnalise.addEventListener('keydown', (e) => {
            const items = sugestoesDropdown.querySelectorAll('[data-cliente]');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection(items, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(items, selectedIndex);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                items[selectedIndex].click();
                selectedIndex = -1;
            } else if (e.key === 'Escape') {
                sugestoesDropdown.classList.add('hidden');
                selectedIndex = -1;
            }
        });

        function updateSelection(items, index) {
            items.forEach((item, i) => {
                if (i === index) {
                    item.classList.add('bg-violet-100');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('bg-violet-100');
                }
            });
        }

        // Resetar seleção quando o dropdown fecha
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && sugestoesDropdown.classList.contains('hidden')) {
                    selectedIndex = -1;
                }
            });
        });
        observer.observe(sugestoesDropdown, { attributes: true });
    }
});

function detectarTipoDocumento(nomeArquivo) {
    const nome = nomeArquivo.toLowerCase();
    if (nome.includes('laudo')) return 'Laudo';
    if (nome.includes('contrato')) return 'Contrato';
    if (nome.includes('orcamento')) return 'Orçamento';
    if (nome.includes('recibo')) return 'Recibo';
    return 'Documento';
}

function extrairClienteDoNome(nomeArquivo) {
    // Extrai nome do cliente de formatos como:
    // "DEDETIZADORA BORGES_Laudo_#0.docx" -> "DEDETIZADORA BORGES"
    // "20251210_LAUDO_ABASTECER_DIVINOPOLIS.docx" -> "ABASTECER DIVINOPOLIS"
    const partes = nomeArquivo.split('_');
    if (partes.length >= 3 && !partes[0].match(/^\d{8}/)) {
        return partes[0];
    } else if (partes.length >= 3) {
        return partes.slice(2).join(' ').replace('.docx', '');
    }
    return 'Cliente não identificado';
}

async function buscarDocumentos() {
    try {
        // Buscar arquivos e clientes em paralelo
        const [resArquivos, resClientes] = await Promise.all([
            fetch('/api/arquivos'),
            fetch('/api/clientes')
        ]);

        const dataArquivos = await resArquivos.json();
        const clientes = await resClientes.json();

        // Criar mapa de clientes por nome para busca rápida
        const clientesMap = {};
        clientes.forEach(cliente => {
            const nomeNormalizado = cliente.nome_fantasia.toUpperCase().trim();
            clientesMap[nomeNormalizado] = cliente;
        });

        // Transformar formato da API de arquivos para formato esperado
        let arquivos = dataArquivos.data || dataArquivos.arquivos || [];

        // Filtrar apenas documentos .docx da pasta documentos
        arquivos = arquivos.filter(arq =>
            arq.nome &&
            arq.nome.toLowerCase().endsWith('.docx') &&
            (arq.tipo === 'documentos' || arq.caminho?.includes('documentos'))
        );

        const documentos = arquivos.map(arq => {
            const clienteNome = extrairClienteDoNome(arq.nome);
            const clienteNomeNormalizado = clienteNome.toUpperCase().trim();
            const dadosCliente = clientesMap[clienteNomeNormalizado] || {};

            return {
                nome_arquivo: arq.nome,
                tipo_documento: detectarTipoDocumento(arq.nome),
                data_criacao: arq.data_modificacao,
                data_geracao: arq.data_modificacao,
                cliente_nome: clienteNome,
                caminho_arquivo: arq.caminho,
                // Dados adicionais do cliente
                cliente_razao_social: dadosCliente.razao_social || '',
                cliente_cnpj: dadosCliente.cnpj || '',
                cliente_endereco: dadosCliente.endereco_completo || '',
                cliente_telefone: dadosCliente.telefone || '',
                cliente_cidade: dadosCliente.cidade || ''
            };
        });

        todosDocumentos = documentos;

        // Aplicar filtros
        const filtroCliente = document.getElementById('filtro-doc-cliente').value.toLowerCase();
        const filtroTipo = document.getElementById('filtro-doc-tipo').value.toLowerCase();
        const filtroCategoria = document.getElementById('filtro-doc-categoria').value;

        let documentosFiltrados = documentos;

        // Filtro por cliente
        if (filtroCliente) {
            documentosFiltrados = documentosFiltrados.filter(doc =>
                doc.cliente_nome?.toLowerCase().includes(filtroCliente)
            );
        }

        // Filtro por tipo de documento
        if (filtroTipo) {
            documentosFiltrados = documentosFiltrados.filter(doc =>
                doc.tipo_documento?.toLowerCase().includes(filtroTipo)
            );
        }

        // Filtro por categoria CNAE (extrai do nome do arquivo)
        if (filtroCategoria) {
            documentosFiltrados = documentosFiltrados.filter(doc => {
                // Extrai categoria do nome do arquivo (ex: "EMPRESA_Laudo_#1.docx" -> "#1")
                const nomeArquivo = doc.nome_arquivo || '';
                return nomeArquivo.includes(filtroCategoria);
            });
        }

        renderizarDocumentos(documentosFiltrados);
    } catch (error) {
        console.error('Erro ao buscar documentos:', error);
        document.getElementById('grid-documentos').innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-2"></i>
                <p>Erro ao carregar documentos</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderizarDocumentos(documentos) {
    const grid = document.getElementById('grid-documentos');

    if (!documentos || documentos.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i data-lucide="file-x" class="w-16 h-16 mx-auto mb-4 opacity-50"></i>
                <p class="text-xl font-semibold">Nenhum documento encontrado</p>
                <p class="text-sm mt-2">Gere um novo documento para começar</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    grid.innerHTML = documentos.map((doc, index) => {
        const icone = getTipoIcone(doc.tipo_documento);
        const cor = getTipoCor(doc.tipo_documento);
        const categoria = extrairCategoria(doc.nome_arquivo);
        const categoriaInfo = getCategoriaInfo(categoria);
        const nomeArquivoEscaped = (doc.nome_arquivo || '').replace(/'/g, "\\'");
        const docId = `doc-${index}`;

        // Modo Grade (padrão)
        const cardGrade = `
            <div class="doc-card doc-card-grade border-2 border-gray-200 rounded-xl p-5 hover:border-${cor}-500 hover:shadow-xl transition-all bg-white">
                <!-- Header do Card -->
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2 flex-wrap">
                        <i data-lucide="${icone}" class="w-5 h-5 text-${cor}-600"></i>
                        <span class="px-2 py-1 bg-${cor}-100 text-${cor}-700 text-xs font-semibold rounded">${doc.tipo_documento || 'Documento'}</span>
                        ${categoria ? `<span class="px-2 py-1 bg-indigo-100 text-indigo-700 text-xl font-semibold rounded" title="${categoriaInfo.nome}">${categoriaInfo.emoji}</span>` : ''}
                    </div>
                </div>

                <!-- Nome do Arquivo -->
                <h3 class="font-bold text-gray-800 mb-2 truncate text-lg" title="${doc.nome_arquivo || 'Sem nome'}">
                    ${doc.nome_arquivo || 'Sem nome'}
                </h3>

                <!-- Informações -->
                <div class="space-y-1 mb-4">
                    <p class="text-sm text-gray-600"><strong>Cliente:</strong> ${doc.cliente_nome || 'Não informado'}</p>
                    ${doc.cliente_razao_social ? `<p class="text-xs text-gray-600"><strong>Razão Social:</strong> ${doc.cliente_razao_social}</p>` : ''}
                    ${doc.cliente_cnpj ? `<p class="text-xs text-gray-600"><strong>CNPJ:</strong> ${doc.cliente_cnpj}</p>` : ''}
                    ${doc.cliente_endereco ? `<p class="text-xs text-gray-600"><strong>Endereço:</strong> ${doc.cliente_endereco}</p>` : ''}
                    ${doc.cliente_telefone ? `<p class="text-xs text-gray-600"><strong>Telefone:</strong> ${doc.cliente_telefone}</p>` : ''}
                    ${doc.cliente_cidade ? `<p class="text-xs text-gray-600"><strong>Cidade:</strong> ${doc.cliente_cidade}</p>` : ''}
                    <p class="text-xs text-gray-500 mt-2">${formatarDataDocumento(doc.data_criacao)}</p>
                </div>

                <!-- Botões de Ação -->
                <div class="grid grid-cols-2 gap-2">
                    <!-- Botão Visualizar -->
                    <button onclick="visualizarDocumento('${nomeArquivoEscaped}')"
                            class="flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg text-sm">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                        <span>Visualizar</span>
                    </button>

                    <!-- Botão Download -->
                    <a href="/download/${encodeURIComponent(doc.nome_arquivo)}"
                       download="${doc.nome_arquivo}"
                       class="flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-${cor}-600 to-${cor}-700 text-white rounded-lg font-semibold hover:from-${cor}-700 hover:to-${cor}-800 transition-all shadow-md hover:shadow-lg text-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Baixar</span>
                    </a>

                    <!-- Botão Ver Cliente -->
                    <button onclick="verInfoCliente('${nomeArquivoEscaped}')"
                            class="flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:from-cyan-700 hover:to-cyan-800 transition-all shadow-md hover:shadow-lg text-sm">
                        <i data-lucide="user" class="w-4 h-4"></i>
                        <span>Cliente</span>
                    </button>

                    <!-- Botão Renomear -->
                    <button onclick="renomearDocumento('${nomeArquivoEscaped}')"
                            class="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg text-sm">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                        <span>Renomear</span>
                    </button>

                    <!-- Botão Mover -->
                    <button onclick="moverDocumento('${nomeArquivoEscaped}')"
                            class="flex items-center justify-center gap-1 px-3 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-all shadow-md hover:shadow-lg text-sm">
                        <i data-lucide="folder-input" class="w-4 h-4"></i>
                        <span>Mover</span>
                    </button>

                    <!-- Botão Excluir -->
                    <button onclick="excluirDocumento('${nomeArquivoEscaped}')"
                            class="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all shadow-md hover:shadow-lg text-sm">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                        <span>Excluir</span>
                    </button>
                </div>
            </div>
        `;

        // Modo Lista (comprimido, botões ocultos)
        const cardLista = `
            <div class="doc-card doc-card-lista border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-all bg-white cursor-pointer" onclick="toggleBotoesLista('${docId}')">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <i data-lucide="${icone}" class="w-5 h-5 text-${cor}-600 flex-shrink-0"></i>
                        ${categoria ? `<span class="text-xl flex-shrink-0" title="${categoriaInfo.nome}">${categoriaInfo.emoji}</span>` : ''}
                        <div class="flex-1 min-w-0">
                            <h3 class="font-semibold text-gray-800 truncate text-sm">${doc.nome_arquivo || 'Sem nome'}</h3>
                            <p class="text-xs text-gray-500 truncate">${doc.cliente_nome || 'Não informado'}${doc.cliente_razao_social ? ' • ' + doc.cliente_razao_social : ''}${doc.cliente_cidade ? ' • ' + doc.cliente_cidade : ''}</p>
                        </div>
                        <span class="px-2 py-1 bg-${cor}-100 text-${cor}-700 text-xs font-semibold rounded flex-shrink-0">${doc.tipo_documento || 'Doc'}</span>
                        <span class="text-xs text-gray-400 flex-shrink-0">${formatarDataDocumento(doc.data_criacao)}</span>
                    </div>
                </div>

                <!-- Botões (inicialmente ocultos) -->
                <div id="${docId}-buttons" class="botoes-lista-ocultos flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <button onclick="event.stopPropagation(); visualizarDocumento('${nomeArquivoEscaped}')"
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-md text-xs font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm hover:shadow-md">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                        Visualizar
                    </button>
                    <a href="/download/${encodeURIComponent(doc.nome_arquivo)}"
                       download="${doc.nome_arquivo}"
                       onclick="event.stopPropagation()"
                       class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-${cor}-600 to-${cor}-700 text-white rounded-md text-xs font-medium hover:from-${cor}-700 hover:to-${cor}-800 transition-all shadow-sm hover:shadow-md">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                        Baixar
                    </a>
                    <button onclick="event.stopPropagation(); verInfoCliente('${nomeArquivoEscaped}')"
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-md text-xs font-medium hover:from-cyan-700 hover:to-cyan-800 transition-all shadow-sm hover:shadow-md">
                        <i data-lucide="user" class="w-3.5 h-3.5"></i>
                        Cliente
                    </button>
                    <button onclick="event.stopPropagation(); renomearDocumento('${nomeArquivoEscaped}')"
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md text-xs font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        Renomear
                    </button>
                    <button onclick="event.stopPropagation(); moverDocumento('${nomeArquivoEscaped}')"
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-md text-xs font-medium hover:from-amber-700 hover:to-amber-800 transition-all shadow-sm hover:shadow-md">
                        <i data-lucide="folder-input" class="w-3.5 h-3.5"></i>
                        Mover
                    </button>
                    <button onclick="event.stopPropagation(); excluirDocumento('${nomeArquivoEscaped}')"
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md text-xs font-medium hover:from-red-700 hover:to-red-800 transition-all shadow-sm hover:shadow-md">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        Excluir
                    </button>
                </div>
            </div>
        `;

        // Modo Detalhes (mais informações visíveis)
        const cardDetalhes = `
            <div class="doc-card doc-card-detalhes border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-all bg-white">
                <div class="flex items-start gap-4">
                    <i data-lucide="${icone}" class="w-6 h-6 text-${cor}-600 flex-shrink-0 mt-1"></i>
                    <div class="flex-1 grid grid-cols-12 gap-2 items-center">
                        <div class="col-span-2">
                            <h3 class="font-semibold text-gray-800 text-xs truncate" title="${doc.nome_arquivo || 'Sem nome'}">${doc.nome_arquivo || 'Sem nome'}</h3>
                        </div>
                        <div class="col-span-2">
                            <p class="text-xs text-gray-600 truncate" title="${doc.cliente_nome || 'Não informado'}">${doc.cliente_nome || 'Não informado'}</p>
                        </div>
                        <div class="col-span-2">
                            <p class="text-xs text-gray-500 truncate" title="${doc.cliente_razao_social || '-'}">${doc.cliente_razao_social || '-'}</p>
                        </div>
                        <div class="col-span-2">
                            <p class="text-xs text-gray-500 truncate" title="${doc.cliente_cnpj || '-'}">${doc.cliente_cnpj || '-'}</p>
                        </div>
                        <div class="col-span-1">
                            <p class="text-xs text-gray-500 truncate" title="${doc.cliente_cidade || '-'}">${doc.cliente_cidade || '-'}</p>
                        </div>
                        <div class="col-span-1 text-center">
                            ${categoria ? `<span class="text-lg" title="${categoriaInfo.nome}">${categoriaInfo.emoji}</span>` : '-'}
                        </div>
                        <div class="col-span-1">
                            <span class="px-2 py-1 bg-${cor}-100 text-${cor}-700 text-xs font-semibold rounded block text-center">${doc.tipo_documento || 'Doc'}</span>
                        </div>
                        <div class="col-span-1 text-right">
                            <p class="text-xs text-gray-400">${formatarDataDocumento(doc.data_criacao)}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <button onclick="visualizarDocumento('${nomeArquivoEscaped}')"
                                class="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition" title="Visualizar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="/download/${encodeURIComponent(doc.nome_arquivo)}"
                           download="${doc.nome_arquivo}"
                           class="p-1.5 bg-${cor}-600 text-white rounded hover:bg-${cor}-700 transition" title="Baixar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                        <button onclick="renomearDocumento('${nomeArquivoEscaped}')"
                                class="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition" title="Renomear">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="moverDocumento('${nomeArquivoEscaped}')"
                                class="p-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition" title="Mover">
                            <i data-lucide="folder-input" class="w-4 h-4"></i>
                        </button>
                        <button onclick="excluirDocumento('${nomeArquivoEscaped}')"
                                class="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition" title="Excluir">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return `<div id="${docId}" class="doc-wrapper">${cardGrade}${cardLista}${cardDetalhes}</div>`;
    }).join('');

    lucide.createIcons();
}

function getTipoIcone(tipo) {
    const tipos = {
        'laudo': 'file-check',
        'contrato': 'file-text',
        'orcamento': 'file-plus',
        'recibo': 'receipt'
    };
    return tipos[tipo?.toLowerCase()] || 'file';
}

function getTipoCor(tipo) {
    const cores = {
        'laudo': 'blue',
        'contrato': 'purple',
        'orcamento': 'green',
        'recibo': 'orange'
    };
    return cores[tipo?.toLowerCase()] || 'gray';
}

function formatarDataDocumento(data) {
    if (!data) return 'Data não disponível';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
}

// Toggle de botões na visualização em lista
let documentoListaAtivo = null;

function toggleBotoesLista(docId) {
    const buttonsDiv = document.getElementById(`${docId}-buttons`);

    // Se já está ativo, desativa
    if (documentoListaAtivo === docId) {
        buttonsDiv.classList.remove('botoes-lista-visivel');
        buttonsDiv.classList.add('botoes-lista-ocultos');
        documentoListaAtivo = null;
    } else {
        // Desativa o anterior se houver
        if (documentoListaAtivo) {
            const prevButtons = document.getElementById(`${documentoListaAtivo}-buttons`);
            if (prevButtons) {
                prevButtons.classList.remove('botoes-lista-visivel');
                prevButtons.classList.add('botoes-lista-ocultos');
            }
        }

        // Ativa o novo
        buttonsDiv.classList.remove('botoes-lista-ocultos');
        buttonsDiv.classList.add('botoes-lista-visivel');
        documentoListaAtivo = docId;
    }

    // Recria ícones do Lucide
    lucide.createIcons();
}

function extrairCategoria(nomeArquivo) {
    if (!nomeArquivo) return null;
    // Extrai categoria do padrão: "EMPRESA_Modelo_#1.docx"
    const match = nomeArquivo.match(/#\d+/);
    return match ? match[0] : null;
}

function getCategoriaInfo(categoria) {
    const categorias = {
        '#0': { nome: 'Todas as Empresas', emoji: '🏢' },
        '#1': { nome: 'Alimentação', emoji: '🍽️' },
        '#2': { nome: 'Saúde', emoji: '🏥' },
        '#3': { nome: 'Condomínios', emoji: '🏘️' },
        '#4': { nome: 'Hotéis', emoji: '🏨' },
        '#5': { nome: 'Indústrias', emoji: '🏭' },
        '#6': { nome: 'Educação', emoji: '🎓' },
        '#7': { nome: 'Comércio', emoji: '🛒' },
        '#8': { nome: 'Estética', emoji: '💅' },
        '#9': { nome: 'Escritórios', emoji: '💼' },
        '#10': { nome: 'Veterinária', emoji: '🐾' },
        '#11': { nome: 'Academias', emoji: '💪' },
        '#99': { nome: 'Outros', emoji: '❓' }
    };
    return categorias[categoria] || { nome: 'Sem Categoria', emoji: '📄' };
}

// ============================================
// FUNÇÃO PARA VER INFORMAÇÕES DO CLIENTE
// ============================================

async function verInfoCliente(nomeArquivo) {
    try {
        // Extrair nome do cliente do arquivo
        const clienteNome = extrairClienteDoNome(nomeArquivo);

        // Buscar informações do cliente
        const response = await fetch('/api/clientes');
        const clientes = await response.json();

        // Encontrar o cliente
        const cliente = clientes.find(c =>
            c.nome_fantasia.toUpperCase().trim() === clienteNome.toUpperCase().trim()
        );

        if (!cliente) {
            showToast('Cliente não encontrado no cadastro', 'error');
            return;
        }

        // Criar e mostrar modal com informações do cliente
        const modal = document.createElement('div');
        modal.id = 'modal-cliente';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <!-- Header -->
                <div class="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-6 rounded-t-xl">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i data-lucide="user" class="w-8 h-8"></i>
                            <div>
                                <h2 class="text-2xl font-bold">${cliente.nome_fantasia || 'Nome não informado'}</h2>
                                <p class="text-cyan-100 text-sm">${cliente.razao_social || 'Razão social não informada'}</p>
                            </div>
                        </div>
                        <button onclick="fecharModalCliente()" class="text-white hover:bg-cyan-800 rounded-full p-2 transition">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>

                <!-- Conteúdo -->
                <div class="p-6 space-y-6">
                    <!-- Informações Básicas -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="file-text" class="w-5 h-5 text-cyan-600"></i>
                                <h3 class="font-semibold text-gray-700">CNPJ</h3>
                            </div>
                            <p class="text-gray-900">${cliente.cnpj || 'Não informado'}</p>
                        </div>

                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="phone" class="w-5 h-5 text-cyan-600"></i>
                                <h3 class="font-semibold text-gray-700">Telefone</h3>
                            </div>
                            <p class="text-gray-900">${cliente.telefone || 'Não informado'}</p>
                        </div>

                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="mail" class="w-5 h-5 text-cyan-600"></i>
                                <h3 class="font-semibold text-gray-700">E-mail</h3>
                            </div>
                            <p class="text-gray-900 break-all">${cliente.email || 'Não informado'}</p>
                        </div>

                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="map-pin" class="w-5 h-5 text-cyan-600"></i>
                                <h3 class="font-semibold text-gray-700">Cidade</h3>
                            </div>
                            <p class="text-gray-900">${cliente.cidade || 'Não informada'}</p>
                        </div>
                    </div>

                    <!-- Endereço -->
                    ${cliente.endereco_completo ? `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex items-center gap-2 mb-2">
                            <i data-lucide="map" class="w-5 h-5 text-cyan-600"></i>
                            <h3 class="font-semibold text-gray-700">Endereço Completo</h3>
                        </div>
                        <p class="text-gray-900">${cliente.endereco_completo}</p>
                    </div>
                    ` : ''}

                    <!-- Responsável -->
                    ${cliente.responsavel_tecnico ? `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex items-center gap-2 mb-2">
                            <i data-lucide="user-check" class="w-5 h-5 text-cyan-600"></i>
                            <h3 class="font-semibold text-gray-700">Responsável Técnico</h3>
                        </div>
                        <p class="text-gray-900">${cliente.responsavel_tecnico}</p>
                    </div>
                    ` : ''}

                    <!-- Observações -->
                    ${cliente.observacoes ? `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex items-center gap-2 mb-2">
                            <i data-lucide="clipboard" class="w-5 h-5 text-cyan-600"></i>
                            <h3 class="font-semibold text-gray-700">Observações</h3>
                        </div>
                        <p class="text-gray-900">${cliente.observacoes}</p>
                    </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div class="bg-gray-50 p-4 rounded-b-xl flex justify-end gap-2">
                    <button onclick="fecharModalCliente()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition">
                        Fechar
                    </button>
                    <button onclick="fecharModalCliente(); mostrarView('clientes');" class="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-medium hover:from-cyan-700 hover:to-cyan-800 transition">
                        Ver na Aba Clientes
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        lucide.createIcons();

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                fecharModalCliente();
            }
        });

    } catch (error) {
        console.error('Erro ao buscar informações do cliente:', error);
        showToast('Erro ao buscar informações do cliente', 'error');
    }
}

function fecharModalCliente() {
    const modal = document.getElementById('modal-cliente');
    if (modal) {
        modal.remove();
    }
}

// ============================================
// FUNÇÕES PARA NAVEGAÇÃO RÁPIDA DE CLIENTE
// ============================================

function irParaDocumentosCliente(nomeCliente) {
    // Muda para a aba de documentos
    mostrarView('documentos');

    // Aguarda um momento para a view carregar
    setTimeout(() => {
        // Preenche o filtro de cliente
        const filtroCliente = document.getElementById('filtro-doc-cliente');
        if (filtroCliente) {
            filtroCliente.value = nomeCliente;
            // Dispara o evento de input para aplicar o filtro
            filtroCliente.dispatchEvent(new Event('input'));
        }

        // Scroll suave para o topo da seção de documentos
        document.getElementById('view-documentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        showToast(`Mostrando documentos de ${nomeCliente}`, 'info');
    }, 100);
}

function irParaAnaliseCliente(nomeCliente) {
    // Aba de analise removida - redireciona para administracao
    mostrarView('administracao');
}

// ============================================
// FUNÇÕES PARA ABA DE ANÁLISE
// ============================================

let todosClientesAnalise = [];
let todosDocumentosAnalise = [];
let clienteFiltradoAnalise = null;

async function carregarAnalise(clienteNome = null) {
    try {
        // Buscar TODAS as fontes de documentos
        const [resClientes, resDocsGerados, resArquivos] = await Promise.all([
            fetch('/api/clientes'),
            fetch('/api/documentos-gerados'),
            fetch('/api/arquivos')
        ]);

        todosClientesAnalise = await resClientes.json();
        const docsGerados = await resDocsGerados.json();
        const arquivosData = await resArquivos.json();

        // Combinar documentos gerados + arquivos
        const arquivos = arquivosData.data || arquivosData || [];

        // Converter arquivos para o formato de documentos
        const arquivosConvertidos = arquivos.map(arq => ({
            nome_arquivo: arq.nome,
            data_geracao: arq.data_modificacao,
            data_criacao: arq.data_modificacao,
            tipo_documento: detectarTipoDocumento(arq.nome),
            cliente_nome: extrairClienteDoNome(arq.nome),
            caminho_arquivo: arq.caminho,
            origem: arq.origem || 'Arquivo'
        }));

        // UNIR todos os documentos
        todosDocumentosAnalise = [...docsGerados, ...arquivosConvertidos];

        // Popular o select de clientes
        popularSelectClientesAnalise();

        // Se foi passado um cliente específico, filtrar por ele
        if (clienteNome) {
            clienteFiltradoAnalise = clienteNome;
            aplicarFiltroAnalise(clienteNome);
        } else {
            // Renderizar estatísticas gerais
            renderizarEstatisticas(todosClientesAnalise, todosDocumentosAnalise);
        }

    } catch (error) {
        console.error('[ERRO] Erro ao carregar análise:', error);
    }
}

function popularSelectClientesAnalise() {
    // Função mantida para compatibilidade, mas não faz mais nada
    // Os clientes agora são mostrados diretamente via autocomplete
}

function aplicarFiltroAnalise(nomeCliente) {
    if (!nomeCliente) {
        // Sem filtro - mostrar todos
        clienteFiltradoAnalise = null;
        document.getElementById('info-cliente-filtrado').classList.add('hidden');
        renderizarEstatisticas(todosClientesAnalise, todosDocumentosAnalise);
        return;
    }

    clienteFiltradoAnalise = nomeCliente;

    // Filtrar cliente
    const clienteFiltrado = todosClientesAnalise.find(c => c.nome_fantasia === nomeCliente);

    // Filtrar documentos do cliente
    const documentosFiltrados = todosDocumentosAnalise.filter(doc => {
        const nomeDocCliente = doc.cliente_nome || extrairClienteDoNome(doc.nome_arquivo || '');
        return nomeDocCliente.toUpperCase().trim() === nomeCliente.toUpperCase().trim();
    });

    // Mostrar info do filtro
    document.getElementById('info-cliente-filtrado').classList.remove('hidden');
    document.getElementById('nome-cliente-filtrado').textContent =
        `${nomeCliente}${clienteFiltrado ? ' - ' + (clienteFiltrado.cidade || 'Sem cidade') : ''}`;

    // Renderizar estatísticas filtradas
    renderizarEstatisticas(
        clienteFiltrado ? [clienteFiltrado] : [],
        documentosFiltrados,
        nomeCliente
    );

    lucide.createIcons();
}

function limparFiltroAnalise() {
    const select = document.getElementById('filtro-analise-cliente');
    if (select) {
        select.value = '';
    }
    aplicarFiltroAnalise(null);
}

let chartDocumentosMes = null;
let chartClientesCidade = null;

function renderizarEstatisticas(clientes, documentos, nomeClienteFiltro = null) {
    // Total de documentos
    const totalDocs = documentos.length;
    const elemTotalDocs = document.getElementById('stat-total-docs');
    if (elemTotalDocs) elemTotalDocs.textContent = totalDocs;

    // Total de clientes
    const totalClientes = nomeClienteFiltro ? 1 : clientes.length;
    const elemTotalClientes = document.getElementById('stat-total-clientes');
    if (elemTotalClientes) elemTotalClientes.textContent = totalClientes;

    // Documentos este mês
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    const docsEsteMes = documentos.filter(doc => {
        const dataDoc = new Date(doc.data_geracao || doc.created_at);
        return dataDoc.getMonth() === mesAtual && dataDoc.getFullYear() === anoAtual;
    });
    const elemMesAtual = document.getElementById('stat-mes-atual');
    if (elemMesAtual) elemMesAtual.textContent = docsEsteMes.length;

    // Cidades únicas
    const cidadesUnicas = new Set(clientes.map(c => c.cidade).filter(c => c));
    const elemCidades = document.getElementById('stat-cidades');
    const valorCidades = cidadesUnicas.size || (nomeClienteFiltro && clientes.length > 0 ? 1 : 0);
    if (elemCidades) elemCidades.textContent = valorCidades;

    // Calcular estatísticas adicionais
    // Média de documentos por cliente
    const mediaDocsCliente = totalClientes > 0 ? (totalDocs / totalClientes).toFixed(1) : 0;
    document.getElementById('stat-media-docs').textContent = mediaDocsCliente;

    // Tipo de documento mais gerado
    const tiposCount = {};
    documentos.forEach(doc => {
        const tipo = doc.tipo_documento || detectarTipoDocumento(doc.nome_arquivo || '');
        tiposCount[tipo] = (tiposCount[tipo] || 0) + 1;
    });
    const tipoMaisGerado = Object.entries(tiposCount).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('stat-tipo-popular').textContent = tipoMaisGerado ? tipoMaisGerado[0] : '-';

    // Documentos na última semana
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
    const docsUltimaSemana = documentos.filter(doc => {
        const dataDoc = new Date(doc.data_geracao || doc.created_at || doc.data_criacao);
        return dataDoc >= umaSemanaAtras;
    });
    document.getElementById('stat-semana').textContent = docsUltimaSemana.length;

    // Renderizar gráficos
    renderizarGraficoDocumentosPorMes(documentos, nomeClienteFiltro);
    renderizarGraficoClientesPorCidade(clientes, nomeClienteFiltro);
    renderizarGraficoDocumentosPorTipo(documentos, nomeClienteFiltro);
    renderizarGraficoDocumentosPorCategoria(documentos, nomeClienteFiltro);
    renderizarGraficoTopClientes(documentos, clientes, nomeClienteFiltro);
    renderizarTabelaResumoClientes(documentos, clientes, nomeClienteFiltro);
}

function renderizarGraficoDocumentosPorMes(documentos, nomeClienteFiltro = null) {
    // Agrupar documentos por mês
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const docsPorMes = new Array(12).fill(0);

    documentos.forEach(doc => {
        const data = new Date(doc.data_geracao || doc.created_at || doc.data_criacao);
        if (!isNaN(data.getTime())) {
            const mes = data.getMonth();
            docsPorMes[mes]++;
        }
    });

    const ctx = document.getElementById('chart-documentos-mes');
    if (!ctx) return;

    // Destruir gráfico anterior se existir
    if (chartDocumentosMes) {
        chartDocumentosMes.destroy();
    }

    chartDocumentosMes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mesesNomes,
            datasets: [{
                label: nomeClienteFiltro ? `Documentos de ${nomeClienteFiltro}` : 'Documentos Gerados',
                data: docsPorMes,
                backgroundColor: 'rgba(139, 92, 246, 0.7)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(139, 92, 246, 0.9)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + ' documento(s)';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderizarGraficoClientesPorCidade(clientes, nomeClienteFiltro = null) {
    // Agrupar clientes por cidade
    const cidadesCount = {};

    clientes.forEach(cliente => {
        const cidade = cliente.cidade || 'Não informada';
        cidadesCount[cidade] = (cidadesCount[cidade] || 0) + 1;
    });

    // Ordenar por quantidade e pegar top 10
    const cidadesOrdenadas = Object.entries(cidadesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = cidadesOrdenadas.map(item => item[0]);
    const valores = cidadesOrdenadas.map(item => item[1]);

    const ctx = document.getElementById('chart-clientes-cidade');
    if (!ctx) return;

    // Destruir gráfico anterior se existir
    if (chartClientesCidade) {
        chartClientesCidade.destroy();
    }

    // Cores variadas para o gráfico de pizza
    const cores = [
        'rgba(59, 130, 246, 0.7)',   // Azul
        'rgba(16, 185, 129, 0.7)',   // Verde
        'rgba(239, 68, 68, 0.7)',    // Vermelho
        'rgba(245, 158, 11, 0.7)',   // Laranja
        'rgba(168, 85, 247, 0.7)',   // Roxo
        'rgba(236, 72, 153, 0.7)',   // Rosa
        'rgba(20, 184, 166, 0.7)',   // Teal
        'rgba(251, 146, 60, 0.7)',   // Laranja claro
        'rgba(99, 102, 241, 0.7)',   // Indigo
        'rgba(132, 204, 22, 0.7)'    // Lima
    ];

    const coresBorda = cores.map(cor => cor.replace('0.7', '1'));

    chartClientesCidade = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Clientes',
                data: valores,
                backgroundColor: cores,
                borderColor: coresBorda,
                borderWidth: 2,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        font: {
                            size: 11,
                            weight: 'bold'
                        },
                        padding: 10,
                        boxWidth: 15,
                        boxHeight: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentual = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + context.parsed + ' cliente(s) (' + percentual + '%)';
                        }
                    }
                }
            }
        }
    });
}

let chartDocumentosTipo = null;
let chartDocumentosCategoria = null;
let chartTopClientes = null;

function renderizarGraficoDocumentosPorTipo(documentos, nomeClienteFiltro = null) {
    const tiposCount = {};

    documentos.forEach(doc => {
        const tipo = doc.tipo_documento || detectarTipoDocumento(doc.nome_arquivo || '');
        tiposCount[tipo] = (tiposCount[tipo] || 0) + 1;
    });

    const labels = Object.keys(tiposCount);
    const valores = Object.values(tiposCount);

    const ctx = document.getElementById('chart-documentos-tipo');
    if (!ctx) return;

    if (chartDocumentosTipo) {
        chartDocumentosTipo.destroy();
    }

    chartDocumentosTipo = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Documentos',
                data: valores,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(168, 85, 247, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(245, 158, 11, 0.7)'
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: { size: 12, weight: 'bold' },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentual = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + context.parsed + ' (' + percentual + '%)';
                        }
                    }
                }
            }
        }
    });
}

function renderizarGraficoDocumentosPorCategoria(documentos, nomeClienteFiltro = null) {
    const categoriasCount = {};

    documentos.forEach(doc => {
        const categoria = extrairCategoria(doc.nome_arquivo || '');
        if (categoria) {
            const catInfo = getCategoriaInfo(categoria);
            const catNome = `${catInfo.emoji} ${catInfo.nome}`;
            categoriasCount[catNome] = (categoriasCount[catNome] || 0) + 1;
        }
    });

    const labels = Object.keys(categoriasCount);
    const valores = Object.values(categoriasCount);

    const ctx = document.getElementById('chart-documentos-categoria');
    if (!ctx) return;

    if (chartDocumentosCategoria) {
        chartDocumentosCategoria.destroy();
    }

    chartDocumentosCategoria = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Documentos por Categoria',
                data: valores,
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

function renderizarGraficoTopClientes(documentos, clientes, nomeClienteFiltro = null) {
    // Se filtrado, não mostrar este gráfico
    if (nomeClienteFiltro) {
        const ctx = document.getElementById('chart-top-clientes');
        if (ctx) {
            if (chartTopClientes) chartTopClientes.destroy();
            const parent = ctx.parentElement;
            parent.innerHTML = '<p class="text-center text-gray-500 py-8">Gráfico não disponível para cliente específico</p>';
        }
        return;
    }

    // Contar documentos por cliente
    const clientesCount = {};

    documentos.forEach(doc => {
        const nomeCliente = doc.cliente_nome || extrairClienteDoNome(doc.nome_arquivo || '');
        clientesCount[nomeCliente] = (clientesCount[nomeCliente] || 0) + 1;
    });

    // Top 10
    const top10 = Object.entries(clientesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = top10.map(item => item[0]);
    const valores = top10.map(item => item[1]);

    const ctx = document.getElementById('chart-top-clientes');
    if (!ctx) return;

    if (chartTopClientes) {
        chartTopClientes.destroy();
    }

    chartTopClientes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Documentos Gerados',
                data: valores,
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

let dadosTabelaOriginais = [];

function renderizarTabelaResumoClientes(documentos, clientes, nomeClienteFiltro = null) {
    const tbody = document.getElementById('tbody-resumo-clientes');
    if (!tbody) return;

    // Se filtrado, mostrar apenas o cliente filtrado
    let clientesParaMostrar = clientes;
    if (nomeClienteFiltro) {
        clientesParaMostrar = clientes.filter(c => c.nome_fantasia === nomeClienteFiltro);
    }

    if (clientesParaMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-12"><div class="flex flex-col items-center gap-3"><i data-lucide="inbox" class="w-16 h-16 text-gray-300"></i><p class="text-gray-500 font-semibold">Nenhum cliente para exibir</p></div></td></tr>';
        lucide.createIcons();
        return;
    }

    // Preparar dados por cliente
    dadosTabelaOriginais = clientesParaMostrar.map(cliente => {
        const docsCliente = documentos.filter(doc => {
            const nomeDoc = doc.cliente_nome || extrairClienteDoNome(doc.nome_arquivo || '');
            return nomeDoc.toUpperCase().trim() === cliente.nome_fantasia.toUpperCase().trim();
        });

        const laudos = docsCliente.filter(d => (d.tipo_documento || detectarTipoDocumento(d.nome_arquivo || '')).toLowerCase().includes('laudo')).length;
        const contratos = docsCliente.filter(d => (d.tipo_documento || detectarTipoDocumento(d.nome_arquivo || '')).toLowerCase().includes('contrato')).length;
        const orcamentos = docsCliente.filter(d => (d.tipo_documento || detectarTipoDocumento(d.nome_arquivo || '')).toLowerCase().includes('orcamento')).length;
        const recibos = docsCliente.filter(d => (d.tipo_documento || detectarTipoDocumento(d.nome_arquivo || '')).toLowerCase().includes('recibo')).length;

        // Data do último documento
        let ultimoDoc = '-';
        let ultimaDataTimestamp = 0;
        if (docsCliente.length > 0) {
            const datasValidas = docsCliente
                .map(d => new Date(d.data_geracao || d.created_at || d.data_criacao))
                .filter(d => !isNaN(d.getTime()))
                .sort((a, b) => b - a);

            if (datasValidas.length > 0) {
                ultimaDataTimestamp = datasValidas[0].getTime();
                ultimoDoc = datasValidas[0].toLocaleDateString('pt-BR');
            }
        }

        return {
            nome: cliente.nome_fantasia,
            total: docsCliente.length,
            laudos,
            contratos,
            orcamentos,
            recibos,
            ultimoDoc,
            ultimaDataTimestamp
        };
    });

    // Ordenar por total de documentos (decrescente) por padrão
    aplicarOrdenacaoTabela();

    // Atualizar contador
    document.getElementById('total-registros-tabela').textContent = dadosTabelaOriginais.length;
    document.getElementById('ultima-atualizacao-tabela').textContent = new Date().toLocaleTimeString('pt-BR');
}

function aplicarOrdenacaoTabela(dados = dadosTabelaOriginais) {
    const tbody = document.getElementById('tbody-resumo-clientes');
    if (!tbody) return;

    // Ordenar dados
    const dadosOrdenados = [...dados].sort((a, b) => {
        let valorA, valorB;

        switch (ordenacaoAtual.campo) {
            case 'cliente':
                valorA = a.nome.toLowerCase();
                valorB = b.nome.toLowerCase();
                break;
            case 'total':
                valorA = a.total;
                valorB = b.total;
                break;
            case 'data':
                valorA = a.ultimaDataTimestamp;
                valorB = b.ultimaDataTimestamp;
                break;
            default:
                valorA = a.total;
                valorB = b.total;
        }

        if (ordenacaoAtual.direcao === 'asc') {
            return valorA > valorB ? 1 : -1;
        } else {
            return valorA < valorB ? 1 : -1;
        }
    });

    // Renderizar linhas com visual moderno
    tbody.innerHTML = '';
    dadosOrdenados.forEach((cliente, index) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 transition-all duration-200 cursor-pointer';
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg p-2">
                        <i data-lucide="building-2" class="w-4 h-4 text-violet-600"></i>
                    </div>
                    <div>
                        <div class="font-bold text-gray-800">${cliente.nome}</div>
                        <div class="text-xs text-gray-500">#${index + 1} no ranking</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold shadow-md">
                    <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                    ${cliente.total}
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 ${cliente.laudos > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} rounded-lg text-sm font-semibold">
                    ${cliente.laudos}
                </span>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 ${cliente.contratos > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'} rounded-lg text-sm font-semibold">
                    ${cliente.contratos}
                </span>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 ${cliente.orcamentos > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'} rounded-lg text-sm font-semibold">
                    ${cliente.orcamentos}
                </span>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 ${cliente.recibos > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'} rounded-lg text-sm font-semibold">
                    ${cliente.recibos}
                </span>
            </td>
            <td class="px-6 py-4 text-center">
                <div class="inline-flex items-center gap-1.5 text-sm text-gray-600">
                    <i data-lucide="calendar" class="w-4 h-4"></i>
                    ${cliente.ultimoDoc}
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                <button onclick="verDetalhesCliente('${cliente.nome}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all">
                    <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                    Ver
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

function ordenarTabela(campo) {
    if (ordenacaoAtual.campo === campo) {
        ordenacaoAtual.direcao = ordenacaoAtual.direcao === 'asc' ? 'desc' : 'asc';
    } else {
        ordenacaoAtual.campo = campo;
        ordenacaoAtual.direcao = 'desc';
    }
    aplicarOrdenacaoTabela();
}

function verDetalhesCliente(nomeCliente) {
    // Aplicar filtro de cliente e mostrar análises
    document.getElementById('pesquisa-cliente-analise').value = nomeCliente;
    document.getElementById('filtro-analise-cliente').value = nomeCliente;
    document.getElementById('filtro-analise-cliente').dispatchEvent(new Event('change'));

    showToast(`Visualizando dados de: ${nomeCliente}`, 'info');
}

function exportarTabelaExcel() {
    showToast('Funcionalidade de exportação em desenvolvimento', 'info');
}

// Listener para pesquisa na tabela
document.addEventListener('DOMContentLoaded', () => {
    const pesquisaTabela = document.getElementById('pesquisa-tabela-clientes');
    if (pesquisaTabela) {
        pesquisaTabela.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase().trim();

            if (!termo) {
                aplicarOrdenacaoTabela(dadosTabelaOriginais);
                document.getElementById('total-registros-tabela').textContent = dadosTabelaOriginais.length;
                return;
            }

            const dadosFiltrados = dadosTabelaOriginais.filter(cliente =>
                cliente.nome.toLowerCase().includes(termo)
            );

            aplicarOrdenacaoTabela(dadosFiltrados);
            document.getElementById('total-registros-tabela').textContent = dadosFiltrados.length;
        });
    }
});

// Carregar documentos quando a view de documentos for exibida
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.id === 'view-documentos' && !mutation.target.classList.contains('hidden')) {
            buscarDocumentos();
        }
        if (mutation.target.id === 'view-administracao' && !mutation.target.classList.contains('hidden')) {
            carregarLogoMascote();
        }
    });
});

// Observar mudanças nas views
document.querySelectorAll('.view-content').forEach(view => {
    observer.observe(view, { attributes: true, attributeFilter: ['class'] });
});

// ============================================
//  FUNÇÕES DE GERENCIAMENTO DE ARQUIVOS
// ============================================

// Excluir documento
// Função para visualizar documento online
function visualizarDocumento(nomeArquivo) {
    const url = `/api/visualizar-documento/${encodeURIComponent(nomeArquivo)}`;

    // Abrir em nova janela/aba
    window.open(url, '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
}

async function excluirDocumento(nomeArquivo) {
    if (!confirm(`⚠️ Tem certeza que deseja excluir o arquivo:\n\n"${nomeArquivo}"?\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }

    try {
        const response = await fetch(`/api/documentos/${encodeURIComponent(nomeArquivo)}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            showToast(`Arquivo "${nomeArquivo}" excluído com sucesso!`, 'success');
            buscarDocumentos(); // Recarregar lista
        } else {
            showToast(`Erro ao excluir arquivo: ${result.erro || 'Erro desconhecido'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        showToast('Erro ao excluir documento. Verifique o console para mais detalhes.', 'error');
    }
}

// Renomear documento
async function renomearDocumento(nomeArquivo) {
    const nomeAtual = nomeArquivo;
    const extensao = nomeAtual.substring(nomeAtual.lastIndexOf('.'));
    const nomeSemExtensao = nomeAtual.substring(0, nomeAtual.lastIndexOf('.'));

    const novoNome = prompt(`📝 Renomear arquivo:\n\nNome atual: ${nomeSemExtensao}\n\nDigite o novo nome (sem extensão):`, nomeSemExtensao);

    if (!novoNome || novoNome.trim() === '') {
        return; // Usuário cancelou ou não digitou nada
    }

    if (novoNome === nomeSemExtensao) {
        showToast('O nome não foi alterado.', 'info');
        return;
    }

    const novoNomeCompleto = novoNome.trim() + extensao;

    try {
        const response = await fetch('/api/documentos/renomear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome_antigo: nomeAtual,
                nome_novo: novoNomeCompleto
            })
        });

        const result = await response.json();

        if (response.ok) {
            showToast(`Arquivo renomeado com sucesso! De: ${nomeAtual} Para: ${novoNomeCompleto}`, 'success');
            buscarDocumentos(); // Recarregar lista
        } else {
            showToast(`Erro ao renomear arquivo: ${result.erro || 'Erro desconhecido'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao renomear documento:', error);
        showToast('Erro ao renomear documento. Verifique o console para mais detalhes.', 'error');
    }
}

// Mover documento para pasta
async function moverDocumento(nomeArquivo) {
    const pastaAtual = 'output/documentos';

    const opcoesPastas = `
Escolha a pasta de destino:

1 - output/documentos (atual)
2 - output/arquivados
3 - output/importantes
4 - output/rascunhos
5 - Nova pasta (você escolhe o nome)

Digite o número da opção:`;

    const opcao = prompt(opcoesPastas);

    if (!opcao) return; // Usuário cancelou

    let pastaDestino;

    switch(opcao.trim()) {
        case '1':
            showToast('O arquivo já está nesta pasta.', 'info');
            return;
        case '2':
            pastaDestino = 'output/arquivados';
            break;
        case '3':
            pastaDestino = 'output/importantes';
            break;
        case '4':
            pastaDestino = 'output/rascunhos';
            break;
        case '5':
            const nomePasta = prompt('📁 Digite o nome da nova pasta:');
            if (!nomePasta || nomePasta.trim() === '') return;
            pastaDestino = `output/${nomePasta.trim()}`;
            break;
        default:
            showToast('Opção inválida!', 'error');
            return;
    }

    try {
        const response = await fetch('/api/documentos/mover', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome_arquivo: nomeArquivo,
                pasta_destino: pastaDestino
            })
        });

        const result = await response.json();

        if (response.ok) {
            showToast(`Arquivo movido com sucesso! De: ${pastaAtual} Para: ${pastaDestino}. Arquivo: ${nomeArquivo}`, 'success');
            buscarDocumentos(); // Recarregar lista
        } else {
            showToast(`Erro ao mover arquivo: ${result.erro || 'Erro desconhecido'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao mover documento:', error);
        showToast('Erro ao mover documento. Verifique o console para mais detalhes.', 'error');
    }
}
