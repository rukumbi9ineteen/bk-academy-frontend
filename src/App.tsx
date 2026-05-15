import { FormEvent, useEffect, useState } from "react";
import { apiRequest, downloadText, getApiUrl, login, registerApplicant } from "./api";
import { clearSession, loadSession, saveSession } from "./auth";
import type {
  AnalyticsOverview,
  ApplicationListItem,
  AuthSession,
  StudentDashboard,
  UserRole
} from "./types";

type Route = "home" | "apply" | "login" | "student" | "admin" | "executive";

type NavItem = {
  id: Route;
  label: string;
  roles?: UserRole[];
  publicOnly?: boolean;
};

const routes: NavItem[] = [
  { id: "home", label: "Academy" },
  { id: "apply", label: "Apply", publicOnly: true },
  { id: "apply", label: "My Application", roles: ["applicant"] },
  { id: "student", label: "Dashboard", roles: ["student"] },
  { id: "admin", label: "Admin", roles: ["admin"] },
  { id: "executive", label: "Executive", roles: ["executive"] }
];

const routeAccess: Record<Route, UserRole[] | "public"> = {
  home: "public",
  apply: "public",
  login: "public",
  student: ["student"],
  admin: ["admin"],
  executive: ["executive"]
};

export function App() {
  const [route, setRoute] = useState<Route>(getRouteFromHash());
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const visibleRoutes = getVisibleRoutes(session?.user.role);
  const access = canAccessRoute(route, session?.user.role);

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(nextRoute: Route) {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  }

  function handleLogin(nextSession: AuthSession) {
    saveSession(nextSession);
    setSession(nextSession);
    navigate(defaultRouteForRole(nextSession.user.role));
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    navigate("home");
  }

  if (!access.allowed) {
    return (
      <div className="app-shell">
        <AppHeader
          route={route}
          session={session}
          routes={visibleRoutes}
          onNavigate={navigate}
          onLogout={handleLogout}
        />
        <Gate
          title={access.reason === "signin" ? "Sign in required" : "Workspace unavailable"}
          message={access.message}
          onNavigate={navigate}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader
        route={route}
        session={session}
        routes={visibleRoutes}
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      {route === "home" && <LandingPage onNavigate={navigate} />}
      {route === "apply" && <ApplyPage session={session} onLogin={handleLogin} />}
      {route === "login" && <LoginPage onLogin={handleLogin} />}
      {route === "student" && <StudentPage session={session} />}
      {route === "admin" && <AdminPage session={session} />}
      {route === "executive" && <ExecutivePage session={session} />}
    </div>
  );
}

function AppHeader({
  route,
  session,
  routes,
  onNavigate,
  onLogout
}: {
  route: Route;
  session: AuthSession | null;
  routes: NavItem[];
  onNavigate: (route: Route) => void;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <button className="brand-mark" type="button" onClick={() => onNavigate("home")}>
        <span className="brand-symbol">BK</span>
        <span>
          <strong>BK Academy</strong>
          <small>Re-imagined</small>
        </span>
      </button>
      <nav aria-label="Primary navigation">
        {routes.map((item) => (
          <button
            className={route === item.id ? "active" : ""}
            key={`${item.id}-${item.label}`}
            type="button"
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="session-pill">
        {session ? (
          <>
            <span>{session.user.role}</span>
            <button type="button" onClick={onLogout}>Sign out</button>
          </>
        ) : (
          <button type="button" onClick={() => onNavigate("login")}>Sign in</button>
        )}
      </div>
    </header>
  );
}

function LandingPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Digital-first talent development</p>
          <h1>Build Rwanda’s next generation of banking leaders.</h1>
          <p>
            A premium academy portal for applications, learning, secure assessments,
            performance analytics, and BK career readiness.
          </p>
          <div className="hero-actions">
            <button className="primary-action" type="button" onClick={() => onNavigate("apply")}>
              Start application
            </button>
            <button className="secondary-action" type="button" onClick={() => onNavigate("login")}>
              Access portal
            </button>
          </div>
        </div>
        <div className="hero-card" aria-label="Program summary">
          <span className="live-dot">Cohort intake</span>
          <strong>3 months</strong>
          <p>Banking foundation, technical skills, practical projects, and proctored assessments.</p>
          <div className="metric-grid">
            <Metric label="Learning" value="12 weeks" />
            <Metric label="Integrity" value="Secure" />
            <Metric label="Analytics" value="Live" />
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <FeatureCard title="Applicant journey" text="Registration, CV upload, review status, interviews, and academy enrollment." />
        <FeatureCard title="Student cockpit" text="Courses, assignments, exams, grades, live sessions, and next actions in one focused place." />
        <FeatureCard title="Admin command center" text="Application review, cohorts, learning content, grading, attendance, and exports." />
        <FeatureCard title="Executive visibility" text="Cohort performance, readiness signals, integrity flags, and report downloads." />
      </section>
    </main>
  );
}

function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("Signing you in...");
    try {
      const session = await login(email, password);
      onLogin(session);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sign in");
    }
  }

  return (
    <main className="center-stage">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Secure portal</p>
        <h1>Welcome back</h1>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        <button className="primary-action" type="submit">Sign in</button>
        {status && <p className="form-status">{status}</p>}
      </form>
    </main>
  );
}

function ApplyPage({
  session,
  onLogin
}: {
  session: AuthSession | null;
  onLogin: (session: AuthSession) => void;
}) {
  const activeStep = session ? 2 : 1;
  const [account, setAccount] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });
  const [motivationStatement, setMotivationStatement] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    const firstName = account.firstName.trim();
    const lastName = account.lastName.trim();
    const email = account.email.trim().toLowerCase();

    if (!firstName || !lastName) {
      setStatus("Please enter both your first name and last name.");
      return;
    }

    setStatus("Creating applicant account...");
    try {
      await registerApplicant({
        firstName,
        lastName,
        email,
        password: account.password
      });
      const nextSession = await login(email, account.password);
      onLogin(nextSession);
      setStatus("Account created. You can now submit your application.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create account");
    }
  }

  async function submitApplication(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      setStatus("Please create an account or sign in first.");
      return;
    }
    if (!cvFile) {
      setStatus("Please attach your CV as PDF or DOCX.");
      return;
    }

    const formData = new FormData();
    formData.set("motivationStatement", motivationStatement);
    formData.set("cvFile", cvFile);

    setStatus("Submitting application...");
    try {
      await apiRequest("/applications", {
        method: "POST",
        body: formData,
        token: session.accessToken
      });
      setStatus("Application submitted. BK Academy will review your profile.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit application");
    }
  }

  return (
    <main className="split-layout">
      <section className="panel luminous">
        <p className="eyebrow">Application intake</p>
        <h1>Show us the banker you are becoming.</h1>
        <p>
          Submit your profile, motivation statement, and CV. Administrators can then review,
          shortlist, schedule interviews, and enroll approved applicants into cohorts.
        </p>
      </section>

      <section className="panel form-panel">
        <div className="apply-stepper" aria-label="Application steps">
          <span className={activeStep === 1 ? "current" : "complete"}>1. Account</span>
          <span className={activeStep === 2 ? "current" : ""}>2. Application</span>
        </div>

        {!session ? (
          <form className="step-card" onSubmit={createAccount}>
            <div>
              <p className="eyebrow">Step 1</p>
              <h2>Create applicant account</h2>
              <p className="form-hint">
                First create your secure account. After this succeeds, we will unlock the CV and motivation form.
              </p>
            </div>
            <div className="two-column">
              <label>
                First name
                <input
                  value={account.firstName}
                  onChange={(event) => setAccount({ ...account, firstName: event.target.value })}
                  placeholder="e.g. Shema"
                  required
                />
              </label>
              <label>
                Last name
                <input
                  value={account.lastName}
                  onChange={(event) => setAccount({ ...account, lastName: event.target.value })}
                  placeholder="e.g. Mutabazi"
                  required
                />
              </label>
            </div>
            <label>
              Email
              <input
                value={account.email}
                onChange={(event) => setAccount({ ...account, email: event.target.value })}
                placeholder="you@example.com"
                type="email"
                required
              />
            </label>
            <label>
              Password
              <input
                value={account.password}
                onChange={(event) => setAccount({ ...account, password: event.target.value })}
                minLength={8}
                placeholder="At least 8 characters"
                type="password"
                required
              />
            </label>
            <button className="primary-action wide" type="submit">Create account</button>
            {status && <p className="form-status">{status}</p>}
          </form>
        ) : (
          <form className="step-card" onSubmit={submitApplication}>
            <div>
              <p className="eyebrow">Step 2</p>
              <h2>Submit application</h2>
              <p className="form-hint">
                You are signed in as {session.user.email}. Add your motivation statement and attach your CV.
              </p>
            </div>
            <label>
              Motivation statement
              <textarea
                value={motivationStatement}
                onChange={(event) => setMotivationStatement(event.target.value)}
                rows={6}
                required
                placeholder="Tell us why BK Academy is the right next step for you."
              />
            </label>
            <label>
              CV file
              <input
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
                type="file"
                required
              />
            </label>
            <button className="primary-action wide" type="submit">Submit to BK Academy</button>
            {status && <p className="form-status">{status}</p>}
          </form>
        )}
      </section>
    </main>
  );
}

function StudentPage({ session }: { session: AuthSession | null }) {
  const { data, error, loading } = useAuthedData<StudentDashboard>(session, "/student/dashboard");

  return (
    <main className="dashboard">
      <DashboardHeader eyebrow="Student cockpit" title="Your learning command center" />
      {loading && <Skeleton text="Loading your academy progress..." />}
      {error && <Notice tone="warning" title="Dashboard not ready" text={error} />}
      {data && (
        <>
          <section className="metric-grid four">
            <Metric label="Courses" value={data.courses.length} />
            <Metric label="Assignments submitted" value={`${data.assignments.submitted}/${data.assignments.total}`} />
            <Metric label="Exams completed" value={`${data.exams.completed}/${data.exams.total}`} />
            <Metric label="Exam average" value={data.exams.averageScore === null ? "N/A" : `${data.exams.averageScore}%`} />
          </section>
          <section className="content-grid">
            <DataCard title="Next actions">
              {data.nextActions.length === 0 ? (
                <p>No immediate actions. A rare quiet moment. Enjoy it responsibly.</p>
              ) : (
                data.nextActions.map((action) => (
                  <Row key={`${action.type}-${action.title}`} title={action.title} meta={action.type} badge={formatDate(action.dueAt)} />
                ))
              )}
            </DataCard>
            <DataCard title="Recent grades">
              {data.recentGrades.map((grade) => (
                <Row key={`${grade.type}-${grade.title}`} title={grade.title} meta={grade.type} badge={`${grade.score}/${grade.total}`} />
              ))}
            </DataCard>
          </section>
        </>
      )}
    </main>
  );
}

function AdminPage({ session }: { session: AuthSession | null }) {
  const [statusFilter, setStatusFilter] = useState("pending");
  const applicationsPath = `/admin/applications?page=1&limit=10${statusFilter ? `&status=${statusFilter}` : ""}`;
  const overview = useAuthedData<AnalyticsOverview>(session, "/admin/analytics/overview");
  const applications = useAuthedData<{ items: ApplicationListItem[]; total: number }>(session, applicationsPath);

  if (!session) {
    return null;
  }

  return (
    <main className="dashboard">
      <DashboardHeader eyebrow="Admin operations" title="Review, track, and move cohorts forward" />
      {overview.data && (
        <section className="metric-grid four">
          <Metric label="Students" value={overview.data.studentTotal ?? 0} />
          <Metric label="Courses" value={overview.data.courseTotal ?? 0} />
          <Metric label="Integrity flags" value={overview.data.integrityFlags ?? 0} />
          <Metric label="Average exam score" value={overview.data.averageExamScore === null ? "N/A" : `${overview.data.averageExamScore ?? 0}%`} />
        </section>
      )}
      <section className="content-grid">
        <DataCard title="Application review queue">
          <div className="filter-row">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {applications.loading && <Skeleton text="Loading applications..." />}
          {applications.error && <Notice tone="warning" title="Applications unavailable" text={applications.error} />}
          {applications.data?.items.map((application) => (
            <Row
              key={application.id}
              title={`${application.applicant.firstName} ${application.applicant.lastName}`}
              meta={application.applicant.email}
              badge={`${application.status} / ${application.interviewStatus}`}
            />
          ))}
        </DataCard>
        <ReportsCard session={session} />
      </section>
    </main>
  );
}

function ExecutivePage({ session }: { session: AuthSession | null }) {
  const overview = useAuthedData<AnalyticsOverview>(session, "/admin/analytics/overview");

  if (!session) {
    return null;
  }

  return (
    <main className="dashboard executive">
      <DashboardHeader eyebrow="Executive visibility" title="Academy outcomes at decision speed" />
      {overview.loading && <Skeleton text="Loading executive analytics..." />}
      {overview.error && <Notice tone="warning" title="Analytics unavailable" text={overview.error} />}
      {overview.data && (
        <section className="metric-grid four">
          <Metric label="Students" value={overview.data.studentTotal ?? 0} />
          <Metric label="Courses" value={overview.data.courseTotal ?? 0} />
          <Metric label="Integrity flags" value={overview.data.integrityFlags ?? 0} />
          <Metric label="Exam average" value={overview.data.averageExamScore === null ? "N/A" : `${overview.data.averageExamScore ?? 0}%`} />
        </section>
      )}
      <section className="content-grid">
        <DataCard title="Leadership signals">
          <Row title="Application funnel" meta="Monitor conversion from pending to approved" badge="Live" />
          <Row title="Cohort readiness" meta="Compare learning, assessment, and attendance signals" badge="Next" />
          <Row title="Talent decisions" meta="Use exports for graduation and placement reviews" badge="CSV" />
        </DataCard>
        <ReportsCard session={session} />
      </section>
    </main>
  );
}

function ReportsCard({ session }: { session: AuthSession }) {
  const [status, setStatus] = useState<string | null>(null);

  async function previewApplicationsCsv() {
    setStatus("Fetching application CSV...");
    try {
      const csv = await downloadText("/admin/reports/applications.csv", session.accessToken);
      const lineCount = csv.split("\n").filter(Boolean).length;
      setStatus(`Application CSV ready: ${lineCount} line(s). Browser download wiring comes next.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to fetch report");
    }
  }

  return (
    <DataCard title="Reports and exports">
      <Row title="Applications report" meta="Applicant identity, status, interview status, CV reference" badge="JSON/CSV" />
      <Row title="Cohort performance" meta="Assignments, exams, integrity, attendance" badge="JSON/CSV" />
      <button className="secondary-action wide" type="button" onClick={previewApplicationsCsv}>
        Test applications CSV
      </button>
      {status && <p className="form-status">{status}</p>}
    </DataCard>
  );
}

function useAuthedData<T>(session: AuthSession | null, path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    apiRequest<T>(path, {
      token: session.accessToken,
      signal: controller.signal
    })
      .then(setData)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setError(error instanceof Error ? error.message : "Unable to load data");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [path, session]);

  return { data, error, loading };
}

function Gate({
  title,
  message = "Sign in with a role that can access this workspace.",
  onNavigate
}: {
  title: string;
  message?: string;
  onNavigate: (route: Route) => void;
}) {
  return (
    <main className="center-stage">
      <section className="auth-card">
        <p className="eyebrow">Authentication required</p>
        <h1>{title}</h1>
        <p>{message}</p>
        <button className="primary-action" type="button" onClick={() => onNavigate("login")}>
          Sign in
        </button>
      </section>
    </main>
  );
}

function DashboardHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <section className="dashboard-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <span className="api-chip">API {getApiUrl()}</span>
    </section>
  );
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="data-card">
      <h2>{title}</h2>
      <div className="data-card-body">{children}</div>
    </section>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="feature-card">
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Row({ title, meta, badge }: { title: string; meta: string; badge?: string }) {
  return (
    <article className="row-item">
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      {badge && <em>{badge}</em>}
    </article>
  );
}

function Notice({ title, text, tone }: { title: string; text: string; tone: "warning" }) {
  return (
    <section className={`notice ${tone}`}>
      <strong>{title}</strong>
      <p>{text}</p>
    </section>
  );
}

function Skeleton({ text }: { text: string }) {
  return <p className="skeleton">{text}</p>;
}

function getRouteFromHash(): Route {
  const route = window.location.hash.replace("#", "") as Route;
  return routes.some((item) => item.id === route) || route === "login" ? route : "home";
}

function defaultRouteForRole(role: UserRole): Route {
  if (role === "admin") {
    return "admin";
  }
  if (role === "executive") {
    return "executive";
  }
  if (role === "student") {
    return "student";
  }
  return "apply";
}

function getVisibleRoutes(role?: UserRole): NavItem[] {
  return routes.filter((item) => {
    if (item.publicOnly) {
      return !role;
    }
    if (!item.roles) {
      return true;
    }
    return role ? item.roles.includes(role) : false;
  });
}

function canAccessRoute(
  route: Route,
  role?: UserRole
): { allowed: true } | { allowed: false; reason: "signin" | "role"; message: string } {
  if (route === "apply" && role && role !== "applicant") {
    return {
      allowed: false,
      reason: "role",
      message: `Your ${role} account does not use the public application workspace.`
    };
  }

  const allowedRoles = routeAccess[route];
  if (allowedRoles === "public") {
    return { allowed: true };
  }
  if (!role) {
    return {
      allowed: false,
      reason: "signin",
      message: "Please sign in before opening this workspace."
    };
  }
  if (!allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: "role",
      message: `Your ${role} account does not have access to this workspace.`
    };
  }
  return { allowed: true };
}

function formatDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
