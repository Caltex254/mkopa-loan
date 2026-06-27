'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/components/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  CreditCard,
  Package,
  Bell,
  BarChart3,
  LogOut,
  Menu,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Send,
  TrendingUp,
  UsersRound,
  Banknote,
  AlertCircle,
  DollarSign,
  Clock,
  UserCheck,
  Download,
  Activity,
  UserX,
  FileDown,
  ImageIcon,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap,
  Wallet,
  Sparkles,
  Target,
  Filter,
  ChevronDown,
  PieChart,
  Receipt,
  Smartphone,
  UserPlus,
  ArrowRight,
  Headphones,
  MessageCircle,
  MessagesSquare,
  Reply,
  CheckCheck,
  CircleDot,
} from 'lucide-react';

// --- Types ---
type Section =
  | 'overview'
  | 'users'
  | 'applications'
  | 'kyc'
  | 'payments'
  | 'products'
  | 'notifications'
  | 'support'
  | 'reports'
  | 'activity';

interface AdminStats {
  totalUsers: number;
  totalApplications: number;
  pendingKYC: number;
  pendingReview: number;
  approvedLoans: number;
  rejectedLoans: number;
  totalDisbursed: number;
}

// ─── Support Chat Types (admin side) ────────────────────────────────
interface SupportMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface SupportChatListItem {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

interface SupportChatDetail extends SupportChatListItem {
  messages: SupportMessage[];
}

interface AdminUser {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  kycStatus: string;
  kycVerifiedAt: string | null;
  // Loan limit set by admin during KYC verification (KES, 0 if no KYC or not yet verified)
  loanLimit: number;
  loanCount: number;
}

interface UserDetail {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  kyc: {
    id: string;
    legalName: string;
    nationalId: string;
    idFrontImage?: string;
    idBackImage?: string;
    residentialAddress: string;
    dateOfBirth: string;
    status: string;
    verifiedAt: string | null;
    loanLimit: number;
  } | null;
  loanApps: LoanApplication[];
  payments: PaymentRecord[];
  activityLogs: { id: string; action: string; details: string; createdAt: string }[];
}

interface LoanApplication {
  id: string;
  userId: string;
  loanAmount: number;
  processingFee: number;
  amountReceived: number;
  totalRepayment: number;
  repaymentDate: string;
  status: string;
  activationPaid: boolean;
  activationRef: string | null;
  paymentRef: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    kyc: { status: string } | null;
  };
}

interface KYCRecord {
  id: string;
  userId: string;
  legalName: string;
  nationalId: string;
  idFrontImage?: string;
  idBackImage?: string;
  residentialAddress: string;
  dateOfBirth: string;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
}

interface PaymentRecord {
  id: string;
  userId: string;
  applicationId: string | null;
  transactionId: string;
  paymentRef: string;
  phoneNumber: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
  };
}

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
  } | null;
}

interface MonthlyStat {
  month: string;
  applications: number;
  approved: number;
  disbursed: number;
}

interface LoanProduct {
  amount: number;
  processingFee: number;
}

// --- Helper functions ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
    case 'verified':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'submitted_for_review':
    case 'pending':
    case 'pending_activation':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// --- Navigation items (single flat list, used for header title lookup) ---
const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="size-[18px]" /> },
  { id: 'users', label: 'Users Management', icon: <Users className="size-[18px]" /> },
  { id: 'kyc', label: 'KYC Verification', icon: <ShieldCheck className="size-[18px]" /> },
  { id: 'applications', label: 'Loan Applications', icon: <FileText className="size-[18px]" /> },
  { id: 'products', label: 'Loan Products', icon: <Package className="size-[18px]" /> },
  { id: 'payments', label: 'Payment Records', icon: <CreditCard className="size-[18px]" /> },
  { id: 'activity', label: 'Activity Logs', icon: <Activity className="size-[18px]" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="size-[18px]" /> },
  { id: 'support', label: 'Support Chats', icon: <Headphones className="size-[18px]" /> },
  { id: 'reports', label: 'Reports & Export', icon: <BarChart3 className="size-[18px]" /> },
];

// --- Grouped navigation (for the redesigned sidebar) ---
type NavGroup = {
  label: string;
  items: { id: Section; label: string; icon: React.ReactNode; hint?: string }[];
};

const NAV_GROUPS: NavGroup[] = [
  // Single-item top group for Overview (kept at top for quick access)
  {
    label: '',
    items: [
      { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="size-[18px]" /> },
    ],
  },
  {
    label: 'Customers',
    items: [
      { id: 'users', label: 'Users Management', icon: <Users className="size-[18px]" /> },
      { id: 'kyc', label: 'KYC Verification', icon: <ShieldCheck className="size-[18px]" /> },
    ],
  },
  {
    label: 'Loans',
    items: [
      { id: 'applications', label: 'Loan Applications', icon: <FileText className="size-[18px]" /> },
      { id: 'products', label: 'Loan Products', icon: <Package className="size-[18px]" /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'payments', label: 'Payment Records', icon: <CreditCard className="size-[18px]" /> },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'activity', label: 'Activity Logs', icon: <Activity className="size-[18px]" /> },
      { id: 'notifications', label: 'Notifications', icon: <Bell className="size-[18px]" /> },
      { id: 'support', label: 'Support Chats', icon: <Headphones className="size-[18px]" /> },
      { id: 'reports', label: 'Reports & Export', icon: <BarChart3 className="size-[18px]" /> },
    ],
  },
];

// --- Main Component ---
export default function AdminDashboard() {
  const { user, logout, setView } = useAppStore();
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // --- Data states ---
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [usersSearch, setUsersSearch] = useState('');
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [applicationsPagination, setApplicationsPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [applicationsFilter, setApplicationsFilter] = useState('all');
  const [kycRecords, setKycRecords] = useState<KYCRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsFilter, setPaymentsFilter] = useState('all');
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // --- Detail states ---
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  // --- Loading states ---
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // --- Dialog states ---
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    applicationId: string;
    action: 'approve' | 'reject';
    applicantName: string;
    amount: number;
  }>({ open: false, applicationId: '', action: 'approve', applicantName: '', amount: 0 });
  const [reviewReason, setReviewReason] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const [kycDialog, setKycDialog] = useState<{
    open: boolean;
    userId: string;
    action: 'verify' | 'reject';
    name: string;
  }>({ open: false, userId: '', action: 'verify', name: '' });
  const [kycReason, setKycReason] = useState('');
  const [kycLoanLimit, setKycLoanLimit] = useState<string>('');
  const [kycLoading, setKycLoading] = useState(false);

  const [kycDetailDialog, setKycDetailDialog] = useState<{
    open: boolean;
    kyc: KYCRecord | null;
  }>({ open: false, kyc: null });

  const [kycImageDialog, setKycImageDialog] = useState<{
    open: boolean;
    imageUrl: string;
    label: string;
    kycId: string;
    side: 'front' | 'back';
  }>({ open: false, imageUrl: '', label: '', kycId: '', side: 'front' });

  const [notifForm, setNotifForm] = useState({ userId: '', title: '', message: '' });
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  // --- Support chat states ---
  const [supportChats, setSupportChats] = useState<SupportChatListItem[]>([]);
  const [supportFilter, setSupportFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [activeSupportChat, setActiveSupportChat] = useState<SupportChatDetail | null>(null);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [supportReply, setSupportReply] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  // --- Auth check ---
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setView('landing');
    }
  }, [user, setView]);

  // --- Fetch functions ---
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
      // Also fetch monthly stats from reports
      const reportRes = await fetch('/api/admin/reports?type=summary');
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setMonthlyStats(reportData.monthlyStats || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setUsersPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch {
      // silently fail
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchApplications = useCallback(async (page = 1, status = '') => {
    setLoadingApplications(true);
    try {
      const statusParam = status && status !== 'all' ? `&status=${status}` : '';
      const res = await fetch(`/api/admin/applications?page=${page}&limit=10${statusParam}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
        setApplicationsPagination(
          data.pagination || { page: 1, totalPages: 1, total: 0 }
        );
      }
    } catch {
      // silently fail
    } finally {
      setLoadingApplications(false);
    }
  }, []);

  const fetchKycRecords = useCallback(async () => {
    setLoadingKyc(true);
    try {
      const res = await fetch('/api/admin/kyc');
      if (res.ok) {
        const data = await res.json();
        setKycRecords(data.records || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingKyc(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch('/api/admin/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  const fetchLoanProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/loans/products');
      if (res.ok) {
        const data = await res.json();
        setLoanProducts(data.products || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch('/api/admin/reports?type=activity');
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.logs || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  // --- Support chat: list all chats across all users ---
  const fetchSupportChats = useCallback(async () => {
    setLoadingSupport(true);
    setSupportError(null);
    try {
      const res = await fetch(`/api/admin/support/chats?status=${supportFilter}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch support chats');
      const data = await res.json();
      setSupportChats(data.chats || []);
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Could not load support chats');
    } finally {
      setLoadingSupport(false);
    }
  }, [supportFilter]);

  // --- Support chat: open one chat with all messages ---
  const openSupportChat = useCallback(async (chatId: string) => {
    setLoadingSupport(true);
    setSupportError(null);
    try {
      const res = await fetch(`/api/admin/support/chats/${chatId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load conversation');
      const data = await res.json();
      setActiveSupportChat(data.chat);
      // Refresh list so unread badges clear
      await fetchSupportChats();
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Could not load conversation');
    } finally {
      setLoadingSupport(false);
    }
  }, [fetchSupportChats]);

  // --- Support chat: admin replies ---
  const sendSupportReply = useCallback(async () => {
    if (!activeSupportChat || !supportReply.trim()) return;
    setSupportSending(true);
    setSupportError(null);
    try {
      const res = await fetch(`/api/admin/support/chats/${activeSupportChat.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: supportReply.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to send reply');
      }
      setSupportReply('');
      await openSupportChat(activeSupportChat.id);
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Could not send reply');
    } finally {
      setSupportSending(false);
    }
  }, [activeSupportChat, supportReply, openSupportChat]);

  // --- Support chat: close / reopen ---
  const toggleSupportChatStatus = useCallback(async (chatId: string, currentStatus: string) => {
    const next = currentStatus === 'open' ? 'closed' : 'open';
    try {
      const res = await fetch(`/api/admin/support/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update chat status');
      }
      // Refresh active chat + list
      await openSupportChat(chatId);
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Could not update chat status');
    }
  }, [openSupportChat]);

  // --- Data fetching on section change ---
  useEffect(() => {
    switch (activeSection) {
      case 'overview':
        // Overview now has sub-tabs that show pending KYC, recent payments,
        // top users, etc. Fetch everything in parallel so the sub-tabs load
        // instantly when clicked.
        fetchStats();
        fetchApplications(1, 'all');
        fetchKycRecords();
        fetchPayments();
        fetchUsers(1);
        break;
      case 'users':
        fetchUsers(1);
        break;
      case 'applications':
        fetchApplications(1, applicationsFilter);
        break;
      case 'kyc':
        fetchKycRecords();
        break;
      case 'payments':
        fetchPayments();
        break;
      case 'products':
        fetchLoanProducts();
        break;
      case 'activity':
        fetchActivityLogs();
        break;
      case 'support':
        fetchSupportChats();
        break;
    }
  }, [activeSection, fetchStats, fetchUsers, fetchApplications, fetchKycRecords, fetchPayments, fetchLoanProducts, fetchActivityLogs, fetchSupportChats, applicationsFilter]);

  // --- Mutation handlers ---
  const handleReviewApplication = async () => {
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/admin/applications/${reviewDialog.applicationId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewDialog.action,
          reason: reviewReason,
        }),
      });
      if (res.ok) {
        fetchApplications(applicationsPagination.page, applicationsFilter);
        fetchStats();
      }
    } catch {
      // silently fail
    } finally {
      setReviewLoading(false);
      setReviewDialog({ open: false, applicationId: '', action: 'approve', applicantName: '', amount: 0 });
      setReviewReason('');
    }
  };

  const handleVerifyKyc = async () => {
    setKycLoading(true);
    try {
      const payload: Record<string, unknown> = {
        action: kycDialog.action,
        reason: kycReason,
      };
      // Loan limit is required when verifying
      if (kycDialog.action === 'verify') {
        const limit = Number(kycLoanLimit);
        if (!kycLoanLimit || isNaN(limit) || limit <= 0) {
          alert('Please enter a valid loan limit (must be greater than 0) before verifying.');
          setKycLoading(false);
          return;
        }
        payload.loanLimit = limit;
      }
      const res = await fetch(`/api/admin/kyc/${kycDialog.userId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchKycRecords();
        fetchStats();
      }
    } catch {
      // silently fail
    } finally {
      setKycLoading(false);
      setKycDialog({ open: false, userId: '', action: 'verify', name: '' });
      setKycReason('');
      setKycLoanLimit('');
    }
  };

  const handleSendNotification = async () => {
    if (!notifForm.userId || !notifForm.title || !notifForm.message) return;
    setNotifLoading(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifForm),
      });
      if (res.ok) {
        setNotifSuccess(true);
        setNotifForm({ userId: '', title: '', message: '' });
        setTimeout(() => setNotifSuccess(false), 3000);
      }
    } catch {
      // silently fail
    } finally {
      setNotifLoading(false);
    }
  };

  const handleViewUserDetail = async (userId: string) => {
    setUserDetailLoading(true);
    setUserDetailOpen(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserDetail(data.user);
      }
    } catch {
      // silently fail
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleToggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        fetchUsers(usersPagination.page);
        fetchStats();
      }
    } catch {
      // silently fail
    }
  };

  const handleDownloadKycDocument = (kycId: string, side: 'front' | 'back', userName: string) => {
    const url = `/api/admin/kyc-download/${kycId}?side=${side}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${userName.replace(/\s+/g, '_')}_ID_${side}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    logout();
    setView('landing');
  };

  // --- Filtered data ---
  const filteredUsers = users.filter((u) => {
    if (!usersSearch) return true;
    const q = usersSearch.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
  });

  const filteredPayments = payments.filter((p) => {
    if (!paymentsFilter || paymentsFilter === 'all') return true;
    return p.status === paymentsFilter;
  });

  // --- Render sidebar ---
  const renderSidebar = () => (
    <div
      className={`flex flex-col h-full transition-all duration-300 relative overflow-hidden ${
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #022c1e 0%, #013527 35%, #004d33 100%)',
      }}
    >
      {/* Ambient glow at top */}
      <div
        className="pointer-events-none absolute -top-24 -left-12 size-56 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #00ff88 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 -right-20 size-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }}
      />

      {/* Logo header */}
      <div className="relative flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mkopa.png"
            alt="MKOPA LOAN"
            className="h-10 w-10 rounded-xl shrink-0 object-cover ring-2 ring-white/20"
          />
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[#00ff88] ring-2 ring-[#022c1e]" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-extrabold text-white tracking-tight whitespace-nowrap leading-tight">
              MKOPA <span className="text-[#FFD700]">LOAN</span>
            </h1>
            <p className="text-[10px] text-white/50 uppercase tracking-[0.18em] font-medium">
              Admin Console
            </p>
          </div>
        )}
      </div>

      {/* Grouped Navigation */}
      <ScrollArea className="relative flex-1 px-2.5 py-3">
        <nav className="flex flex-col gap-3.5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-0.5">
              {!sidebarCollapsed && group.label && (
                <p className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                  {group.label}
                </p>
              )}
              {sidebarCollapsed && group.label && gi > 0 && (
                <div className="mx-2 my-1 border-t border-white/10" />
              )}
              {group.items.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                      active
                        ? 'text-white shadow-lg'
                        : 'text-white/65 hover:text-white hover:bg-white/5'
                    }`}
                    style={
                      active
                        ? {
                            background:
                              'linear-gradient(135deg, rgba(0,166,81,0.95) 0%, rgba(0,200,100,0.85) 100%)',
                            boxShadow: '0 6px 18px -6px rgba(0,166,81,0.55), inset 0 1px 0 rgba(255,255,255,0.18)',
                          }
                        : undefined
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {/* Active left accent */}
                    {active && (
                      <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#FFD700]" />
                    )}
                    <span className={`shrink-0 ${active ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="whitespace-nowrap truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User card + collapse + logout (footer) */}
      <div className="relative border-t border-white/10 p-2.5 space-y-1.5">
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/5 backdrop-blur-sm">
            <Avatar className="size-8 ring-1 ring-white/20">
              <AvatarFallback className="bg-gradient-to-br from-[#00A651] to-[#00ff88] text-white text-xs font-bold">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.fullName || 'Admin'}</p>
              <p className="text-[10px] text-white/45 truncate uppercase tracking-wider">
                {user.role || 'admin'}
              </p>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center w-full px-3 py-1.5 rounded-lg text-white/55 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-xs"
        >
          {sidebarCollapsed ? <ChevronRight className="size-4" /> : (
            <>
              <ChevronLeft className="size-4" />
              <span className="ml-1.5">Collapse</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium text-red-300 hover:text-red-200 hover:bg-red-500/15 transition-colors w-full cursor-pointer"
          title={sidebarCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="size-[18px] shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  // --- Mini Bar Chart Component ---
  function MiniBarChart({ data, dataKey, label }: { data: MonthlyStat[]; dataKey: 'applications' | 'approved' | 'disbursed'; label: string }) {
    if (!data.length) return null;
    const maxVal = Math.max(...data.map((d) => d[dataKey]), 1);
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
        <div className="flex items-end gap-1.5 h-24">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[#00A651] transition-all duration-500 min-h-[2px]"
                style={{ height: `${(d[dataKey] / maxVal) * 100}%` }}
              />
              <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.month.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OVERVIEW SECTION
  // ═══════════════════════════════════════════════════════════════════════
  // OVERVIEW SECTION (with sub-tabs: Stats / Pending Tasks / Recent Payments / Top Users / Quick Actions)
  // ═══════════════════════════════════════════════════════════════════════
  const renderOverview = () => {
    // ─── Derived metrics ───────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const todaysApplications = applications.filter((a) => a.createdAt?.startsWith(today)).length;
    const completedPayments = payments.filter((p) => p.status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const activationFeeRevenue = completedPayments
      .filter((p) => p.type === 'activation' || p.type === 'activation_fee' || p.type === 'fee')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const kycVerifiedCount = kycRecords.filter((k) => k.status === 'verified').length;
    const disbursedCount = completedPayments.filter((p) => p.type === 'disbursement').length;

    // Funnel percentages
    const funnelTotal = stats?.totalApplications || 0;
    const funnelPct = (n: number) => (funnelTotal > 0 ? Math.round((n / funnelTotal) * 100) : 0);

    // ─── Daily series for last 7 days ──────────────────────────────────
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const dayKey = (d: Date) => d.toISOString().split('T')[0];
    const dayLabel = (d: Date) => d.toLocaleDateString('en-KE', { weekday: 'short' });

    const dailyApplications = last7Days.map((d) => ({
      label: dayLabel(d),
      value: applications.filter((a) => a.createdAt?.startsWith(dayKey(d))).length,
    }));
    const dailyApprovals = last7Days.map((d) => ({
      label: dayLabel(d),
      value: applications.filter(
        (a) => a.status === 'approved' && a.reviewedAt?.startsWith(dayKey(d))
      ).length,
    }));
    const dailyDisbursements = last7Days.map((d) => ({
      label: dayLabel(d),
      value: payments.filter(
        (p) =>
          p.status === 'completed' &&
          p.type === 'disbursement' &&
          p.createdAt?.startsWith(dayKey(d))
      ).length,
    }));
    const dailyRegistrations = last7Days.map((d) => ({
      label: dayLabel(d),
      value: users.filter((u) => u.createdAt?.startsWith(dayKey(d))).length,
    }));

    // ─── Recent activity feed (merged from multiple sources) ───────────
    type FeedType = 'registration' | 'application' | 'kyc_approval' | 'payment_confirmation';
    type FeedItem = {
      id: string;
      type: FeedType;
      title: string;
      subtitle: string;
      timestamp: string;
      amount?: number;
    };
    const feedItems: FeedItem[] = [
      ...users.map((u) => ({
        id: `reg-${u.id}`,
        type: 'registration' as FeedType,
        title: u.fullName,
        subtitle: 'New registration',
        timestamp: u.createdAt,
      })),
      ...applications.map((a) => ({
        id: `app-${a.id}`,
        type: 'application' as FeedType,
        title: a.user.fullName,
        subtitle: `Applied for ${formatCurrency(a.loanAmount)}`,
        timestamp: a.createdAt,
        amount: a.loanAmount,
      })),
      ...kycRecords
        .filter((k) => k.status === 'verified' && k.verifiedAt)
        .map((k) => ({
          id: `kyc-${k.id}`,
          type: 'kyc_approval' as FeedType,
          title: k.user.fullName,
          subtitle: 'KYC approved',
          timestamp: k.verifiedAt as string,
        })),
      ...payments
        .filter((p) => p.status === 'completed')
        .map((p) => ({
          id: `pay-${p.id}`,
          type: 'payment_confirmation' as FeedType,
          title: p.user.fullName,
          subtitle: `${p.type} payment confirmed`,
          timestamp: p.createdAt,
          amount: p.amount,
        })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    // ─── Time ago helper ───────────────────────────────────────────────
    const timeAgo = (ts: string) => {
      const diff = Date.now() - new Date(ts).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `${days}d ago`;
      return formatDate(ts);
    };

    // ─── Feed icon/color mapper ────────────────────────────────────────
    const feedMeta: Record<FeedType, { icon: React.ReactNode; bg: string; fg: string }> = {
      registration: { icon: <UserPlus className="size-3.5" />, bg: 'bg-blue-100', fg: 'text-blue-600' },
      application: { icon: <FileText className="size-3.5" />, bg: 'bg-purple-100', fg: 'text-purple-600' },
      kyc_approval: { icon: <ShieldCheck className="size-3.5" />, bg: 'bg-emerald-100', fg: 'text-emerald-600' },
      payment_confirmation: { icon: <CheckCircle2 className="size-3.5" />, bg: 'bg-green-100', fg: 'text-green-600' },
    };

    // ─── Compact daily bar chart ───────────────────────────────────────
    const DailyBarChart = ({ title, data, color }: { title: string; data: { label: string; value: number }[]; color: string }) => {
      const max = Math.max(...data.map((d) => d.value), 1);
      const total = data.reduce((s, d) => s + d.value, 0);
      return (
        <div className="rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
            <span className="text-sm font-extrabold text-[#333333]">{total}</span>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {data.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md transition-all duration-700 ease-out min-h-[3px] hover:opacity-80"
                    style={{
                      height: `${(d.value / max) * 100}%`,
                      background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
                    }}
                    title={`${d.label}: ${d.value}`}
                  />
                </div>
                <span className="text-[9px] text-gray-400 font-medium">{d.label[0]}</span>
              </div>
            ))}
          </div>
        </div>
      );
    };

    // ─── Quick stat card (compact) ─────────────────────────────────────
    const QuickStat = ({ label, value, icon, tone }: { label: string; value: React.ReactNode; icon: React.ReactNode; tone: 'yellow' | 'orange' | 'emerald' | 'gold' | 'blue' }) => {
      const toneMap = {
        yellow: 'from-yellow-50 to-amber-50 text-yellow-600 ring-yellow-100',
        orange: 'from-orange-50 to-amber-50 text-orange-600 ring-orange-100',
        emerald: 'from-emerald-50 to-green-50 text-emerald-600 ring-emerald-100',
        gold: 'from-amber-50 to-yellow-50 text-amber-600 ring-amber-100',
        blue: 'from-blue-50 to-sky-50 text-blue-600 ring-blue-100',
      };
      return (
        <div className={`rounded-xl bg-gradient-to-br ${toneMap[tone]} p-3 ring-1 shadow-sm hover:shadow-md transition-all`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="shrink-0">{icon}</span>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 truncate">{label}</p>
          </div>
          <p className="text-base sm:text-lg font-extrabold text-[#333333] truncate">{value}</p>
        </div>
      );
    };

    // ─── Main stat card (larger, premium) ──────────────────────────────
    const MainStatCard = ({ label, value, icon, gradient, iconBg }: { label: string; value: React.ReactNode; icon: React.ReactNode; gradient: string; iconBg: string }) => (
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
        <div className={`absolute inset-x-0 top-0 h-1 ${gradient}`} />
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
            <div className={`flex items-center justify-center size-9 rounded-xl ${iconBg} group-hover:scale-110 transition-transform`}>
              {icon}
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-[#333333]">{value}</p>
        </div>
      </div>
    );

    // ─── Quick action button ───────────────────────────────────────────
    const QuickAction = ({ label, icon, onClick, tone }: { label: string; icon: React.ReactNode; onClick: () => void; tone: 'emerald' | 'blue' | 'purple' | 'amber' }) => {
      const toneMap = {
        emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
        blue: 'from-blue-500 to-sky-600 shadow-blue-500/30',
        purple: 'from-purple-500 to-violet-600 shadow-purple-500/30',
        amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
      };
      return (
        <button
          onClick={onClick}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r ${toneMap[tone]} text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer w-full`}
        >
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{label}</span>
        </button>
      );
    };

    // ─── Funnel stage ──────────────────────────────────────────────────
    const FunnelStage = ({ label, value, pct, color, icon, delay }: { label: string; value: number; pct: number; color: string; icon: React.ReactNode; delay: number }) => (
      <div className="relative rounded-2xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <div className="absolute top-0 right-0 opacity-5 size-20 -mr-6 -mt-6">
          <div className="size-full">{icon}</div>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-8 rounded-lg" style={{ background: `${color}15`, color }}>
              {icon}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
          </div>
          <p className="text-2xl font-extrabold text-[#333333] mb-2">{value}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Conversion</span>
              <span className="font-bold" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}dd)`, transitionDelay: `${delay}ms` }}
              />
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-4 sm:space-y-5">
        {/* ═══ 1. HERO HEADER ═══ */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #022c1e 0%, #013527 30%, #00A651 70%, #00c45a 100%)' }}
        >
          {/* Decorative glows */}
          <div className="pointer-events-none absolute -top-20 -right-10 size-64 rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }} />
          <div className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #00ff88 0%, transparent 70%)' }} />

          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="min-w-0">
              <p className="text-white/70 text-[11px] uppercase tracking-[0.18em] font-semibold">
                {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
                Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'}
              </h2>
              <p className="text-white/75 text-sm mt-1">
                Here's what's happening with your lending platform today.
              </p>
            </div>
            <button
              onClick={() => fetchStats()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold backdrop-blur-sm border border-white/20 transition-colors cursor-pointer"
            >
              <RefreshCw className="size-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ═══ 2. QUICK STATS STRIP (5 cards) ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <QuickStat label="Pending KYC" value={stats?.pendingKYC ?? 0} icon={<ShieldCheck className="size-3.5" />} tone="yellow" />
          <QuickStat label="Pending Approvals" value={stats?.pendingReview ?? 0} icon={<Clock className="size-3.5" />} tone="orange" />
          <QuickStat label="Total Revenue" value={formatCurrency(totalRevenue)} icon={<Wallet className="size-3.5" />} tone="emerald" />
          <QuickStat label="Activation Revenue" value={formatCurrency(activationFeeRevenue)} icon={<Zap className="size-3.5" />} tone="gold" />
          <QuickStat label="Today's Applications" value={todaysApplications} icon={<FileText className="size-3.5" />} tone="blue" />
        </div>

        {/* ═══ 3. MAIN 4 STAT CARDS ═══ */}
        {loadingStats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-[#00A651]" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MainStatCard
              label="Total Users"
              value={stats.totalUsers}
              icon={<Users className="size-5 text-[#00A651]" />}
              gradient="bg-gradient-to-r from-[#00A651] to-[#00c45a]"
              iconBg="bg-[#00A651]/10"
            />
            <MainStatCard
              label="Applications"
              value={stats.totalApplications}
              icon={<FileText className="size-5 text-blue-600" />}
              gradient="bg-gradient-to-r from-blue-500 to-sky-500"
              iconBg="bg-blue-50"
            />
            <MainStatCard
              label="Approved Loans"
              value={stats.approvedLoans}
              icon={<CheckCircle2 className="size-5 text-emerald-600" />}
              gradient="bg-gradient-to-r from-emerald-500 to-green-500"
              iconBg="bg-emerald-50"
            />
            <MainStatCard
              label="Total Disbursed"
              value={formatCurrency(stats.totalDisbursed)}
              icon={<DollarSign className="size-5 text-amber-600" />}
              gradient="bg-gradient-to-r from-amber-500 to-orange-500"
              iconBg="bg-amber-50"
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center text-gray-500">
            <AlertCircle className="size-8 mx-auto mb-2 text-gray-400" />
            Failed to load dashboard stats
          </div>
        )}

        {/* ═══ 4. QUICK ACTION BUTTONS ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <QuickAction label="Approve Loans" icon={<CheckCircle2 className="size-4" />} onClick={() => setActiveSection('applications')} tone="emerald" />
          <QuickAction label="Verify KYC" icon={<ShieldCheck className="size-4" />} onClick={() => setActiveSection('kyc')} tone="blue" />
          <QuickAction label="View Payments" icon={<CreditCard className="size-4" />} onClick={() => setActiveSection('payments')} tone="purple" />
          <QuickAction label="Send Notification" icon={<Send className="size-4" />} onClick={() => setActiveSection('notifications')} tone="amber" />
        </div>

        {/* ═══ 5. LOAN FUNNEL ═══ */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#00A651]/10">
                <Target className="size-4 text-[#00A651]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#333333]">Loan Funnel</h3>
                <p className="text-[11px] text-gray-500">Application → KYC → Approval → Disbursement</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:block">
              Conversion Tracking
            </span>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <FunnelStage label="Applications" value={funnelTotal} pct={100} color="#00A651" icon={<FileText className="size-5" />} delay={0} />
              <FunnelStage label="KYC Verified" value={kycVerifiedCount} pct={funnelPct(kycVerifiedCount)} color="#3b82f6" icon={<ShieldCheck className="size-5" />} delay={150} />
              <FunnelStage label="Approved" value={stats?.approvedLoans ?? 0} pct={funnelPct(stats?.approvedLoans ?? 0)} color="#8b5cf6" icon={<CheckCircle2 className="size-5" />} delay={300} />
              <FunnelStage label="Disbursed" value={disbursedCount} pct={funnelPct(disbursedCount)} color="#f59e0b" icon={<Banknote className="size-5" />} delay={450} />
            </div>
          </div>
        </div>

        {/* ═══ 6. ANALYTICS CHARTS + RECENT ACTIVITY (two-column) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: 4 daily charts in 2x2 grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DailyBarChart title="Daily Applications" data={dailyApplications} color="#00A651" />
            <DailyBarChart title="Loan Approvals" data={dailyApprovals} color="#8b5cf6" />
            <DailyBarChart title="Disbursements" data={dailyDisbursements} color="#f59e0b" />
            <DailyBarChart title="User Registrations" data={dailyRegistrations} color="#3b82f6" />
          </div>

          {/* Right: Recent Activity feed */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-lg bg-[#00A651]/10">
                  <Activity className="size-4 text-[#00A651]" />
                </div>
                <h3 className="text-sm font-bold text-[#333333]">Recent Activity</h3>
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Live</span>
            </div>
            <div className="p-3 flex-1 max-h-[420px] overflow-y-auto">
              {feedItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-1">
                  {feedItems.map((item) => {
                    const meta = feedMeta[item.type];
                    return (
                      <div key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`flex items-center justify-center size-7 rounded-full ${meta.bg} ${meta.fg} shrink-0`}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#333333] truncate">{item.title}</p>
                          <p className="text-[11px] text-gray-500 truncate">{item.subtitle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {item.amount && (
                            <p className="text-xs font-bold text-[#00A651]">{formatCurrency(item.amount)}</p>
                          )}
                          <p className="text-[10px] text-gray-400">{timeAgo(item.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ 7. DETAILED VIEWS (existing tabbed content preserved) ═══ */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="tasks" className="text-xs sm:text-sm py-2 relative">
              <Clock className="size-3.5 mr-1" />
              Pending Tasks
              {stats && (stats.pendingKYC + stats.pendingReview) > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {stats.pendingKYC + stats.pendingReview}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm py-2">
              <CreditCard className="size-3.5 mr-1" />
              Recent Payments
            </TabsTrigger>
            <TabsTrigger value="topusers" className="text-xs sm:text-sm py-2">
              <TrendingUp className="size-3.5 mr-1" />
              Top Users
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs sm:text-sm py-2">
              <Send className="size-3.5 mr-1" />
              Quick Actions
            </TabsTrigger>
          </TabsList>

          {/* ─── PENDING TASKS TAB ─── */}
          <TabsContent value="tasks" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pending KYC verifications */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="size-4 text-yellow-600" />
                      KYC Verification Queue
                    </CardTitle>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {kycRecords.filter((k) => k.status === 'pending').length} pending
                    </Badge>
                  </div>
                  <CardDescription>Users waiting for KYC review</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {loadingKyc ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-6 animate-spin text-[#00A651]" />
                    </div>
                  ) : kycRecords.filter((k) => k.status === 'pending').length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No pending KYC applications
                    </p>
                  ) : (
                    kycRecords
                      .filter((k) => k.status === 'pending')
                      .slice(0, 10)
                      .map((kyc) => (
                        <div
                          key={kyc.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-100 hover:bg-yellow-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback className="bg-yellow-500 text-white text-xs">
                                {kyc.user.fullName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#333333] truncate">
                                {kyc.user.fullName}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: {kyc.nationalId}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs shrink-0 ml-2 cursor-pointer"
                            onClick={() => {
                              setKycDetailDialog({ open: true, kyc });
                            }}
                          >
                            <Eye className="size-3 mr-0.5" />
                            Review
                          </Button>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>

              {/* Pending loan reviews */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="size-4 text-orange-600" />
                      Loan Review Queue
                    </CardTitle>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {applications.filter((a) => a.status === 'pending_review' || a.status === 'pending_activation').length} pending
                    </Badge>
                  </div>
                  <CardDescription>Applications awaiting action</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {loadingApplications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-6 animate-spin text-[#00A651]" />
                    </div>
                  ) : applications.filter((a) => a.status === 'pending_review' || a.status === 'pending_activation').length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No pending loan applications
                    </p>
                  ) : (
                    applications
                      .filter((a) => a.status === 'pending_review' || a.status === 'pending_activation')
                      .slice(0, 10)
                      .map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback className="bg-orange-500 text-white text-xs">
                                {app.user.fullName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#333333] truncate">
                                {app.user.fullName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(app.loanAmount)} • {formatStatus(app.status)}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs shrink-0 ml-2 cursor-pointer"
                            onClick={() => {
                              if (app.status === 'pending_review') {
                                setReviewDialog({
                                  open: true,
                                  applicationId: app.id,
                                  action: 'approve',
                                  applicantName: app.user.fullName,
                                  amount: app.loanAmount,
                                });
                              }
                            }}
                          >
                            <Eye className="size-3 mr-0.5" />
                            Review
                          </Button>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── RECENT PAYMENTS TAB ─── */}
          <TabsContent value="payments" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Payments</CardTitle>
                <CardDescription>Latest payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPayments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-[#00A651]" />
                  </div>
                ) : payments.length > 0 ? (
                  <div className="space-y-2">
                    {payments.slice(0, 8).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="size-9 shrink-0">
                            <AvatarFallback className="bg-[#00A651] text-white text-xs">
                              {p.user.fullName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#333333] truncate">{p.user.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {p.paymentRef} • {formatDateTime(p.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold text-[#333333]">
                            {formatCurrency(p.amount)}
                          </span>
                          <Badge className={getStatusColor(p.status)} variant="secondary">
                            {formatStatus(p.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No payments yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TOP USERS TAB ─── */}
          <TabsContent value="topusers" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Users by Loan Count</CardTitle>
                <CardDescription>Most active borrowers</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-[#00A651]" />
                  </div>
                ) : users.length > 0 ? (
                  <div className="space-y-2">
                    {[...users]
                      .sort((a, b) => b.loanCount - a.loanCount)
                      .slice(0, 8)
                      .map((u, i) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                            <Avatar className="size-9 shrink-0">
                              <AvatarFallback className="bg-[#00A651] text-white text-xs">
                                {u.fullName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#333333] truncate">{u.fullName}</p>
                              <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="secondary"
                              className={
                                u.kycStatus === 'verified'
                                  ? 'bg-green-100 text-green-800'
                                  : u.kycStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {u.loanCount} loans
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No users yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── QUICK ACTIONS TAB ─── */}
          <TabsContent value="actions" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Send a notification to a user</CardDescription>
              </CardHeader>
              <CardContent>
                {notifSuccess && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">Notification sent successfully!</span>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notif-user">Select User</Label>
                    <Select
                      value={notifForm.userId}
                      onValueChange={(v) => setNotifForm({ ...notifForm, userId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.fullName} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notif-title">Title</Label>
                    <Input
                      id="notif-title"
                      value={notifForm.title}
                      onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                      placeholder="Notification title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notif-message">Message</Label>
                    <Textarea
                      id="notif-message"
                      value={notifForm.message}
                      onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                      placeholder="Type your message here..."
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleSendNotification}
                    disabled={notifLoading || !notifForm.userId || !notifForm.title || !notifForm.message}
                    className="w-full bg-[#00A651] hover:bg-[#008f45] cursor-pointer"
                  >
                    {notifLoading ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="size-4 mr-2" />
                    )}
                    Send Notification
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Monthly charts (preserved from old Stats tab) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Monthly Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={monthlyStats} dataKey="applications" label="Applications per Month" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Monthly Disbursements</CardTitle>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={monthlyStats} dataKey="disbursed" label="Amount Disbursed" />
                </CardContent>
              </Card>
            </div>

            {/* Approval Rate (preserved) */}
            {stats && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Loan Approval Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Approval Rate</span>
                      <span className="font-bold text-[#00A651]">
                        {stats.totalApplications > 0
                          ? Math.round((stats.approvedLoans / stats.totalApplications) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={stats.totalApplications > 0 ? (stats.approvedLoans / stats.totalApplications) * 100 : 0}
                      className="h-3"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{stats.approvedLoans} approved</span>
                      <span>{stats.rejectedLoans} rejected</span>
                      <span>{stats.totalApplications} total</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // USERS MANAGEMENT SECTION
  // ═══════════════════════════════════════════════════════════════════════
  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#333333]">Users Management</h2>
          <p className="text-gray-500 mt-1">{usersPagination.total} total users</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={usersSearch}
            onChange={(e) => setUsersSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[#00A651]" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden md:table-cell">Phone</TableHead>
                      <TableHead>KYC</TableHead>
                      <TableHead>Loan Limit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Loans</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-[#00A651] text-white text-xs">
                                  {u.fullName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{u.fullName}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-600">
                            {u.phone}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(u.kycStatus)} variant="secondary">
                              {formatStatus(u.kycStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.kycStatus === 'verified' && u.loanLimit > 0 ? (
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#00A651]">
                                <Wallet className="size-3.5" />
                                {formatCurrency(u.loanLimit)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—
                                {u.kycStatus === 'pending' ? 'Pending KYC' :
                                 u.kycStatus === 'rejected' ? 'KYC rejected' :
                                 'No KYC'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                              variant="secondary"
                            >
                              {u.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                            {u.loanCount}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs cursor-pointer"
                                onClick={() => handleViewUserDetail(u.id)}
                              >
                                <Eye className="size-3 mr-0.5" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant={u.isActive ? 'destructive' : 'default'}
                                className={`h-7 text-xs cursor-pointer ${
                                  u.isActive ? '' : 'bg-[#00A651] hover:bg-[#008f45] text-white'
                                }`}
                                onClick={() => handleToggleUserActive(u.id, u.isActive)}
                              >
                                {u.isActive ? (
                                  <><UserX className="size-3 mr-0.5" />Deactivate</>
                                ) : (
                                  <><UserCheck className="size-3 mr-0.5" />Activate</>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {usersPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-500">
                    Page {usersPagination.page} of {usersPagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={usersPagination.page <= 1}
                      onClick={() => fetchUsers(usersPagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={usersPagination.page >= usersPagination.totalPages}
                      onClick={() => fetchUsers(usersPagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {userDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[#00A651]" />
            </div>
          ) : userDetail ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarFallback className="bg-[#00A651] text-white text-xl">
                    {userDetail.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-[#333333]">{userDetail.fullName}</h3>
                  <p className="text-sm text-gray-500">{userDetail.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      className={userDetail.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                      variant="secondary"
                    >
                      {userDetail.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-xs text-gray-400">Joined {formatDate(userDetail.createdAt)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* KYC Info */}
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-3">KYC Information</h4>
                {userDetail.kyc ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Legal Name</p>
                        <p className="font-medium">{userDetail.kyc.legalName}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">National ID</p>
                        <p className="font-medium">{userDetail.kyc.nationalId}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Date of Birth</p>
                        <p className="font-medium">{userDetail.kyc.dateOfBirth}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Status</p>
                        <Badge className={getStatusColor(userDetail.kyc.status)} variant="secondary">
                          {formatStatus(userDetail.kyc.status)}
                        </Badge>
                      </div>
                    </div>
                    {/* Loan limit set by admin (highlights the amount the user is allowed to borrow) */}
                    <div
                      className={`rounded-lg p-4 border ${
                        userDetail.kyc.status === 'verified' && userDetail.kyc.loanLimit > 0
                          ? 'bg-gradient-to-br from-[#00A651]/10 to-[#00A651]/5 border-[#00A651]/30'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Loan Limit (set by admin)</p>
                          {userDetail.kyc.status === 'verified' && userDetail.kyc.loanLimit > 0 ? (
                            <p className="text-2xl font-bold text-[#00A651] flex items-center gap-1.5">
                              <Wallet className="size-5" />
                              {formatCurrency(userDetail.kyc.loanLimit)}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">
                              {userDetail.kyc.status === 'verified'
                                ? 'Verified — no limit set'
                                : userDetail.kyc.status === 'pending'
                                  ? 'Awaiting verification'
                                  : userDetail.kyc.status === 'rejected'
                                    ? 'KYC rejected — no limit'
                                    : 'No KYC submission'}
                            </p>
                          )}
                        </div>
                        {userDetail.kyc.verifiedAt && (
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Verified on</p>
                            <p className="text-xs font-medium text-gray-600">
                              {formatDate(userDetail.kyc.verifiedAt)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Address</p>
                      <p className="text-sm">{userDetail.kyc.residentialAddress}</p>
                    </div>
                    {/* Download KYC Documents */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#00A651] border-[#00A651]/30 cursor-pointer"
                        onClick={() => handleDownloadKycDocument(userDetail.kyc!.id, 'front', userDetail.kyc!.legalName)}
                      >
                        <Download className="size-3.5 mr-1" />
                        Download ID Front
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#00A651] border-[#00A651]/30 cursor-pointer"
                        onClick={() => handleDownloadKycDocument(userDetail.kyc!.id, 'back', userDetail.kyc!.legalName)}
                      >
                        <Download className="size-3.5 mr-1" />
                        Download ID Back
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No KYC submission</p>
                )}
              </div>

              <Separator />

              {/* Loan History */}
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-3">Loan Applications ({userDetail.loanApps.length})</h4>
                {userDetail.loanApps.length === 0 ? (
                  <p className="text-sm text-gray-400">No loan applications</p>
                ) : (
                  <div className="space-y-2">
                    {userDetail.loanApps.slice(0, 5).map((loan) => (
                      <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(loan.loanAmount)}</p>
                          <p className="text-xs text-gray-500">{formatDate(loan.createdAt)}</p>
                        </div>
                        <Badge className={getStatusColor(loan.status)} variant="secondary">
                          {formatStatus(loan.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Activity Log */}
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-3">Recent Activity</h4>
                {userDetail.activityLogs.length === 0 ? (
                  <p className="text-sm text-gray-400">No activity recorded</p>
                ) : (
                  <div className="space-y-1.5">
                    {userDetail.activityLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-sm">
                        <Activity className="size-3.5 mt-1 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-gray-700">{log.details}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">User not found</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // LOAN APPLICATIONS SECTION
  // ═══════════════════════════════════════════════════════════════════════
  const renderApplications = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#333333]">Loan Applications</h2>
        <p className="text-gray-500 mt-1">Review and manage loan applications</p>
      </div>

      <Tabs
        value={applicationsFilter}
        onValueChange={(v) => {
          setApplicationsFilter(v);
          setApplicationsPagination({ ...applicationsPagination, page: 1 });
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending_activation">Pending Activation</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={applicationsFilter} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingApplications ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-[#00A651]" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Applicant</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Fee</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              No applications found
                            </TableCell>
                          </TableRow>
                        ) : (
                          applications.map((app) => (
                            <TableRow key={app.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-8">
                                    <AvatarFallback className="bg-[#00A651] text-white text-xs">
                                      {app.user.fullName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{app.user.fullName}</p>
                                    <p className="text-xs text-gray-500">{app.user.phone}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-sm">
                                {formatCurrency(app.loanAmount)}
                              </TableCell>
                              <TableCell className="text-sm text-red-500">
                                {formatCurrency(app.processingFee)}
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(app.status)} variant="secondary">
                                  {formatStatus(app.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                                {formatDate(app.createdAt)}
                              </TableCell>
                              <TableCell>
                                {app.status === 'pending_activation' ? (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs cursor-pointer"
                                      onClick={() => handleViewUserDetail(app.userId)}
                                    >
                                      <Eye className="size-3.5 mr-1" />
                                      View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8 text-xs cursor-pointer"
                                      onClick={() =>
                                        setReviewDialog({
                                          open: true,
                                          applicationId: app.id,
                                          action: 'reject',
                                          applicantName: app.user.fullName,
                                          amount: app.loanAmount,
                                        })
                                      }
                                    >
                                      <XCircle className="size-3.5 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs cursor-pointer"
                                    onClick={() => handleViewUserDetail(app.userId)}
                                  >
                                    <Eye className="size-3 mr-1" />
                                    View User
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {applicationsPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-gray-500">
                        Page {applicationsPagination.page} of {applicationsPagination.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={applicationsPagination.page <= 1}
                          onClick={() =>
                            fetchApplications(applicationsPagination.page - 1, applicationsFilter)
                          }
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={applicationsPagination.page >= applicationsPagination.totalPages}
                          onClick={() =>
                            fetchApplications(applicationsPagination.page + 1, applicationsFilter)
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Confirmation Dialog */}
      <AlertDialog
        open={reviewDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setReviewDialog({
              open: false,
              applicationId: '',
              action: 'approve',
              applicantName: '',
              amount: 0,
            });
            setReviewReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve' : 'Reject'} Loan Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {reviewDialog.action} the loan application from{' '}
              <strong>{reviewDialog.applicantName}</strong> for{' '}
              <strong>{formatCurrency(reviewDialog.amount)}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-reason">Reason (optional)</Label>
            <Textarea
              id="review-reason"
              placeholder={`Reason for ${reviewDialog.action}...`}
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reviewLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReviewApplication}
              disabled={reviewLoading}
              className={
                reviewDialog.action === 'approve'
                  ? 'bg-[#00A651] hover:bg-[#008f45] text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
            >
              {reviewLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {reviewDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // KYC VERIFICATION SECTION (with document download)
  // ═══════════════════════════════════════════════════════════════════════
  const renderKyc = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#333333]">KYC Verification</h2>
        <p className="text-gray-500 mt-1">Review and verify user identity documents</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loadingKyc ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[#00A651]" />
            </div>
          ) : kycRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShieldCheck className="size-12 mx-auto mb-3 text-gray-300" />
              <p>No KYC submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>National ID</TableHead>
                    <TableHead className="hidden md:table-cell">DOB</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kycRecords.map((kyc) => (
                    <TableRow key={kyc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-[#00A651] text-white text-xs">
                              {kyc.legalName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{kyc.legalName}</p>
                            <p className="text-xs text-gray-500">{kyc.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{kyc.nationalId}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">{kyc.dateOfBirth}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {formatDate(kyc.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(kyc.status)} variant="secondary">
                          {formatStatus(kyc.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs cursor-pointer"
                            onClick={() => setKycDetailDialog({ open: true, kyc })}
                          >
                            <Eye className="size-3 mr-0.5" />
                            View
                          </Button>
                          {kyc.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-[#00A651] hover:bg-[#008f45] text-white h-7 text-xs cursor-pointer"
                                onClick={() =>
                                  setKycDialog({ open: true, userId: kyc.userId, action: 'verify', name: kyc.legalName })
                                }
                              >
                                <CheckCircle2 className="size-3 mr-0.5" />
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs cursor-pointer"
                                onClick={() =>
                                  setKycDialog({ open: true, userId: kyc.userId, action: 'reject', name: kyc.legalName })
                                }
                              >
                                <XCircle className="size-3 mr-0.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC Detail Dialog with Document Download */}
      <Dialog
        open={kycDetailDialog.open}
        onOpenChange={(open) => setKycDetailDialog({ open, kyc: null })}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Document Details</DialogTitle>
            <DialogDescription>
              Review identity documents for {kycDetailDialog.kyc?.legalName}
            </DialogDescription>
          </DialogHeader>
          {kycDetailDialog.kyc && (
            <div className="space-y-5">
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Legal Name</p>
                  <p className="font-medium text-sm">{kycDetailDialog.kyc.legalName}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">National ID</p>
                  <p className="font-medium text-sm">{kycDetailDialog.kyc.nationalId}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Date of Birth</p>
                  <p className="font-medium text-sm">{kycDetailDialog.kyc.dateOfBirth}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <Badge className={getStatusColor(kycDetailDialog.kyc.status)} variant="secondary">
                    {formatStatus(kycDetailDialog.kyc.status)}
                  </Badge>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Residential Address</p>
                <p className="font-medium text-sm">{kycDetailDialog.kyc.residentialAddress}</p>
              </div>

              <Separator />

              {/* ID Front Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <ImageIcon className="size-4 text-[#00A651]" />
                    ID Front Image
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#00A651] border-[#00A651]/30 h-7 text-xs cursor-pointer"
                    onClick={() =>
                      handleDownloadKycDocument(
                        kycDetailDialog.kyc!.id,
                        'front',
                        kycDetailDialog.kyc!.legalName
                      )
                    }
                  >
                    <Download className="size-3 mr-1" />
                    Download
                  </Button>
                </div>
                <div
                  className="relative rounded-lg border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-gray-50 min-h-[150px] flex items-center justify-center"
                  onClick={() =>
                    setKycImageDialog({
                      open: true,
                      imageUrl: `/api/admin/kyc-download/${kycDetailDialog.kyc!.id}?side=front&size=preview`,
                      label: 'ID Front',
                      kycId: kycDetailDialog.kyc!.id,
                      side: 'front',
                    })
                  }
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-5 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
                      <span>Loading…</span>
                    </div>
                  </div>
                  <img
                    src={`/api/admin/kyc-download/${kycDetailDialog.kyc!.id}?side=front&size=thumb`}
                    alt="ID Front"
                    className="w-full max-h-48 object-cover relative z-10"
                    loading="lazy"
                    onLoad={(e) => {
                      const ph = (e.currentTarget.parentElement?.querySelector('.absolute') as HTMLElement | null);
                      if (ph) ph.style.display = 'none';
                      (e.currentTarget as HTMLImageElement).style.opacity = '1';
                    }}
                    onError={(e) => {
                      const ph = (e.currentTarget.parentElement?.querySelector('.absolute') as HTMLElement | null);
                      if (ph) {
                        ph.innerHTML = '<div class=\'text-center text-red-500 text-xs\'><div class=\'font-semibold\'>No image</div><div class=\'text-[10px] mt-0.5\'>Not uploaded</div></div>';
                      }
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    style={{ opacity: 0, transition: 'opacity 200ms ease-in-out' }}
                  />
                </div>
              </div>

              {/* ID Back Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <ImageIcon className="size-4 text-[#00A651]" />
                    ID Back Image
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#00A651] border-[#00A651]/30 h-7 text-xs cursor-pointer"
                    onClick={() =>
                      handleDownloadKycDocument(
                        kycDetailDialog.kyc!.id,
                        'back',
                        kycDetailDialog.kyc!.legalName
                      )
                    }
                  >
                    <Download className="size-3 mr-1" />
                    Download
                  </Button>
                </div>
                <div
                  className="relative rounded-lg border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-gray-50 min-h-[150px] flex items-center justify-center"
                  onClick={() =>
                    setKycImageDialog({
                      open: true,
                      imageUrl: `/api/admin/kyc-download/${kycDetailDialog.kyc!.id}?side=back&size=preview`,
                      label: 'ID Back',
                      kycId: kycDetailDialog.kyc!.id,
                      side: 'back',
                    })
                  }
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-5 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
                      <span>Loading…</span>
                    </div>
                  </div>
                  <img
                    src={`/api/admin/kyc-download/${kycDetailDialog.kyc!.id}?side=back&size=thumb`}
                    alt="ID Back"
                    className="w-full max-h-48 object-cover relative z-10"
                    loading="lazy"
                    onLoad={(e) => {
                      const ph = (e.currentTarget.parentElement?.querySelector('.absolute') as HTMLElement | null);
                      if (ph) ph.style.display = 'none';
                      (e.currentTarget as HTMLImageElement).style.opacity = '1';
                    }}
                    onError={(e) => {
                      const ph = (e.currentTarget.parentElement?.querySelector('.absolute') as HTMLElement | null);
                      if (ph) {
                        ph.innerHTML = '<div class=\'text-center text-red-500 text-xs\'><div class=\'font-semibold\'>No image</div><div class=\'text-[10px] mt-0.5\'>Not uploaded</div></div>';
                      }
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    style={{ opacity: 0, transition: 'opacity 200ms ease-in-out' }}
                  />
                </div>
              </div>

              {/* Actions */}
              {kycDetailDialog.kyc.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-[#00A651] hover:bg-[#008f45] text-white cursor-pointer"
                    onClick={() => {
                      setKycDetailDialog({ open: false, kyc: null });
                      setKycDialog({
                        open: true,
                        userId: kycDetailDialog.kyc!.userId,
                        action: 'verify',
                        name: kycDetailDialog.kyc!.legalName,
                      });
                    }}
                  >
                    <CheckCircle2 className="size-4 mr-1" />
                    Approve & Verify
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      setKycDetailDialog({ open: false, kyc: null });
                      setKycDialog({
                        open: true,
                        userId: kycDetailDialog.kyc!.userId,
                        action: 'reject',
                        name: kycDetailDialog.kyc!.legalName,
                      });
                    }}
                  >
                    <XCircle className="size-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KYC Image Preview Dialog */}
      <Dialog
        open={kycImageDialog.open}
        onOpenChange={(open) =>
          setKycImageDialog({ open, imageUrl: '', label: '', kycId: '', side: 'front' })
        }
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{kycImageDialog.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative rounded-lg border overflow-hidden bg-gray-50 min-h-[200px] flex items-center justify-center">
              {/* Loading spinner shown until image loads */}
              <div
                className="absolute inset-0 flex items-center justify-center text-sm text-gray-500"
                id="kyc-image-loading"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="size-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
                  <span>Loading document…</span>
                </div>
              </div>
              <img
                src={kycImageDialog.imageUrl}
                alt={kycImageDialog.label}
                className="w-full max-h-[60vh] object-contain relative z-10"
                onLoad={(e) => {
                  const loading = document.getElementById('kyc-image-loading');
                  if (loading) loading.style.display = 'none';
                  (e.currentTarget as HTMLImageElement).style.opacity = '1';
                }}
                onError={(e) => {
                  const loading = document.getElementById('kyc-image-loading');
                  if (loading) {
                    loading.innerHTML =
                      '<div class="text-center text-red-500 text-sm"><div class="font-semibold">Failed to load image</div><div class="text-xs mt-1">The document may be missing or corrupted.</div></div>';
                  }
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                style={{ opacity: 0, transition: 'opacity 200ms ease-in-out' }}
              />
            </div>
            <Button
              className="w-full bg-[#00A651] hover:bg-[#008f45] text-white cursor-pointer"
              onClick={() =>
                handleDownloadKycDocument(
                  kycImageDialog.kycId,
                  kycImageDialog.side,
                  'document'
                )
              }
            >
              <Download className="size-4 mr-2" />
              Download {kycImageDialog.label}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* KYC Verify/Reject Confirmation */}
      <AlertDialog
        open={kycDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setKycDialog({ open: false, userId: '', action: 'verify', name: '' });
            setKycReason('');
            setKycLoanLimit('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {kycDialog.action === 'verify' ? 'Verify' : 'Reject'} KYC
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {kycDialog.action === 'verify' ? 'approve' : 'reject'} the KYC
              verification for <strong>{kycDialog.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="kyc-reason">Reason (optional)</Label>
            <Textarea
              id="kyc-reason"
              placeholder={`Reason for ${kycDialog.action}...`}
              value={kycReason}
              onChange={(e) => setKycReason(e.target.value)}
            />
          </div>
          {kycDialog.action === 'verify' && (
            <div className="space-y-2">
              <Label htmlFor="kyc-loan-limit">Loan Limit (KES) — required</Label>
              <Input
                id="kyc-loan-limit"
                type="number"
                min={5000}
                step={1000}
                placeholder="e.g. 50000"
                value={kycLoanLimit}
                onChange={(e) => setKycLoanLimit(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                The user can apply for loans up to this amount after verification.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={kycLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerifyKyc}
              disabled={kycLoading}
              className={
                kycDialog.action === 'verify'
                  ? 'bg-[#00A651] hover:bg-[#008f45] text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
            >
              {kycLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {kycDialog.action === 'verify' ? 'Verify' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENTS SECTION
  // ═══════════════════════════════════════════════════════════════════════
  const renderPayments = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#333333]">Payment Records</h2>
          <p className="text-gray-500 mt-1">Track all STK Push payments and transactions</p>
        </div>
        <Select value={paymentsFilter} onValueChange={setPaymentsFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loadingPayments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[#00A651]" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="size-12 mx-auto mb-3 text-gray-300" />
              <p>No payment records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarFallback className="bg-[#00A651] text-white text-[10px]">
                              {p.user.fullName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{p.user.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-600">{p.transactionId}</TableCell>
                      <TableCell className="text-sm text-gray-600">{p.phoneNumber}</TableCell>
                      <TableCell className="font-semibold text-sm">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          {p.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(p.status)} variant="secondary">
                          {formatStatus(p.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {formatDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // LOAN PRODUCTS SECTION
  // ═══════════════════════════════════════════════════════════════════════
  const renderProducts = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#333333]">Loan Products</h2>
        <p className="text-gray-500 mt-1">Manage available loan products and pricing</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loanProducts.map((product) => (
          <Card key={product.amount} className="border-l-4 border-l-[#00A651]">
            <CardContent className="p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#333333]">
                    {formatCurrency(product.amount)}
                  </h3>
                  <Badge className="bg-[#00A651]/10 text-[#00A651]">Active</Badge>
                </div>
                <Separator />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Processing Fee</span>
                    <span className="font-semibold text-red-500">{formatCurrency(product.processingFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Received</span>
                    <span className="font-semibold text-[#00A651]">
                      {formatCurrency(product.amount - product.processingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Interest (15%)</span>
                    <span className="font-semibold">{formatCurrency(product.amount * 0.15)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Repayment</span>
                    <span className="font-bold">{formatCurrency(product.amount * 1.15)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fee Ratio</span>
                    <span className="font-semibold">{((product.processingFee / product.amount) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIVITY LOGS SECTION
  // ═══════════════════════════════════════════════════════════════════════
  const renderActivity = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#333333]">Activity Logs</h2>
        <p className="text-gray-500 mt-1">Track all user and system activities</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loadingActivity ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[#00A651]" />
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="size-12 mx-auto mb-3 text-gray-300" />
              <p>No activity logs found</p>
            </div>
          ) : (
            <div className="divide-y">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-center size-8 rounded-full bg-gray-100 shrink-0 mt-0.5">
                    <Activity className="size-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                      {log.user && (
                        <span className="text-xs text-gray-500">{log.user.fullName}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{log.details}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS SECTION
  // ═══════════════════════════════════════════════════════════════════════
  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#333333]">Send Notifications</h2>
        <p className="text-gray-500 mt-1">Send notifications to users</p>
      </div>

      {notifSuccess && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          Notification sent successfully!
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send Notification</CardTitle>
          <CardDescription>Send a notification to a specific user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select User</Label>
            <Select
              value={notifForm.userId}
              onValueChange={(v) => setNotifForm({ ...notifForm, userId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Notification title"
              value={notifForm.title}
              onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Notification message"
              rows={4}
              value={notifForm.message}
              onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
            />
          </div>
          <Button
            onClick={handleSendNotification}
            disabled={notifLoading || !notifForm.userId || !notifForm.title || !notifForm.message}
            className="bg-[#00A651] hover:bg-[#008f45] text-white cursor-pointer"
          >
            {notifLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Send className="size-4 mr-2" />}
            Send Notification
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // REPORTS & EXPORT SECTION
  // ═══════════════════════════════════════════════════════════════════════
  const renderReports = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#333333]">Reports & Export</h2>
        <p className="text-gray-500 mt-1">Generate and download reports</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center size-14 rounded-xl bg-blue-50">
              <Users className="size-7 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#333333]">Users Report</h3>
              <p className="text-sm text-gray-500 mt-1">Export all user data including KYC status</p>
            </div>
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/reports?type=users');
                  if (res.ok) {
                    const data = await res.json();
                    downloadJSON(data.users, 'users_report');
                  }
                } catch { /* silently fail */ }
              }}
            >
              <FileDown className="size-4 mr-2" />
              Export Users
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center size-14 rounded-xl bg-[#00A651]/10">
              <FileText className="size-7 text-[#00A651]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#333333]">Loans Report</h3>
              <p className="text-sm text-gray-500 mt-1">Export all loan applications and status</p>
            </div>
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/reports?type=loans');
                  if (res.ok) {
                    const data = await res.json();
                    downloadJSON(data.loans, 'loans_report');
                  }
                } catch { /* silently fail */ }
              }}
            >
              <FileDown className="size-4 mr-2" />
              Export Loans
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center size-14 rounded-xl bg-orange-50">
              <CreditCard className="size-7 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#333333]">Payments Report</h3>
              <p className="text-sm text-gray-500 mt-1">Export all payment transactions</p>
            </div>
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/reports?type=payments');
                  if (res.ok) {
                    const data = await res.json();
                    downloadJSON(data.payments, 'payments_report');
                  }
                } catch { /* silently fail */ }
              }}
            >
              <FileDown className="size-4 mr-2" />
              Export Payments
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center size-14 rounded-xl bg-purple-50">
              <ShieldCheck className="size-7 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#333333]">KYC Report</h3>
              <p className="text-sm text-gray-500 mt-1">Export KYC verification records</p>
            </div>
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/kyc');
                  if (res.ok) {
                    const data = await res.json();
                    downloadJSON(data.records, 'kyc_report');
                  }
                } catch { /* silently fail */ }
              }}
            >
              <FileDown className="size-4 mr-2" />
              Export KYC
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center size-14 rounded-xl bg-yellow-50">
              <Activity className="size-7 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#333333]">Activity Log</h3>
              <p className="text-sm text-gray-500 mt-1">Export system activity logs</p>
            </div>
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/reports?type=activity');
                  if (res.ok) {
                    const data = await res.json();
                    downloadJSON(data.logs, 'activity_report');
                  }
                } catch { /* silently fail */ }
              }}
            >
              <FileDown className="size-4 mr-2" />
              Export Activity
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center size-14 rounded-xl bg-green-50">
              <BarChart3 className="size-7 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#333333]">Summary Report</h3>
              <p className="text-sm text-gray-500 mt-1">Export dashboard summary statistics</p>
            </div>
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/reports?type=summary');
                  if (res.ok) {
                    const data = await res.json();
                    downloadJSON(data, 'summary_report');
                  }
                } catch { /* silently fail */ }
              }}
            >
              <FileDown className="size-4 mr-2" />
              Export Summary
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // --- Helper: Download JSON ---
  function downloadJSON(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- Section Router ---
  const renderSupport = () => {
    const formatTime = (s: string) => {
      try {
        return new Date(s).toLocaleString('en-KE', {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return s;
      }
    };

    // Derived counts
    const openCount = supportChats.filter((c) => c.status === 'open').length;
    const totalUnread = supportChats.reduce((sum, c) => sum + c.unreadCount, 0);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#333333] flex items-center gap-2">
              <Headphones className="size-6 text-[#00A651]" />
              Support Chats
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              User-initiated support conversations. Reply to close the loop.
            </p>
          </div>
          {/* Filter pills */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {(['all', 'open', 'closed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSupportFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer capitalize ${
                  supportFilter === f
                    ? 'bg-white text-[#00A651] shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Resolved'}
              </button>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <MessagesSquare className="size-4" />
                <span className="text-xs font-medium">Total Chats</span>
              </div>
              <p className="text-2xl font-bold text-[#333333] mt-1">{supportChats.length}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-700">
                <CircleDot className="size-4" />
                <span className="text-xs font-medium">Open</span>
              </div>
              <p className="text-2xl font-bold text-[#333333] mt-1">{openCount}</p>
            </CardContent>
          </Card>
          <Card className="border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <Bell className="size-4" />
                <span className="text-xs font-medium">Unread</span>
              </div>
              <p className="text-2xl font-bold text-[#333333] mt-1">{totalUnread}</p>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCheck className="size-4" />
                <span className="text-xs font-medium">Resolved</span>
              </div>
              <p className="text-2xl font-bold text-[#333333] mt-1">{supportChats.length - openCount}</p>
            </CardContent>
          </Card>
        </div>

        {supportError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>{supportError}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          {/* Chat list */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="size-4 text-[#00A651]" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              {loadingSupport && !activeSupportChat ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-[#00A651]" />
                </div>
              ) : supportChats.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-gray-100">
                    <MessageCircle className="size-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">No support chats yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    When users start a support chat, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {supportChats.map((c) => {
                    const active = activeSupportChat?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => openSupportChat(c.id)}
                        className={`flex w-full items-start gap-3 p-3 text-left transition-colors cursor-pointer ${
                          active ? 'bg-[#00A651]/5' : 'hover:bg-gray-50'
                        }`}
                      >
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback className={`text-xs ${
                            c.status === 'open' ? 'bg-[#00A651] text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {c.user.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm text-gray-800 truncate">{c.user.fullName}</p>
                            <p className="text-[10px] text-gray-400 shrink-0">{formatTime(c.lastMessageAt)}</p>
                          </div>
                          <p className="text-xs text-gray-700 truncate">{c.subject}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {c.lastMessage || 'No messages yet'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {c.status === 'open' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#00A651] bg-[#00A651]/10 px-1.5 py-0.5 rounded-full">
                                <span className="size-1.5 rounded-full bg-[#00A651]" />
                                Open
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="size-2.5" />
                                Resolved
                              </span>
                            )}
                            {c.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full min-w-[18px]">
                                {c.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation view */}
          <Card>
            {!activeSupportChat ? (
              <CardContent className="p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-[#00A651]/10">
                  <Headphones className="size-8 text-[#00A651]" />
                </div>
                <p className="text-sm font-semibold text-gray-800">Select a conversation</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Choose a chat from the list to read the user&apos;s messages and reply.
                </p>
              </CardContent>
            ) : loadingSupport ? (
              <CardContent className="p-12 flex items-center justify-center min-h-[400px]">
                <Loader2 className="size-8 animate-spin text-[#00A651]" />
              </CardContent>
            ) : (
              <>
                {/* Conversation header */}
                <CardHeader className="border-b pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="bg-[#00A651] text-white text-sm">
                          {activeSupportChat.user.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {activeSupportChat.user.fullName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="truncate">{activeSupportChat.subject}</span>
                          <span>·</span>
                          <span className="text-gray-500">{activeSupportChat.user.email}</span>
                          <span>·</span>
                          <span className="text-gray-500">{activeSupportChat.user.phone}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={activeSupportChat.status === 'open' ? 'outline' : 'default'}
                      onClick={() => toggleSupportChatStatus(activeSupportChat.id, activeSupportChat.status)}
                      className={`shrink-0 cursor-pointer ${
                        activeSupportChat.status === 'open'
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'bg-[#00A651] hover:bg-[#008f45] text-white'
                      }`}
                    >
                      {activeSupportChat.status === 'open' ? (
                        <><XCircle className="size-3.5 mr-1" />Close</>
                      ) : (
                        <><CheckCircle2 className="size-3.5 mr-1" />Reopen</>
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {/* Messages thread */}
                <CardContent className="p-0">
                  <div className="max-h-[450px] min-h-[300px] overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                    {activeSupportChat.messages.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-8">No messages yet</p>
                    ) : (
                      activeSupportChat.messages.map((m) => {
                        const isFromAdmin = m.senderId !== activeSupportChat.user.id;
                        return (
                          <div
                            key={m.id}
                            className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                isFromAdmin
                                  ? 'bg-[#00A651] text-white rounded-br-md'
                                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                              }`}
                            >
                              {!isFromAdmin && (
                                <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                                  <User className="size-3" />
                                  {activeSupportChat.user.fullName}
                                </p>
                              )}
                              {isFromAdmin && (
                                <p className="text-xs font-semibold text-white/80 mb-1 flex items-center gap-1">
                                  <Headphones className="size-3" />
                                  Support Team
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              <p className={`text-[10px] mt-1 ${isFromAdmin ? 'text-white/70' : 'text-gray-400'}`}>
                                {formatTime(m.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {activeSupportChat.status === 'closed' && (
                      <div className="text-center py-3">
                        <p className="text-xs text-gray-500">
                          This chat was marked as resolved. Reopen it to continue the conversation.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Reply box */}
                  <div className="border-t p-3 bg-white">
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={supportReply}
                        onChange={(e) => setSupportReply(e.target.value)}
                        placeholder={
                          activeSupportChat.status === 'closed'
                            ? 'Reopen the chat to reply...'
                            : 'Type your reply...'
                        }
                        rows={3}
                        maxLength={5000}
                        disabled={activeSupportChat.status === 'closed'}
                        className="resize-none flex-1 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (supportReply.trim() && !supportSending && activeSupportChat.status === 'open') {
                              sendSupportReply();
                            }
                          }
                        }}
                      />
                      <Button
                        onClick={sendSupportReply}
                        disabled={
                          supportSending ||
                          !supportReply.trim() ||
                          activeSupportChat.status === 'closed'
                        }
                        className="bg-[#00A651] hover:bg-[#008f45] text-white cursor-pointer h-10 px-3"
                        aria-label="Send reply"
                      >
                        {supportSending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Reply className="size-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Press Enter to send · Shift+Enter for new line · User will receive a notification
                    </p>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'users':
        return renderUsers();
      case 'applications':
        return renderApplications();
      case 'kyc':
        return renderKyc();
      case 'payments':
        return renderPayments();
      case 'products':
        return renderProducts();
      case 'activity':
        return renderActivity();
      case 'notifications':
        return renderNotifications();
      case 'support':
        return renderSupport();
      case 'reports':
        return renderReports();
      default:
        return renderOverview();
    }
  };

  // --- Main Render ---
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex shrink-0">
        {renderSidebar()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[260px] shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="absolute right-3 top-4 z-10">
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderSidebar()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200/80 bg-white/80 backdrop-blur-md px-4 py-3 sm:px-6 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 lg:hidden cursor-pointer"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#333333] truncate">
                {NAV_ITEMS.find((item) => item.id === activeSection)?.label || 'Dashboard'}
              </h1>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                {new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick refresh */}
            <button
              onClick={() => {
                fetchStats();
                fetchApplications(1, applicationsFilter);
                fetchKycRecords();
                fetchPayments();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#00A651] cursor-pointer"
              aria-label="Refresh data"
              title="Refresh"
            >
              <RefreshCw className="size-4" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100">
              <Avatar className="size-6 ring-1 ring-white">
                <AvatarFallback className="bg-gradient-to-br from-[#00A651] to-[#00ff88] text-white text-[10px] font-bold">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm text-[#333333]">{user?.fullName || 'Admin'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
