import { sessionService } from "@/services/session.service";
import { revokeSessionAction } from "@/actions/auth";
import { getWorkspaceContext } from "@/lib/workspace";
export async function SecurityPanel() {
  const ctx = await getWorkspaceContext();
  const sessions = await sessionService.listUserSessions();
  return <section className="panel stack"><h2>Sessões da sua conta</h2><p className="muted">Encerre o acesso de um dispositivo que você não utiliza mais.</p>
    {sessions.map((session) => <div className="row" key={session.id} style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
      <div><strong>{session.id === ctx.sessionId ? "Esta sessão" : "Outro dispositivo"}</strong><p className="muted" style={{ fontSize: 12, maxWidth: 500, overflowWrap: "anywhere" }}>{session.userAgent || "Navegador"}</p><small className="muted">Criada em {session.createdAt.toLocaleString(ctx.workspace.locale, { timeZone: ctx.workspace.timezone })} · {session.status === "ACTIVE" ? "Ativa" : "Encerrada"}</small></div>
      {session.status === "ACTIVE" && <form action={revokeSessionAction}><input type="hidden" name="sessionId" value={session.id} /><button className="button-secondary">Encerrar sessão</button></form>}
    </div>)}
  </section>;
}
