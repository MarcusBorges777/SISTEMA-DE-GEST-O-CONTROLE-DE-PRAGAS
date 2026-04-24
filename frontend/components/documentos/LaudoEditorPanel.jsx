/**
 * LaudoEditorPanel — Painel colapsável de edição do Laudo Técnico.
 *
 * Extraído de Laudos.jsx para reduzir o tamanho do componente principal.
 * Recebe toda a lógica de estado via props agrupadas semanticamente.
 *
 * Props:
 *   doc        — visibilidade dos documentos e seus setters
 *   form       — formData, handleInputChange, setFormData
 *   pest       — pestOptions, togglePest
 *   cliente    — clientesSalvos, setPickerOpen, handleSalvarCliente, cnpj*
 *   reserv     — addReservatorio, removeReservatorio, updateReservatorio
 *   gordura    — addCaixaGordura, removeCaixaGordura, updateCaixaGordura
 *   getExpiryDate — função utilitária de data
 */
import React from 'react';
import {
  Edit3, ChevronDown, ChevronUp, FileText, Bug, CheckCircle2,
  Droplets, Archive, AlertTriangle, Plus, Minus, Trash2, Search,
} from 'lucide-react';
import { CnpjInput } from '../shared/CnpjInput';

export function LaudoEditorPanel({ doc, form, pest, cliente, reserv, gordura, getExpiryDate }) {
  const { showEditor, setShowEditor, showPestControl, setShowPestControl,
          showWaterTank, setShowWaterTank, showGreaseTrap, setShowGreaseTrap } = doc;
  const { formData, handleInputChange, setFormData } = form;
  const { pestOptions, togglePest } = pest;
  const { clientesSalvos, setPickerOpen, handleSalvarCliente,
          cnpjValue, handleCnpjChange, isLoadingCnpj, cnpjStatus } = cliente;
  const { addReservatorio, removeReservatorio, updateReservatorio } = reserv;
  const { addCaixaGordura, removeCaixaGordura, updateCaixaGordura } = gordura;

  return (
    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl border border-blue-200 mb-8 no-print">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
          <Edit3 size={20} /> Editar Informações do Documento
        </h3>
        <button onClick={() => setShowEditor(!showEditor)} className="text-gray-500 hover:text-blue-700">
          {showEditor ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {showEditor && (
        <div className="space-y-6">

          {/* SELEÇÃO DE DOCUMENTOS */}
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-bold text-sm text-[#254191] uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={16} /> Documentos a Emitir
            </h4>
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={() => setShowPestControl(!showPestControl)}
                className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                  showPestControl ? 'bg-[#254191] text-white border-blue-900 shadow-md' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Bug size={18} className={showPestControl ? 'text-blue-300' : 'text-gray-400'} />
                Controle de Pragas
                {showPestControl && <CheckCircle2 size={16} className="ml-auto" />}
              </button>
              <button
                onClick={() => setShowWaterTank(!showWaterTank)}
                className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                  showWaterTank ? 'bg-[#254191] text-white border-blue-900 shadow-md' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Droplets size={18} className={showWaterTank ? 'text-blue-300' : 'text-gray-400'} />
                Higienização (Caixa D'água)
                {showWaterTank && <CheckCircle2 size={16} className="ml-auto" />}
              </button>
              <button
                onClick={() => setShowGreaseTrap(!showGreaseTrap)}
                className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                  showGreaseTrap ? 'bg-[#254191] text-white border-blue-900 shadow-md' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Archive size={18} className={showGreaseTrap ? 'text-blue-300' : 'text-gray-400'} />
                Caixa de Gordura
                {showGreaseTrap && <CheckCircle2 size={16} className="ml-auto" />}
              </button>
            </div>
            {(!showPestControl && !showWaterTank && !showGreaseTrap) && (
              <p className="text-red-500 text-xs mt-3 font-bold flex items-center gap-1 justify-center bg-red-50 p-2 rounded">
                <AlertTriangle size={14} /> Atenção: Selecione pelo menos um documento para poder imprimir.
              </p>
            )}
          </div>

          {/* SELEÇÃO DE PRAGAS */}
          {showPestControl && (
            <div>
              <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1 mb-3">Seleção de Pragas e Vetores</h4>
              <div className="flex flex-wrap gap-2">
                {pestOptions.map(pest => (
                  <button
                    key={pest.id}
                    onClick={() => togglePest(pest.id)}
                    className={`flex-1 min-w-[100px] p-2 text-xs font-bold rounded border transition-all flex items-center justify-center gap-1 ${
                      (formData.selectedPests || []).includes(pest.id)
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {(formData.selectedPests || []).includes(pest.id) && <CheckCircle2 size={14} />}
                    {pest.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DADOS GERAIS DO SERVIÇO E CLIENTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1">Dados Gerais</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nº Laudo</label>
                  <div className="flex gap-1">
                    <input type="text" name="laudoNumero" value={formData.laudoNumero} onChange={handleInputChange}
                      className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <button
                      onClick={() => { const n = parseInt(formData.laudoNumero, 10) || 1; setFormData(p => ({ ...p, laudoNumero: String(Math.max(1, n - 1)).padStart(4, '0') })); }}
                      className="p-2 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0"
                      title="Voltar para o número anterior"
                    ><Minus size={16} /></button>
                    <button
                      onClick={() => { const n = parseInt(formData.laudoNumero, 10) || 0; setFormData(p => ({ ...p, laudoNumero: String(n + 1).padStart(4, '0') })); }}
                      className="p-2 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 flex items-center justify-center transition-colors shrink-0"
                      title="Avançar para o próximo número"
                    ><Plus size={16} /></button>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1 italic">* Salva automaticamente ao imprimir.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data Execução</label>
                  <input type="date" name="dataExecucao" value={formData.dataExecucao} onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                {showPestControl && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Garantia Pragas (Meses)</label>
                    <div className="flex gap-1">
                      <input type="number" name="garantiaMeses" value={formData.garantiaMeses} onChange={handleInputChange}
                        className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      <button
                        onClick={() => { const n = parseInt(formData.garantiaMeses, 10) || 0; setFormData(p => ({ ...p, garantiaMeses: Math.max(0, n - 1) })); }}
                        className="p-2 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0"
                        title="Diminuir meses de garantia"
                      ><Minus size={16} /></button>
                      <button
                        onClick={() => { const n = parseInt(formData.garantiaMeses, 10) || 0; setFormData(p => ({ ...p, garantiaMeses: n + 1 })); }}
                        className="p-2 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 flex items-center justify-center transition-colors shrink-0"
                        title="Aumentar meses de garantia"
                      ><Plus size={16} /></button>
                    </div>
                  </div>
                )}
                {showPestControl && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Próxima Manutenção</label>
                    <input type="text" value={getExpiryDate(formData.dataExecucao, formData.garantiaMeses)} disabled
                      className="w-full p-2 border rounded text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1">Dados do Cliente</h4>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Carregar Cliente Salvo</label>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="w-full flex items-center gap-2 p-2 border border-slate-300 rounded text-sm bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    <Search size={16} className="text-slate-400" />
                    <span className="truncate">Buscar cliente salvo...</span>
                    <span className="ml-auto text-xs text-slate-400 shrink-0">{clientesSalvos.length} salvo{clientesSalvos.length === 1 ? '' : 's'}</span>
                  </button>
                </div>
                <button
                  onClick={handleSalvarCliente}
                  className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors flex items-center gap-1 shrink-0"
                  title="Salvar cliente atual no navegador"
                >
                  <Plus size={14} /> Salvar Cliente
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Razão Social / Nome</label>
                <input type="text" name="cliente.nome" value={formData.cliente.nome} onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia</label>
                <input type="text" name="cliente.fantasia" value={formData.cliente.fantasia} onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CnpjInput value={cnpjValue} onChange={handleCnpjChange} isLoading={isLoadingCnpj} status={cnpjStatus} />
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cód. / Atividade Econômica</label>
                  <input type="text" name="cliente.atividadeEconomica" value={formData.cliente.atividadeEconomica} onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Endereço</label>
                <input type="text" name="cliente.endereco" value={formData.cliente.endereco} onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* RESERVATÓRIOS */}
          {showWaterTank && (
            <div className="border-t pt-4 mt-2">
              <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1 mb-3">Reservatórios (Higienização)</h4>
              {(formData.reservatorios || []).map((res, idx) => (
                <div key={`res-${idx}`} className="flex gap-2 mb-2 items-end bg-gray-50 p-2 rounded">
                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-gray-500">Qtd</label>
                    <input type="text" value={res.quantidade} onChange={e => updateReservatorio(idx, 'quantidade', e.target.value)}
                      className="w-full p-1 border rounded text-xs" placeholder="01" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500">Tipo</label>
                    <input type="text" value={res.tipo} onChange={e => updateReservatorio(idx, 'tipo', e.target.value)}
                      className="w-full p-1 border rounded text-xs" placeholder="Caixa Fibra" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500">Volume</label>
                    <input type="text" value={res.volume} onChange={e => updateReservatorio(idx, 'volume', e.target.value)}
                      className="w-full p-1 border rounded text-xs" placeholder="1000L" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500">Identificação</label>
                    <input type="text" value={res.identificacao} onChange={e => updateReservatorio(idx, 'identificacao', e.target.value)}
                      className="w-full p-1 border rounded text-xs" placeholder="Água Potável" />
                  </div>
                  <button onClick={() => removeReservatorio(idx)} className="p-1.5 text-red-500 hover:bg-red-100 rounded mb-0.5">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button onClick={addReservatorio} className="text-xs flex items-center gap-1 text-blue-600 font-bold mt-2 hover:bg-blue-50 px-2 py-1 rounded">
                <Plus size={14} /> Adicionar Reservatório
              </button>
            </div>
          )}

          {/* CAIXAS DE GORDURA */}
          {showGreaseTrap && (
            <div className="border-t pt-4 mt-2">
              <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider border-b pb-1 mb-3">Caixas de Gordura</h4>
              {(formData.caixasGordura || []).map((res, idx) => (
                <div key={`cg-${idx}`} className="flex gap-2 mb-2 items-end bg-gray-50 p-2 rounded">
                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-gray-500">Qtd</label>
                    <input type="text" value={res.quantidade} onChange={e => updateCaixaGordura(idx, 'quantidade', e.target.value)}
                      className="w-full p-1 border rounded text-xs" placeholder="01" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500">Tipo</label>
                    <input type="text" value={res.tipo} onChange={e => updateCaixaGordura(idx, 'tipo', e.target.value)}
                      className="w-full p-1 border rounded text-xs" placeholder="Alvenaria" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500">Volume</label>
                    <input type="text" value={res.volume} onChange={e => updateCaixaGordura(idx, 'volume', e.target.value)}
                      className="w-full p-1 border rounded text-xs" placeholder="100L" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500">Identificação</label>
                    <input type="text" value={res.identificacao} onChange={e => updateCaixaGordura(idx, 'identificacao', e.target.value)}
                      className="w-full p-1 border rounded text-xs" placeholder="Cozinha" />
                  </div>
                  <button onClick={() => removeCaixaGordura(idx)} className="p-1.5 text-red-500 hover:bg-red-100 rounded mb-0.5">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button onClick={addCaixaGordura} className="text-xs flex items-center gap-1 text-blue-600 font-bold mt-2 hover:bg-blue-50 px-2 py-1 rounded">
                <Plus size={14} /> Adicionar Caixa de Gordura
              </button>
            </div>
          )}

          {/* RESPONSÁVEIS & ALVARÁ */}
          <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Responsáveis pela Execução</label>
              <input
                type="text"
                name="responsaveis"
                value={formData.responsaveis}
                onChange={handleInputChange}
                list="responsaveis-suggestions"
                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nome dos responsáveis..."
              />
              <datalist id="responsaveis-suggestions">
                <option value="MARIA APARECIDA DE OLIVEIRA BORGES" />
                <option value="PAULO BORGES DE CASTRO" />
                <option value="PAULO BORGES DE CASTRO e MARIA APARECIDA DE OLIVEIRA BORGES" />
              </datalist>
              <p className="text-[10px] text-gray-400 italic mt-1">* Comece a digitar para ver as sugestões.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Alvará Sanitário (Cabeçalho)</label>
              <input
                type="text"
                name="alvara"
                value={formData.alvara}
                onChange={handleInputChange}
                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nº 164/2025 (Venc: 03/07/2028)"
              />
              <p className="text-[10px] text-gray-400 italic mt-1">* Editável para futuras atualizações.</p>
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          {showPestControl && (
            <div className="mt-4 border-t pt-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">Observações Adicionais (Página Controle de Pragas)</label>
              <textarea
                name="observacao"
                value={formData.observacao}
                onChange={handleInputChange}
                rows="2"
                className="w-full p-2 border rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none min-h-[40px]"
                placeholder="Digite aqui alguma observação específica para sair no laudo de pragas... (Deixe em branco para ocultar)"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
