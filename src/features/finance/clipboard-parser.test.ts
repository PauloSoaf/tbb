import { describe, expect, it, vi } from "vitest";
import { clipboardDrafts, detectClipboardDelimiter, parseClipboardTable } from "./clipboard-parser";

describe("smart finance clipboard",()=>{
  it.each([["a,b\n1,2",","],["a;b\n1;2",";"],["a\tb\n1\t2","\t"]])("detects delimiter",(input,delimiter)=>expect(detectClipboardDelimiter(input)).toBe(delimiter));
  it("preserves quoted commas, newlines, accents and empty cells",()=>expect(parseClipboardTable('Data,Descrição,Valor,Nota\n13/09/2026,"Mercado, bairro",-12.34,"linha 1\nlinha 2"\n14/09/2026,Café,,ação')).toMatchObject({hasHeader:true,rows:[["Data","Descrição","Valor","Nota"],["13/09/2026","Mercado, bairro","-12.34","linha 1\nlinha 2"],["14/09/2026","Café","","ação"]]}));
  it("creates draft rows without persisting",()=>{vi.spyOn(Date,"now").mockReturnValue(1);expect(clipboardDrafts("15/09/2026\tUber\t-32,50\n16/09/2026\tSalário\t8500,00","2026-09-13","account")).toMatchObject([{id:"draft-1-0",date:"15/09/2026",description:"Uber",amount:"32,50",draft:true},{id:"draft-1-1",description:"Salário",amount:"8500,00"}]);});
  it("supports a single two-column row",()=>expect(clipboardDrafts("Uber\t27,50","2026-09-13","a")[0]).toMatchObject({date:"2026-09-13",description:"Uber",amount:"27,50"}));
  it("rejects unclosed quoted records",()=>expect(()=>parseClipboardTable('a,b\n"broken')).toThrow(/fechamento/));
});
