export type UserRole = "applicant" | "student" | "trainer" | "admin" | "executive";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  tokenType: "Bearer";
  user: AuthUser;
}

export interface ApplicationListItem {
  id: string;
  status: string;
  interviewStatus: string;
  createdAt: string;
  updatedAt: string;
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AnalyticsOverview {
  applications?: Record<string, number>;
  cohorts?: Record<string, number>;
  studentTotal?: number;
  courseTotal?: number;
  assignmentGrading?: Record<string, number>;
  examAttempts?: Record<string, number>;
  averageExamScore?: number | null;
  integrityFlags?: number;
}

export interface StudentDashboard {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  cohorts: Array<{ id: string; name: string; status: string }>;
  courses: Array<{ id: string; title: string; progress?: number }>;
  assignments: {
    total: number;
    submitted: number;
    graded: number;
    pending: number;
  };
  exams: {
    total: number;
    attempted: number;
    completed: number;
    averageScore: number | null;
  };
  nextActions: Array<{ type: string; title: string; dueAt?: string }>;
  recentGrades: Array<{ title: string; score: number; total: number; type: string }>;
}

export interface ApiErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}
