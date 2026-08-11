import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  RouteOff,
  ShieldCheck,
} from "lucide-react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  OAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useAuthContext } from "@/src/auth/AuthProvider";
import { activeFirebaseAuthDomain, activeFirebaseProjectId, auth as firebaseAuth, loginWithGoogle } from "@/src/lib/firebase";
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
  const isRegistering = location.pathname === "/inscription";
  const [busy, setBusy] = useState<AuthAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const availableSocialProviders = useMemo(() => getConfiguredSocialProviders(), []);

  if (!auth.loading && auth.user && auth.profile) {
    const requested = (location.state as { from?: string } | null)?.from;
    return <Navigate to={requested || ROLE_HOME[auth.profile.role]} replace />;
  }

  const runAuthAction = async (action: AuthAction, callback: () => Promise<unknown>) => {
    setBusy(action);
    setError(null);
    setSuccess(null);
    try {
      await callback();
    } catch (loginError) {
      setError(loginMessage(loginError));
    } finally {
      setBusy(null);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Saisissez votre adresse e-mail.");
      return;
    }
    if (!password) {
      setError("Saisissez votre mot de passe.");
      return;
    }

    await runAuthAction("email", async () => {
      await setPersistence(firebaseAuth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (isRegistering) {
        await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      } else {
        await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      }
    });
  };

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Saisissez votre adresse e-mail avant de demander la reinitialisation.");
      return;
    }

    await runAuthAction("reset", async () => {
      await sendPasswordResetEmail(firebaseAuth, normalizedEmail);
      setSuccess("Un e-mail de reinitialisation vient d'etre envoye si ce compte existe.");
    });
  };

  const handleGoogle = async () => {
    await runAuthAction("google", async () => {
      await setPersistence(firebaseAuth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await loginWithGoogle();
    });
  };

  const handleProvider = async (provider: SocialProvider) => {
    await runAuthAction(provider.id, async () => {
      await setPersistence(firebaseAuth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithPopup(firebaseAuth, new OAuthProvider(provider.firebaseProviderId));
    });
  };

  const primaryLabel = isRegistering ? "Creer un compte" : "Se connecter";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#020B14] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_55%,rgba(0,122,255,0.20),transparent_35%),linear-gradient(135deg,#020B14,#041524,#020A12)]" />
      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col lg:grid lg:min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-w-0 flex-col overflow-hidden px-6 pb-4 pt-8 sm:px-10 md:min-h-[600px] lg:min-h-dvh lg:px-14 lg:py-12">
          <div className="relative z-10 animate-[rowmotionFadeUp_650ms_ease-out_both] text-center lg:text-left">
            <div className="inline-flex flex-col items-center gap-1 lg:items-start">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#1683FF]/35 bg-[#1683FF]/15 shadow-[0_0_28px_rgba(0,122,255,0.24)]">
                  <span className="h-3 w-7 rounded-full bg-[#1683FF]" />
                </span>
                <span className="text-xl font-black tracking-tight">RowMotion AI</span>
              </div>
              <p className="text-sm font-semibold text-[#9EB0C7]">Better Technique. Better Performance.</p>
            </div>

            <div className="mx-auto mt-10 hidden max-w-3xl md:block lg:mx-0 lg:mt-14">
              <h1 className="text-[clamp(40px,7vw,68px)] font-black leading-[0.98] tracking-tight sm:text-[clamp(44px,5vw,68px)]">
                Analyse biomecanique intelligente pour <span className="text-[#1683FF]">l'aviron</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#B2C1D3] sm:text-lg">
                Analysez les mouvements d'un rameur sur ergometre ou dans le bateau grace a l'intelligence artificielle,
                a la vision par ordinateur et aux donnees de performance.
              </p>
            </div>
          </div>

          <div className="relative z-0 mt-7 h-[260px] overflow-hidden sm:h-[320px] md:mt-8 md:h-[340px] lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:h-[62%]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,124,255,0.32),transparent_65%)]" />
            <img
              src="/auth/rowmotion-rower.png"
              alt="Rameur en skiff sur l'eau avec une lumiere bleue en arriere-plan"
              className="h-full w-full object-cover object-center lg:[mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_78%,transparent_100%)]"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#020B14_0%,transparent_15%,transparent_85%,#020B14_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#020B14_0%,transparent_16%,transparent_75%,#020B14_100%)] lg:hidden" />
          </div>
        </section>

        <section className="relative z-10 flex min-w-0 items-center justify-center px-4 pb-10 sm:px-8 lg:min-h-dvh lg:px-12 lg:py-12">
          <div className="min-w-0 w-full max-w-[620px] animate-[rowmotionCardIn_650ms_ease-out_120ms_both]">
            <div className="rowmotion-login-panel rounded-[24px] border border-[rgba(105,156,211,0.25)] bg-[rgba(5,23,40,0.78)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[22px] sm:p-10 lg:p-12">
              <div>
                <h2 className="text-[32px] font-black leading-tight tracking-tight sm:text-[42px]">{isRegistering ? "Inscription" : "Connexion"}</h2>
                <p className="mt-2 text-sm text-[#9EB0C7] sm:text-base">
                  {isRegistering ? "Creez votre compte RowMotion AI" : "Connectez-vous a votre compte RowMotion AI"}
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleEmailSubmit}>
                <FieldShell label="Adresse e-mail" htmlFor="rowmotion-email">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9EB0C7]" aria-hidden="true" />
                  <input
                    id="rowmotion-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Votre adresse e-mail"
                    autoComplete="email"
                    className="h-[58px] w-full rounded-xl border border-[rgba(105,156,211,0.30)] bg-[rgba(2,14,25,0.65)] pl-12 pr-4 text-white outline-none transition placeholder:text-[#687C94] focus:border-[#1683FF] focus:shadow-[0_0_0_3px_rgba(22,131,255,0.12)]"
                    required
                  />
                </FieldShell>

                <FieldShell label="Mot de passe" htmlFor="rowmotion-password">
                  <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9EB0C7]" aria-hidden="true" />
                  <input
                    id="rowmotion-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Votre mot de passe"
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    minLength={6}
                    className="h-[58px] w-full rounded-xl border border-[rgba(105,156,211,0.30)] bg-[rgba(2,14,25,0.65)] pl-12 pr-12 text-white outline-none transition placeholder:text-[#687C94] focus:border-[#1683FF] focus:shadow-[0_0_0_3px_rgba(22,131,255,0.12)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#9EB0C7] transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#1683FF]"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </FieldShell>

                <div className="flex flex-col items-start justify-between gap-3 text-sm sm:flex-row sm:items-center">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[#B2C1D3]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-[rgba(105,156,211,0.45)] bg-[rgba(2,14,25,0.65)] accent-[#1683FF]"
                    />
                    Se souvenir de moi
                  </label>
                  {!isRegistering && (
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={busy !== null}
                      className="min-h-11 font-semibold text-[#1683FF] transition hover:text-white focus:outline-none focus:ring-2 focus:ring-[#1683FF]"
                    >
                      Mot de passe oublie ?
                    </button>
                  )}
                </div>

                {error && <InlineAlert tone="error" message={error} />}
                {success && <InlineAlert tone="success" message={success} />}
                {auth.error && <InlineAlert tone="error" message={auth.error} />}

                <button
                  type="submit"
                  disabled={busy !== null}
                  className="flex h-[62px] w-full items-center justify-center gap-3 rounded-xl bg-[linear-gradient(90deg,#248CFF,#176AFF)] px-5 font-black text-white shadow-[0_0_0_rgba(0,117,255,0)] transition hover:-translate-y-px hover:shadow-[0_12px_30px_rgba(0,117,255,0.30)] focus:outline-none focus:ring-2 focus:ring-[#1683FF] disabled:cursor-wait disabled:opacity-65 disabled:hover:translate-y-0"
                >
                  {busy === "email" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <span>{primaryLabel}</span>}
                  {busy === "email" ? "Connexion..." : <ArrowRight className="h-5 w-5" aria-hidden="true" />}
                </button>
              </form>

              <div className="my-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-[rgba(104,155,210,0.24)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9EB0C7]">ou continuer avec</span>
                <span className="h-px flex-1 bg-[rgba(104,155,210,0.24)]" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SocialButton label="Google" busy={busy === "google"} disabled={busy !== null} onClick={handleGoogle}>
                  <GoogleMark />
                </SocialButton>
                {availableSocialProviders.map((provider) => (
                  <div key={provider.id}>
                    <SocialButton
                      label={provider.label}
                      busy={busy === provider.id}
                      disabled={busy !== null}
                      onClick={() => handleProvider(provider)}
                    >
                      {provider.id === "apple" ? <AppleMark /> : <MicrosoftMark />}
                    </SocialButton>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-center text-sm text-[#9EB0C7]">
                {isRegistering ? "Deja un compte ?" : "Pas encore de compte ?"}{" "}
                <Link className="font-bold text-[#1683FF] transition hover:text-white" to={isRegistering ? "/connexion" : "/inscription"}>
                  {isRegistering ? "Se connecter" : "Creer un compte"}
                </Link>
              </p>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3 text-center text-sm text-[#9EB0C7]">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#1683FF]" aria-hidden="true" />
              <p>Vos donnees sont securisees. Nous ne partageons jamais vos informations.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
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

type AuthAction = "email" | "reset" | "google" | "apple" | "microsoft";

type SocialProvider = {
  id: "apple" | "microsoft";
  label: string;
  firebaseProviderId: string;
};

function FieldShell({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-white">
        {label}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}

function InlineAlert({ tone, message }: { tone: "error" | "success"; message: string }) {
  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-400/30 bg-red-500/10 text-red-100"
          : "border-[#1683FF]/30 bg-[#1683FF]/10 text-blue-100"
      }`}
    >
      {isError ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}

function SocialButton({
  label,
  busy,
  disabled,
  children,
  onClick,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[rgba(105,156,211,0.28)] bg-[rgba(4,18,31,0.65)] px-3 text-sm font-bold text-white transition hover:border-[#1683FF] hover:bg-[#1683FF]/10 focus:outline-none focus:ring-2 focus:ring-[#1683FF] disabled:cursor-wait disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : children}
      <span className="max-[479px]:text-[13px]">{label}</span>
    </button>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.8-5.5 3.8a6 6 0 0 1 0-12c1.9 0 3.1.8 3.8 1.5l2.6-2.5A9.8 9.8 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12Z" />
      <path fill="#34A853" d="M3.3 7.4 6.5 9.8A6 6 0 0 1 12 5.9c1.9 0 3.1.8 3.8 1.5l2.6-2.5A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.7 5.4Z" />
      <path fill="#4A90E2" d="M12 22c2.7 0 5-0.9 6.6-2.5l-3.1-2.4c-.8.6-1.9 1-3.5 1a6 6 0 0 1-5.6-4.1l-3.2 2.5A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-4.1L3.3 7.4a10 10 0 0 0 0 9.1L6.4 14Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M16.4 13c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.7-1.8-3.3-1.8-1.4-.1-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.2-1.6 2.8-.4 6.9 1.2 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-0.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.6-1-2.6-3.3ZM14.2 6.2c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.6-1.3Z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
      <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
      <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
      <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
    </svg>
  );
}

function getConfiguredSocialProviders(): SocialProvider[] {
  const env = import.meta.env;
  const providers: SocialProvider[] = [];
  if (env.VITE_FIREBASE_ENABLE_APPLE_AUTH === "true") {
    providers.push({ id: "apple", label: "Apple", firebaseProviderId: "apple.com" });
  }
  if (env.VITE_FIREBASE_ENABLE_MICROSOFT_AUTH === "true") {
    providers.push({ id: "microsoft", label: "Microsoft", firebaseProviderId: "microsoft.com" });
  }
  return providers;
}

function loginMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  if (code === "auth/unauthorized-domain") return `Domaine non autorise pour ${activeFirebaseProjectId} (${activeFirebaseAuthDomain}).`;
  if (code === "auth/popup-closed-by-user") return "La fenetre de connexion a ete fermee avant la fin.";
  if (code === "auth/invalid-credential") return "E-mail ou mot de passe incorrect.";
  if (code === "auth/user-not-found") return "Aucun compte trouve avec cette adresse.";
  if (code === "auth/wrong-password") return "Mot de passe incorrect.";
  if (code === "auth/too-many-requests") return "Trop de tentatives. Veuillez reessayer plus tard.";
  if (code === "auth/network-request-failed") return "Erreur reseau. Verifiez votre connexion Internet.";
  if (code === "auth/invalid-email") return "Adresse e-mail invalide.";
  if (code === "auth/email-already-in-use") return "Un compte existe deja avec cette adresse.";
  if (code === "auth/weak-password") return "Le mot de passe doit contenir au moins 6 caracteres.";
  return "Connexion Google impossible. Verifiez la configuration Firebase puis reessayez.";
}
