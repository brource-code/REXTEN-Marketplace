import { apiClient } from './auth';

export interface DashboardPeriodMetric {
  value: number;
  growShrink: number;
}

export interface BusinessStats {
  totalBookings: number;
  totalRevenue: number;
  revenueInWork: number;
  overdueBookings?: { count: number; revenue: number };
  activeClients: number;
  upcomingBookings: number;
  activeAdvertisements: number;
  revenue?: {
    thisWeek: DashboardPeriodMetric;
    thisMonth: DashboardPeriodMetric;
    thisYear: DashboardPeriodMetric;
  };
  bookings?: {
    thisWeek: DashboardPeriodMetric;
    thisMonth: DashboardPeriodMetric;
    thisYear: DashboardPeriodMetric;
  };
  clients?: {
    thisWeek: DashboardPeriodMetric;
    thisMonth: DashboardPeriodMetric;
    thisYear: DashboardPeriodMetric;
  };
}

function parseMetric(raw: unknown): DashboardPeriodMetric {
  if (raw != null && typeof raw === 'object' && 'value' in raw) {
    const o = raw as { value?: unknown; growShrink?: unknown };
    return {
      value: Number(o.value) || 0,
      growShrink: Number(o.growShrink) || 0,
    };
  }
  return { value: 0, growShrink: 0 };
}

export interface BusinessCompanyItem {
  id: number;
  name: string;
  slug: string;
  is_owner: boolean;
}

export interface BusinessProfile {
  id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  city?: string;
  state?: string;
  timezone?: string;
  slug?: string;
  is_owner?: boolean;
  permissions?: string[];
  onboarding_completed?: boolean;
}

export async function getBusinessCompanies(): Promise<BusinessCompanyItem[]> {
  const res = await apiClient.get<{ companies?: BusinessCompanyItem[]; data?: { companies?: BusinessCompanyItem[] } }>(
    '/business/companies'
  );
  const d = res.data;
  return d.companies || d.data?.companies || [];
}

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const res = await apiClient.get<{ data?: BusinessProfile }>('/business/settings/profile');
  return (res.data.data || res.data) as BusinessProfile;
}

export async function getBusinessStats(): Promise<BusinessStats> {
  try {
    const res = await apiClient.get('/business/dashboard/stats');
    let data: any = res.data;
    if (data?.data) data = data.data;
    const z = (): DashboardPeriodMetric => ({ value: 0, growShrink: 0 });
    return {
      totalBookings: data.totalBookings ?? 0,
      totalRevenue: data.totalRevenue ?? 0,
      revenueInWork: data.revenueInWork ?? 0,
      overdueBookings: data.overdueBookings ?? { count: 0, revenue: 0 },
      activeClients: data.activeClients ?? 0,
      upcomingBookings: data.upcomingBookings ?? 0,
      activeAdvertisements: data.activeAdvertisements ?? 0,
      revenue: {
        thisWeek: parseMetric(data.revenue?.thisWeek),
        thisMonth: parseMetric(data.revenue?.thisMonth),
        thisYear: parseMetric(data.revenue?.thisYear),
      },
      bookings: {
        thisWeek: parseMetric(data.bookings?.thisWeek),
        thisMonth: parseMetric(data.bookings?.thisMonth),
        thisYear: parseMetric(data.bookings?.thisYear),
      },
      clients: {
        thisWeek: parseMetric(data.clients?.thisWeek),
        thisMonth: parseMetric(data.clients?.thisMonth),
        thisYear: parseMetric(data.clients?.thisYear),
      },
    };
  } catch {
    const z = (): DashboardPeriodMetric => ({ value: 0, growShrink: 0 });
    return {
      totalBookings: 0,
      totalRevenue: 0,
      revenueInWork: 0,
      overdueBookings: { count: 0, revenue: 0 },
      activeClients: 0,
      upcomingBookings: 0,
      activeAdvertisements: 0,
      revenue: { thisWeek: z(), thisMonth: z(), thisYear: z() },
      bookings: { thisWeek: z(), thisMonth: z(), thisYear: z() },
      clients: { thisWeek: z(), thisMonth: z(), thisYear: z() },
    };
  }
}

export interface ChartData {
  series: Array<{ name: string; data: number[] }>;
  date: string[];
  categories?: string[];
}

export async function getChartData(
  category: 'revenue' | 'bookings' | 'clients',
  period: 'thisWeek' | 'thisMonth' | 'thisYear'
): Promise<ChartData> {
  try {
    const res = await apiClient.get('/business/dashboard/chart', {
      params: { category, period },
    });
    let data: any = res.data;
    if (data?.data) data = data.data;
    if (!data || typeof data !== 'object') {
      return { series: [{ name: category, data: [] }], date: [] };
    }
    const series = Array.isArray(data.series) ? data.series : [];
    const axis = data.date || data.categories || [];
    return {
      series: series.length ? series : [{ name: category, data: [] }],
      date: Array.isArray(axis) ? axis : [],
      categories: Array.isArray(axis) ? axis : [],
    };
  } catch {
    return { series: [{ name: category, data: [] }], date: [] };
  }
}

export interface RecentBooking {
  id: string;
  date: string;
  time: string;
  customer: string;
  service: string;
  amount: number;
  status: 'new' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
  execution_type?: string;
}

export async function getRecentBookings(limit = 5): Promise<RecentBooking[]> {
  try {
    const res = await apiClient.get('/business/dashboard/recent-bookings', {
      params: { limit },
    });
    const d = res.data?.data ?? res.data;
    if (!Array.isArray(d)) return [];
    return d.map((row: any) => ({
      id: String(row.id ?? ''),
      date: row.date ?? '',
      time: row.time ?? '00:00:00',
      customer: row.customer ?? '',
      service: row.service ?? '',
      amount: Number(row.amount) || 0,
      status: (row.status ?? 'new') as RecentBooking['status'],
      execution_type: row.execution_type,
    }));
  } catch {
    return [];
  }
}

// ========== Bookings (бизнес) ==========
export interface BusinessBooking {
  id: number;
  service: { id: number; name: string };
  client: {
    id: number | null;
    name: string;
    email: string | null;
    phone: string | null;
  };
  specialist: { id: number; name: string } | null;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  price: number;
  /** Итог с учётом доп. услуг и скидок (как в GET /business/bookings/:id) */
  total_price?: number;
  discount_amount?: number;
  discount_source?: string | null;
  discount_tier_name?: string | null;
  promo_code?: string | null;
  review_token?: string | null;
  advertisement_id?: number | null;
  additional_services?: Array<{
    id?: number;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
  status: string;
  notes: string | null;
  client_notes: string | null;
  created_at: string;
}

export async function getBusinessBookings(params?: {
  status?: string;
  date_from?: string;
  date_to?: string;
  service_id?: number;
}): Promise<BusinessBooking[]> {
  const res = await apiClient.get('/business/bookings', { params });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export async function getBusinessBooking(id: number): Promise<BusinessBooking> {
  const res = await apiClient.get(`/business/bookings/${id}`);
  return (res.data?.data ?? res.data) as BusinessBooking;
}

export async function updateBusinessBooking(
  id: number,
  data: Partial<{
    status: string;
    notes: string | null;
    client_notes: string | null;
  }>
): Promise<BusinessBooking> {
  const res = await apiClient.put(`/business/bookings/${id}`, data);
  return (res.data?.data ?? res.data) as BusinessBooking;
}

export async function deleteBusinessBooking(id: number): Promise<void> {
  await apiClient.delete(`/business/bookings/${id}`);
}

// ========== Clients (CRM) ==========
export interface BusinessClient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
  img?: string;
  totalBookings: number;
  totalSpent: number;
  lastVisit?: string;
  status: string;
}

export interface ClientNote {
  id: number;
  note: string;
  createdAt: string;
}

export interface ClientSummary {
  firstVisit: string | null;
  lastVisit: string | null;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  averageCheck: number;
  conversionRate: number;
  favoriteService: { id: number; name: string } | null;
  favoriteSpecialist: { id: number; name: string } | null;
  visitFrequency: number;
}

export interface ClientBooking {
  id: number;
  service: { id: number; name: string } | null;
  specialist: { id: number; name: string } | null;
  booking_date: string | null;
  booking_time: string | null;
  duration_minutes: number;
  price: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'new';
  notes: string | null;
  client_notes: string | null;
  execution_type: 'onsite' | 'offsite';
  created_at?: string;
  review?: {
    id: number;
    rating: number;
    comment: string | null;
  } | null;
}

export async function getBusinessClients(filters?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: BusinessClient[]; total: number }> {
  const res = await apiClient.get('/business/clients', { params: filters });
  const list = res.data?.data ?? res.data;
  const arr = Array.isArray(list) ? list : [];
  return {
    data: arr,
    total: typeof res.data?.total === 'number' ? res.data.total : arr.length,
  };
}

export interface ClientDetailsResponse {
  client: BusinessClient;
  summary?: ClientSummary;
  bookings: ClientBooking[];
  notes: ClientNote[];
}

export async function getClientDetails(
  clientId: number,
  filters?: {
    status?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: string;
  }
): Promise<ClientDetailsResponse> {
  const res = await apiClient.get(`/business/clients/${clientId}`, { params: filters });
  const raw = res.data?.data ?? res.data;
  return {
    client: raw.client || raw,
    summary: raw.summary,
    bookings: Array.isArray(raw.bookings) ? raw.bookings : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
  };
}

export async function addClientNote(clientId: number, note: string): Promise<ClientNote> {
  const res = await apiClient.post(`/business/clients/${clientId}/notes`, { note });
  return (res.data?.data ?? res.data) as ClientNote;
}

export interface CreateClientPayload {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'regular' | 'permanent' | 'vip';
}

export async function createClient(data: CreateClientPayload): Promise<BusinessClient> {
  const res = await apiClient.post('/business/clients', data);
  return (res.data?.data ?? res.data) as BusinessClient;
}

export async function updateClient(
  clientId: number,
  data: Partial<CreateClientPayload>
): Promise<BusinessClient> {
  const res = await apiClient.put(`/business/clients/${clientId}`, data);
  return (res.data?.data ?? res.data) as BusinessClient;
}

export async function deleteClient(clientId: number): Promise<void> {
  await apiClient.delete(`/business/clients/${clientId}`);
}

export async function updateClientStatus(
  clientId: number,
  status: 'regular' | 'permanent' | 'vip'
): Promise<BusinessClient> {
  const res = await apiClient.put(`/business/clients/${clientId}/status`, { status });
  return (res.data?.data ?? res.data) as BusinessClient;
}

// ========== Schedule (слоты = бронирования в календаре) ==========
export interface ScheduleSlot {
  id: string;
  title: string;
  start: string;
  end: string;
  status?: string;
  booking_date?: string;
  booking_time?: string;
  eventColor?: string;
  user_id?: number | null;
  has_client_account?: boolean;
  review_token?: string | null;
  specialist_id?: number | null;
  specialist?: { id: number; name: string } | null;
  specialistName?: string | null;
  service_id?: number | string | null;
  service?: { id?: number | string; name?: string; service_type?: string } | null;
  client?: {
    id?: number | null;
    name?: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  client_name?: string | null;
  total_price?: string | number | null;
  price?: string | number | null;
  discount_amount?: number;
  discount_source?: string | null;
  discount_tier_name?: string | null;
  promo_code?: string | null;
  additional_services?: Array<{ id?: number; price?: number; quantity?: number; name?: string }> | null;
  duration_minutes?: number;
  notes?: string | null;
}

export async function getScheduleSlots(): Promise<ScheduleSlot[]> {
  const res = await apiClient.get('/business/schedule/slots');
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export function formatDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function filterSlotsByDay(slots: ScheduleSlot[], day: Date): ScheduleSlot[] {
  const target = formatDateYmd(day);
  return slots.filter((s) => {
    if (s.booking_date) return s.booking_date === target;
    if (s.start) return s.start.slice(0, 10) === target;
    return false;
  });
}

export interface BusinessServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number;
  status?: string;
  category?: string;
  service_type?: 'onsite' | 'offsite' | 'hybrid';
  advertisement_id?: number | null;
}

export async function getBusinessServices(): Promise<BusinessServiceItem[]> {
  const res = await apiClient.get('/business/settings/services');
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export type CreateScheduleSlotPayload = {
  booking_date: string;
  booking_time: string;
  duration_minutes?: number;
  service_id?: number | null;
  title?: string | null;
  status?: string;
  user_id?: number | null;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  notes?: string;
  price?: number | null;
  specialist_id?: number | null;
  /** ID объявления для услуги из маркетплейса (как на вебе) */
  advertisement_id?: number | null;
  additional_services?: Array<{ id: number; quantity: number; price?: number }>;
};

export async function createScheduleSlot(data: CreateScheduleSlotPayload): Promise<ScheduleSlot> {
  const res = await apiClient.post('/business/schedule/slots', data);
  return (res.data?.data ?? res.data) as ScheduleSlot;
}

export async function updateScheduleSlot(
  id: string | number,
  data: Partial<CreateScheduleSlotPayload>
): Promise<ScheduleSlot> {
  const res = await apiClient.put(`/business/schedule/slots/${id}`, data);
  return (res.data?.data ?? res.data) as ScheduleSlot;
}

export async function deleteScheduleSlot(id: string | number): Promise<void> {
  await apiClient.delete(`/business/schedule/slots/${id}`);
}

// ========== Настройки расписания ==========
export interface DayScheduleSlot {
  enabled: boolean;
  from: string;
  to: string;
}

export interface ScheduleSettings {
  monday: DayScheduleSlot;
  tuesday: DayScheduleSlot;
  wednesday: DayScheduleSlot;
  thursday: DayScheduleSlot;
  friday: DayScheduleSlot;
  saturday: DayScheduleSlot;
  sunday: DayScheduleSlot;
  breakEnabled: boolean;
  breakFrom: string;
  breakTo: string;
  blockPastSlots: boolean;
  minBookingHours: number;
  maxBookingDays: number;
  weekStartsOn?: number;
}

export async function getScheduleSettings(): Promise<ScheduleSettings> {
  const res = await apiClient.get('/business/settings/schedule');
  return (res.data?.data ?? res.data) as ScheduleSettings;
}

export async function updateScheduleSettings(data: Partial<ScheduleSettings>): Promise<ScheduleSettings> {
  const res = await apiClient.put('/business/settings/schedule', data);
  return (res.data?.data ?? res.data) as ScheduleSettings;
}

// ========== Отзывы ==========
export interface BusinessReview {
  id: number;
  userId: number | null;
  userName: string;
  userAvatar: string | null;
  rating: number;
  comment: string;
  serviceName: string | null;
  specialistName: string | null;
  response: string | null;
  responseAt: string | null;
  createdAt: string;
}

export interface BusinessAdvertisementReviewGroup {
  advertisement: {
    id: number;
    title: string;
    link: string;
    image: string | null;
  };
  reviews: BusinessReview[];
  averageRating: number;
  totalReviews: number;
}

export async function getBusinessReviews(filters?: { page?: number; pageSize?: number }): Promise<{
  groupedByAdvertisement: BusinessAdvertisementReviewGroup[];
  reviewsWithoutAd: BusinessReview[];
}> {
  const res = await apiClient.get('/business/reviews', { params: filters });
  const data = res.data?.data ?? res.data;
  return {
    groupedByAdvertisement: Array.isArray(data?.groupedByAdvertisement) ? data.groupedByAdvertisement : [],
    reviewsWithoutAd: Array.isArray(data?.reviewsWithoutAd) ? data.reviewsWithoutAd : [],
  };
}

export async function updateBusinessReviewResponse(id: number, response: string): Promise<void> {
  await apiClient.put(`/business/reviews/${id}/response`, { response });
}

// ========== Отчёты ==========
export interface ReportsFilters {
  date_from?: string;
  date_to?: string;
  specialist_id?: number;
  service_id?: number;
  status?: string | string[];
}

export interface ReportsOverview {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  activeBookings: number;
  totalRevenue: number;
  revenueInWork: number;
  averageCheck: number;
  uniqueClients: number;
  activeSpecialists: number;
}

export interface RevenueReport {
  byPeriod: Array<{ period: string; revenue: number }>;
  byService: Array<{ serviceId: number; serviceName: string; revenue: number }>;
  bySpecialist: Array<{ specialistId: number; specialistName: string; revenue: number }>;
}

export async function getReportsOverview(params?: ReportsFilters): Promise<ReportsOverview> {
  const res = await apiClient.get('/business/reports', { params });
  return (res.data?.data ?? res.data) as ReportsOverview;
}

export async function getRevenueReport(params?: ReportsFilters): Promise<RevenueReport> {
  const res = await apiClient.get('/business/reports/revenue', { params });
  return (res.data?.data ?? res.data) as RevenueReport;
}

// ========== Повторяющиеся брони ==========
export interface RecurringBookingChain {
  id: number;
  service_id: number | null;
  service?: { id: number; name: string } | null;
  client_name: string | null;
  frequency: string;
  booking_time: string;
  duration_minutes: number;
  price: number;
  start_date: string;
  end_date: string | null;
  status: string;
}

export async function getRecurringBookings(): Promise<RecurringBookingChain[]> {
  const res = await apiClient.get('/business/recurring-bookings');
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export async function deleteRecurringBooking(id: number): Promise<void> {
  await apiClient.delete(`/business/recurring-bookings/${id}`);
}

export type CreateRecurringBookingPayload = {
  service_id?: number | null;
  user_id?: number | null;
  specialist_id?: number | null;
  advertisement_id?: number | null;
  frequency: string;
  interval_days?: number | null;
  days_of_week?: number[] | null;
  day_of_month?: number | null;
  days_of_month?: number[] | null;
  booking_time: string;
  duration_minutes?: number;
  price?: number;
  start_date: string;
  end_date?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  notes?: string | null;
};

export async function createRecurringBooking(
  data: CreateRecurringBookingPayload
): Promise<RecurringBookingChain> {
  const res = await apiClient.post('/business/recurring-bookings', data);
  return (res.data?.data ?? res.data) as RecurringBookingChain;
}

export async function updateRecurringBooking(
  id: number,
  data: Partial<CreateRecurringBookingPayload>
): Promise<RecurringBookingChain> {
  const res = await apiClient.put(`/business/recurring-bookings/${id}`, data);
  return (res.data?.data ?? res.data) as RecurringBookingChain;
}

// ========== Скидки и промокоды ==========
export type LoyaltyBookingCountRule = 'completed' | 'all_non_cancelled';

export async function getBusinessDiscountSettings(): Promise<{ loyalty_booking_count_rule: LoyaltyBookingCountRule }> {
  const res = await apiClient.get('/business/discounts/settings');
  return (res.data?.data ?? res.data) as { loyalty_booking_count_rule: LoyaltyBookingCountRule };
}

export interface BusinessDiscountTier {
  id: number;
  company_id: number;
  name: string;
  min_bookings: number;
  max_bookings: number | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  sort_order: number;
  is_active: boolean;
}

export async function getBusinessDiscountTiers(): Promise<BusinessDiscountTier[]> {
  const res = await apiClient.get('/business/discount-tiers');
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export interface BusinessPromoCode {
  id: number;
  company_id: number;
  code: string;
  name: string | null;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_per_user: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export async function getBusinessPromoCodes(): Promise<BusinessPromoCode[]> {
  const res = await apiClient.get('/business/promo-codes');
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

// ========== Объявления ==========
export interface BusinessAdvertisement {
  id: number;
  title: string;
  description?: string;
  type: 'advertisement' | 'regular';
  status: string;
  is_active: boolean;
  image?: string;
  placement?: string;
  start_date?: string | null;
  end_date?: string | null;
}

export async function getBusinessAdvertisements(params?: {
  page?: number;
  pageSize?: number;
  type?: 'advertisement' | 'regular';
}): Promise<{ data: BusinessAdvertisement[]; total: number }> {
  const res = await apiClient.get('/business/settings/advertisements', { params });
  const raw = res.data;
  if (raw?.data && Array.isArray(raw.data)) {
    return {
      data: raw.data,
      total: typeof raw.total === 'number' ? raw.total : raw.data.length,
    };
  }
  if (Array.isArray(raw)) {
    return { data: raw, total: raw.length };
  }
  return { data: [], total: 0 };
}

export async function updateBusinessProfile(data: Partial<BusinessProfile>): Promise<BusinessProfile> {
  const res = await apiClient.put('/business/settings/profile', data);
  return (res.data?.data ?? res.data) as BusinessProfile;
}

// ========== Stripe ==========
export interface StripeTransaction {
  id: string;
  type: 'advertisement' | 'subscription' | 'unknown';
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: string;
  created_timestamp: number;
}

export interface StripeTransactionsResponse {
  transactions: StripeTransaction[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function getStripeTransactions(
  limit?: number,
  startingAfter?: string
): Promise<StripeTransactionsResponse> {
  const params: Record<string, string | number> = {};
  if (limit) params.limit = limit;
  if (startingAfter) params.starting_after = startingAfter;
  try {
    const res = await apiClient.get('/business/stripe/transactions', { params });
    const d = res.data as StripeTransactionsResponse;
    return {
      transactions: Array.isArray(d?.transactions) ? d.transactions : [],
      has_more: !!d?.has_more,
      next_cursor: d?.next_cursor ?? null,
    };
  } catch {
    return { transactions: [], has_more: false, next_cursor: null };
  }
}

// ========== Отчёты (доп.) ==========
export interface BookingReport {
  byStatus: Array<{ status: string; count: number }>;
  byPeriod: Array<{ period: string; count: number }>;
  topServices: Array<{ serviceId: number; serviceName: string; count: number }>;
}

export interface ClientReport {
  topByBookings: Array<{ clientId: number | null; clientName: string; bookings: number }>;
  topByRevenue: Array<{ clientId: number | null; clientName: string; revenue: number }>;
  newClients: Array<{ period: string; count: number }>;
}

export interface SpecialistReport {
  id: number;
  name: string;
  bookingsCount: number;
  revenue: number;
  cancellations: number;
  completed: number;
  active: number;
  averageCheck: number;
  clients: Array<{ id: number | null; name: string; bookings: number }>;
}

export interface SalaryReport {
  totalSalary: number;
  totalCalculations: number;
  totalSpecialists: number;
  averageSalary: number;
  bySpecialist: Array<{
    specialist_id: number;
    specialist_name: string;
    total_salary: number;
    total_bookings: number;
    total_hours: number;
  }>;
  byPeriod: Array<{
    period_start: string;
    period_end: string;
    total_salary: number;
    calculations_count: number;
  }>;
}

export async function getBookingsReport(params?: ReportsFilters): Promise<BookingReport> {
  const res = await apiClient.get('/business/reports/bookings', { params });
  return (res.data?.data ?? res.data) as BookingReport;
}

export async function getClientsReport(params?: ReportsFilters): Promise<ClientReport> {
  const res = await apiClient.get('/business/reports/clients', { params });
  return (res.data?.data ?? res.data) as ClientReport;
}

export async function getSpecialistsReport(params?: ReportsFilters): Promise<SpecialistReport[]> {
  const res = await apiClient.get('/business/reports/specialists', { params });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export async function getSalaryReport(params?: ReportsFilters): Promise<SalaryReport> {
  const res = await apiClient.get('/business/reports/salary', { params });
  return (res.data?.data ?? res.data) as SalaryReport;
}

// ========== Услуги CRUD ==========
export async function createBusinessService(
  data: Omit<BusinessServiceItem, 'id'> & { name: string; duration: number; price: number }
): Promise<BusinessServiceItem> {
  const res = await apiClient.post('/business/settings/services', {
    name: data.name,
    category: data.category ?? 'General',
    duration: data.duration,
    price: data.price,
    status: (data.status as 'active' | 'inactive') ?? 'active',
    service_type: data.service_type ?? 'onsite',
  });
  return (res.data?.data ?? res.data) as BusinessServiceItem;
}

export async function updateBusinessService(
  id: number,
  data: Partial<BusinessServiceItem>
): Promise<BusinessServiceItem> {
  const res = await apiClient.put(`/business/settings/services/${id}`, data);
  return (res.data?.data ?? res.data) as BusinessServiceItem;
}

export async function deleteBusinessService(id: number): Promise<void> {
  await apiClient.delete(`/business/settings/services/${id}`);
}

// ========== Команда (team) ==========
export interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive';
  img?: string;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await apiClient.get('/business/settings/team');
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export async function createTeamMember(data: Omit<TeamMember, 'id'>): Promise<TeamMember> {
  const res = await apiClient.post('/business/settings/team', data);
  return (res.data?.data ?? res.data) as TeamMember;
}

export async function updateTeamMember(id: number, data: Partial<TeamMember>): Promise<TeamMember> {
  const res = await apiClient.put(`/business/settings/team/${id}`, data);
  return (res.data?.data ?? res.data) as TeamMember;
}

export async function deleteTeamMember(id: number): Promise<void> {
  await apiClient.delete(`/business/settings/team/${id}`);
}

// ========== Пользователи компании ==========
export interface CompanyUserMember {
  id: string | number;
  user_id: number;
  email: string;
  name: string;
  role: { id: number; name: string; slug: string; is_system: boolean } | null;
  is_owner: boolean;
  is_active: boolean;
}

export async function getCompanyUsers(): Promise<{ members: CompanyUserMember[] }> {
  const res = await apiClient.get('/business/users');
  return { members: res.data?.members ?? [] };
}

export async function inviteCompanyUser(data: {
  email: string;
  role_id: number;
}): Promise<{ member: CompanyUserMember; temporary_password?: string }> {
  const res = await apiClient.post('/business/users/invite', data);
  return res.data;
}

export async function updateCompanyUserRole(id: number, roleId: number): Promise<void> {
  await apiClient.put(`/business/users/${id}/role`, { role_id: roleId });
}

export async function removeCompanyUser(id: number): Promise<void> {
  await apiClient.delete(`/business/users/${id}`);
}

// ========== Роли ==========
export interface CompanyRoleItem {
  id: number;
  name: string;
  slug: string;
  is_system: boolean;
  permissions: string[];
}

export async function getCompanyRoles(): Promise<{ roles: CompanyRoleItem[] }> {
  const res = await apiClient.get('/business/roles');
  return { roles: res.data?.roles ?? [] };
}

export async function getCompanyPermissions(): Promise<{
  permissions: Record<string, Array<{ id: number; name: string; slug: string }>>;
}> {
  const res = await apiClient.get('/business/roles/permissions');
  return res.data;
}

export async function createCompanyRole(data: {
  name: string;
  slug: string;
  permission_ids?: number[];
}): Promise<{ role: CompanyRoleItem }> {
  const res = await apiClient.post('/business/roles', data);
  return res.data;
}

export async function updateCompanyRole(
  id: number,
  data: { name?: string; permission_ids?: number[] }
): Promise<{ role: CompanyRoleItem }> {
  const res = await apiClient.put(`/business/roles/${id}`, data);
  return res.data;
}

export async function deleteCompanyRole(id: number): Promise<void> {
  await apiClient.delete(`/business/roles/${id}`);
}

// ========== Портфолио ==========
export interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  image: string;
}

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  const res = await apiClient.get('/business/settings/portfolio');
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export async function deletePortfolioItem(id: number): Promise<void> {
  await apiClient.delete(`/business/settings/portfolio/${id}`);
}

// ========== Маркетплейс (витрина) ==========
export interface MarketplaceSettings {
  visible: boolean;
  showInSearch: boolean;
  allowBooking: boolean;
  showReviews: boolean;
  showPortfolio: boolean;
  seoTitle: string;
  seoDescription: string;
  metaKeywords: string;
}

export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
  const res = await apiClient.get('/business/settings/marketplace');
  return (res.data?.data ?? res.data) as MarketplaceSettings;
}

export async function updateMarketplaceSettings(
  data: Partial<MarketplaceSettings>
): Promise<MarketplaceSettings> {
  const res = await apiClient.put('/business/settings/marketplace', data);
  return (res.data?.data ?? res.data) as MarketplaceSettings;
}

// ========== Настройки уведомлений ==========
export interface BusinessNotificationSettings {
  email: boolean;
  sms: boolean;
  newBookings: boolean;
  cancellations: boolean;
  payments: boolean;
  reviews: boolean;
}

export async function getBusinessNotificationSettings(): Promise<BusinessNotificationSettings> {
  const res = await apiClient.get('/business/settings/notifications');
  return (res.data?.data ?? res.data) as BusinessNotificationSettings;
}

export async function updateBusinessNotificationSettings(
  data: Partial<BusinessNotificationSettings>
): Promise<BusinessNotificationSettings> {
  const res = await apiClient.put('/business/settings/notifications', data);
  return (res.data?.data ?? res.data) as BusinessNotificationSettings;
}

export interface BusinessNotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export async function getBusinessNotifications(): Promise<BusinessNotificationItem[]> {
  const res = await apiClient.get('/business/notifications');
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export async function markBusinessNotificationAsRead(id: number): Promise<void> {
  await apiClient.post(`/business/notifications/${id}/read`);
}

export async function markAllBusinessNotificationsAsRead(): Promise<void> {
  await apiClient.post('/business/notifications/read-all');
}

export async function deleteBusinessNotification(id: number): Promise<void> {
  await apiClient.delete(`/business/notifications/${id}`);
}

// ========== Объявления CRUD ==========
export async function getBusinessAdvertisement(
  id: number
): Promise<BusinessAdvertisement & Record<string, unknown>> {
  const res = await apiClient.get(`/business/settings/advertisements/${id}`);
  return (res.data?.data ?? res.data) as BusinessAdvertisement & Record<string, unknown>;
}

export async function createBusinessAdvertisement(data: {
  title: string;
  description?: string;
  type?: 'advertisement' | 'regular';
  status?: string;
  category_id?: number;
  state?: string;
  city?: string;
  price_from?: number;
  price_to?: number;
  currency?: string;
  services?: Array<{ service_id: number; name: string; price: number; duration: number }>;
  schedule?: Record<string, { enabled: boolean; from: string; to: string }>;
  slot_step_minutes?: number;
  team?: Array<{ id: number; name: string; role?: string }>;
}): Promise<BusinessAdvertisement> {
  const res = await apiClient.post('/business/settings/advertisements', data);
  return (res.data?.data ?? res.data) as BusinessAdvertisement;
}

export async function updateBusinessAdvertisement(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    type: 'advertisement' | 'regular';
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    category_id: number;
    state: string;
    city: string;
    price_from: number;
    price_to: number;
    currency: string;
    services: Array<{ service_id: number; name: string; price: number; duration: number }>;
    schedule: Record<string, { enabled: boolean; from: string; to: string }>;
    slot_step_minutes: number;
    team: Array<{ id: number; name: string; role?: string }>;
  }>
): Promise<BusinessAdvertisement> {
  const res = await apiClient.put(`/business/settings/advertisements/${id}`, data);
  return (res.data?.data ?? res.data) as BusinessAdvertisement;
}

export async function updateAdvertisementVisibility(id: number, isActive: boolean): Promise<BusinessAdvertisement> {
  const res = await apiClient.patch(`/business/settings/advertisements/${id}/visibility`, {
    is_active: isActive,
  });
  return (res.data?.data ?? res.data) as BusinessAdvertisement;
}

export async function deleteBusinessAdvertisement(id: number): Promise<void> {
  await apiClient.delete(`/business/settings/advertisements/${id}`);
}
