

// ============================================================
// FORM RECIBO
// ============================================================

function initFormRecibo() {
    const form = document.getElementById('form-recibo');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await gerarRecibo();
    });
}

async function gerarRecibo() {
    const clienteId = document.getElementById('cliente-recibo').value;
    const dataRecibo = document.getElementById('data-recibo').value;
    const valorRecibo = parseFloat(document.getElementById('valor-recibo').value);
    const formaPagamento = document.getElementById('forma-pagamento').value;
    const referenteRecibo = document.getElementById('referente-recibo').value;
    const observacoes = document.getElementById('observacoes-recibo').value;

    if (!clienteId) {
        showToast('Selecione um cliente', 'error');
        return;
    }

    if (!valorRecibo || valorRecibo <= 0) {
        showToast('Informe um valor válido', 'error');
        return;
    }

    if (!referenteRecibo) {
        showToast('Informe a que se refere o recibo', 'error');
        return;
    }

    const data = {
        cliente_id: parseInt(clienteId),
        valor: valorRecibo,
        forma_pagamento: formaPagamento,
        referente_a: referenteRecibo,
        observacoes: observacoes || null
    };

    if (dataRecibo) {
        data.data_recibo = dataRecibo;
    }

    try {
        showLoading();
        const response = await fetch(`${API_BASE}/documentos/recibo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        hideLoading();

        if (response.ok && result.success) {
            showResult('resultado-recibo', 'success', `
                Recibo gerado com sucesso!<br>
                <strong>Documento ID:</strong> ${result.documento_id}<br>
                <strong>Arquivo:</strong> ${result.nome_arquivo}<br>
                <strong>Valor:</strong> ${formatMoney(result.valor)}<br>
                <button class="btn btn-secondary" onclick="downloadDoc(${result.documento_id})" style="margin-top: 1rem;">
                    Download
                </button>
            `);
            document.getElementById('form-recibo').reset();
            loadStats();
        } else {
            showResult('resultado-recibo', 'error', `Erro: ${result.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        hideLoading();
        showResult('resultado-recibo', 'error', `Erro: ${error.message}`);
    }
}

// ============================================================
// GERENCIAMENTO DE CLIENTES
// ============================================================

function initFormCliente() {
    const btnAdicionar = document.getElementById('btn-adicionar-cliente');
    if (btnAdicionar) {
        btnAdicionar.addEventListener('click', abrirModalNovoCliente);
    }

    const form = document.getElementById('form-cliente');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await salvarCliente();
        });
    }
}

function abrirModalNovoCliente() {
    document.getElementById('modal-cliente-title').textContent = 'Adicionar Cliente';
    document.getElementById('form-cliente').reset();
    document.getElementById('cliente-id').value = '';
    document.getElementById('modal-cliente').style.display = 'flex';
}

function abrirModalEditarCliente(clienteId) {
    const cliente = state.clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
    document.getElementById('cliente-id').value = cliente.id;
    document.getElementById('cliente-nome-fantasia').value = cliente.nome_fantasia || '';
    document.getElementById('cliente-razao-social').value = cliente.razao_social || '';
    document.getElementById('cliente-cnpj').value = cliente.cnpj || '';
    document.getElementById('cliente-cnae').value = cliente.cnae || '';
    document.getElementById('cliente-rua').value = cliente.rua || '';
    document.getElementById('cliente-numero').value = cliente.numero || '';
    document.getElementById('cliente-bairro').value = cliente.bairro || '';
    document.getElementById('cliente-cidade').value = cliente.cidade || '';
    document.getElementById('cliente-uf').value = cliente.uf || '';
    document.getElementById('cliente-cep').value = cliente.cep || '';
    document.getElementById('cliente-telefone').value = cliente.telefone || '';
    document.getElementById('cliente-email').value = cliente.email || '';

    document.getElementById('modal-cliente').style.display = 'flex';
}

function fecharModalCliente() {
    document.getElementById('modal-cliente').style.display = 'none';
    document.getElementById('form-cliente').reset();
}

async function salvarCliente() {
    const clienteId = document.getElementById('cliente-id').value;
    const isEditing = clienteId !== '';

    const data = {
        nome_fantasia: document.getElementById('cliente-nome-fantasia').value,
        razao_social: document.getElementById('cliente-razao-social').value || null,
        cnpj: document.getElementById('cliente-cnpj').value || null,
        cnae: document.getElementById('cliente-cnae').value || null,
        rua: document.getElementById('cliente-rua').value || null,
        numero: document.getElementById('cliente-numero').value || null,
        bairro: document.getElementById('cliente-bairro').value || null,
        cidade: document.getElementById('cliente-cidade').value || null,
        uf: document.getElementById('cliente-uf').value || null,
        cep: document.getElementById('cliente-cep').value || null,
        telefone: document.getElementById('cliente-telefone').value || null,
        email: document.getElementById('cliente-email').value || null
    };

    try {
        showLoading();

        let response;
        if (isEditing) {
            response = await fetch(`${API_BASE}/clientes/${clienteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_BASE}/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        const result = await response.json();
        hideLoading();

        if (response.ok) {
            showToast(isEditing ? 'Cliente atualizado com sucesso' : 'Cliente adicionado com sucesso', 'success');
            fecharModalCliente();
            await loadClientes();
            renderClientesTable();
        } else {
            showToast(`Erro: ${result.error || 'Erro desconhecido'}`, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast(`Erro: ${error.message}`, 'error');
    }
}
