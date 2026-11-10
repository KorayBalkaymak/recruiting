import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Inbox,
  SendHorizonal,
  FileText,
  FileSignature,
  Calculator,
  BarChart3,
  UserCog,
  ClipboardCheck,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badgeCountKey?: "openRequests";
  /** When true, only user managers (admin / Geschäftsleitung) see this item. */
  requiresUserManager?: boolean;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Kandidaten", href: "/kandidaten", icon: Users },
  { label: "Portal-Prüfungen", href: "/portal-pruefungen", icon: ClipboardCheck },
  { label: "Kunden", href: "/kunden", icon: Building2 },
  { label: "Vakanzen", href: "/vakanzen", icon: Briefcase },
  { label: "Anfragen", href: "/anfragen", icon: Inbox, badgeCountKey: "openRequests" },
  { label: "Einreichungen", href: "/einreichungen", icon: SendHorizonal },
  { label: "Unterlagen", href: "/unterlagen", icon: FileText },
  { label: "Verträge", href: "/vertraege", icon: FileSignature },
  { label: "Verrechnungssatzrechner", href: "/rechner", icon: Calculator },
  { label: "Reporting", href: "/reporting", icon: BarChart3 },
  {
    label: "Nutzerverwaltung",
    href: "/nutzerverwaltung",
    icon: UserCog,
    requiresUserManager: true,
  },
];
