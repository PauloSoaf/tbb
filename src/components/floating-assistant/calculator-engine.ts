const normalized=(input:string)=>input.replace(/,/g,".").replace(/[×x]/gi,"*").replace(/÷/g,"/").replace(/\s+/g,"");

class ExpressionParser{
  private index=0;
  constructor(private readonly source:string){}
  parse(){
    if(!this.source||!/^[\d.+\-*/()]+$/.test(this.source))throw new Error("Expressão inválida");
    const value=this.expression();
    if(this.index!==this.source.length||!Number.isFinite(value))throw new Error("Expressão inválida");
    return value;
  }
  private expression(){
    let value=this.term();
    while(this.peek()==="+"||this.peek()==="-"){
      const operator=this.source[this.index++];
      const right=this.term();
      value=operator==="+"?value+right:value-right;
    }
    return value;
  }
  private term(){
    let value=this.factor();
    while(this.peek()==="*"||this.peek()==="/"){
      const operator=this.source[this.index++];
      const right=this.factor();
      if(operator==="/"&&right===0)throw new Error("Não é possível dividir por zero");
      value=operator==="*"?value*right:value/right;
    }
    return value;
  }
  private factor():number{
    const token=this.peek();
    if(token==="+"||token==="-"){
      this.index++;
      const value=this.factor();
      return token==="-"?-value:value;
    }
    if(token==="("){
      this.index++;
      const value=this.expression();
      if(this.peek()!==")")throw new Error("Feche os parênteses");
      this.index++;
      return value;
    }
    const start=this.index;
    while(/[\d.]/.test(this.peek()||""))this.index++;
    const raw=this.source.slice(start,this.index);
    if(!raw||!/^\d*\.?\d+$/.test(raw))throw new Error("Número inválido");
    return Number(raw);
  }
  private peek(){return this.source[this.index]||""}
}

export function calculateExpression(input:string){
  const value=new ExpressionParser(normalized(input)).parse();
  const rounded=Math.round((value+Number.EPSILON)*1_000_000_000_000)/1_000_000_000_000;
  if(!Number.isFinite(rounded)||Math.abs(rounded)>1e15)throw new Error("Resultado fora do limite");
  return rounded;
}

export function calculatorValue(value:number){
  return Number.isInteger(value)?String(value):String(Number(value.toPrecision(12)));
}

export function displayCalculatorValue(value:number){
  return new Intl.NumberFormat("pt-BR",{maximumFractionDigits:10}).format(value);
}
