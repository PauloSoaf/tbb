import { Sun, CheckCheck, ListTodo, Target, FolderKanban, CalendarDays, Wallet, ArrowLeftRight, Landmark, PieChart, Repeat2, CreditCard, PiggyBank, ChartNoAxesCombined, BriefcaseBusiness, Building2, MessagesSquare, Users, Files, Lightbulb, Plug, Settings, ShieldCheck, TrendingUp } from 'lucide-react';
export const navGroups=[
  {name:'',items:[{label:'Today',href:'/today',icon:Sun}]},
  {name:'Life',items:[{label:'Habits',href:'/habits',icon:CheckCheck},{label:'Tasks',href:'/tasks',icon:ListTodo},{label:'Goals',href:'/goals',icon:Target},{label:'Projects',href:'/projects',icon:FolderKanban},{label:'Calendar',href:'/calendar',icon:CalendarDays}]},
  {name:'Money',items:[{label:'Overview',href:'/finance',icon:Wallet},{label:'Transactions',href:'/finance/transactions',icon:ArrowLeftRight},{label:'Accounts',href:'/finance/accounts',icon:Landmark},{label:'Budgets',href:'/finance/budgets',icon:PieChart},{label:'Subscriptions',href:'/finance/subscriptions',icon:Repeat2},{label:'Debts',href:'/finance/debts',icon:CreditCard},{label:'Savings',href:'/finance/savings',icon:PiggyBank},{label:'Investments',href:'/finance/investments',icon:TrendingUp},{label:'Reports',href:'/finance/reports',icon:ChartNoAxesCombined}]},
  {name:'Career',items:[{label:'Overview',href:'/career',icon:BriefcaseBusiness},{label:'Applications',href:'/career/applications',icon:FolderKanban},{label:'Companies',href:'/career/companies',icon:Building2},{label:'Interviews',href:'/career/interviews',icon:MessagesSquare},{label:'Contacts',href:'/career/contacts',icon:Users},{label:'Documents',href:'/career/documents',icon:Files}]},
  {name:'',items:[{label:'Insights',href:'/insights',icon:Lightbulb},{label:'Integrations',href:'/integrations',icon:Plug},{label:'Settings',href:'/settings',icon:Settings}]}
];
export const adminItem={label:'Admin',href:'/admin',icon:ShieldCheck};
export type Command={label:string;href:string;group:string};
export const moduleCommands:Command[]=[
  {label:'Adicionar despesa',href:'/finance/transactions?action=expense',group:'Money'},
  {label:'Adicionar receita',href:'/finance/transactions?action=income',group:'Money'},
  {label:'Completar hábito',href:'/habits?view=today',group:'Life'},
  {label:'Adicionar hábito',href:'/habits?action=new',group:'Life'},
  {label:'Adicionar tarefa',href:'/tasks?action=new',group:'Life'},
  {label:'Adicionar candidatura',href:'/career/applications?action=new',group:'Career'},
  {label:'Criar meta',href:'/goals?action=new',group:'Life'},
  {label:'Importar transações',href:'/finance/imports',group:'Money'},
  {label:'Registrar aporte',href:'/finance/investments?action=contribution',group:'Money'},
  ...navGroups.flatMap(g=>g.items.map(item=>({label:`Abrir ${item.label}`,href:item.href,group:g.name||'TBB'})))
];
