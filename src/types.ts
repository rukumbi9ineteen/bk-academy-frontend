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
  cohorts: {
    total: number;
    items: Array<{ id: string; name: string; status: string; startDate: string; endDate: string }>;
  };
  courses: {
    total: number;
    items: Array<{
      id: string;
      title: string;
      description: string;
      durationWeeks: number;
      modules: number;
      assignments: number;
      exams: number;
    }>;
  };
  progress: {
    assignments: {
      total: number;
      submitted: number;
      graded: number;
      pending: number;
      completionRate: number;
      averageScore: number | null;
    };
    exams: {
      total: number;
      attempted: number;
      completed: number;
      reviewed: number;
      pending: number;
      completionRate: number;
      averageScore: number | null;
    };
    overallCompletionRate: number;
  };
  nextActions: Array<{ type: string; title: string; dueAt?: string }>;
  recentGrades: Array<{ title: string; score: number; total: number; type: string }>;
}

export interface ApiErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}
