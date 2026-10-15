import { describe, expect, it } from "vitest";
import { clipboardDrafts, detectClipboardDelimiter, parseClipboardTable } from "./clipboard-parser";

describe("smart finance clipboard",()=>{
  it.each([["a,b\n1,2",","],["a;b\n1;2",";"],["a\tb\n1\t2","\t"]])("detects delimiter",(input,delimiter)=>expect(detectClipboardDelimiter(input)).toBe(delimiter));
  it("preserves quoted commas, newlines, accents and empty cells",()=>expect(parseClipboardTable('Data,Descrição,Valor,Nota\n13/09/2026,"Mercado, bairro",-12.34,"linha 1\nlinha 2"\n14/09/2026,Café,,ação')).toMatchObject({hasHeader:true,rows:[["Data","Descrição","Valor","Nota"],["13/09/2026","Mercado, bairro","-12.34","linha 1\nlinha 2"],["14/09/2026","Café","","ação"]]}));
  it("creates draft rows without persisting, each with its own unique id",()=>{const drafts=clipboardDrafts("15/09/2026\tUber\t-32,50\n16/09/2026\tSalário\t8500,00","2026-09-13","account");expect(drafts).toMatchObject([{date:"15/09/2026",description:"Uber",amount:"32,50",draft:true},{description:"Salário",amount:"8500,00"}]);expect(drafts[0].id).toMatch(/^draft-/);expect(drafts[0].id).not.toBe(drafts[1].id);});
  it("supports a single two-column row",()=>expect(clipboardDrafts("Uber\t27,50","2026-09-13","a")[0]).toMatchObject({date:"2026-09-13",description:"Uber",amount:"27,50"}));
  it("rejects unclosed quoted records",()=>expect(()=>parseClipboardTable('a,b\n"broken')).toThrow(/fechamento/));
});
