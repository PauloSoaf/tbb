"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { acceptPartnerInvite, declinePartnerInvite } from "./actions";

export function PartnerAcceptActions({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const result = await acceptPartnerInvite(token);
      if ("error" in result) { toast.error(result.error); return; }
      toast.success(result.success);
      router.push("/settings?section=partner");
    });
  }
  function decline() {
    startTransition(async () => {
      const result = await declinePartnerInvite(token);
      if ("error" in result) { toast.error(result.error); return; }
      router.push("/today");
    });
  }

  return <div className="row" style={{ gap: 8 }}>
    <button className="button" onClick={accept} disabled={pending}>{pending ? <LoaderCircle size={16} className="spin"/> : "Aceitar"}</button>
    <button className="button-secondary" onClick={decline} disabled={pending}>Recusar</button>
  </div>;
}
