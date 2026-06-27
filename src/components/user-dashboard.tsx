'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/components/store';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Home,
  PlusCircle,
  Shield,
  Clock,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  User,
  Mail,
  Phone,
  Lock,
  DollarSign,
  FileText,
  Eye,
  Wallet,
  ArrowLeft,
  CreditCard,
  BarChart3,
  EyeOff,
  MessageCircle,
  Send,
  Headphones,
  Plus,
  MessagesSquare,
} from 'lucide-react';

// ─── Helper Functions ───────────────────────────────────────────────

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
      return 'bg-green-100 text-green-800';
    case 'submitted_for_review':
      return 'bg-blue-100 text-blue-800';
    case 'pending_activation':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'verified':
      return 'bg-green-100 text-green-800';
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

// ─── Types ──────────────────────────────────────────────────────────

interface LoanApplication {
  id: string;
  loanAmount: number;
  processingFee: number;
  amountReceived: number;
  totalRepayment: number;
  repaymentDate: string;
  status: string;
  activationPaid: boolean;
  activationRef?: string;
  paymentRef?: string;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface KycData {
  id: string;
  status: string;
  legalName: string;
  nationalId: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

// ─── Support Chat Types ────────────────────────────────────────────

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
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

interface SupportChatDetail {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  messages: SupportMessage[];
}

type DashboardView =
  | 'overview'
  | 'apply'
  | 'kyc'
  | 'history'
  | 'payments'
  | 'notifications'
  | 'support'
  | 'settings';

// ─── Quick Action Tab Items (for overview page) ────────────────────

const quickTabs: { id: DashboardView; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'apply', label: 'Apply for Loan', icon: <PlusCircle className="h-6 w-6" />, desc: 'Start a new loan application' },
  { id: 'history', label: 'Loan History', icon: <Clock className="h-6 w-6" />, desc: 'View past applications' },
  { id: 'payments', label: 'Payments', icon: <CreditCard className="h-6 w-6" />, desc: 'Track your payments' },
  { id: 'kyc', label: 'KYC Verification', icon: <Shield className="h-6 w-6" />, desc: 'Verify your identity' },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-6 w-6" />, desc: 'View alerts & updates' },
  { id: 'support', label: 'Support Chat', icon: <Headphones className="h-6 w-6" />, desc: 'Message the admin team' },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-6 w-6" />, desc: 'Manage your account' },
];

// ─── Navigation Items (sidebar) ────────────────────────────────────

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <Home className="h-5 w-5" /> },
  { id: 'apply', label: 'Apply for Loan', icon: <PlusCircle className="h-5 w-5" /> },
  { id: 'history', label: 'Loan History', icon: <Clock className="h-5 w-5" /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard className="h-5 w-5" /> },
  { id: 'kyc', label: 'KYC Verification', icon: <Shield className="h-5 w-5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" /> },
  { id: 'support', label: 'Support Chat', icon: <Headphones className="h-5 w-5" /> },
  { id: 'settings', label: 'Account Settings', icon: <Settings className="h-5 w-5" /> },
];

// ─── Component ──────────────────────────────────────────────────────

export default function UserDashboard() {
  const { user, logout, setView, setNotifications, notifications } = useAppStore();

  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [kycStatus, setKycStatus] = useState<string>('not_submitted');
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);

  // ─── Support Chat State ─────────────────────────────────────────
  const [supportChats, setSupportChats] = useState<SupportChatListItem[]>([]);
  const [activeChat, setActiveChat] = useState<SupportChatDetail | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [newChatSubject, setNewChatSubject] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [replyText, setReplyText] = useState('');

  // ─── Data Fetching ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user?.kyc) {
          setKycStatus(meData.user.kyc.status);
          setKycData({
            id: '',
            status: meData.user.kyc.status,
            legalName: meData.user.kyc.legalName,
            nationalId: meData.user.kyc.nationalId,
            verifiedAt: meData.user.kyc.verifiedAt,
          });
        } else {
          setKycStatus('not_submitted');
        }
      }

      const loansRes = await fetch('/api/loans/my-applications');
      if (loansRes.ok) {
        const loansData = await loansRes.json();
        setLoans(loansData.applications || []);
      }

      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifs(notifData.notifications || []);
        setNotifications(notifData.notifications || []);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [setNotifications]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Mark Notification Read ─────────────────────────────────────

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifs((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      }
    } catch {
      // Silently handle
    }
  };

  // ─── Derived Data ───────────────────────────────────────────────

  const unreadCount = notifs.filter((n) => !n.read).length;
  const activeLoans = loans.filter(
    (l) => l.status === 'approved' || l.status === 'pending_activation'
  );
  const latestApplication = loans[0] || null;
  const isKycVerified = kycStatus === 'verified';
  const totalPaid = loans
    .filter((l) => l.activationPaid)
    .reduce((sum, l) => {
      // Approximate activation fee by loan amount bracket
      const amt = l.loanAmount || 0;
      if (amt <= 5000) return sum + 99;
      if (amt <= 10000) return sum + 149;
      if (amt <= 20000) return sum + 249;
      if (amt <= 50000) return sum + 499;
      if (amt <= 100000) return sum + 899;
      if (amt <= 200000) return sum + 1499;
      return sum + 2999;
    }, 0);
  const totalBorrowed = loans.filter((l) => l.status === 'approved').reduce((sum, l) => sum + l.loanAmount, 0);

  // ─── Handle Navigation ──────────────────────────────────────────

  const handleNavClick = (view: DashboardView) => {
    setActiveView(view);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    setView('landing');
  };

  // ─── Back Button Component ──────────────────────────────────────

  const BackButton = ({ target = 'overview' as DashboardView, label = 'Overview' }: { target?: DashboardView; label?: string }) => (
    <button
      onClick={() => setActiveView(target)}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#00A651] transition-colors cursor-pointer mb-4"
    >
      <ArrowLeft className="size-4" />
      Back to {label}
    </button>
  );

  // ─── Sidebar Content ────────────────────────────────────────────

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mkopa.jpg" alt="MKOPA LOAN" className="h-9 w-9 rounded-lg object-cover" />
        <div>
          <h2 className="text-base font-bold text-[#333333]">MKOPA LOAN</h2>
          <p className="text-xs text-gray-500">Digital Lending</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  activeView === item.id
                    ? 'bg-[#00A651]/10 text-[#00A651]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-[#333333]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <Separator />

      {/* User Info & Logout */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[#00A651] text-sm font-semibold text-white">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#333333]">
              {user?.fullName || 'User'}
            </p>
            <p className="truncate text-xs text-gray-500">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  // ─── Overview Section with Tab Navigation ─────────────────────────

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div>
        <h2 className="text-2xl font-bold text-[#333333]">
          Welcome back, {user?.fullName?.split(' ')[0] || 'User'}!
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of your account and loan activity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Account Status */}
        <Card className="border-l-4 border-l-[#00A651]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500">
                  Account
                </p>
                <p className="mt-1 text-sm sm:text-lg font-semibold text-[#333333]">
                  Active
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800 text-[10px]">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Loan Status */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500">
                  Loan Status
                </p>
                <p className="mt-1 text-sm sm:text-lg font-semibold text-[#333333]">
                  {latestApplication
                    ? latestApplication.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                    : 'None'}
                </p>
              </div>
              {latestApplication && (
                <Badge className={getStatusColor(latestApplication.status)}>
                  {latestApplication.status.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activation Fee */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500">
                  Fee Status
                </p>
                <p className="mt-1 text-sm sm:text-lg font-semibold text-[#333333]">
                  {latestApplication
                    ? latestApplication.activationPaid
                      ? 'Paid'
                      : 'Pending'
                    : 'N/A'}
                </p>
              </div>
              {latestApplication && (
                <Badge
                  className={
                    latestApplication.activationPaid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {latestApplication.activationPaid ? 'Paid' : 'Pending'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Limit */}
        <Card className="border-l-4 border-l-[#00A651]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500">
                  Limit
                </p>
                <p className="mt-1 text-sm sm:text-lg font-semibold text-[#333333]">
                  {isKycVerified ? formatCurrency(500000) : formatCurrency(0)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-[#00A651]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Tabs */}
      <div>
        <h3 className="text-base font-semibold text-[#333333] mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-100 bg-white p-4 text-center transition-all hover:border-[#00A651]/40 hover:shadow-md cursor-pointer group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00A651]/10 text-[#00A651] transition-colors group-hover:bg-[#00A651] group-hover:text-white">
                {tab.icon}
              </div>
              <span className="text-sm font-semibold text-[#333333]">{tab.label}</span>
              <span className="text-[10px] text-gray-400 leading-tight">{tab.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Loans */}
      {activeLoans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#333333]">
              <FileText className="h-5 w-5 text-[#00A651]" />
              Active Loans
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Repayment Date</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">
                        {formatCurrency(loan.loanAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(loan.status)}>
                          {loan.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(loan.repaymentDate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(loan.totalRepayment)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#333333]">
              <Bell className="h-5 w-5 text-[#00A651]" />
              Recent Notifications
            </CardTitle>
            {notifs.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#00A651] hover:text-[#008f45]"
                onClick={() => setActiveView('notifications')}
              >
                View All
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {notifs.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No notifications yet
            </p>
          ) : (
            <div className="space-y-3">
              {notifs.slice(0, 3).map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                    notif.read
                      ? 'border-gray-100 bg-white'
                      : 'border-[#00A651]/20 bg-[#00A651]/5'
                  }`}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      notif.read ? 'bg-gray-100' : 'bg-[#00A651]/10'
                    }`}
                  >
                    <Bell
                      className={`h-4 w-4 ${
                        notif.read ? 'text-gray-400' : 'text-[#00A651]'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        notif.read
                          ? 'font-normal text-gray-600'
                          : 'font-semibold text-[#333333]'
                      }`}
                    >
                      {notif.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {formatDate(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#00A651]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ─── Apply for Loan Section ─────────────────────────────────────

  const renderApply = () => (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h2 className="text-2xl font-bold text-[#333333]">Apply for Loan</h2>
        <p className="mt-1 text-sm text-gray-500">
          Start your loan application process
        </p>
      </div>

      {!isKycVerified ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <Shield className="h-8 w-8 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">
                Complete KYC Verification First
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-600">
                You need to complete your KYC verification before you can apply
                for a loan. This helps us verify your identity and protect your
                account.
              </p>
            </div>
            <Button
              className="bg-[#00A651] text-white hover:bg-[#008f45] cursor-pointer"
              size="lg"
              onClick={() => setActiveView('kyc')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Complete KYC
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-[#00A651]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">
                You&apos;re Eligible to Apply!
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-600">
                Your KYC verification is complete. You can now apply for a loan
                up to {formatCurrency(500000)}.
              </p>
            </div>
            <Button
              className="bg-[#00A651] text-white hover:bg-[#008f45] cursor-pointer"
              size="lg"
              onClick={() => setView('loan-apply')}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Apply Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ─── KYC Verification Section ───────────────────────────────────

  const renderKyc = () => (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h2 className="text-2xl font-bold text-[#333333]">KYC Verification</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your identity verification status
        </p>
      </div>

      {kycStatus === 'not_submitted' && (
        <Card className="border-gray-200">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">
                KYC Not Submitted
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-600">
                You haven&apos;t submitted your KYC documents yet. Complete your
                verification to unlock loan applications.
              </p>
            </div>
            <Button
              className="bg-[#00A651] text-white hover:bg-[#008f45] cursor-pointer"
              size="lg"
              onClick={() => setView('kyc')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Complete KYC
            </Button>
          </CardContent>
        </Card>
      )}

      {kycStatus === 'pending' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">
                Verification In Progress
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-600">
                Your KYC documents have been submitted and are currently being
                reviewed. You will be notified once the verification is complete.
              </p>
            </div>
            <Badge className="bg-yellow-100 text-yellow-800 px-4 py-1 text-sm">
              <Clock className="mr-1 h-3 w-3" />
              Pending Review
            </Badge>
          </CardContent>
        </Card>
      )}

      {kycStatus === 'verified' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-[#00A651]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">
                KYC Verified
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-600">
                Your identity has been successfully verified. You are eligible to
                apply for loans.
                {kycData?.verifiedAt && (
                  <span className="block mt-1 text-xs text-gray-400">
                    Verified on {formatDate(kycData.verifiedAt)}
                  </span>
                )}
              </p>
            </div>
            <Badge className="bg-green-100 text-green-800 px-4 py-1 text-sm">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Verified
            </Badge>
          </CardContent>
        </Card>
      )}

      {kycStatus === 'rejected' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">
                KYC Verification Rejected
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-600">
                Your KYC verification was not approved. Please review the reason
                below and resubmit your documents.
              </p>
              {kycData?.rejectionReason && (
                <div className="mt-3 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700">
                  <strong>Reason:</strong> {kycData.rejectionReason}
                </div>
              )}
            </div>
            <Button
              className="bg-[#00A651] text-white hover:bg-[#008f45] cursor-pointer"
              size="lg"
              onClick={() => setView('kyc')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Resubmit KYC
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ─── Loan History Section ───────────────────────────────────────

  const renderHistory = () => (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h2 className="text-2xl font-bold text-[#333333]">Loan History</h2>
        <p className="mt-1 text-sm text-gray-500">
          View all your loan applications
        </p>
      </div>

      {loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">
                No Loan History
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                You haven&apos;t applied for any loans yet.
              </p>
            </div>
            <Button
              className="bg-[#00A651] text-white hover:bg-[#008f45] cursor-pointer"
              onClick={() => setActiveView('apply')}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Apply for a Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Repayment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="text-xs">
                        {formatDate(loan.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(loan.loanAmount)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {formatCurrency(loan.processingFee)}
                      </TableCell>
                      <TableCell className="font-medium text-[#00A651]">
                        {formatCurrency(loan.amountReceived)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(loan.totalRepayment)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(loan.status)}>
                          {loan.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(loan.repaymentDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ─── Payments Section ───────────────────────────────────────────

  const renderPayments = () => (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h2 className="text-2xl font-bold text-[#333333]">Payments</h2>
        <p className="mt-1 text-sm text-gray-500">
          Track your payment activity and activation fees
        </p>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-4 border-l-[#00A651]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A651]/10">
                <CreditCard className="h-5 w-5 text-[#00A651]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Paid</p>
                <p className="text-lg font-bold text-[#333333]">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Borrowed</p>
                <p className="text-lg font-bold text-[#333333]">{formatCurrency(totalBorrowed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Records */}
      {loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">
                No Payment Records
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Your payment records will appear here after you apply for a loan.
              </p>
            </div>
            <Button
              className="bg-[#00A651] text-white hover:bg-[#008f45] cursor-pointer"
              onClick={() => setActiveView('apply')}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Apply for a Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#333333]">
              <CreditCard className="h-5 w-5 text-[#00A651]" />
              Activation Fee Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Date</TableHead>
                    <TableHead>Loan Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="text-xs">
                        {formatDate(loan.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(loan.loanAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={loan.activationPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {loan.activationPaid ? 'Paid (KES 299)' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(loan.status)}>
                          {loan.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ─── Notifications Section ──────────────────────────────────────

  const renderNotifications = () => (
    <div className="space-y-6">
      <BackButton />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#333333]">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-[#00A651] border-[#00A651] hover:bg-[#00A651]/10"
            onClick={async () => {
              for (const n of notifs.filter((nf) => !nf.read)) {
                await markAsRead(n.id);
              }
            }}
          >
            <Eye className="mr-1 h-3 w-3" />
            Mark All Read
          </Button>
        )}
      </div>

      {notifs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">
                No Notifications
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                You don&apos;t have any notifications at the moment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifs.map((notif) => (
            <Card
              key={notif.id}
              className={`cursor-pointer transition-colors ${
                notif.read
                  ? 'border-gray-200'
                  : 'border-[#00A651]/30 bg-[#00A651]/5'
              }`}
              onClick={() => !notif.read && markAsRead(notif.id)}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    notif.read ? 'bg-gray-100' : 'bg-[#00A651]/10'
                  }`}
                >
                  <Bell
                    className={`h-5 w-5 ${
                      notif.read ? 'text-gray-400' : 'text-[#00A651]'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm ${
                        notif.read
                          ? 'font-normal text-gray-700'
                          : 'font-semibold text-[#333333]'
                      }`}
                    >
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#00A651]" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{notif.message}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {formatDate(notif.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Account Settings Section ───────────────────────────────────

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password.');
        return;
      }

      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordSuccess('');
      }, 2500);
    } catch {
      setPasswordError('Network error. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h2 className="text-2xl font-bold text-[#333333]">Account Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#333333]">
            Personal Information
          </CardTitle>
          <CardDescription>
            Your account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-[#00A651] text-xl font-bold text-white">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-[#333333]">
                {user?.fullName || 'User'}
              </p>
              <p className="text-sm text-gray-500">
                Member since {user?.id ? '2024' : 'N/A'}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <User className="mt-0.5 h-5 w-5 shrink-0 text-[#00A651]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Full Name
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#333333]">
                  {user?.fullName || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#00A651]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Email Address
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#333333]">
                  {user?.email || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#00A651]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Phone Number
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#333333]">
                  {user?.phone || 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Change Password Section */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#333333]">
                  Change Password
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Update your account password for security
                </p>
              </div>
              {!changePasswordOpen && (
                <Button
                  className="bg-[#00A651] text-white hover:bg-[#008f45] cursor-pointer"
                  onClick={() => setChangePasswordOpen(true)}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              )}
            </div>

            {changePasswordOpen && (
              <div className="mt-4 rounded-xl border border-[#00A651]/20 bg-[#00A651]/5 p-5 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[#00A651] flex items-center justify-center shrink-0">
                    <Lock className="size-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#333333]">Update Password</h4>
                    <p className="text-xs text-gray-500">Enter your current password and choose a new one</p>
                  </div>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {passwordSuccess}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-11 pr-10"
                        disabled={passwordLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Enter new password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 pr-10"
                        disabled={passwordLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 pr-10"
                        disabled={passwordLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="size-3" />
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setChangePasswordOpen(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordError('');
                        setPasswordSuccess('');
                      }}
                      className="flex-1 h-11 cursor-pointer"
                      disabled={passwordLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-11 bg-[#00A651] hover:bg-[#008f45] text-white font-medium cursor-pointer"
                      disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {passwordLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Updating...
                        </span>
                      ) : (
                        <>
                          <Lock className="size-4 mr-1" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─── View Renderer ──────────────────────────────────────────────

  // ─── Support Chat Handlers ──────────────────────────────────────
  const fetchSupportChats = useCallback(async () => {
    setSupportLoading(true);
    setSupportError(null);
    try {
      const res = await fetch('/api/support/chats', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load chats');
      const data = await res.json();
      setSupportChats(data.chats || []);
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Could not load chats');
    } finally {
      setSupportLoading(false);
    }
  }, []);

  const openSupportChat = useCallback(async (chatId: string) => {
    setSupportLoading(true);
    setSupportError(null);
    try {
      const res = await fetch(`/api/support/chats/${chatId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load conversation');
      const data = await res.json();
      setActiveChat(data.chat);
      // Also refresh list so unread badge clears
      await fetchSupportChats();
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Could not load conversation');
    } finally {
      setSupportLoading(false);
    }
  }, [fetchSupportChats]);

  const createNewChat = useCallback(async () => {
    if (!newChatMessage.trim()) return;
    setSupportSending(true);
    setSupportError(null);
    try {
      const res = await fetch('/api/support/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newChatSubject.trim() || 'General Support',
          message: newChatMessage.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to start chat');
      }
      const data = await res.json();
      setNewChatSubject('');
      setNewChatMessage('');
      setShowNewChatForm(false);
      await fetchSupportChats();
      // Auto-open the newly created chat
      if (data.chat?.id) {
        await openSupportChat(data.chat.id);
      }
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Could not start chat');
    } finally {
      setSupportSending(false);
    }
  }, [newChatSubject, newChatMessage, fetchSupportChats, openSupportChat]);

  const sendReply = useCallback(async () => {
    if (!activeChat || !replyText.trim()) return;
    setSupportSending(true);
    setSupportError(null);
    try {
      const res = await fetch(`/api/support/chats/${activeChat.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to send message');
      }
      setReplyText('');
      // Refresh the active chat to show the new message
      await openSupportChat(activeChat.id);
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Could not send message');
    } finally {
      setSupportSending(false);
    }
  }, [activeChat, replyText, openSupportChat]);

  // Load chats when the user navigates to the support view
  useEffect(() => {
    if (activeView === 'support') {
      fetchSupportChats();
    }
  }, [activeView, fetchSupportChats]);

  // Auto-scroll to bottom of messages when chat updates
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (activeChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeChat?.messages.length, activeChat?.id]);

  // ─── Support Chat Renderer ──────────────────────────────────────
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

    return (
      <div className="space-y-4">
        <BackButton />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#333333] flex items-center gap-2">
              <Headphones className="size-6 text-[#00A651]" />
              Support Chat
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Stuck or need help? Send a message and our team will reply.
            </p>
          </div>
          {!activeChat && !showNewChatForm && (
            <Button
              onClick={() => setShowNewChatForm(true)}
              className="bg-[#00A651] hover:bg-[#008f45] text-white cursor-pointer"
            >
              <Plus className="size-4 mr-1" />
              New Conversation
            </Button>
          )}
        </div>

        {supportError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>{supportError}</span>
          </div>
        )}

        {/* New chat form */}
        {showNewChatForm && !activeChat && (
          <Card className="border-[#00A651]/20">
            <CardHeader>
              <CardTitle className="text-base">Start a new conversation</CardTitle>
              <CardDescription className="text-xs">
                Tell us what you need help with. Our team will reply as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="subject" className="text-xs">Subject (optional)</Label>
                <Input
                  id="subject"
                  value={newChatSubject}
                  onChange={(e) => setNewChatSubject(e.target.value)}
                  placeholder="e.g. Loan application issue"
                  maxLength={120}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="message" className="text-xs">Message</Label>
                <Textarea
                  id="message"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Describe your issue..."
                  rows={4}
                  maxLength={5000}
                  className="mt-1 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{newChatMessage.length}/5000</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={createNewChat}
                  disabled={supportSending || !newChatMessage.trim()}
                  className="bg-[#00A651] hover:bg-[#008f45] text-white cursor-pointer"
                >
                  {supportSending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <>
                      <Send className="size-4 mr-1" />
                      Send Message
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewChatForm(false);
                    setNewChatSubject('');
                    setNewChatMessage('');
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active conversation view */}
        {activeChat ? (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessagesSquare className="size-4 text-[#00A651]" />
                    {activeChat.subject}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Started {formatTime(activeChat.createdAt)} ·
                    <span className={`ml-1 font-medium ${
                      activeChat.status === 'open' ? 'text-[#00A651]' : 'text-gray-500'
                    }`}>
                      {activeChat.status === 'open' ? 'Open' : 'Resolved'}
                    </span>
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveChat(null)}
                  className="cursor-pointer text-gray-500"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Messages thread */}
              <div className="max-h-[60vh] min-h-[300px] overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {activeChat.messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">No messages yet</p>
                ) : (
                  activeChat.messages.map((m) => {
                    const isMine = m.senderId === activeChat.userId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isMine
                              ? 'bg-[#00A651] text-white rounded-br-md'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                          }`}
                        >
                          {!isMine && (
                            <p className="text-xs font-semibold text-[#00A651] mb-1 flex items-center gap-1">
                              <Headphones className="size-3" />
                              Support Team
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                            {formatTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                {activeChat.status === 'closed' && (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500 mb-2">
                      This conversation was marked as resolved.
                    </p>
                    <p className="text-xs text-gray-400">
                      Send a new message to reopen it.
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="border-t p-3 bg-white">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    maxLength={5000}
                    className="resize-none flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim() && !supportSending) {
                          sendReply();
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={sendReply}
                    disabled={supportSending || !replyText.trim()}
                    className="bg-[#00A651] hover:bg-[#008f45] text-white cursor-pointer h-10 px-3"
                    aria-label="Send message"
                  >
                    {supportSending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Press Enter to send · Shift+Enter for new line
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Chat list */
          !showNewChatForm && (
            <Card>
              <CardContent className="p-0">
                {supportLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-8 animate-spin text-[#00A651]" />
                  </div>
                ) : supportChats.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[#00A651]/10">
                      <MessageCircle className="size-7 text-[#00A651]" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">No conversations yet</p>
                    <p className="text-xs text-gray-500 mt-1 mb-4">
                      Need help with a loan, payment, or your account? Start a chat with our support team.
                    </p>
                    <Button
                      onClick={() => setShowNewChatForm(true)}
                      className="bg-[#00A651] hover:bg-[#008f45] text-white cursor-pointer"
                    >
                      <Plus className="size-4 mr-1" />
                      Start a Conversation
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {supportChats.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => openSupportChat(c.id)}
                        className="flex w-full items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${
                          c.status === 'open' ? 'bg-[#00A651]/10' : 'bg-gray-100'
                        }`}>
                          <MessagesSquare className={`size-5 ${c.status === 'open' ? 'text-[#00A651]' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm text-gray-800 truncate">{c.subject}</p>
                            <p className="text-xs text-gray-400 shrink-0">{formatTime(c.lastMessageAt)}</p>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {c.lastMessage || 'No messages yet'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        )}

        {/* Help info card */}
        {!activeChat && (
          <Card className="bg-gradient-to-br from-[#00A651]/5 to-transparent border-[#00A651]/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#00A651]/10">
                  <MessageCircle className="size-5 text-[#00A651]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">How support chat works</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Send a message describing your issue. Our admin team will be notified and reply
                    here — you&apos;ll also see a notification in your Notifications tab. This is not a
                    live chat, but we aim to respond as quickly as possible.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return renderOverview();
      case 'apply':
        return renderApply();
      case 'kyc':
        return renderKyc();
      case 'history':
        return renderHistory();
      case 'payments':
        return renderPayments();
      case 'notifications':
        return renderNotifications();
      case 'support':
        return renderSupport();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  // ─── Main Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00A651]" />
          <p className="text-sm font-medium text-gray-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <ScrollArea className="h-screen">{sidebarContent}</ScrollArea>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="absolute right-3 top-4">
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 cursor-pointer"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 lg:hidden cursor-pointer"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Show back button in header when not on overview */}
            {activeView !== 'overview' && (
              <button
                onClick={() => setActiveView('overview')}
                className="flex items-center gap-1 text-sm text-[#00A651] hover:text-[#008f45] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-[#333333]">
                {navItems.find((item) => item.id === activeView)?.label || 'Dashboard'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => setActiveView('notifications')}
              aria-label="View notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#00A651] text-xs font-semibold text-white">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-[#333333]">
                {user?.fullName?.split(' ')[0] || 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
