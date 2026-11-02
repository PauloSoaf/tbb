"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { X, BriefcaseBusiness } from "lucide-react";
import { useFinanceWriteAccess } from "@/features/finance/FinanceWriteAccess";
export function CareerDrawer({
  title,
  trigger,
  children,
  open = false,
  className = "button-secondary",
  onClose,
}: {
  title: string;
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  className?: string;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    label = useId();
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
  }, [open]);
  function close() {
    if (
      ref.current?.querySelector('[data-career-dirty="true"]') &&
      !window.confirm("Há alterações não salvas. Fechar e descartar?")
    )
      return;
    ref.current?.close();
  }
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => ref.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="modal drawer career-drawer"
        aria-labelledby={label}
        onClose={onClose}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="modal-content">
          <header className="career-dialog-head">
            <div>
              <span className="career-eyebrow">SEU PRÓXIMO PASSO</span>
              <h2 id={label}>{title}</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar"
              onClick={close}
            >
              <X size={18} />
            </button>
          </header>
          {children}
        </div>
      </dialog>
    </>
  );
}
export function CareerEmpty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="career-empty">
      <BriefcaseBusiness size={25} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export type MutationResult = { success?: string; error?: string };
export function CareerForm({
  submit,
  children,
  className = "career-form",
  onSaved,
  saveLabel = "Salvar",
  disabled = false,
  closeOnSuccess = false,
  id,
}: {
  submit: (fd: FormData) => Promise<MutationResult>;
  children: ReactNode;
  className?: string;
  onSaved?: () => void;
  saveLabel?: string;
  disabled?: boolean;
  closeOnSuccess?: boolean;
  id?: string;
}) {
  const canWrite = useFinanceWriteAccess(),
    [pending, setPending] = useState(false),
    [result, setResult] = useState<MutationResult>({}),
    [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!dirty) return;
    const visible = () =>
      !!formRef.current?.checkVisibility({ visibilityProperty: true });
    const unload = (event: BeforeUnloadEvent) => {
      if (visible()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigate = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        !visible()
      )
        return;
      const target = new URL(anchor.href);
      if (
        target.origin === location.origin &&
        target.pathname + target.search !==
          location.pathname + location.search &&
        !confirm("Há alterações não salvas. Sair e descartar?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || !canWrite) return;
    const form = e.currentTarget,
      fd = new FormData(form);
    setPending(true);
    setResult({});
    try {
      const r = await submit(fd);
      setResult(r);
      if (!r.error) {
        setDirty(false);
        onSaved?.();
        if (closeOnSuccess) {
          form.reset();
          form.closest("dialog")?.close();
        }
      }
    } catch {
      setResult({
        error: "Não foi possível salvar. O texto foi mantido; tente novamente.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      ref={formRef}
      id={id}
      onSubmit={save}
      className={className}
      onChange={() => setDirty(true)}
      data-career-dirty={dirty}
      aria-busy={pending}
    >
      <fieldset
        disabled={!canWrite || pending || disabled}
        className="form-contents"
      >
        {children}
      </fieldset>
      <footer className="career-form-footer">
        {canWrite && (
          <button
            className="button"
            type="submit"
            disabled={pending || disabled}
          >
            {pending ? "Salvando…" : saveLabel}
          </button>
        )}
        <span
          role={result.error ? "alert" : "status"}
          className={result.error ? "form-error" : "career-save-state"}
        >
          {result.error ||
            result.success ||
            (dirty ? "Alterações não salvas" : "")}
        </span>
        {!canWrite && <span className="muted">Somente leitura</span>}
      </footer>
    </form>
  );
}
export const field = (fd: FormData, key: string) =>
  String(fd.get(key) ?? "").trim();
export const list = (fd: FormData, key: string) =>
  field(fd, key)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
export const numberField = (fd: FormData, key: string) =>
  Number(field(fd, key));
export function SafeLink({
  href,
  children,
  className,
}: {
  href: string | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  return href && /^https?:\/\//i.test(href) ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  ) : null;
}
export function dateLabel(value: string | null | undefined) {
  return value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
}
