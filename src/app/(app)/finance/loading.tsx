export default function FinanceLoading() {
  return <div className="finance-overview-page finance-loading" aria-busy="true" aria-label="Carregando visão financeira">
    <div className="finance-loading-header"><span/><span/><span/></div>
    <div className="finance-loading-tabs"/>
    <div className="finance-loading-kpis">{Array.from({ length: 6 }, (_, index) => <span key={index}/>)}</div>
    <div className="finance-loading-income"/>
    <div className="finance-loading-primary"><span/><span/></div>
    <div className="finance-loading-row"><span/><span/></div>
    <div className="finance-loading-row"><span/><span/></div>
  </div>;
}
