export default function InvestmentsLoading() {
  return <div className="investment-loading" aria-label="Carregando investimentos">
    <div className="investment-loading-header"><span/><span/><span/></div>
    <div className="investment-loading-tabs"/>
    <div className="investment-loading-kpis">{Array.from({ length: 6 }, (_, index) => <span key={index}/>)}</div>
    <div className="investment-loading-primary"><span/><span/></div>
    <div className="investment-loading-row"><span/><span/><span/></div>
  </div>;
}
