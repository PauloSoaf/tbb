import type { FinancialReport } from "./financial-report";
/** Text stays selectable; long histories wrap and paginate instead of being clipped screenshots. */
export async function financialReportPdf(report:FinancialReport){
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF({unit:'mm',format:'a4'});
  doc.setProperties({title:'TBB - Relatório financeiro',subject:`Retrato em ${report.today}`,creator:'TBB'});
  const margin=16,width=178,bottom=278;let y=20;
  const newPage=()=>{doc.addPage();y=20;};
  const normalize=(line:string)=>line.replace(/—|–/g,'-').replace(/→/g,'->').replace(/\\\|/g,'/').replace(/\u00a0/g,' ');
  for(const raw of report.markdown.split('\n')){
    if(/^---(?: \| ---)*$/.test(raw))continue;
    const heading=raw.startsWith('#');const level=raw.match(/^#+/)?.[0].length||0;
    const size=level===1?17:level===2?12:level===3?10:9;
    doc.setFont('helvetica',heading?'bold':'normal');doc.setFontSize(size);
    doc.setTextColor(heading?10:45,heading?35:45,heading?60:45);
    const lines=doc.splitTextToSize(normalize(raw.replace(/^#+\s*/,'')),width) as string[];
    const height=size*.45;
    if(heading){y+=4;if(y+height*3>bottom)newPage();}
    for(const line of lines){if(y+height>bottom)newPage();doc.text(line,margin,y);y+=height;}
    y+=raw?2:1;
    if(raw==='## Cobertura e possível dívida'&&report.hasCash){
      if(y+32>bottom)newPage();
      const maximum=Math.max(report.cashCents,report.invoicesCents,1);
      for(const [index,label,value]of [[0,'Dinheiro registrado',Math.max(0,report.cashCents)],[1,'Faturas abertas',report.invoicesCents]]as const){
        doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text(`${label}: ${(value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`,margin,y);
        y+=3;doc.setFillColor(index===0?52:255,index===0?180:151,index===0?130:73);doc.rect(margin,y,Math.max(0,value)/maximum*width,3,'F');y+=7;
      }
      y+=3;
    }
  }
  const count=doc.getNumberOfPages();
  for(let page=1;page<=count;page++){doc.setPage(page);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(95);doc.text(`TBB | ${report.today} | ${page}/${count}`,margin,289);}
  return doc.output('arraybuffer');
}
