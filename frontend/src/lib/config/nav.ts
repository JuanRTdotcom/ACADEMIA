// Sidebar navigation — visual only for now (modules not yet wired).
// `title` and `label` are i18n keys, resolved in the Sidebar via i18n.t().
export interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: string;
  permissions?: string[];
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: "nav.group.general",
    items: [{ label: "nav.dashboard", icon: "grid", href: "/dashboard" }],
  },
  {
    title: "nav.group.superadmin",
    items: [
      {
        label: "nav.companies",
        icon: "building-2",
        href: "/superadmin/companies",
        permissions: ["superadmin.companies.read", "companies.read"],
      },
      {
        label: "nav.systemUsers",
        icon: "user-cog",
        href: "/superadmin/users",
        permissions: ["superadmin.users.read", "systemUsers.read"],
      },
      {
        label: "nav.roles",
        icon: "shield-check",
        href: "/superadmin/roles",
        permissions: ["superadmin.roles.read", "roles.read"],
      },
      {
        label: "nav.countries",
        icon: "globe",
        href: "/superadmin/countries",
        permissions: ["superadmin.countries.read"],
      },
      {
        label: "nav.plans",
        icon: "package",
        href: "/superadmin/plans",
        permissions: ["superadmin.plans.read"],
      },
      {
        label: "nav.subscriptions",
        icon: "credit-card",
        href: "/superadmin/subscriptions",
        permissions: ["superadmin.subscriptions.read"],
      },
    ],
  },
  {
    title: "nav.group.administrator",
    items: [
      {
        label: "nav.company",
        icon: "building-2",
        href: "/administrator/company",
        permissions: ["administrator.company.general.read", "companyProfile.read"],
      },
      {
        label: "nav.companyUsers",
        icon: "users",
        href: "/administrator/users",
        permissions: ["administrator.users.read"],
      },
    ],
  },
];
