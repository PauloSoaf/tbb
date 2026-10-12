"use client";

import Link from "next/link";
import { useId } from "react";
import { Archive, Car, House, Laptop, Package, PencilLine, Plus, RotateCcw } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nContext";
import { moneyInput } from "./money";
import { savePersonalAsset, setPersonalAssetArchived } from "./personal-asset-actions";
import { personalAssetCopy } from "./personal-asset-copy";
import { personalAssetKinds, personalAssetsValue, type PersonalAssetRow } from "./personal-assets";
import "./personal-assets.css";

type DebtOption = { id: string; name: string };
const icons = { VEHICLE: Car, ELECTRONIC: Laptop, PROPERTY: House, OTHER: Package };
const languages = { pt: "pt-BR", en: "en-US", es: "es-ES" };

function AssetForm({ today, debts, asset }: { today: string; debts: DebtOption[]; asset?: PersonalAssetRow }) {
  const { locale } = useI18n(), copy = personalAssetCopy(locale);
  const valueHelpId = useId();
  return <ActionForm action={savePersonalAsset} className="stack personal-asset-form" resetOnSuccess={!asset}>
    {asset && <><input type="hidden" name="id" value={asset.id}/><input type="hidden" name="version" value={asset.version}/></>}
    <label>{copy.name}<input name="name" defaultValue={asset?.name || ""} required maxLength={200}/></label>
    <label>{copy.kind}<select name="kind" defaultValue={asset?.kind || "VEHICLE"}>{personalAssetKinds.map(kind => <option value={kind} key={kind}>{copy.kinds[kind]}</option>)}</select></label>
    <div className="personal-asset-form-row">
      <label>{copy.value}<input name="value" inputMode="decimal" defaultValue={asset ? moneyInput(asset.valueCents) : ""} required aria-describedby={valueHelpId}/></label>
      <label>{copy.valuationDate}<input name="valuationDate" type="date" defaultValue={asset?.valuationDate || today} max={today} required/></label>
    </div>
    <p className="muted text-xs" id={valueHelpId}>{copy.valueHint}</p>
    <div className="personal-asset-form-row">
      <label>{copy.purchaseValue}<input name="purchaseValue" inputMode="decimal" defaultValue={asset?.purchaseValueCents != null ? moneyInput(asset.purchaseValueCents) : ""}/></label>
      <label>{copy.purchaseDate}<input name="purchaseDate" type="date" defaultValue={asset?.purchaseDate || ""} max={today}/></label>
    </div>
    <label>{copy.debt}<select name="debtId" defaultValue={asset?.debtId || ""}><option value="">{copy.noDebt}</option>{debts.map(debt => <option key={debt.id} value={debt.id}>{debt.name}</option>)}</select></label>
    <p className="muted text-xs">{copy.debtHint} <Link href="/finance/debts">{copy.registerDebt} →</Link></p>
    <label>{copy.notes}<textarea name="notes" defaultValue={asset?.notes || ""} maxLength={1000}/></label>
    <p className="muted text-xs">{copy.criteria}</p>
    <button type="submit" className="button">{copy.save}</button>
  </ActionForm>;
}

export function PersonalAssetsPage({ assets, debts, today, canWrite }: { assets: PersonalAssetRow[]; debts: DebtOption[]; today: string; canWrite: boolean }) {
  const { locale } = useI18n(), copy = personalAssetCopy(locale);
  const currency = (cents: number) => new Intl.NumberFormat(languages[locale], { style: "currency", currency: "BRL" }).format(cents / 100);
  const date = (day: string) => new Intl.DateTimeFormat(languages[locale], { timeZone: "UTC", dateStyle: "short" }).format(new Date(`${day}T00:00:00Z`));
  const active = assets.filter(asset => !asset.archivedAt), archived = assets.filter(asset => asset.archivedAt);
  const card = (asset: PersonalAssetRow) => {
    const Icon = icons[asset.kind];
    return <article className="panel stack personal-asset-card" key={asset.id} data-asset-id={asset.id}>
      <div className="row"><span className="personal-asset-icon"><Icon size={21}/></span><div><small className="muted">{copy.kinds[asset.kind]}</small><h2>{asset.name}</h2></div></div>
      <div><small className="muted">{copy.estimated}</small><strong className="personal-asset-value">{currency(asset.valueCents)}</strong><small className="muted">{copy.assessed} {date(asset.valuationDate)}</small></div>
      {(asset.purchaseValueCents != null || asset.purchaseDate) && <small className="muted">{copy.bought}: {asset.purchaseValueCents != null && currency(asset.purchaseValueCents)}{asset.purchaseDate && ` · ${date(asset.purchaseDate)}`}</small>}
      {asset.debt && <div className="personal-asset-debt"><Link href="/finance/debts">{copy.linked}: {asset.debt.name} →</Link><small>{copy.remaining}: {currency(asset.debt.status === "ACTIVE" ? asset.debt.remainingBalanceCents : 0)}</small></div>}
      {asset.notes && <p className="muted personal-asset-notes">{asset.notes}</p>}
      {canWrite && <div className="row personal-asset-actions">
        {!asset.archivedAt && <Modal title={`${copy.edit} · ${asset.name}`} trigger={<><PencilLine size={14}/>{copy.edit}</>}><AssetForm today={today} debts={debts} asset={asset}/></Modal>}
        <Modal title={asset.archivedAt ? copy.confirmRestore : copy.confirmArchive} trigger={asset.archivedAt ? <><RotateCcw size={14}/>{copy.restore}</> : <><Archive size={14}/>{copy.archive}</>}>
          <ActionForm action={setPersonalAssetArchived} className="stack"><input type="hidden" name="id" value={asset.id}/><input type="hidden" name="version" value={asset.version}/><input type="hidden" name="operation" value={asset.archivedAt ? "RESTORE" : "ARCHIVE"}/><p>{asset.archivedAt ? copy.restoreHint : copy.archiveHint}</p><button type="submit" className="button">{asset.archivedAt ? copy.restore : copy.archive}</button></ActionForm>
        </Modal>
      </div>}
    </article>;
  };
  return <div className="stack personal-assets-page">
    <PageHeader eyebrow="MONEY" title={copy.title} description={copy.subtitle}>{canWrite && <Modal title={copy.newAsset} trigger={<><Plus size={15}/>{copy.newAsset}</>} triggerClassName="button"><AssetForm today={today} debts={debts}/></Modal>}</PageHeader>
    <div className="panel personal-assets-summary"><div><small className="muted">{copy.total}</small><strong>{currency(personalAssetsValue(assets))}</strong></div><div><small className="muted">{copy.count}</small><strong>{active.length}</strong></div><p className="muted">{copy.liquidHint}</p></div>
    <div className="personal-assets-grid">{active.map(card)}</div>
    {!active.length && <div className="panel"><EmptyState title={copy.empty} description={copy.emptyHint}/></div>}
    {!!archived.length && <details className="panel personal-assets-archived"><summary>{copy.archived} ({archived.length})</summary><div className="personal-assets-grid">{archived.map(card)}</div></details>}
    <p className="muted text-xs">{copy.criteria}</p>
  </div>;
}
