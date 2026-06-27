#!/usr/bin/env python3
"""Replace the renderOverview function in admin-dashboard.tsx with a new premium fintech design."""
import re
import sys

FILE = "/home/z/my-project/src/components/admin-dashboard.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    src = f.read()

# Find the renderOverview function: from "const renderOverview = () => (" to the closing ");"
# that precedes "// USERS MANAGEMENT SECTION"
start_marker = "  const renderOverview = () => ("
end_marker = "  );\n\n  // ═══════════════════════════════════════════════════════════════════════\n  // USERS MANAGEMENT SECTION"

start_idx = src.find(start_marker)
if start_idx == -1:
    print("ERROR: start marker not found", file=sys.stderr)
    sys.exit(1)

end_idx = src.find(end_marker, start_idx)
if end_idx == -1:
    print("ERROR: end marker not found", file=sys.stderr)
    sys.exit(1)

# end_idx points to the start of "  );\n\n  // ═══..." — we want to replace up to and including "  );\n"
# The actual end is at end_idx + len("  );\n")
replace_end = end_idx + len("  );\n")

old_block = src[start_idx:replace_end]
print(f"Found renderOverview: {len(old_block)} chars, {old_block.count(chr(10))} lines")

NEW_OVERVIEW = r'''  const renderOverview = () => {
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
'''

new_src = src[:start_idx] + NEW_OVERVIEW + src[replace_end:]

with open(FILE, "w", encoding="utf-8") as f:
    f.write(new_src)

print(f"Done. Old block: {len(old_block)} chars. New block: {len(NEW_OVERVIEW)} chars.")
print(f"File size: {len(src)} -> {len(new_src)} chars.")
