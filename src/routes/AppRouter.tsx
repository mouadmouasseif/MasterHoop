import { Fragment, lazy, Suspense } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import SplashScreen from "@/src/components/SplashScreen";
import { ProtectedRoute } from "@/src/routes/guards";
import AuthenticatedLayout from "@/src/routes/AuthenticatedLayout";
import { useAppShell } from "@/src/routes/AppShellContext";
import { ForbiddenPage, InvitationPage, LandingRoute, LegalPage, LoginRoute, NotFoundPage, PlannedWorkspacePage } from "@/src/pages/system/SystemPages";

const LiveTraining = lazy(() => import("@/src/pages/LiveTraining"));
const DrillsPage = lazy(() => import("@/src/pages/DrillsPage"));
const Dashboard = lazy(() => import("@/src/pages/Dashboard"));
const CoachPage = lazy(() => import("@/src/pages/CoachPage"));
const HistoryPage = lazy(() => import("@/src/pages/HistoryPage"));
const ProfilePage = lazy(() => import("@/src/pages/ProfilePage"));
const GameModesPage = lazy(() => import("@/src/pages/GameModesPage"));
const FriendsPage = lazy(() => import("@/src/pages/FriendsPage"));
const TeamsPage = lazy(() => import("@/src/pages/TeamsPage"));
const LeaderboardPage = lazy(() => import("@/src/pages/LeaderboardPage"));
const NotificationsPage = lazy(() => import("@/src/pages/NotificationsPage"));

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
            <Route path="analyse/:analysisId" element={<PlannedWorkspacePage title="Détail de l’analyse" sprint="le Sprint 3 (timeline et explicabilité)" />} />
            <Route path="progression" element={<AthleteDashboard />} />
            <Route path="entrainements" element={<DrillsRoute />} />
            <Route path="matchs" element={<GameModesRoute />} />
            <Route path="equipes" element={<TeamsRoute />} />
            <Route path="communaute" element={<FriendsRoute />} />
            <Route path="communaute/classement" element={<LeaderboardPage />} />
            <Route path="coach-ia" element={<CoachAiRoute />} />
            <Route path="profil" element={<ProfileRoute />} />
            <Route path="parametres" element={<PlannedWorkspacePage title="Paramètres et confidentialité" sprint="le Sprint 5" />} />
            <Route path="notifications" element={<NotificationsRoute />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["coach"]} />}>
          <Route path="/coach" element={<AuthenticatedLayout />}>
            <Route index element={<PlannedWorkspacePage title="Espace coach" sprint="le Sprint 5" />} />
            {coachPaths.map((path) => <Fragment key={path}><Route path={path} element={<PlannedWorkspacePage title={`Coach · ${path}`} sprint="le Sprint 5" />} /></Fragment>)}
            <Route path="athletes/:athleteId" element={<PlannedWorkspacePage title="Profil athlète associé" sprint="le Sprint 5" />} />
            <Route path="analyses/:analysisId" element={<PlannedWorkspacePage title="Analyse commentée" sprint="le Sprint 5" />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["club_admin"]} />}>
          <Route path="/club" element={<AuthenticatedLayout />}>
            <Route index element={<PlannedWorkspacePage title="Espace club" sprint="le Sprint 6" />} />
            {clubPaths.map((path) => <Fragment key={path}><Route path={path} element={<PlannedWorkspacePage title={`Club · ${path}`} sprint="le Sprint 6" />} /></Fragment>)}
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
          <Route path="/admin" element={<AuthenticatedLayout />}>
            <Route index element={<PlannedWorkspacePage title="Administration de la plateforme" sprint="une itération d’administration dédiée" />} />
            {adminPaths.map((path) => <Fragment key={path}><Route path={path} element={<PlannedWorkspacePage title={`Administration · ${path}`} sprint="une itération d’administration dédiée" />} /></Fragment>)}
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

const coachPaths = ["athletes", "analyses", "programmes", "exercices", "missions", "equipes", "rapports", "notifications"];
const clubPaths = ["joueurs", "coachs", "equipes", "matchs", "presences", "performances", "entrainements", "rapports", "parametres"];
const adminPaths = ["clubs", "utilisateurs", "modeles", "securite", "audit", "parametres"];

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
  return <CoachPage user={user} />;
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
