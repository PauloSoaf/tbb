"use client";

import { useMemo, useState } from "react";
import { AreaChart } from "@/components/charts/area-chart";
import { Area } from "@/components/charts/area";
import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
  type HeatmapColumn,
} from "@/components/charts/heatmap";

export type FinanceFlowPoint = { month: string; income: number; expenses: number };
export type FinanceCategoryPoint = { category: string; amount: number; color?: string };
export type FinanceDailyPoint = { date: string; amount: number };
export type FinanceDailyCashPoint = { date: string; income: number; expenses: number; balance: number };
export type FinanceCreditCardPoint = { name:string; spent:number; available:number; limit:number; usage:number|null };
export type FinanceBudgetPoint = { category:string; spent:number; remaining:number; limit:number; usage:number };
export type FinanceBillPoint = { label:string; kind:string; amount:number; date:string };

const currencyFormatter=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:2});
const monthFormatter=new Intl.DateTimeFormat("pt-BR",{month:"short",timeZone:"UTC"});
const asNumber=(value:unknown)=>typeof value==="number"?value:Number(value)||0;
const formatCurrency=(value:unknown)=>currencyFormatter.format(asNumber(value));
const monthDate=(month:string)=>new Date(`${month}-01T00:00:00.000Z`);
const monthLabel=(month:string)=>monthFormatter.format(monthDate(month)).replace(".","");

export function FinanceFlowChart({ data }: { data: FinanceFlowPoint[] }) {
  const [range,setRange]=useState<3|6|12>(6);
  const chartData=useMemo(()=>data.slice(-range).map(item=>({...item,label:monthLabel(item.month)})),[data,range]);

  return <div className="finance-chart-body">
    <div className="chart-range" aria-label="Período do gráfico">
      {([3,6,12] as const).map(value=><button type="button" key={value} aria-pressed={range===value} onClick={()=>setRange(value)}>{value}M</button>)}
    </div>
    <BarChart data={chartData} xDataKey="label" aspectRatio="2.65 / 1" margin={{left:24,right:18,top:22,bottom:36}} barGap={0.28}>
      <Grid horizontal hideHorizontalEdgeLines/>
      <Bar dataKey="income" fill="var(--success)" lineCap={5}/>
      <Bar dataKey="expenses" fill="var(--danger)" lineCap={5}/>
      <BarXAxis showAllLabels/>
      <ChartTooltip showDatePill={false} rows={point=>[
        {label:"Receitas",value:formatCurrency(point.income),color:"var(--success)"},
        {label:"Despesas",value:formatCurrency(point.expenses),color:"var(--danger)"},
      ]}/>
    </BarChart>
  </div>;
}

export function FinanceNetChart({ data }: { data: FinanceFlowPoint[] }) {
  const chartData=useMemo(()=>data.map(item=>({date:monthDate(item.month),net:item.income-item.expenses})),[data]);
  return <AreaChart data={chartData} xDataKey="date" aspectRatio="2 / 1" margin={{left:24,right:18,top:20,bottom:36}}>
    <Grid horizontal hideHorizontalEdgeLines highlightRowValues={[0]}/>
    <Area dataKey="net" fill="var(--chart-1)" stroke="var(--chart-1)" fillOpacity={0.34} showMarkers/>
    <XAxis numTicks={Math.min(5,chartData.length)}/>
    <ChartTooltip rows={point=>[{label:"Resultado",value:formatCurrency(point.net),color:"var(--chart-1)"}]}/>
  </AreaChart>;
}

export function FinanceDailyCashFlowChart({ data, labels }: { data: FinanceDailyCashPoint[]; labels?: { income: string; expenses: string; balance: string; last7Days?: string; currentMonth?: string } }) {
  const [range,setRange]=useState<"7D"|"MONTH">("MONTH");
  const allData=useMemo(()=>{
    return data.map((item,index)=>({
      date:new Date(`${item.date}T00:00:00.000Z`),
      income:item.income,
      expenses:item.expenses,
      balance:data.slice(0,index+1).reduce((sum,point)=>sum+point.income-point.expenses,0),
    }));
  },[data]);
  const chartData=range==="7D"?allData.slice(-7):allData;
  const text=labels||{income:"Receitas",expenses:"Despesas",balance:"Saldo"};
  return <div className="finance-chart-body">
    <div className="chart-range finance-daily-range" aria-label="Período do gráfico"><button type="button" aria-pressed={range==="7D"} onClick={()=>setRange("7D")}>{labels?.last7Days||"7D"}</button><button type="button" aria-pressed={range==="MONTH"} onClick={()=>setRange("MONTH")}>{labels?.currentMonth||"Mês"}</button></div>
    <AreaChart data={chartData} xDataKey="date" aspectRatio="6.2 / 1" style={{height:"clamp(104px,12.5vh,142px)"}} margin={{left:28,right:20,top:12,bottom:24}}>
    <Grid horizontal hideHorizontalEdgeLines highlightRowValues={[0]}/>
    <Area dataKey="expenses" fill="var(--danger)" stroke="var(--danger)" fillOpacity={0.1}/>
    <Area dataKey="income" fill="var(--success)" stroke="var(--success)" fillOpacity={0.12}/>
    <Area dataKey="balance" fill="var(--chart-1)" stroke="var(--chart-1)" fillOpacity={0.2} showMarkers/>
    <XAxis numTicks={Math.min(7,Math.max(2,chartData.length))}/>
    <ChartTooltip rows={point=>[
      {label:text.income,value:formatCurrency(point.income),color:"var(--success)"},
      {label:text.expenses,value:formatCurrency(point.expenses),color:"var(--danger)"},
      {label:text.balance,value:formatCurrency(point.balance),color:"var(--chart-1)"},
    ]}/>
    </AreaChart>
  </div>;
}

export function FinanceIncomeUsageChart({ fixed, variable, available, labels }: { fixed: number; variable: number; available: number; labels?: { fixed: string; variable: string; available: string } }) {
  const text=labels||{fixed:"Fixos",variable:"Variáveis",available:"Disponível"};
  const data=[{label:"Renda",fixed,variable,available}];
  return <BarChart data={data} xDataKey="label" orientation="horizontal" stacked className="finance-usage-chart" aspectRatio="7 / 1" margin={{left:4,right:8,top:4,bottom:4}} barGap={0.18}>
    <Bar dataKey="fixed" fill="var(--chart-4)" lineCap={7}/>
    <Bar dataKey="variable" fill="var(--warning)" lineCap={7}/>
    <Bar dataKey="available" fill="var(--success)" lineCap={7}/>
    <ChartTooltip showDatePill={false} showCrosshair={false} rows={point=>[
      {label:text.fixed,value:formatCurrency(point.fixed),color:"var(--chart-4)"},
      {label:text.variable,value:formatCurrency(point.variable),color:"var(--warning)"},
      {label:text.available,value:formatCurrency(point.available),color:"var(--success)"},
    ]}/>
  </BarChart>;
}

export function FinanceCategoryChart({ data }: { data: FinanceCategoryPoint[] }) {
  return <BarChart data={data} xDataKey="category" orientation="horizontal" className="finance-category-chart" aspectRatio="3.9 / 1" margin={{left:112,right:18,top:6,bottom:6}} barGap={0.6}>
    <Grid vertical horizontal={false} hideVerticalEdgeLines/>
    <Bar dataKey="amount" fill="var(--chart-4)" lineCap={6}/>
    <BarYAxis/>
    <ChartTooltip showDatePill={false} showCrosshair={false} rows={point=>[{label:"Despesas",value:formatCurrency(point.amount),color:"var(--chart-4)"}]}/>
  </BarChart>;
}

export function FinanceIncomePressureChart({income,expenses,day,daysInMonth}:{income:number;expenses:number;day:number;daysInMonth:number}){
  const projection=day?Math.round(expenses/day*daysInMonth):expenses;
  const data=[
    {label:"Realizado",spent:expenses,available:Math.max(0,income-expenses)},
    {label:"Projeção",spent:projection,available:Math.max(0,income-projection)},
  ];
  return <BarChart data={data} xDataKey="label" orientation="horizontal" stacked aspectRatio="2 / 1" margin={{left:92,right:18,top:15,bottom:15}} barGap={0.36}>
    <Grid vertical horizontal={false} hideVerticalEdgeLines/>
    <Bar dataKey="spent" fill="var(--danger)" lineCap={5}/>
    <Bar dataKey="available" fill="var(--chart-2)" lineCap={5}/>
    <BarYAxis/>
    <ChartTooltip showDatePill={false} showCrosshair={false} rows={point=>[
      {label:"Despesas",value:formatCurrency(point.spent),color:"var(--danger)"},
      {label:"Renda livre",value:formatCurrency(point.available),color:"var(--chart-2)"},
    ]}/>
  </BarChart>;
}

export function FinanceCreditCardChart({data}:{data:FinanceCreditCardPoint[]}){
  return <BarChart data={data} xDataKey="name" stacked aspectRatio="2 / 1" margin={{left:18,right:18,top:18,bottom:38}} barGap={0.28}>
    <Grid horizontal hideHorizontalEdgeLines/>
    <Bar dataKey="spent" fill="var(--chart-3)" lineCap={5}/>
    <Bar dataKey="available" fill="var(--chart-5)" lineCap={5}/>
    <BarXAxis showAllLabels/>
    <ChartTooltip showDatePill={false} rows={point=>[
      {label:"Usado no mês",value:formatCurrency(point.spent),color:"var(--chart-3)"},
      {label:"Limite livre",value:formatCurrency(point.available),color:"var(--chart-5)"},
    ]}/>
  </BarChart>;
}

export function FinanceBudgetChart({data}:{data:FinanceBudgetPoint[]}){
  return <BarChart data={data} xDataKey="category" orientation="horizontal" stacked aspectRatio="1.72 / 1" margin={{left:108,right:18,top:14,bottom:14}} barGap={0.3}>
    <Grid vertical horizontal={false} hideVerticalEdgeLines/>
    <Bar dataKey="spent" fill="var(--warning)" lineCap={5}/>
    <Bar dataKey="remaining" fill="var(--chart-2)" lineCap={5}/>
    <BarYAxis maxLabels={8}/>
    <ChartTooltip showDatePill={false} showCrosshair={false} rows={point=>[
      {label:"Usado",value:formatCurrency(point.spent),color:"var(--warning)"},
      {label:"Restante",value:formatCurrency(point.remaining),color:"var(--chart-2)"},
    ]}/>
  </BarChart>;
}

export function FinanceBillsChart({data}:{data:FinanceBillPoint[]}){
  return <BarChart data={data} xDataKey="label" orientation="horizontal" aspectRatio="1.72 / 1" margin={{left:112,right:18,top:14,bottom:14}} barGap={0.34}>
    <Grid vertical horizontal={false} hideVerticalEdgeLines/>
    <Bar dataKey="amount" fill="var(--chart-5)" lineCap={6}/>
    <BarYAxis maxLabels={8}/>
    <ChartTooltip showDatePill={false} showCrosshair={false} rows={point=>[
      {label:String(point.kind||"Pagamento"),value:formatCurrency(point.amount),color:"var(--chart-5)"},
      {label:"Vencimento",value:new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",timeZone:"UTC"}).format(new Date(`${String(point.date)}T00:00:00.000Z`)),color:"var(--chart-2)"},
    ]}/>
  </BarChart>;
}

function buildSpendingHeatmap(data:FinanceDailyPoint[],from:string,to:string):HeatmapColumn[]{
  const totals=new Map(data.map(item=>[item.date,item.amount]));
  const first=new Date(`${from}T00:00:00.000Z`);
  first.setUTCDate(first.getUTCDate()-((first.getUTCDay()+6)%7));
  const last=new Date(`${to}T00:00:00.000Z`);
  const columns:HeatmapColumn[]=[];
  for(let week=new Date(first),column=0;week<=last;week=new Date(week.getTime()+7*86_400_000),column++){
    columns.push({bin:column,bins:Array.from({length:7},(_,row)=>{
      const date=new Date(week.getTime()+row*86_400_000);
      const key=date.toISOString().slice(0,10);
      return {bin:row,date,count:key<from||key>to?0:totals.get(key)||0};
    })});
  }
  return columns;
}

export function FinanceSpendingHeatmap({data,from,to}:{data:FinanceDailyPoint[];from:string;to:string}){
  const columns=useMemo(()=>buildSpendingHeatmap(data,from,to),[data,from,to]);
  const levels=["var(--muted)","color-mix(in srgb, var(--danger) 22%, var(--card))","color-mix(in srgb, var(--danger) 42%, var(--card))","color-mix(in srgb, var(--danger) 66%, var(--card))","var(--danger)"] as [string,string,string,string,string];
  return <div className="bklit-heatmap finance-spending-heatmap" aria-label="Intensidade diária das despesas nas últimas 16 semanas">
    <HeatmapChart data={columns} weekStartDay={1} levelColors={levels} margin={{top:25,left:36,right:8,bottom:6}}>
      <HeatmapCells activeScale={1.1}/>
      <HeatmapXAxis/>
      <HeatmapYAxis labelFormat="initial"/>
      <HeatmapTooltip formatLabel={amount=>`${formatCurrency(amount)} em despesas`}/>
      <HeatmapLegend lessLabel="Menor gasto" moreLabel="Maior gasto"/>
    </HeatmapChart>
  </div>;
}

export function SpendingTrendChart({ data }: { data: { date: Date; spending: number }[] }) {
  return <AreaChart data={data} xDataKey="date" aspectRatio="2.4 / 1" margin={{left:24,right:16,top:20,bottom:34}}>
    <Grid horizontal hideHorizontalEdgeLines/>
    <Area dataKey="spending" fill="var(--primary)" stroke="var(--primary)" showMarkers/>
    <XAxis/>
    <ChartTooltip rows={point=>[{label:"Despesas",value:formatCurrency(point.spending),color:"var(--primary)"}]}/>
  </AreaChart>;
}

export function CareerFunnel({ data }: { data: { label: string; value: number }[] }) {
  if (!data.some(item=>item.value)) return <p className="empty-state muted">O funil aparecerá depois da primeira candidatura.</p>;
  return <FunnelChart data={data.map((item,index)=>({...item,color:["#605de9","#716eea","#8582ed","#9a97f0","#b0aef4"][index]}))} orientation="horizontal" showValues showPercentage className="career-funnel"/>;
}

export function HabitActivityHeatmap({ data, color, unit, year }: { data: HeatmapColumn[]; color: string; unit: string; year: number }) {
  const levels=["var(--muted)",`color-mix(in srgb, ${color} 25%, var(--card))`,`color-mix(in srgb, ${color} 45%, var(--card))`,`color-mix(in srgb, ${color} 70%, var(--card))`,color] as [string,string,string,string,string];
  return <div className="bklit-heatmap" aria-label={`Atividade em ${year}`}><HeatmapChart data={data} weekStartDay={1} levelColors={levels} margin={{top:24,left:34,right:8,bottom:4}}><HeatmapCells activeScale={1.08}/><HeatmapXAxis/><HeatmapYAxis labelFormat="initial"/><HeatmapTooltip formatLabel={count=>`${count.toLocaleString("pt-BR")} ${unit}`}/><HeatmapLegend lessLabel="Menos" moreLabel="Mais"/></HeatmapChart></div>;
}

export function InvestmentPortfolioHistoryChart({ data, labels }: { data: { date: string; marketValue: number; invested: number }[]; labels?: { value: string; invested: string } }) {
  const [range, setRange] = useState<1 | 3 | 6 | 12 | 36 | 0>(12);
  const chartData = useMemo(() => (range ? data.slice(-range) : data).map((point) => ({ ...point, date: new Date(`${point.date}T00:00:00.000Z`) })), [data, range]);
  const text = labels || { value: "Patrimônio", invested: "Aplicado" };
  return <div className="finance-chart-body"><div className="chart-range" aria-label="Período do gráfico">{([[1,"1M"],[3,"3M"],[6,"6M"],[12,"1A"],[36,"3A"],[0,"Tudo"]] as const).map(([value, label]) => <button type="button" key={label} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}</div><AreaChart data={chartData} xDataKey="date" aspectRatio="3.35 / 1" className="investment-history-chart" margin={{ left: 24, right: 18, top: 18, bottom: 32 }}>
    <Grid horizontal hideHorizontalEdgeLines/>
    <Area dataKey="invested" fill="var(--chart-4)" stroke="var(--chart-4)" fillOpacity={0.08}/>
    <Area dataKey="marketValue" fill="var(--primary)" stroke="var(--primary)" fillOpacity={0.26} showMarkers/>
    <XAxis numTicks={Math.min(6, Math.max(2, chartData.length))}/>
    <ChartTooltip rows={(point) => [
      { label: text.value, value: formatCurrency(point.marketValue), color: "var(--primary)" },
      { label: text.invested, value: formatCurrency(point.invested), color: "var(--chart-4)" },
    ]}/>
  </AreaChart></div>;
}

export function InvestmentBenchmarkChart({ data, labels }: { data: { date: string; portfolio: number; selic: number }[]; labels?: { portfolio: string; selic: string } }) {
  const chartData = useMemo(() => data.map((point) => ({ ...point, date: new Date(`${point.date}T00:00:00.000Z`) })), [data]);
  const text = labels || { portfolio: "Carteira", selic: "Selic" };
  return <AreaChart data={chartData} xDataKey="date" aspectRatio="2.25 / 1" className="investment-benchmark-chart" margin={{ left: 20, right: 14, top: 12, bottom: 28 }}>
    <Grid horizontal hideHorizontalEdgeLines highlightRowValues={[100]}/>
    <Area dataKey="selic" fill="var(--chart-4)" stroke="var(--chart-4)" fillOpacity={0.06}/>
    <Area dataKey="portfolio" fill="var(--primary)" stroke="var(--primary)" fillOpacity={0.18} showMarkers/>
    <XAxis numTicks={Math.min(4, Math.max(2, chartData.length))}/>
    <ChartTooltip rows={(point) => [
      { label: text.portfolio, value: asNumber(point.portfolio).toLocaleString("pt-BR", { maximumFractionDigits: 2 }), color: "var(--primary)" },
      { label: text.selic, value: asNumber(point.selic).toLocaleString("pt-BR", { maximumFractionDigits: 2 }), color: "var(--chart-4)" },
    ]}/>
  </AreaChart>;
}

export function InvestmentAllocationChart({ data }: { data: { label: string; currentBasisPoints: number; targetBasisPoints: number }[] }) {
  const chartData = data.map((item) => ({ ...item, current: item.currentBasisPoints / 100, target: item.targetBasisPoints / 100 }));
  return <BarChart data={chartData} xDataKey="label" orientation="horizontal" aspectRatio="1.45 / 1" className="investment-allocation-chart" margin={{ left: 105, right: 18, top: 10, bottom: 10 }} barGap={0.2}>
    <Grid vertical horizontal={false} hideVerticalEdgeLines/>
    <Bar dataKey="current" fill="var(--primary)" lineCap={5}/>
    <Bar dataKey="target" fill="var(--chart-4)" lineCap={5}/>
    <BarYAxis maxLabels={7}/>
    <ChartTooltip showDatePill={false} showCrosshair={false} rows={(point) => [
      { label: "Atual", value: `${asNumber(point.current).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, color: "var(--primary)" },
      { label: "Alvo", value: `${asNumber(point.target).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, color: "var(--chart-4)" },
    ]}/>
  </BarChart>;
}

export function InvestmentIncomeChart({ data }: { data: { month: string; income: number }[] }) {
  const chartData = data.map((item) => ({ ...item, label: monthLabel(item.month) }));
  return <BarChart data={chartData} xDataKey="label" aspectRatio="2.4 / 1" className="investment-income-chart" margin={{ left: 18, right: 14, top: 18, bottom: 34 }} barGap={0.34}>
    <Grid horizontal hideHorizontalEdgeLines/>
    <Bar dataKey="income" fill="var(--success)" lineCap={5}/>
    <BarXAxis showAllLabels/>
    <ChartTooltip showDatePill={false} rows={(point) => [{ label: "Rendimentos", value: formatCurrency(point.income), color: "var(--success)" }]}/>
  </BarChart>;
}

export type CardStatementMonthPoint = { month: string; open: number; future: number; forecast: number; pending: number };
/** Card commitments by due month (competence month for forecasts), in the limit bar's colors.
 * Amounts pending reconciliation are listed in the tooltip but never stacked into a total. */
export function CardStatementTimelineChart({ data }: { data: CardStatementMonthPoint[] }) {
  const chartData = useMemo(() => data.map((item) => ({ ...item, label: `${monthLabel(item.month)}/${item.month.slice(2, 4)}` })), [data]);
  return <BarChart data={chartData} xDataKey="label" stacked className="statement-timeline-chart" aspectRatio="2.4 / 1" margin={{ left: 24, right: 18, top: 22, bottom: 36 }} barGap={0.32}>
    <Grid horizontal hideHorizontalEdgeLines/>
    <Bar dataKey="open" fill="var(--credit-open)" lineCap={4}/>
    <Bar dataKey="future" fill="var(--credit-future)" lineCap={4}/>
    <Bar dataKey="forecast" fill="var(--chart-5)" lineCap={4}/>
    <BarXAxis showAllLabels/>
    <ChartTooltip showDatePill={false} rows={(point) => [
      { label: "Abertas", value: formatCurrency(point.open), color: "var(--credit-open)" },
      { label: "Futuras conhecidas", value: formatCurrency(point.future), color: "var(--credit-future)" },
      { label: "Previsões", value: formatCurrency(point.forecast), color: "var(--chart-5)" },
      ...(asNumber(point.pending) ? [{ label: "A conciliar (fora do total)", value: formatCurrency(point.pending), color: "var(--muted-foreground)" }] : []),
    ]}/>
  </BarChart>;
}
