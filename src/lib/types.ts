/** Respuesta paginada del backend (coincide con PaginatedResult del API). */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Payload del usuario que devuelve el login / se decodifica del token. */
export interface SessionUser {
  userId: string;
  email: string;
  organizationId: string | null;
  permissions: string[];
  condominiumIds: string[];
}

// ─── Entidades de estructura (subconjunto usado por el panel) ────────────────

export interface Organization {
  _id: string;
  name: string;
  legalName?: string;
  email?: string;
  status?: string;
}

export interface Condominium {
  _id: string;
  name: string;
  code: string;
  status?: string;
}

export interface Building {
  _id: string;
  condominiumId: string;
  name: string;
  code: string;
  floors?: number;
  status?: string;
}

export interface Apartment {
  _id: string;
  buildingId: string;
  code: string;
  floor?: number;
  area?: number;
  participationCoefficient?: number;
  status?: string;
}

export interface Person {
  _id: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status?: string;
}

// ─── Dashboard (agregados del backend) ───────────────────────────────────────

export interface DashboardSummary {
  period: { id: string; year: number; month: number; status: string } | null;
  kpis: {
    charged: number;
    collected: number;
    pending: number;
    delinquencyRate: number;
    apartments: number;
  };
  chargesByStatus: { status: string; count: number; amount: number }[];
  maintenanceByStatus: { status: string; count: number }[];
  upcomingReservations: {
    id: string;
    commonAreaId: string;
    startAt: string;
    endAt: string;
    status: string;
  }[];
  recentAnnouncements: {
    id: string;
    title: string;
    status: string;
    publishedAt: string | null;
  }[];
  expensesByCategory: { category: string; amount: number }[];
  incomeVsExpenses: { year: number; month: number; income: number; expenses: number }[];
  waterConsumption: {
    apartmentId: string;
    previousReading: number;
    currentReading: number;
    consumption: number;
  }[];
  assets: {
    id: string;
    name: string;
    type: string;
    status: string;
    nextMaintenanceAt: string | null;
  }[];
}

// ─── Dominios de negocio (Fase 2) ────────────────────────────────────────────

export interface MaintenanceTicket {
  _id: string;
  condominiumId: string;
  apartmentId?: string | null;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string | null;
  resolvedAt?: string | null;
  createdAt?: string;
}

export interface FeeConcept {
  _id: string;
  condominiumId: string;
  name: string;
  description?: string;
  allocationMethod: string;
  amount: number;
  isActive: boolean;
}

export interface BillingPeriod {
  _id: string;
  condominiumId: string;
  year: number;
  month: number;
  dueDate: string;
  status: string;
  closedAt?: string | null;
}

export interface Charge {
  _id: string;
  periodId: string;
  apartmentId: string;
  conceptSnapshot: { name: string; allocationMethod: string; baseAmount: number };
  amount: number;
  paidAmount: number;
  status: string;
}

export interface CommonArea {
  _id: string;
  condominiumId: string;
  name: string;
  capacity: number;
  reservationFee: number;
  maxDurationMinutes: number;
  isActive: boolean;
}

export interface Reservation {
  _id: string;
  commonAreaId: string;
  apartmentId: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string;
}

export interface Announcement {
  _id: string;
  condominiumId: string;
  title: string;
  body: string;
  audienceType: string;
  status: string;
  publishedAt?: string | null;
}
