import { ArrowLeft, LockKeyhole, RouteOff } from "lucide-react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { useAuthContext } from "@/src/auth/AuthProvider";
import { activeFirebaseAuthDomain, activeFirebaseProjectId, loginWithGoogle } from "@/src/lib/firebase";
import { ROLE_HOME } from "@/src/routes/paths";
import LandingPage from "@/src/pages/LandingPage";
import { respondToInvitation } from "@/src/services/firebase/secureAccessService";
import { BRAND_NAME } from "@/src/shared/brand";

export function LandingRoute() {
  const auth = useAuthContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!auth.loading && auth.user && auth.profile) return <Navigate to={ROLE_HOME[auth.profile.role]} replace />;
  const signIn = async () => {
    setBusy(true);
    setError(null);
    try { await loginWithGoogle(); }
    catch (loginError) { setError(loginMessage(loginError)); }
    finally { setBusy(false); }
  };
  return <LandingPage onStart={signIn} onGoogleLogin={signIn} isAuthLoading={busy} authError={error} />;
}

export function LoginRoute() {
  const auth = useAuthContext();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!auth.loading && auth.user && auth.profile) {
    const requested = (location.state as { from?: string } | null)?.from;
    return <Navigate to={requested || ROLE_HOME[auth.profile.role]} replace />;
  }
  const signIn = async () => {
    setBusy(true);
    setError(null);
    try { await loginWithGoogle(); }
    catch (loginError) { setError(loginMessage(loginError)); }
    finally { setBusy(false); }
  };
  return (
    <CenteredPage icon={<LockKeyhole />} title="Connexion securisee" description={`Connectez-vous avec Google pour acceder a votre espace ${BRAND_NAME}.`}>
      <button disabled={busy} onClick={signIn} className="rounded-xl bg-brand-orange px-6 py-3 font-black disabled:opacity-50">
        {busy ? "Connexion..." : "Continuer avec Google"}
      </button>
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
    </CenteredPage>
  );
}

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const description = kind === "privacy"
    ? "Les videos restent privees par defaut. Vous gardez le controle des acces, du consentement et de la suppression de vos donnees."
    : `${BRAND_NAME} fournit des observations techniques d'entrainement, jamais un diagnostic medical. Les estimations sont signalees et les resultats peu fiables restent indisponibles.`;
  return <CenteredPage title={kind === "privacy" ? "Confidentialite" : "Conditions d'utilisation"} description={description}><Link className="text-brand-orange underline" to="/">Retour a l'accueil</Link></CenteredPage>;
}

export function InvitationPage() {
  const { invitationToken } = useParams();
  const auth = useAuthContext();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!invitationToken) return <CenteredPage title={`Invitation ${BRAND_NAME}`} description="Jeton d'invitation absent." />;
  if (!auth.user || !auth.profile) {
    return <CenteredPage title={`Invitation ${BRAND_NAME}`} description="Connectez-vous pour verifier cette invitation avant toute association a un club ou a un coach."><Link state={{ from: `/rejoindre/${invitationToken}` }} className="rounded-xl bg-brand-orange px-5 py-3 font-black" to="/connexion">Verifier apres connexion</Link></CenteredPage>;
  }
  const respond = async (decision: "accepted" | "declined") => {
    setBusy(true);
    setMessage(null);
    try {
      await respondToInvitation(auth.profile!, invitationToken, decision);
      setMessage(decision === "accepted" ? "Invitation acceptee." : "Invitation refusee.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "INVITATION_FAILED";
      setMessage(code === "INVITATION_EXPIRED" ? "Cette invitation a expire." : "Cette invitation est invalide ou ne vous est pas destinee.");
    } finally { setBusy(false); }
  };
  return (
    <CenteredPage title={`Invitation ${BRAND_NAME}`} description="Votre identite est verifiee. Acceptez uniquement si vous reconnaissez l'expediteur.">
      <div className="flex justify-center gap-3">
        <button disabled={busy} onClick={() => respond("accepted")} className="rounded-xl bg-brand-orange px-5 py-3 font-black disabled:opacity-50">Accepter</button>
        <button disabled={busy} onClick={() => respond("declined")} className="rounded-xl border border-white/15 px-5 py-3 font-black disabled:opacity-50">Refuser</button>
      </div>
      {message && <p className="mt-4 text-sm text-white/65">{message}</p>}
    </CenteredPage>
  );
}

export function ForbiddenPage() {
  return <CenteredPage icon={<LockKeyhole />} title="Acces refuse" description="Votre role ou l'etat de votre compte ne permet pas d'ouvrir cette page."><Link className="text-brand-orange underline" to="/">Revenir a votre espace</Link></CenteredPage>;
}

export function NotFoundPage() {
  return <CenteredPage icon={<RouteOff />} title="Page introuvable" description={`Cette adresse ne correspond a aucune route ${BRAND_NAME}.`}><Link className="inline-flex items-center gap-2 text-brand-orange underline" to="/"><ArrowLeft size={16} /> Accueil</Link></CenteredPage>;
}

export function PlannedWorkspacePage({ title, sprint }: { title: string; sprint: string }) {
  return <div className="glass-card mx-auto max-w-3xl p-8"><div className="text-xs font-black uppercase tracking-[0.22em] text-brand-orange">Route securisee active</div><h2 className="mt-3 text-3xl font-black">{title}</h2><p className="mt-4 leading-7 text-white/60">Le controle d'acces de cette page est operationnel. Les outils metier sont planifies pour {sprint} et ne sont pas presentes comme termines dans ce sprint.</p></div>;
}

function CenteredPage({ title, description, icon, children }: { title: string; description: string; icon?: ReactNode; children?: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-brand-dark p-6 text-white"><div className="glass-card w-full max-w-xl p-8 text-center">{icon && <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange">{icon}</div>}<h1 className="text-3xl font-black">{title}</h1><p className="mx-auto my-5 max-w-lg leading-7 text-white/55">{description}</p>{children}</div></div>;
}

function loginMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  if (code === "auth/unauthorized-domain") return `Domaine non autorise pour ${activeFirebaseProjectId} (${activeFirebaseAuthDomain}).`;
  if (code === "auth/popup-closed-by-user") return "La fenetre de connexion a ete fermee avant la fin.";
  return "Connexion Google impossible. Verifiez la configuration Firebase puis reessayez.";
}
