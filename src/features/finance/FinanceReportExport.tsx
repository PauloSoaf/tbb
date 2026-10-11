"use client";
import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { exportFinancialReport } from "./report-actions";
export function FinanceReportExport(){
  const [pending,setPending]=useState<string|null>(null);
  async function download(format:'pdf'|'md'){
    setPending(format);
    try{
      const result=await exportFinancialReport();if('error'in result){toast.error(result.error);return;}
      const {report}=result;
      const content=format==='md'?report.markdown:await import('./report-pdf').then((m)=>m.financialReportPdf(report));
      const url=URL.createObjectURL(new Blob([content],{type:format==='md'?'text/markdown;charset=utf-8':'application/pdf'}));
      const link=document.createElement('a');link.href=url;link.download=`tbb-relatorio-financeiro-${report.today}.${format}`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast.success('Relatório exportado.');
    }catch{toast.error('Não foi possível exportar o relatório. Tente novamente.');}finally{setPending(null);}
  }
  return <div className="row finance-export-actions" aria-label="Exportar relatório completo">{(['pdf','md']as const).map((format)=><button key={format} type="button" className="button-secondary" disabled={!!pending} onClick={()=>download(format)}>{pending===format?<LoaderCircle size={15} className="spin"/>:<Download size={15}/>}Relatório {format==='pdf'?'PDF':'Markdown'}</button>)}</div>;
}
