export type ClipboardTable = { delimiter: "\t" | "," | ";"; rows: string[][]; hasHeader: boolean };

function firstRecordCounts(input: string) {
  let quoted = false; const counts = { "\t": 0, ",": 0, ";": 0 };
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') index++;
      else quoted = !quoted;
    }
    if (!quoted && (char === "\n" || char === "\r")) break;
    if (!quoted && char in counts) counts[char as keyof typeof counts]++;
  }
  return counts;
}

export function detectClipboardDelimiter(input: string): ClipboardTable["delimiter"] {
  const counts = firstRecordCounts(input);
  return (Object.entries(counts) as [ClipboardTable["delimiter"], number][]).sort((a,b)=>b[1]-a[1])[0][0];
}

export function parseClipboardTable(input: string): ClipboardTable {
  const clean = input.replace(/^\uFEFF/, "");
  if (!clean.trim() || clean.length > 1_000_000 || clean.includes("\0") || clean.includes("\uFFFD")) throw new Error("Conteúdo vazio, grande demais ou sem codificação UTF-8 válida.");
  const delimiter = detectClipboardDelimiter(clean);
  const rows: string[][]=[]; let row:string[]=[]; let cell=""; let quoted=false; let afterQuote=false;
  for(let index=0;index<clean.length;index++){
    const char=clean[index];
    if(quoted){if(char==='"'&&clean[index+1]==='"'){cell+='"';index++;}else if(char==='"'){quoted=false;afterQuote=true;}else cell+=char;}
    else if(char==='"'){if(cell.trim()||afterQuote)throw new Error("Aspas inválidas.");quoted=true;}
    else if(char===delimiter){row.push(cell.trim());cell="";afterQuote=false;}
    else if(char==='\n'||char==='\r'){if(char==='\r'&&clean[index+1]==='\n')index++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell="";afterQuote=false;}
    else {if(afterQuote&&char.trim())throw new Error("Conteúdo inesperado após aspas.");if(!afterQuote)cell+=char;}
    if(rows.length>5000)throw new Error("Cole no máximo 5.000 linhas.");
  }
  if(quoted)throw new Error("Aspas sem fechamento."); row.push(cell.trim()); if(row.some(Boolean))rows.push(row);
  if(!rows.length)throw new Error("Nenhuma linha detectada.");
  const width=Math.max(...rows.map(item=>item.length));
  if(width>50)throw new Error("Cole no máximo 50 colunas.");
  const normalized=rows.map(item=>[...item,...Array(width-item.length).fill("")]);
  const headerWords=/^(data|date|descri[cç][aã]o|description|valor|amount|categoria|category|conta|account|merchant|estabelecimento|tipo|type)$/i;
  const hasHeader=normalized[0].filter(value=>headerWords.test(value.trim())).length>=2;
  return {delimiter,rows:normalized,hasHeader};
}

export function clipboardDrafts(input:string,today:string,accountId:string){
  const parsed=parseClipboardTable(input);const data=parsed.hasHeader?parsed.rows.slice(1):parsed.rows;
  return data.map((row,index)=>{
    const [date,description,amount]=row.length>=3?row:[today,row[0]||"",row[1]||""];
    return {id:`draft-${Date.now()}-${index}`,date:date||today,description:description||"",merchant:"",categoryId:"",accountId,type:(amount||"").trim().startsWith("-")?"EXPENSE" as const:"EXPENSE" as const,amount:(amount||"").replace(/^[-+]/,""),tags:"",draft:true};
  });
}
