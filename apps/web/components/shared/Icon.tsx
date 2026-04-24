"use client";

import {
  Activity, AlertOctagon, AlertTriangle, ArrowRight, ArrowUpCircle,
  BarChart3, Bell, Check, CheckCircle, CheckCircle2, ClipboardCheck,
  ClipboardList, CreditCard, Download, FileDown, Home, LayoutDashboard,
  ListChecks, LogIn, LogOut, MessageSquare, MousePointerClick, Palette,
  Pencil, RefreshCw, Rocket, Search, Send, Settings, ShieldAlert,
  UserPlus, Users, Wrench, X, type LucideIcon
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  groups: Users,
  payments: CreditCard,
  engineering: Wrench,
  settings: Settings,
  download: Download,
  emergency_home: ShieldAlert,
  checklist: ListChecks,
  build: Wrench,
  notifications: Bell,
  logout: LogOut,
  query_stats: BarChart3,
  fact_check: ClipboardCheck,
  login: LogIn,
  check: Check,
  task_alt: CheckCircle,
  escalator_warning: AlertTriangle,
  person_add: UserPlus,
  arrow_forward: ArrowRight,
  picture_as_pdf: FileDown,
  monitoring: Activity,
  send: Send,
  upgrade: ArrowUpCircle,
  home: Home,
  ads_click: MousePointerClick,
  lab_profile: ClipboardList,
  chat: MessageSquare,
  refresh: RefreshCw,
  sync: RefreshCw,
  edit: Pencil,
  close: X,
  check_circle: CheckCircle2,
  rocket_launch: Rocket,
  palette: Palette,
  search: Search,
  alert: AlertOctagon,
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, className, style, strokeWidth = 1.5 }: IconProps) {
  const LucideComp = ICON_MAP[name];
  if (!LucideComp) return null;
  return <LucideComp size={size} className={className} style={style} strokeWidth={strokeWidth} />;
}
