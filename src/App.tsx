import { FormEvent, useEffect, useState } from "react";
import { apiRequest, downloadBlob, downloadText, login, registerApplicant } from "./api";
import { clearSession, loadSession, saveSession } from "./auth";
import type {
  AnalyticsOverview,
  ApplicationListItem,
  AuthSession,
  StudentDashboard,
  UserRole
} from "./types";

type Route = "home" | "apply" | "login" | "student" | "admin" | "executive" | "trainer";

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
  { id: "executive", label: "Executive", roles: ["executive"] },
  { id: "trainer", label: "Trainer", roles: ["trainer"] }
];

const routeAccess: Record<Route, UserRole[] | "public"> = {
  home: "public",
  apply: "public",
  login: "public",
  student: ["student"],
  admin: ["admin"],
  executive: ["executive"],
  trainer: ["trainer"]
};

type ListResponse<T> = {
  items: T[];
  total: number;
};

type CohortItem = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};

type CourseItem = {
  id: string;
  title: string;
  description: string;
  durationWeeks: number;
  trainerId?: string | null;
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type ModuleItem = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  orderIndex: number;
};

type InternalUserItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
};

type AssignmentItem = {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  module?: { id: string; courseId: string; title: string } | null;
  submission?: { id: string; marks: number | null; feedback: string | null; submittedAt: string } | null;
};

type ExamItem = {
  id: string;
  courseId: string;
  title: string;
  examType: string;
  description: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  proctoringEnabled: boolean;
  course?: { id: string; title: string } | null;
  attempt?: { id: string; status: string; score: number | null; integrityStatus: string } | null;
};

type ExamQuestionItem = {
  id: string;
  examId: string;
  questionType: string;
  prompt: string;
  options?: string[] | null;
  points: number;
  orderIndex: number;
  correctAnswer?: string | null;
};

type LiveSessionItem = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  meetingLink: string;
  scheduledAt: string;
  durationMinutes: number;
};

type CourseDeck = {
  id: string;
  courseId: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  moduleMarkers: Array<{
    moduleId: string;
    name: string;
    startSlide: number;
    endSlide: number | null;
  }>;
  viewPath: string;
};

type AdminSection = "overview" | "applications" | "cohorts" | "courses" | "reports";

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
      {route === "trainer" && <TrainerPage session={session} />}
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
  const [studentKey, setStudentKey] = useState(0);
  const [studentStatus, setStudentStatus] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<{
    examId: string;
    attemptId: string;
    questions: ExamQuestionItem[];
    answers: Record<string, string>;
  } | null>(null);
  const [activeDeck, setActiveDeck] = useState<{
    metadata: CourseDeck;
    objectUrl: string;
  } | null>(null);
  const { data, error, loading } = useAuthedData<StudentDashboard>(session, "/student/dashboard");
  const assignments = useAuthedData<ListResponse<AssignmentItem>>(session, "/student/assignments", studentKey);
  const exams = useAuthedData<ListResponse<ExamItem>>(session, "/student/exams", studentKey);

  useEffect(() => {
    return () => {
      if (activeDeck?.objectUrl) {
        URL.revokeObjectURL(activeDeck.objectUrl);
      }
    };
  }, [activeDeck?.objectUrl]);

  if (!session) {
    return null;
  }
  const accessToken = session.accessToken;

  async function submitAssignment(event: FormEvent<HTMLFormElement>, assignmentId: string) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStudentStatus("Uploading assignment submission...");
    try {
      await apiRequest(`/student/assignments/${assignmentId}/submissions`, {
        method: "POST",
        token: accessToken,
        body: form
      });
      formElement.reset();
      setStudentKey((value) => value + 1);
      setStudentStatus("Assignment submitted. Your trainer can now grade it.");
    } catch (error) {
      setStudentStatus(error instanceof Error ? error.message : "Unable to submit assignment");
    }
  }

  async function startExam(exam: ExamItem) {
    setStudentStatus("Starting exam attempt...");
    try {
      const attempt = exam.attempt?.status === "in_progress"
        ? exam.attempt
        : await apiRequest<{ id: string; status: string }>(`/student/exams/${exam.id}/attempts`, {
            method: "POST",
            token: accessToken
          });
      const questionResponse = await apiRequest<{ items: ExamQuestionItem[] }>(`/student/exams/${exam.id}/questions`, {
        token: accessToken
      });
      setActiveExam({
        examId: exam.id,
        attemptId: attempt.id,
        questions: questionResponse.items,
        answers: {}
      });
      setStudentKey((value) => value + 1);
      setStudentStatus(`Exam opened: ${exam.title}`);
    } catch (error) {
      setStudentStatus(error instanceof Error ? error.message : "Unable to start exam");
    }
  }

  async function openCourseDeck(courseId: string) {
    setStudentStatus("Opening protected course presentation...");
    try {
      const metadata = await apiRequest<CourseDeck>(`/student/courses/${courseId}/deck`, {
        token: accessToken
      });
      const blob = await downloadBlob(metadata.viewPath, accessToken);
      const objectUrl = URL.createObjectURL(blob);
      if (activeDeck?.objectUrl) {
        URL.revokeObjectURL(activeDeck.objectUrl);
      }
      setActiveDeck({ metadata, objectUrl });
      setStudentStatus("Course presentation opened inside the portal.");
    } catch (error) {
      setStudentStatus(error instanceof Error ? error.message : "Unable to open course presentation");
    }
  }

  async function submitExamAnswers() {
    if (!activeExam) {
      return;
    }
    const answers = activeExam.questions
      .map((question) => ({
        questionId: question.id,
        answer: activeExam.answers[question.id]?.trim() ?? ""
      }))
      .filter((answer) => answer.answer.length > 0);

    if (answers.length === 0) {
      setStudentStatus("Answer at least one question before submitting.");
      return;
    }

    setStudentStatus("Submitting exam answers...");
    try {
      await apiRequest(`/student/exams/attempts/${activeExam.attemptId}/answers`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ answers })
      });
      await apiRequest(`/student/exams/attempts/${activeExam.attemptId}/complete`, {
        method: "PATCH",
        token: accessToken
      });
      setActiveExam(null);
      setStudentKey((value) => value + 1);
      setStudentStatus("Exam submitted and completed.");
    } catch (error) {
      setStudentStatus(error instanceof Error ? error.message : "Unable to submit exam");
    }
  }

  return (
    <main className="dashboard">
      <DashboardHeader eyebrow="Student cockpit" title="Your learning command center" />
      {studentStatus && <Notice tone="warning" title="Student action" text={studentStatus} />}
      {loading && <Skeleton text="Loading your academy progress..." />}
      {error && <Notice tone="warning" title="Dashboard not ready" text={error} />}
      {data && (
        <>
          <section className="metric-grid four">
            <Metric label="Courses" value={data.courses.total} />
            <Metric label="Assignments submitted" value={`${data.progress.assignments.submitted}/${data.progress.assignments.total}`} />
            <Metric label="Exams completed" value={`${data.progress.exams.completed}/${data.progress.exams.total}`} />
            <Metric label="Overall progress" value={`${data.progress.overallCompletionRate}%`} />
          </section>
          <section className="content-grid">
            <DataCard title="Assigned courses">
              {data.courses.items.length === 0 ? (
                <p>No courses are assigned yet. Once an admin enrolls you into a cohort and assigns courses, they will appear here.</p>
              ) : (
                data.courses.items.map((course) => (
                  <article className="admin-record" key={course.id}>
                    <Row
                      title={course.title}
                      meta={`${course.modules} module(s), ${course.assignments} assignment(s), ${course.exams} exam(s)`}
                      badge={`${course.durationWeeks} week(s)`}
                    />
                    <button className="secondary-action wide" type="button" onClick={() => openCourseDeck(course.id)}>
                      Open protected course presentation
                    </button>
                  </article>
                ))
              )}
            </DataCard>
            {activeDeck && (
              <DataCard title={activeDeck.metadata.title}>
                <div className="deck-viewer">
                  <iframe title={activeDeck.metadata.title} src={activeDeck.objectUrl} />
                </div>
                <div className="module-marker-list">
                  {activeDeck.metadata.moduleMarkers.map((marker) => (
                    <Row
                      key={marker.moduleId}
                      title={marker.name}
                      meta={`Starts at slide ${marker.startSlide}`}
                      badge={marker.endSlide ? `Ends ${marker.endSlide}` : "Final section"}
                    />
                  ))}
                </div>
                <p className="form-hint">This presentation is streamed through the academy portal without exposing a storage URL or download button.</p>
              </DataCard>
            )}
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
              {data.recentGrades.length === 0 ? (
                <p>No grades yet. Graded assignments and reviewed exams will appear here.</p>
              ) : (
                data.recentGrades.map((grade) => (
                  <Row key={`${grade.type}-${grade.title}`} title={grade.title} meta={grade.type} badge={`${grade.score}/${grade.total}`} />
                ))
              )}
            </DataCard>
            <DataCard title="Assignments to submit">
              {assignments.loading && <Skeleton text="Loading assignments..." />}
              {assignments.error && <Notice tone="warning" title="Assignments unavailable" text={assignments.error} />}
              {assignments.data?.items.length === 0 && <p>No assignments are available yet.</p>}
              {assignments.data?.items.map((assignment) => (
                <article className="admin-record" key={assignment.id}>
                  <Row
                    title={assignment.title}
                    meta={assignment.module?.title ?? "Module"}
                    badge={assignment.submission ? "Submitted" : formatDate(assignment.dueDate)}
                  />
                  {assignment.submission ? (
                    <p className="form-hint">
                      Submitted {formatDate(assignment.submission.submittedAt)}. Grade: {assignment.submission.marks ?? "Pending"}.
                    </p>
                  ) : (
                    <form className="mini-form no-divider" onSubmit={(event) => submitAssignment(event, assignment.id)}>
                      <input name="file" type="file" required />
                      <button className="primary-action wide" type="submit">Submit assignment</button>
                    </form>
                  )}
                </article>
              ))}
            </DataCard>
            <DataCard title="Exams to start">
              {exams.loading && <Skeleton text="Loading exams..." />}
              {exams.error && <Notice tone="warning" title="Exams unavailable" text={exams.error} />}
              {exams.data?.items.length === 0 && <p>No exams are scheduled yet.</p>}
              {exams.data?.items.map((exam) => (
                <article className="admin-record" key={exam.id}>
                  <Row
                    title={exam.title}
                    meta={`${exam.course?.title ?? "Course"} · ${formatDate(exam.startTime)} to ${formatDate(exam.endTime)}`}
                    badge={exam.attempt?.status ?? exam.examType}
                  />
                  <button
                    className="secondary-action wide"
                    disabled={exam.attempt?.status === "completed" || exam.attempt?.status === "reviewed"}
                    type="button"
                    onClick={() => startExam(exam)}
                  >
                    {exam.attempt?.status === "in_progress" ? "Continue exam" : "Start exam"}
                  </button>
                </article>
              ))}
            </DataCard>
            {activeExam && (
              <DataCard title="Active exam questions">
                {activeExam.questions.length === 0 ? (
                  <p>No questions have been added to this exam yet.</p>
                ) : (
                  activeExam.questions.map((question) => (
                    <label key={question.id}>
                      {question.orderIndex}. {question.prompt} ({question.points} pts)
                      {question.options?.length ? (
                        <select
                          value={activeExam.answers[question.id] ?? ""}
                          onChange={(event) => setActiveExam({
                            ...activeExam,
                            answers: { ...activeExam.answers, [question.id]: event.target.value }
                          })}
                        >
                          <option value="">Select answer</option>
                          {question.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <textarea
                          rows={3}
                          value={activeExam.answers[question.id] ?? ""}
                          onChange={(event) => setActiveExam({
                            ...activeExam,
                            answers: { ...activeExam.answers, [question.id]: event.target.value }
                          })}
                        />
                      )}
                    </label>
                  ))
                )}
                <button className="primary-action wide" type="button" onClick={submitExamAnswers}>Submit and complete exam</button>
              </DataCard>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function AdminPage({ session }: { session: AuthSession | null }) {
  const [adminSection, setAdminSection] = useState<AdminSection>("overview");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [applicationsKey, setApplicationsKey] = useState(0);
  const [workspaceKey, setWorkspaceKey] = useState(0);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const applicationsPath = `/admin/applications?page=1&limit=20${statusFilter ? `&status=${statusFilter}` : ""}`;
  const overview = useAuthedData<AnalyticsOverview>(session, "/admin/analytics/overview");
  const applications = useAuthedData<ListResponse<ApplicationListItem>>(session, applicationsPath, applicationsKey);
  const cohorts = useAuthedData<ListResponse<CohortItem>>(session, "/admin/cohorts?page=1&limit=50", workspaceKey);
  const courses = useAuthedData<ListResponse<CourseItem>>(session, "/admin/courses?page=1&limit=50", workspaceKey);
  const trainers = useAuthedData<ListResponse<InternalUserItem>>(session, "/users/admin?role=trainer", workspaceKey);

  if (!session) {
    return null;
  }
  const accessToken = session.accessToken;

  async function updateApplicationStatus(application: ApplicationListItem, status: string) {
    setAdminStatus(`Updating application to ${status}...`);
    try {
      if (status === "approved" && application.status === "pending") {
        await apiRequest(`/admin/applications/${application.id}/status`, {
          method: "PATCH",
          token: accessToken,
          body: JSON.stringify({ status: "shortlisted", reason: "Auto-shortlisted before approval from admin portal" })
        });
      }
      await apiRequest(`/admin/applications/${application.id}/status`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ status, reason: `Marked ${status} from admin portal` })
      });
      setApplicationsKey((value) => value + 1);
      setAdminStatus(`Application marked ${status}.`);
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to update application");
    }
  }

  async function updateInterviewStatus(applicationId: string, interviewStatus: string) {
    setAdminStatus(`Updating interview status...`);
    try {
      await apiRequest(`/admin/applications/${applicationId}/interview-status`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ interviewStatus })
      });
      setApplicationsKey((value) => value + 1);
      setAdminStatus(`Interview status changed to ${interviewStatus}.`);
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to update interview status");
    }
  }

  async function openCv(applicationId: string) {
    setAdminStatus("Generating secure CV link...");
    try {
      const response = await apiRequest<{ accessUrl: string }>(`/admin/applications/${applicationId}/cv-access`, {
        token: accessToken
      });
      window.open(response.accessUrl, "_blank", "noopener,noreferrer");
      setAdminStatus("CV link opened in a new tab.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to open CV");
    }
  }

  async function createCohort(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setAdminStatus("Creating cohort...");
    try {
      await apiRequest("/admin/cohorts", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          name: String(form.get("name")),
          startDate: String(form.get("startDate")),
          endDate: String(form.get("endDate")),
          status: String(form.get("status"))
        })
      });
      formElement.reset();
      setWorkspaceKey((value) => value + 1);
      setAdminStatus("Cohort created.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to create cohort");
    }
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setAdminStatus("Creating course...");
    try {
      await apiRequest("/admin/courses", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          title: String(form.get("title")),
          description: String(form.get("description")),
          durationWeeks: Number(form.get("durationWeeks"))
        })
      });
      formElement.reset();
      setWorkspaceKey((value) => value + 1);
      setAdminStatus("Course created.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to create course");
    }
  }

  async function assignCourseToCohort() {
    if (!selectedCohortId || !selectedCourseId) {
      setAdminStatus("Select both a cohort and a course first.");
      return;
    }
    setAdminStatus("Assigning course to cohort...");
    try {
      await apiRequest(`/admin/cohorts/${selectedCohortId}/courses`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ courseId: selectedCourseId })
      });
      setWorkspaceKey((value) => value + 1);
      setAdminStatus("Course assigned to cohort.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to assign course");
    }
  }

  async function assignTrainerToCourse() {
    if (!selectedCourseId || !selectedTrainerId) {
      setAdminStatus("Select both a course and a trainer first.");
      return;
    }
    setAdminStatus("Assigning trainer to course...");
    try {
      await apiRequest(`/admin/courses/${selectedCourseId}/trainer`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ trainerId: selectedTrainerId })
      });
      setWorkspaceKey((value) => value + 1);
      setAdminStatus("Trainer assigned to course. The course now appears in the trainer portal.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to assign trainer");
    }
  }

  async function enrollApprovedApplication(applicationId: string) {
    if (!selectedCohortId) {
      setAdminStatus("Select a cohort before enrolling an approved applicant.");
      return;
    }
    setAdminStatus("Enrolling approved applicant...");
    try {
      await apiRequest(`/admin/cohorts/${selectedCohortId}/enrollments`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ applicationId })
      });
      setApplicationsKey((value) => value + 1);
      setWorkspaceKey((value) => value + 1);
      setAdminStatus("Applicant enrolled and converted to student.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to enroll applicant");
    }
  }

  return (
    <main className="dashboard admin-dashboard">
      <DashboardHeader eyebrow="Admin operations" title="Academy command center" />
      {overview.data && (
        <section className="metric-grid four">
          <Metric label="Students" value={overview.data.studentTotal ?? 0} />
          <Metric label="Courses" value={overview.data.courseTotal ?? 0} />
          <Metric label="Integrity flags" value={overview.data.integrityFlags ?? 0} />
          <Metric label="Average exam score" value={overview.data.averageExamScore === null ? "N/A" : `${overview.data.averageExamScore ?? 0}%`} />
        </section>
      )}
      <section className="admin-tabs" aria-label="Admin workspaces">
        {[
          ["overview", "Overview"],
          ["applications", "Applications"],
          ["cohorts", "Cohorts"],
          ["courses", "Courses"],
          ["reports", "Reports"]
        ].map(([id, label]) => (
          <button
            className={adminSection === id ? "active" : ""}
            key={id}
            type="button"
            onClick={() => setAdminSection(id as AdminSection)}
          >
            {label}
          </button>
        ))}
      </section>

      {adminStatus && <Notice tone="warning" title="Admin action" text={adminStatus} />}

      {adminSection === "overview" && (
        <section className="admin-page-grid">
          <DataCard title="Workflow map">
            <Row title="1. Review applicants" meta="Open CVs, shortlist, approve, reject, and track interviews." badge="Applications" />
            <Row title="2. Prepare academy structure" meta="Create cohorts and courses, assign trainers, then attach courses to cohorts." badge="Cohorts" />
            <Row title="3. Enroll approved applicants" meta="Select a cohort, then enroll an approved applicant to convert them into a student." badge="Dependency" />
            <Row title="4. Trainers build learning" meta="Assigned trainers create modules, materials, assignments, exams, questions, and live sessions." badge="Trainer" />
          </DataCard>
          <DataCard title="Current setup">
            <Row title="Applications" meta="Total applications currently visible to admin." badge={applications.data?.total ?? 0} />
            <Row title="Cohorts" meta="Cohorts available for enrollment and course assignment." badge={cohorts.data?.total ?? 0} />
            <Row title="Courses" meta="Courses available to assign to trainers and cohorts." badge={courses.data?.total ?? 0} />
            <Row title="Trainers" meta="Internal trainer accounts available for course ownership." badge={trainers.data?.total ?? 0} />
          </DataCard>
        </section>
      )}

      {adminSection === "applications" && (
        <section className="admin-page-grid">
          <DataCard title="Application review queue">
            <div className="section-intro">
              <p>Approve or reject applicants here. To enroll an approved applicant, select a target cohort below first.</p>
            </div>
            <div className="selector-stack">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select value={selectedCohortId} onChange={(event) => setSelectedCohortId(event.target.value)}>
                <option value="">Target cohort for enrollment</option>
                {cohorts.data?.items.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>{cohort.name} ({cohort.status})</option>
                ))}
              </select>
            </div>
            {applications.loading && <Skeleton text="Loading applications..." />}
            {applications.error && <Notice tone="warning" title="Applications unavailable" text={applications.error} />}
            {applications.data?.items.length === 0 && <p>No applications match this filter.</p>}
            {applications.data?.items.map((application) => (
              <article className="admin-record" key={application.id}>
                <Row
                  title={`${application.applicant.firstName} ${application.applicant.lastName}`}
                  meta={application.applicant.email}
                  badge={`${application.status} / ${application.interviewStatus}`}
                />
                <div className="action-row">
                  <button type="button" onClick={() => openCv(application.id)}>Open CV</button>
                  <button type="button" onClick={() => updateApplicationStatus(application, "shortlisted")}>Shortlist</button>
                  <button type="button" onClick={() => updateApplicationStatus(application, "approved")}>Approve</button>
                  <button type="button" onClick={() => updateApplicationStatus(application, "rejected")}>Reject</button>
                  <button disabled={!selectedCohortId || application.status !== "approved"} type="button" onClick={() => enrollApprovedApplication(application.id)}>Enroll</button>
                  <select
                    value={application.interviewStatus}
                    onChange={(event) => updateInterviewStatus(application.id, event.target.value)}
                    aria-label="Interview status"
                  >
                    <option value="not_scheduled">Not scheduled</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </article>
            ))}
          </DataCard>
        </section>
      )}

      {adminSection === "cohorts" && (
        <section className="admin-page-grid">
          <DataCard title="Create and connect cohorts">
            <div className="section-intro">
              <p>Courses become visible to students only after they are assigned to a cohort that the student is enrolled in.</p>
            </div>
            <div className="selector-stack">
              <select value={selectedCohortId} onChange={(event) => setSelectedCohortId(event.target.value)}>
                <option value="">Select cohort</option>
                {cohorts.data?.items.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>{cohort.name} ({cohort.status})</option>
                ))}
              </select>
              <select value={selectedCourseId} onChange={(event) => {
                setSelectedCourseId(event.target.value);
                setSelectedTrainerId("");
              }}>
                <option value="">Select course</option>
                {courses.data?.items.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
              <button disabled={!selectedCohortId || !selectedCourseId} className="secondary-action wide" type="button" onClick={assignCourseToCohort}>Assign selected course to selected cohort</button>
            </div>
          </DataCard>
          <DataCard title="New cohort">
            <form className="mini-form no-divider" onSubmit={createCohort}>
              <input name="name" placeholder="Cohort name" required />
              <div className="two-column">
                <input name="startDate" type="date" required />
                <input name="endDate" type="date" required />
              </div>
              <select name="status" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <button className="primary-action wide" type="submit">Create cohort</button>
            </form>
          </DataCard>
        </section>
      )}

      {adminSection === "courses" && (
        <section className="admin-page-grid">
          <DataCard title="Assign trainer ownership">
            <div className="section-intro">
              <p>Admins create courses and assign a trainer. Trainers then build modules, materials, assignments, exams, questions, and live sessions from their own portal.</p>
            </div>
            <div className="selector-stack">
              <select value={selectedCourseId} onChange={(event) => {
                setSelectedCourseId(event.target.value);
              }}>
                <option value="">Select course</option>
                {courses.data?.items.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}{course.trainer ? ` · ${course.trainer.firstName} ${course.trainer.lastName}` : " · unassigned"}</option>
                ))}
              </select>
              <select value={selectedTrainerId} onChange={(event) => setSelectedTrainerId(event.target.value)}>
                <option value="">Select trainer</option>
                {trainers.data?.items.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>{trainer.firstName} {trainer.lastName} ({trainer.email})</option>
                ))}
              </select>
              <button disabled={!selectedCourseId || !selectedTrainerId} className="primary-action wide" type="button" onClick={assignTrainerToCourse}>Assign trainer to selected course</button>
            </div>
          </DataCard>
          <DataCard title="Course ownership">
            {courses.data?.items.length === 0 && <p>No courses have been created yet.</p>}
            {courses.data?.items.map((course) => (
              <Row
                key={course.id}
                title={course.title}
                meta={`${course.durationWeeks} week(s) · ${course.description}`}
                badge={course.trainer ? `${course.trainer.firstName} ${course.trainer.lastName}` : "Unassigned"}
              />
            ))}
          </DataCard>
          <DataCard title="New course">
            <form className="mini-form no-divider" onSubmit={createCourse}>
              <input name="title" placeholder="Course title" required />
              <textarea name="description" placeholder="Course description, at least 10 characters" rows={4} required />
              <input name="durationWeeks" type="number" min="1" placeholder="Duration weeks" required />
              <button className="primary-action wide" type="submit">Create course</button>
            </form>
          </DataCard>
        </section>
      )}

      {adminSection === "reports" && (
        <section className="admin-page-grid">
          <ReportsCard session={session} />
          <DataCard title="Report dependencies">
            <Row title="Applications CSV" meta="Available as soon as applicants submit forms." badge="Ready" />
            <Row title="Cohort performance CSV" meta="Needs enrolled students, assigned courses, assignments, exams, and attendance." badge="Data-driven" />
          </DataCard>
        </section>
      )}
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

function TrainerPage({ session }: { session: AuthSession | null }) {
  const [trainerKey, setTrainerKey] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [trainerStatus, setTrainerStatus] = useState<string | null>(null);
  const courses = useAuthedData<ListResponse<CourseItem>>(session, "/trainer/courses", trainerKey);
  const modules = useAuthedData<ListResponse<ModuleItem>>(
    session && selectedCourseId ? session : null,
    selectedCourseId ? `/trainer/courses/${selectedCourseId}/modules` : "/trainer/courses/no-course/modules",
    trainerKey
  );
  const assignments = useAuthedData<ListResponse<AssignmentItem>>(
    session && selectedModuleId ? session : null,
    selectedModuleId ? `/trainer/assignments/modules/${selectedModuleId}` : "/trainer/assignments/modules/no-module",
    trainerKey
  );
  const exams = useAuthedData<ListResponse<ExamItem>>(
    session && selectedCourseId ? session : null,
    selectedCourseId ? `/trainer/exams/courses/${selectedCourseId}` : "/trainer/exams/courses/no-course",
    trainerKey
  );
  const questions = useAuthedData<ListResponse<ExamQuestionItem>>(
    session && selectedExamId ? session : null,
    selectedExamId ? `/trainer/exams/${selectedExamId}/questions` : "/trainer/exams/no-exam/questions",
    trainerKey
  );
  const sessions = useAuthedData<ListResponse<LiveSessionItem>>(
    session && selectedCourseId ? session : null,
    selectedCourseId ? `/trainer/live-sessions/courses/${selectedCourseId}` : "/trainer/live-sessions/courses/no-course",
    trainerKey
  );

  if (!session) {
    return null;
  }
  const accessToken = session.accessToken;

  async function createTrainerModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) {
      setTrainerStatus("Select one of your assigned courses first.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setTrainerStatus("Creating module...");
    try {
      await apiRequest(`/trainer/courses/${selectedCourseId}/modules`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          title: String(form.get("title")),
          description: String(form.get("description")),
          orderIndex: Number(form.get("orderIndex"))
        })
      });
      formElement.reset();
      setTrainerKey((value) => value + 1);
      setTrainerStatus("Module created.");
    } catch (error) {
      setTrainerStatus(error instanceof Error ? error.message : "Unable to create module");
    }
  }

  async function uploadMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedModuleId) {
      setTrainerStatus("Select a module before uploading material.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setTrainerStatus("Uploading learning material...");
    try {
      await apiRequest(`/trainer/courses/modules/${selectedModuleId}/materials`, {
        method: "POST",
        token: accessToken,
        body: form
      });
      formElement.reset();
      setTrainerKey((value) => value + 1);
      setTrainerStatus("Learning material uploaded.");
    } catch (error) {
      setTrainerStatus(error instanceof Error ? error.message : "Unable to upload material");
    }
  }

  async function uploadCourseDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) {
      setTrainerStatus("Select a course before uploading the master presentation.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const moduleLines = String(form.get("moduleLines") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const modules = moduleLines.map((line) => {
      const [namePart, slidePart] = line.split("|").map((part) => part.trim());
      return {
        name: namePart,
        startSlide: Number(slidePart)
      };
    });

    if (modules.length === 0 || modules.some((module) => !module.name || !Number.isInteger(module.startSlide))) {
      setTrainerStatus("Use one module per line, for example: Banking foundations | 1");
      return;
    }

    form.delete("moduleLines");
    form.set("modulesJson", JSON.stringify(modules));
    setTrainerStatus("Uploading protected course presentation...");
    try {
      await apiRequest(`/trainer/courses/${selectedCourseId}/deck`, {
        method: "POST",
        token: accessToken,
        body: form
      });
      formElement.reset();
      setTrainerKey((value) => value + 1);
      setTrainerStatus("Course presentation uploaded. Modules were created or updated from the slide markers.");
    } catch (error) {
      setTrainerStatus(error instanceof Error ? error.message : "Unable to upload course presentation");
    }
  }


  async function createTrainerAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedModuleId) {
      setTrainerStatus("Select a module before creating an assignment.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setTrainerStatus("Creating assignment...");
    try {
      await apiRequest(`/trainer/assignments/modules/${selectedModuleId}`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          title: String(form.get("title")),
          description: String(form.get("description")),
          dueDate: String(form.get("dueDate")),
          totalMarks: Number(form.get("totalMarks"))
        })
      });
      formElement.reset();
      setTrainerKey((value) => value + 1);
      setTrainerStatus("Assignment created and students notified.");
    } catch (error) {
      setTrainerStatus(error instanceof Error ? error.message : "Unable to create assignment");
    }
  }

  async function createTrainerExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) {
      setTrainerStatus("Select a course before creating an exam.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setTrainerStatus("Creating exam...");
    try {
      await apiRequest(`/trainer/exams/courses/${selectedCourseId}`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          title: String(form.get("title")),
          examType: String(form.get("examType")),
          description: String(form.get("description")),
          startTime: String(form.get("startTime")),
          endTime: String(form.get("endTime")),
          totalMarks: Number(form.get("totalMarks")),
          proctoringEnabled: form.get("proctoringEnabled") === "true"
        })
      });
      formElement.reset();
      setTrainerKey((value) => value + 1);
      setTrainerStatus("Exam created and students notified.");
    } catch (error) {
      setTrainerStatus(error instanceof Error ? error.message : "Unable to create exam");
    }
  }

  async function createExamQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExamId) {
      setTrainerStatus("Select an exam before adding a question.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const options = String(form.get("options") ?? "")
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);
    setTrainerStatus("Adding question...");
    try {
      await apiRequest(`/trainer/exams/${selectedExamId}/questions`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          questionType: String(form.get("questionType")),
          prompt: String(form.get("prompt")),
          options: options.length > 0 ? options : undefined,
          correctAnswer: String(form.get("correctAnswer") ?? ""),
          points: Number(form.get("points")),
          orderIndex: Number(form.get("orderIndex"))
        })
      });
      formElement.reset();
      setTrainerKey((value) => value + 1);
      setTrainerStatus("Question added.");
    } catch (error) {
      setTrainerStatus(error instanceof Error ? error.message : "Unable to add question");
    }
  }

  async function createTrainerLiveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) {
      setTrainerStatus("Select a course before scheduling a live session.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setTrainerStatus("Scheduling live session...");
    try {
      await apiRequest(`/trainer/live-sessions/courses/${selectedCourseId}`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          title: String(form.get("title")),
          description: String(form.get("description")),
          meetingLink: String(form.get("meetingLink")),
          scheduledAt: String(form.get("scheduledAt")),
          durationMinutes: Number(form.get("durationMinutes"))
        })
      });
      formElement.reset();
      setTrainerKey((value) => value + 1);
      setTrainerStatus("Live session scheduled and students notified.");
    } catch (error) {
      setTrainerStatus(error instanceof Error ? error.message : "Unable to schedule session");
    }
  }

  return (
    <main className="dashboard admin-dashboard">
      <DashboardHeader eyebrow="Trainer studio" title="Build the learning experience" />
      {trainerStatus && <Notice tone="warning" title="Trainer action" text={trainerStatus} />}
      <section className="metric-grid four">
        <Metric label="Assigned courses" value={courses.data?.total ?? 0} />
        <Metric label="Modules" value={modules.data?.total ?? 0} />
        <Metric label="Assignments" value={assignments.data?.total ?? 0} />
        <Metric label="Exams" value={exams.data?.total ?? 0} />
      </section>
      <section className="admin-page-grid">
        <DataCard title="Assigned courses">
          {courses.loading && <Skeleton text="Loading your courses..." />}
          {courses.error && <Notice tone="warning" title="Courses unavailable" text={courses.error} />}
          {courses.data?.items.length === 0 && <p>No course has been assigned to you yet. Ask an admin to assign one from Admin → Courses.</p>}
          <div className="selector-stack">
            <select value={selectedCourseId} onChange={(event) => {
              setSelectedCourseId(event.target.value);
              setSelectedModuleId("");
              setSelectedExamId("");
            }}>
              <option value="">Select assigned course</option>
              {courses.data?.items.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <select value={selectedModuleId} onChange={(event) => setSelectedModuleId(event.target.value)}>
              <option value="">Select module</option>
              {modules.data?.items.map((module) => (
                <option key={module.id} value={module.id}>{module.orderIndex}. {module.title}</option>
              ))}
            </select>
            <select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
              <option value="">Select exam</option>
              {exams.data?.items.map((exam) => (
                <option key={exam.id} value={exam.id}>{exam.title}</option>
              ))}
            </select>
          </div>
        </DataCard>
        <DataCard title="Create module">
          <form className="mini-form no-divider" onSubmit={createTrainerModule}>
            <input name="title" placeholder="Module title" required />
            <textarea name="description" placeholder="Module description, at least 10 characters" rows={4} required />
            <input name="orderIndex" type="number" min="1" placeholder="Order index" required />
            <button disabled={!selectedCourseId} className="primary-action wide" type="submit">Create module</button>
          </form>
        </DataCard>
        <DataCard title="Full course presentation">
          <div className="section-intro">
            <p>Upload one master PPT/PPTX/PDF and define where each module starts. Students view it inside the portal; raw storage links are not exposed.</p>
          </div>
          <form className="mini-form no-divider" onSubmit={uploadCourseDeck}>
            <input name="title" placeholder="Presentation title" />
            <input name="file" type="file" accept=".ppt,.pptx,.pdf" required />
            <textarea
              name="moduleLines"
              placeholder={"Banking foundations | 1\nRisk and compliance | 12\nCase practice | 24"}
              rows={5}
              required
            />
            <button disabled={!selectedCourseId} className="primary-action wide" type="submit">Upload protected course deck</button>
          </form>
        </DataCard>
        <DataCard title="Upload learning material">
          <form className="mini-form no-divider" onSubmit={uploadMaterial}>
            <input name="title" placeholder="Material title" required />
            <select name="type" defaultValue="pdf">
              <option value="pdf">PDF</option>
              <option value="ppt">PPT</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
            </select>
            <input name="file" type="file" required />
            <button disabled={!selectedModuleId} className="primary-action wide" type="submit">Upload material</button>
          </form>
        </DataCard>
        <DataCard title="Create assignment">
          <form className="mini-form no-divider" onSubmit={createTrainerAssignment}>
            <input name="title" placeholder="Assignment title" required />
            <textarea name="description" placeholder="Assignment description, at least 10 characters" rows={4} required />
            <input name="dueDate" type="datetime-local" required />
            <input name="totalMarks" type="number" min="1" placeholder="Total marks" required />
            <button disabled={!selectedModuleId} className="primary-action wide" type="submit">Create assignment</button>
          </form>
        </DataCard>
        <DataCard title="Create exam">
          <form className="mini-form no-divider" onSubmit={createTrainerExam}>
            <input name="title" placeholder="Exam title" required />
            <select name="examType" defaultValue="quiz">
              <option value="entry">Entry</option>
              <option value="quiz">Quiz</option>
              <option value="mid_program">Mid-program</option>
              <option value="final">Final</option>
              <option value="project">Project</option>
            </select>
            <textarea name="description" placeholder="Exam description, at least 10 characters" rows={4} required />
            <div className="two-column">
              <input name="startTime" type="datetime-local" required />
              <input name="endTime" type="datetime-local" required />
            </div>
            <input name="totalMarks" type="number" min="1" placeholder="Total marks" required />
            <select name="proctoringEnabled" defaultValue="true">
              <option value="true">Proctoring enabled</option>
              <option value="false">Proctoring disabled</option>
            </select>
            <button disabled={!selectedCourseId} className="primary-action wide" type="submit">Create exam</button>
          </form>
        </DataCard>
        <DataCard title="Add question to exam">
          <form className="mini-form no-divider" onSubmit={createExamQuestion}>
            <select name="questionType" defaultValue="multiple_choice">
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True / false</option>
              <option value="short_answer">Short answer</option>
              <option value="essay">Essay</option>
            </select>
            <textarea name="prompt" placeholder="Question prompt, at least 10 characters" rows={4} required />
            <textarea name="options" placeholder="Options, one per line for multiple choice or true/false" rows={3} />
            <input name="correctAnswer" placeholder="Correct answer for objective questions" />
            <div className="two-column">
              <input name="points" type="number" min="1" placeholder="Points" required />
              <input name="orderIndex" type="number" min="1" placeholder="Order" required />
            </div>
            <button disabled={!selectedExamId} className="primary-action wide" type="submit">Add question</button>
          </form>
          {questions.data?.items.map((question) => (
            <Row key={question.id} title={question.prompt} meta={question.questionType} badge={`${question.points} pts`} />
          ))}
        </DataCard>
        <DataCard title="Schedule live session">
          <form className="mini-form no-divider" onSubmit={createTrainerLiveSession}>
            <input name="title" placeholder="Session title" required />
            <textarea name="description" placeholder="Session description, at least 10 characters" rows={4} required />
            <input name="meetingLink" placeholder="https://teams.microsoft.com/..." required />
            <input name="scheduledAt" type="datetime-local" required />
            <input name="durationMinutes" type="number" min="1" placeholder="Duration minutes" required />
            <button disabled={!selectedCourseId} className="primary-action wide" type="submit">Schedule session</button>
          </form>
          {sessions.data?.items.map((session) => (
            <Row key={session.id} title={session.title} meta={session.meetingLink} badge={formatDate(session.scheduledAt)} />
          ))}
        </DataCard>
      </section>
    </main>
  );
}

function ReportsCard({ session }: { session: AuthSession }) {
  const [status, setStatus] = useState<string | null>(null);

  async function previewApplicationsCsv() {
    setStatus("Downloading application CSV...");
    try {
      const csv = await downloadText("/admin/reports/applications.csv", session.accessToken);
      downloadCsv("bk-academy-applications.csv", csv);
      setStatus("Application CSV downloaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to fetch report");
    }
  }

  return (
    <DataCard title="Reports and exports">
      <Row title="Applications report" meta="Applicant identity, status, interview status, CV reference" badge="JSON/CSV" />
      <Row title="Cohort performance" meta="Assignments, exams, integrity, attendance" badge="JSON/CSV" />
      <button className="secondary-action wide" type="button" onClick={previewApplicationsCsv}>
        Download applications CSV
      </button>
      {status && <p className="form-status">{status}</p>}
    </DataCard>
  );
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function useAuthedData<T>(session: AuthSession | null, path: string, refreshKey = 0) {
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
  }, [path, refreshKey, session]);

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

function Row({ title, meta, badge }: { title: string; meta: string; badge?: string | number }) {
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
  if (role === "trainer") {
    return "trainer";
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
