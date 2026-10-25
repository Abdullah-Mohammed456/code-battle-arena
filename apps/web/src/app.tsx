import { lazy, Suspense } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { SignIn, SignUp, UserButton, useAuth, useUser } from "@clerk/react";
import { request, type Api } from "./api";
import { clerkAppearance } from "./clerkAppearance";
import { ProblemList } from "./ProblemList";
import { Landing } from "./Landing";
import { MotionEffects } from "./MotionEffects";
import { Starfield } from "./Starfield";
import { webEnv } from "./env";
import "./preview.css";
import "./app.css";

const WorkspaceRoute = lazy(() =>
  import("./Workspace").then((module) => ({ default: module.WorkspaceRoute })),
);
const Profile = lazy(() =>
  import("./Profile").then((module) => ({ default: module.Profile })),
);
const Submission = lazy(() =>
  import("./Submission").then((module) => ({ default: module.Submission })),
);
export function App() {
  return (
    <Suspense
      fallback={
        <main className="preview">
          <p className="message">Loading page…</p>
        </main>
      }
    >
      {webEnv.VITE_CLERK_PUBLISHABLE_KEY ? <AuthenticatedApp /> : <PublicApp />}
    </Suspense>
  );
}

function PublicApp() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/problems"
          element={<ProblemList authConfigured={false} />}
        />
        <Route
          path="/problems/:slug"
          element={
            <WorkspaceRoute
              api={async () => {
                throw new Error(
                  "Sign-in is not configured — add the Clerk publishable key to apps/web/.env",
                );
              }}
            />
          }
        />
        <Route path="/sign-in/*" element={<SetupNeeded />} />
        <Route path="/sign-up/*" element={<SetupNeeded />} />
        <Route path="*" element={<ProblemList authConfigured={false} />} />
      </Routes>
    </Shell>
  );
}

function SetupNeeded() {
  return (
    <section className="setup-notice">
      <p className="eyebrow">ACCOUNT SETUP</p>
      <h1>Connect Clerk to continue</h1>
      <p>
        Add the Clerk publishable key to <code>apps/web/.env</code> — the server
        secret stays in <code>apps/server/.env</code>
      </p>
      <pre>VITE_CLERK_PUBLISHABLE_KEY=pk_test_…</pre>
      <p>Restart the web dev server after saving the key</p>
    </section>
  );
}

function AuthenticatedApp() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const api: Api = async (path, schema, init) =>
    request(path, schema, init, await getToken());
  if (!isLoaded)
    return (
      <main className="preview">
        <p className="message">Loading account…</p>
      </main>
    );
  return (
    <Shell
      signedIn={Boolean(isSignedIn)}
      userName={user?.firstName ?? undefined}
    >
      <Routes>
        <Route path="/" element={<Landing signedIn={Boolean(isSignedIn)} />} />
        <Route
          path="/problems"
          element={
            <ProblemList
              api={isSignedIn ? api : undefined}
              userId={userId ?? undefined}
            />
          }
        />
        <Route
          path="/problems/:slug"
          element={
            <WorkspaceRoute
              api={api}
              signedIn={Boolean(isSignedIn)}
              userId={userId ?? undefined}
            />
          }
        />
        <Route
          path="/sign-in/*"
          element={
            <main className="auth-page">
              <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
            </main>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <main className="auth-page">
              <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
            </main>
          }
        />
        <Route
          path="/submissions/:id"
          element={
            isSignedIn && userId ? (
              <Submission api={api} userId={userId} />
            ) : (
              <Navigate to="/sign-in" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isSignedIn && userId ? (
              <Profile api={api} userId={userId} />
            ) : (
              <Navigate to="/sign-in" replace />
            )
          }
        />
        <Route
          path="*"
          element={
            <ProblemList
              api={isSignedIn ? api : undefined}
              userId={userId ?? undefined}
            />
          }
        />
      </Routes>
    </Shell>
  );
}

function Shell({
  children,
  signedIn,
  userName,
}: {
  children: React.ReactNode;
  signedIn?: boolean;
  userName?: string;
}) {
  const { pathname } = useLocation();
  const motionEnabled = !/^\/(problems\/[^/]+|battle\/[^/]+)$/.test(pathname);

  return (
    <main className="preview">
      <Starfield />
      <MotionEffects enabled={motionEnabled} routeKey={pathname} />
      <header className="topbar">
        <Link className="wordmark" to="/" aria-label="Code Battle Arena home">
          <span className="brand-name">
            <strong>CODE BATTLE</strong>
            <span className="custom-small">ARENA</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink className="nav-flip" to="/problems">
            <span className="navbar">PROBLEMS</span>
            <span aria-hidden="true" className="navbar">
              PROBLEMS
            </span>
          </NavLink>
        </nav>
        {signedIn ? (
          <div className="account">
            <Link to="/profile">{userName ?? "Profile"}</Link>
            <UserButton
              appearance={clerkAppearance}
              userProfileProps={{ appearance: clerkAppearance }}
            />
          </div>
        ) : (
          <Link className="sign-link" to="/sign-in">
            Sign in
          </Link>
        )}
      </header>
      <div className="route-content" key={pathname}>
        {children}
      </div>
      <footer className="footer">
        <span>CODE BATTLE ARENA</span>
        <span>COMPETITIVE PROGRAMMING</span>
      </footer>
    </main>
  );
}
