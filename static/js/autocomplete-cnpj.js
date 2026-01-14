/**
 * AUTOCOMPLETE DE CNPJs DA RECEITA FEDERAL
 * Integrado ao Dashboard - Performance: ~6ms
 */

(function() {
    'use strict';

    let autocompleteTimeout;
    let suggestionsDiv;

    // Inicializar quando o DOM carregar
    document.addEventListener('DOMContentLoaded', inicializarAutocompleteCNPJ);

    function inicializarAutocompleteCNPJ() {
        // Criar div de sugestões se não existir
        criarDivSugestoes();

        // Adicionar autocomplete no campo "rf-nome" (Buscar por Nome)
        const campoNome = document.getElementById('rf-nome');
        if (campoNome) {
            campoNome.addEventListener('input', function() {
                buscarAutocompleteCNPJ('nome_fantasia', this.value);
            });
        }

        // Adicionar autocomplete no campo "rf-cnpj" (Buscar por CNPJ)
        const campoCNPJ = document.getElementById('rf-cnpj');
        if (campoCNPJ) {
            campoCNPJ.addEventListener('input', function() {
                const cnpjLimpo = this.value.replace(/\D/g, '');
                if (cnpjLimpo.length >= 2) {
                    buscarAutocompleteCNPJ('cnpj', cnpjLimpo);
                }
            });
        }

        console.log('[OK] Autocomplete de CNPJs da Receita Federal inicializado');
    }

    function criarDivSugestoes() {
        suggestionsDiv = document.getElementById('sugestoes-cnpj-rf');

        if (!suggestionsDiv) {
            suggestionsDiv = document.createElement('div');
            suggestionsDiv.id = 'sugestoes-cnpj-rf';
            suggestionsDiv.className = 'autocomplete-sugestoes-cnpj-rf';

            // Inserir após o botão de buscar
            const container = document.querySelector('.p-3.bg-blue-50');
            if (container) {
                container.appendChild(suggestionsDiv);
            }
        }
    }

    function buscarAutocompleteCNPJ(campo, termo) {
        clearTimeout(autocompleteTimeout);

        if (!termo || termo.trim().length < 2) {
            fecharSugestoes();
            return;
        }

        // Debounce de 300ms
        autocompleteTimeout = setTimeout(() => {
            executarBuscaCNPJ(campo, termo.trim());
        }, 300);
    }

    async function executarBuscaCNPJ(campo, termo) {
        try {
            mostrarLoading();

            const params = new URLSearchParams({
                campo: campo,
                termo: termo,
                limit: 10
            });

            const response = await fetch(`/api/cnpj/autocomplete?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.sucesso && data.resultados && data.resultados.length > 0) {
                mostrarSugestoes(data.resultados);
            } else {
                mostrarMensagem('Nenhuma empresa encontrada');
            }

        } catch (error) {
            console.error('Erro ao buscar CNPJs:', error);
            mostrarMensagem('Erro ao buscar. Tente novamente.');
        }
    }

    function mostrarLoading() {
        suggestionsDiv.innerHTML = `
            <div class="p-3 text-center text-blue-600">
                <i data-lucide="loader-2" class="w-4 h-4 inline animate-spin"></i>
                <span class="ml-2">Buscando na Receita Federal...</span>
            </div>
        `;
        suggestionsDiv.classList.add('ativo');
        if (window.lucide) window.lucide.createIcons();
    }

    function mostrarMensagem(texto) {
        suggestionsDiv.innerHTML = `
            <div class="p-3 text-center text-gray-500 text-sm">${texto}</div>
        `;
        suggestionsDiv.classList.add('ativo');
    }

    function mostrarSugestoes(resultados) {
        let html = '<div class="max-h-80 overflow-y-auto">';

        resultados.forEach((empresa) => {
            const nomeExibicao = empresa.nome_fantasia || empresa.razao_social || 'Sem nome';
            const cnpjFormatado = formatarCNPJ(empresa.cnpj);
            const endereco = montarEndereco(empresa);

            html += `
                <div class="sugestao-cnpj-item-rf p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition"
                     onclick='selecionarEmpresaCNPJ_RF(${JSON.stringify(empresa).replace(/'/g, "&apos;")})'>
                    <div class="font-semibold text-gray-800 text-sm">${escapeHtml(nomeExibicao)}</div>
                    <div class="text-xs text-gray-600 mt-1">
                        CNPJ: ${cnpjFormatado}
                        ${empresa.uf ? ` | ${empresa.uf}` : ''}
                    </div>
                    ${endereco ? `<div class="text-xs text-gray-500 mt-1">${escapeHtml(endereco)}</div>` : ''}
                </div>
            `;
        });

        html += '</div>';

        suggestionsDiv.innerHTML = html;
        suggestionsDiv.classList.add('ativo');
    }

    function fecharSugestoes() {
        if (suggestionsDiv) {
            suggestionsDiv.classList.remove('ativo');
        }
    }

    // Expor função global para ser chamada do HTML
    window.selecionarEmpresaCNPJ_RF = function(empresa) {
        console.log('Empresa selecionada:', empresa);

        // Preencher campos do formulário
        document.getElementById('cli-cnpj').value = empresa.cnpj || '';
        document.getElementById('cli-razao').value = empresa.razao_social || '';
        document.getElementById('cli-nome').value = empresa.nome_fantasia || empresa.razao_social || '';
        document.getElementById('cli-cnae').value = empresa.cnae_fiscal || '';
        document.getElementById('cli-rua').value = empresa.logradouro || '';
        document.getElementById('cli-bairro').value = empresa.bairro || '';
        document.getElementById('cli-uf').value = empresa.uf || '';

        // Limpar campos de busca
        document.getElementById('rf-cnpj').value = '';
        document.getElementById('rf-nome').value = '';

        // Fechar sugestões
        fecharSugestoes();

        // Mostrar notificação
        if (window.showToast) {
            showToast('Dados da Receita Federal carregados com sucesso!', 'success');
        }
    };

    // Utilitários
    function formatarCNPJ(cnpj) {
        if (!cnpj) return '';
        cnpj = cnpj.replace(/\D/g, '');
        if (cnpj.length === 14) {
            return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        return cnpj;
    }

    function montarEndereco(empresa) {
        const partes = [];
        if (empresa.logradouro) partes.push(empresa.logradouro);
        if (empresa.bairro) partes.push(empresa.bairro);
        return partes.join(', ');
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    // Fechar sugestões ao clicar fora
    document.addEventListener('click', function(e) {
        if (suggestionsDiv && !e.target.closest('.p-3.bg-blue-50')) {
            fecharSugestoes();
        }
    });

})();
