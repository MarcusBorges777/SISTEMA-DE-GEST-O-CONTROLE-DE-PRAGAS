const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/Laudos.js","assets/main.js","assets/react.js","assets/pdf.js","assets/icons.js","assets/BotoesDocumento.js","assets/brasilApi.js","assets/formatters.js","assets/ClientePickerModal.js","assets/Modal.js","assets/clienteCache.js","assets/ClientePerfilModal.js","assets/GarantiaModal.js","assets/Orcamentos.js","assets/Recibos.js","assets/RelatorioMensal.js","assets/ClienteSection.js","assets/RelatorioBranco.js"])))=>i.map(i=>d[i]);
import{_ as n}from"./pdf.js";import{u as x,n as g,j as e}from"./main.js";import{g as f,r as a,c as h}from"./react.js";import{b as _}from"./brasilApi.js";import{f as v,t as k,R as w,A as j,F as E}from"./icons.js";import"./formatters.js";const R=a.lazy(()=>n(()=>import("./Laudos.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12]))),y=a.lazy(()=>n(()=>import("./Orcamentos.js"),__vite__mapDeps([13,1,2,3,4,10,7,5,6,8,9,11]))),P=a.lazy(()=>n(()=>import("./Recibos.js"),__vite__mapDeps([14,1,2,3,4,10,7,5,6,8,9,11,12]))),T=a.lazy(()=>n(()=>import("./RelatorioMensal.js"),__vite__mapDeps([15,1,2,3,4,5,6,7,8,9,10,16]))),A=a.lazy(()=>n(()=>import("./RelatorioBranco.js"),__vite__mapDeps([17,1,2,3,4,5,6,7,8,9,10,16]))),L=[{id:"laudo",label:"Laudo",icon:v,description:"Tecnico + Higienizacao"},{id:"orcamento",label:"Orcamento",icon:k,description:"Proposta de Servicos"},{id:"recibo",label:"Recibo",icon:w,description:"Comprovante"},{id:"relatorio_mensal",label:"Rel. Mensal",icon:j,description:"Junção de Serviços"},{id:"relatorio_branco",label:"Rel. Livre",icon:E,description:"Página em Branco"}];function I(){const[d,m]=f(),[o,p]=a.useState(d.get("tab")||"laudo"),[i,b]=a.useState([]),r=h(),{empresa:z,setEmpresa:u}=x();a.useEffect(()=>{r.state&&(r.state.cliente&&u(g(r.state.cliente)),r.state.tab&&l(r.state.tab))},[r.state]),a.useEffect(()=>{const t=new Date().getFullYear();_(t).then(s=>b(s)).catch(()=>{})},[]);const l=t=>{p(t),m({tab:t})};return e.jsxs("div",{className:"flex flex-col items-center",children:[e.jsx("nav",{className:"w-full max-w-[210mm] mb-6 print:hidden",children:e.jsx("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 flex gap-2",children:L.map(t=>{const s=t.icon,c=o===t.id;return e.jsxs("button",{onClick:()=>l(t.id),className:`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${c?"bg-brand-500 text-white shadow-md":"text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200"}`,children:[e.jsx(s,{size:18,className:c?"text-blue-200":"text-slate-400"}),e.jsx("span",{children:t.label})]},t.id)})})}),e.jsx("main",{className:"w-full flex flex-col items-center",children:e.jsxs(a.Suspense,{fallback:e.jsx("div",{className:"py-10 text-sm font-semibold text-slate-400",children:"Carregando documento..."}),children:[o==="laudo"&&e.jsx(R,{feriados:i}),o==="orcamento"&&e.jsx(y,{feriados:i}),o==="recibo"&&e.jsx(P,{feriados:i}),o==="relatorio_mensal"&&e.jsx(T,{feriados:i}),o==="relatorio_branco"&&e.jsx(A,{feriados:i})]})}),e.jsx("style",{children:`
        .a4-page {
          width: 210mm; height: 297mm; min-height: 297mm; position: relative;
        }
        .text-shadow-sm { text-shadow: 1px 1px 2px rgba(0,0,0,0.05); }
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; margin: 0; padding: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .no-print, .print\\:hidden { display: none !important; }
          .a4-page {
            box-shadow: none !important; border: none !important; margin: 0 !important;
            padding: 15mm !important; width: 210mm; height: 297mm; overflow: hidden;
          }
          #a4-document {
            box-shadow: none !important; width: 210mm; padding: 10mm; margin: 0; border-radius: 0;
            position: relative !important; page-break-after: avoid; page-break-inside: avoid;
          }
          .print-page-break, .print\\:page-break { page-break-before: always; }
          .print-avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
          .print-bg-blue { background-color: #254191 !important; color: white !important; }
          .print-bg-header { background-color: #1e3a8a !important; color: white !important; }
          .print-bg-blue-line { background-color: #254191 !important; }
          .print-bg-light-blue { background-color: #eff6ff !important; }
          .print-bg-red { background-color: #fff5f5 !important; }
          .print-bg-row-val { background-color: #eff6ff !important; }
          .print-border-blue { border-left-color: #254191 !important; }
          .print-border-light-blue { border-color: #dbeafe !important; }
        }
        .no-spinner::-webkit-inner-spin-button, .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        textarea { overflow: hidden; }
        input:focus, textarea:focus { outline: none; }
      `})]})}export{I as default};
