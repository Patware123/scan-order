import Link from "next/link";
import {
  UtensilsCrossed,
  QrCode,
  ChefHat,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col text-[#29241F]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E7E1D8]">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#783F24] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              SO
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[#29241F]">
              ScanOrder
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center font-medium rounded-xl h-10 px-4 text-xs sm:text-sm bg-[#783F24] text-white hover:bg-[#63331D] shadow-xs transition-colors"
            >
              Staff & Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-16">
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C58B45]/30 bg-[#F3E6D4]/60 px-3.5 py-1 text-xs font-semibold text-[#783F24]">
            <Sparkles className="h-3.5 w-3.5 text-[#C58B45]" />
            <span>Production-Ready Multi-Tenant QR SaaS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#29241F] leading-tight">
            Contactless Table Ordering Built for Modern Hospitality
          </h1>

          <p className="text-base sm:text-lg text-[#78716C] max-w-2xl mx-auto leading-relaxed">
            Eliminate customer wait times and paper menus. Diners scan a table QR code, browse rich dietary menus, and submit kitchen-ready orders in seconds—no app download required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/m/royal-biryani/token_ec4e8629_t01"
              className="w-full sm:w-auto inline-flex items-center justify-center font-bold rounded-xl h-12 px-6 text-sm bg-[#783F24] text-white hover:bg-[#63331D] shadow-md transition-all gap-2"
            >
              <QrCode className="h-4 w-4" />
              <span>Try Live Guest Menu (Table T01)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center font-semibold rounded-xl h-12 px-6 text-sm border border-[#E7E1D8] bg-white text-[#29241F] hover:bg-[#FAF8F4] shadow-xs transition-colors gap-2"
            >
              <ChefHat className="h-4 w-4 text-[#783F24]" />
              <span>Open Staff Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Live Interactive Experience Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Customer Mobile Ordering */}
          <div className="rounded-3xl border border-[#E7E1D8] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#F3E6D4] text-[#783F24] flex items-center justify-center">
                <QrCode className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-[#29241F]">
                1. Mobile Guest Menu
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Mobile-first ordering with veg/non-veg filter, category tabs, server-side paise pricing, and idempotent checkout.
              </p>
            </div>

            <Link
              href="/m/royal-biryani/token_ec4e8629_t01"
              className="text-xs font-bold text-[#783F24] hover:underline flex items-center gap-1 pt-2"
            >
              <span>Scan Demo Table T01</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 2: Kitchen Display System (KDS) */}
          <div className="rounded-3xl border border-[#E7E1D8] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#783F24]/10 text-[#783F24] flex items-center justify-center">
                <ChefHat className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-[#29241F]">
                2. Kitchen Display (KDS)
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                3-column Kanban stream for kitchen expeditors and chefs with high-contrast tickets, elapsed timers, and fast status triggers.
              </p>
            </div>

            <Link
              href="/dashboard/kitchen"
              className="text-xs font-bold text-[#783F24] hover:underline flex items-center gap-1 pt-2"
            >
              <span>View Kitchen Board</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 3: Manager & Owner Portal */}
          <div className="rounded-3xl border border-[#E7E1D8] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#557A52]/10 text-[#557A52] flex items-center justify-center">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-[#29241F]">
                3. Restaurant Operations
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Full order review, table QR generator with printable tent-cards, catalog manager, staff invitations, and daily financial reports.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="text-xs font-bold text-[#783F24] hover:underline flex items-center gap-1 pt-2"
            >
              <span>Explore Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="rounded-3xl border border-[#E7E1D8] bg-white p-8 sm:p-12 shadow-xs space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#29241F]">
              Engineered for Speed, Reliability and Financial Safety
            </h2>
            <p className="text-xs sm:text-sm text-[#78716C] max-w-xl mx-auto">
              Built on Next.js 16 App Router, TypeScript, and Supabase PostgreSQL with strict multi-tenant isolation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#29241F]">
                <CheckCircle2 className="h-4 w-4 text-[#557A52]" />
                <span>Zero Floating Math</span>
              </div>
              <p className="text-xs text-[#78716C]">
                All prices and transactions computed in integer paise (INR) with immutable item price snapshots.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#29241F]">
                <CheckCircle2 className="h-4 w-4 text-[#557A52]" />
                <span>Idempotent Checkout</span>
              </div>
              <p className="text-xs text-[#78716C]">
                Database-level uniqueness prevents accidental duplicate orders during network retries or double taps.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#29241F]">
                <CheckCircle2 className="h-4 w-4 text-[#557A52]" />
                <span>Smart Visibility Polling</span>
              </div>
              <p className="text-xs text-[#78716C]">
                Battery-friendly HTTP polling throttles automatically when browser tabs are inactive or hidden.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#29241F]">
                <CheckCircle2 className="h-4 w-4 text-[#557A52]" />
                <span>Tenant Isolation</span>
              </div>
              <p className="text-xs text-[#78716C]">
                Strict PostgreSQL RLS policies ensure data between restaurant brands remains completely segregated.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E7E1D8] bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
          <span>© {new Date().getFullYear()} ScanOrder SaaS. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-[#29241F]">
              Sign In
            </Link>
            <Link href="/m/royal-biryani/token_ec4e8629_t01" className="hover:text-[#29241F]">
              Sample QR Menu
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
