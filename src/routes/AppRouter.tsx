import { Fragment, lazy, Suspense } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import SplashScreen from "@/src/components/SplashScreen";
import { ProtectedRoute } from "@/src/routes/guards";
import AuthenticatedLayout from "@/src/routes/AuthenticatedLayout";
import { useAppShell } from "@/src/routes/AppShellContext";
import {
  ForbiddenPage,
  InvitationPage,
  LandingRoute,
  LegalPage,
  LoginRoute,
  NotFoundPage,
  PlannedWorkspacePage,
} from "@/src/pages/system/SystemPages";

const LiveTraining = lazy(() => import("@/src/pages/LiveTraining"));
const DrillsPage = lazy(() => import("@/src/pages/DrillsPage"));
const Dashboard = lazy(() => import("@/src/pages/Dashboard"));
const AICoachPage = lazy(() => import("@/src/pages/AICoachPage"));
const HistoryPage = lazy(() => import("@/src/pages/HistoryPage"));
const ProfilePage = lazy(() => import("@/src/pages/ProfilePage"));
const GameModesPage = lazy(() => import("@/src/pages/GameModesPage"));
const FriendsPage = lazy(() => import("@/src/pages/FriendsPage"));
const TeamsPage = lazy(() => import("@/src/pages/TeamsPage"));
const LeaderboardPage = lazy(() => import("@/src/pages/LeaderboardPage"));
const NotificationsPage = lazy(() => import("@/src/pages/NotificationsPage"));
const ProfessionalWorkspacePage = lazy(() => import("@/src/pages/ProfessionalWorkspacePage"));
const ClubWorkspacePage = lazy(() => import("@/src/pages/ClubWorkspacePage"));
const EliteAnalyticsPage = lazy(() => import("@/src/pages/EliteAnalyticsPage"));
const MatchIntelligencePage = lazy(() => import("@/src/pages/MatchIntelligencePage"));
const EcosystemPage = lazy(() => import("@/src/pages/EcosystemPage"));
const NativeResearchPage = lazy(() => import("@/src/pages/NativeResearchPage"));

const coachPaths = ["athletes", "analyses", "compare", "drills", "exercices", "missions", "training-plans", "programmes", "equipes", "reports", "rapports", "notifications"];
const clubPaths = ["players", "joueurs", "coaches", "coachs", "teams", "equipes", "matches", "matchs", "attendance", "presences", "performance", "performances", "training", "entrainements", "reports", "rapports", "settings", "parametres"];
const adminPaths = ["clubs", "users", "utilisateurs", "models", "modeles", "cloud-jobs", "tournaments", "security", "securite", "audit", "settings", "parametres"];
type ProfessionalKind = "coach" | "club" | "elite" | "match" | "ecosystem" | "admin";
type ClubSection = "dashboard" | "players" | "coaches" | "teams" | "matches" | "attendance" | "training" | "performance" | "reports" | "settings";

export default function AppRouter() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/connexion" element={<LoginRoute />} />
        <Route path="/inscription" element={<LoginRoute />} />
        <Route path="/confidentialite" element={<LegalPage kind="privacy" />} />
        <Route path="/conditions" element={<LegalPage kind="terms" />} />
        <Route path="/rejoindre/:invitationToken" element={<InvitationPage />} />
        <Route path="/403" element={<ForbiddenPage />} />

        <Route element={<ProtectedRoute allowedRoles={["athlete"]} />}>
          <Route path="/app" element={<AuthenticatedLayout />}>
            <Route index element={<AthleteDashboard />} />
            <Route path="analyse" element={<HistoryRoute />} />
            <Route path="analyse/nouvelle" element={<LiveTrainingRoute />} />
            <Route path="analyse/:analysisId" element={<PlannedWorkspacePage title="Detail de l'analyse" sprint="le Sprint 3 (timeline et explicabilite)" />} />
            <Route path="progression" element={<AthleteDashboard />} />
            <Route path="entrainements" element={<DrillsRoute />} />
            <Route path="matchs" element={<GameModesRoute />} />
            <Route path="equipes" element={<TeamsRoute />} />
            <Route path="communaute" element={<FriendsRoute />} />
            <Route path="communaute/classement" element={<LeaderboardPage />} />
            <Route path="coach-ia" element={<CoachAiRoute />} />
            <Route path="profil" element={<ProfileRoute />} />
            <Route path="parametres" element={<PlannedWorkspacePage title="Parametres et confidentialite" sprint="le Sprint 5" />} />
            <Route path="notifications" element={<NotificationsRoute />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["coach"]} />}>
          <Route path="/coach" element={<AuthenticatedLayout />}>
            <Route index element={<ProfessionalWorkspaceRoute kind="coach" />} />
            {coachPaths.map((path) => (
              <Fragment key={path}>
                <Route path={path} element={<ProfessionalWorkspaceRoute kind={professionalKindForCoachPath(path)} />} />
              </Fragment>
            ))}
            <Route path="athletes/:athleteId" element={<ProfessionalWorkspaceRoute kind="coach" />} />
            <Route path="analyses/:analysisId" element={<ProfessionalWorkspaceRoute kind="elite" />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["club_admin"]} />}>
          <Route path="/club" element={<AuthenticatedLayout />}>
            <Route index element={<ClubWorkspaceRoute section="dashboard" />} />
            {clubPaths.map((path) => (
              <Fragment key={path}>
                <Route path={path} element={<ClubWorkspaceRoute section={clubSectionForPath(path)} />} />
              </Fragment>
            ))}
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
          <Route path="/admin" element={<AuthenticatedLayout />}>
            <Route index element={<ProfessionalWorkspaceRoute kind="admin" />} />
            {adminPaths.map((path) => (
              <Fragment key={path}>
                <Route path={path} element={<ProfessionalWorkspaceRoute kind={professionalKindForAdminPath(path)} />} />
              </Fragment>
            ))}
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["super_admin", "club_admin", "coach", "athlete"]} />}>
          <Route path="/ai-coach" element={<AuthenticatedLayout />}>
            <Route index element={<AICoachRoute />} />
          </Route>
          <Route path="/elite" element={<AuthenticatedLayout />}>
            <Route index element={<EliteAnalyticsPage />} />
            <Route path="pose-comparison" element={<EliteAnalyticsPage />} />
            <Route path="scouting" element={<EliteAnalyticsPage />} />
            <Route path="scouting/:athleteId" element={<EliteAnalyticsPage />} />
            <Route path="team-analytics" element={<EliteAnalyticsPage />} />
            <Route path="fatigue" element={<EliteAnalyticsPage />} />
          </Route>
          <Route path="/match-intelligence" element={<AuthenticatedLayout />}>
            <Route index element={<MatchIntelligencePage />} />
            <Route path=":matchId" element={<MatchIntelligencePage />} />
            <Route path="live/:matchId" element={<MatchIntelligencePage />} />
          </Route>
          <Route path="/tournaments" element={<AuthenticatedLayout />}>
            <Route index element={<EcosystemPage />} />
          </Route>
          <Route path="/marketplace" element={<AuthenticatedLayout />}>
            <Route index element={<EcosystemPage />} />
          </Route>
          <Route path="/training-generator" element={<AuthenticatedLayout />}>
            <Route index element={<EcosystemPage />} />
          </Route>
          <Route path="/integrations" element={<AuthenticatedLayout />}>
            <Route index element={<EcosystemPage />} />
            <Route path="wearables" element={<EcosystemPage />} />
          </Route>
          <Route path="/research" element={<AuthenticatedLayout />}>
            <Route index element={<NativeResearchPage />} />
          </Route>
          <Route path="/mobile" element={<AuthenticatedLayout />}>
            <Route index element={<NativeResearchPage />} />
          </Route>
          <Route path="/desktop" element={<AuthenticatedLayout />}>
            <Route index element={<NativeResearchPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function LiveTrainingRoute() {
  const shell = useAppShell();
  return <LiveTraining isImmersive={shell.isImmersive} setIsImmersive={shell.setIsImmersive} user={shell.user} isRecording={shell.isRecording} setIsRecording={shell.setIsRecording} handleRecordingComplete={shell.handleRecordingComplete} handleMetricsUpdate={shell.handleMetricsUpdate} liveMetrics={shell.liveMetrics} uploadProgress={shell.uploadProgress} onSessionSaved={shell.notifySessionSaved} />;
}

function DrillsRoute() {
  const navigate = useNavigate();
  return <DrillsPage onStartDrill={() => navigate("/app/analyse/nouvelle")} />;
}

function AthleteDashboard() {
  const { profile } = useAppShell();
  return <Dashboard profile={profile} />;
}

function CoachAiRoute() {
  const { user } = useAppShell();
  const { profile } = useAppShell();
  return <AICoachPage user={user} profile={profile} />;
}

function AICoachRoute() {
  const { user, profile } = useAppShell();
  return <AICoachPage user={user} profile={profile} />;
}

function HistoryRoute() {
  const { user, historyRefreshKey } = useAppShell();
  return <HistoryPage user={user} refreshKey={historyRefreshKey} />;
}

function ProfileRoute() {
  const { user, profile, openProfileEditor } = useAppShell();
  return <ProfilePage user={user} profile={profile} sessions={[]} onEditProfile={openProfileEditor} />;
}

function GameModesRoute() {
  const { user, profile } = useAppShell();
  return <GameModesPage user={user} profile={profile} />;
}

function FriendsRoute() {
  const { user, profile } = useAppShell();
  return <FriendsPage user={user} profile={profile} />;
}

function TeamsRoute() {
  const { user, profile } = useAppShell();
  return <TeamsPage user={user} profile={profile} />;
}

function NotificationsRoute() {
  const { user } = useAppShell();
  const navigate = useNavigate();
  return <NotificationsPage user={user} onOpenHistory={() => navigate("/app/analyse")} onOpenGames={() => navigate("/app/matchs")} />;
}

function ProfessionalWorkspaceRoute({ kind }: { kind: ProfessionalKind }) {
  return <ProfessionalWorkspacePage kind={kind} />;
}

function ClubWorkspaceRoute({ section }: { section: ClubSection }) {
  return <ClubWorkspacePage section={section} />;
}

function professionalKindForCoachPath(path: string): ProfessionalKind {
  if (path === "analyses" || path === "rapports") return "elite";
  if (path === "reports") return "elite";
  if (path === "equipes" || path === "compare") return "match";
  if (path === "notifications") return "ecosystem";
  return "coach";
}

function clubSectionForPath(path: string): ClubSection {
  if (path === "players" || path === "joueurs") return "players";
  if (path === "coaches" || path === "coachs") return "coaches";
  if (path === "teams" || path === "equipes") return "teams";
  if (path === "matches" || path === "matchs") return "matches";
  if (path === "attendance" || path === "presences") return "attendance";
  if (path === "training" || path === "entrainements") return "training";
  if (path === "performance" || path === "performances") return "performance";
  if (path === "reports" || path === "rapports") return "reports";
  if (path === "settings" || path === "parametres") return "settings";
  return "dashboard";
}

function professionalKindForAdminPath(path: string): ProfessionalKind {
  if (path === "modeles" || path === "models") return "elite";
  if (path === "clubs" || path === "utilisateurs" || path === "users") return "club";
  if (path === "parametres" || path === "settings" || path === "cloud-jobs" || path === "tournaments") return "ecosystem";
  return "admin";
}
