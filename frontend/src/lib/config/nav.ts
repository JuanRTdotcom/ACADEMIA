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
        permissions: [
          "administrator.company.general.read",
          "administrator.company.contact.read",
          "administrator.company.services.read",
          "administrator.company.agenda.read",
          "administrator.company.fiscal.read",
          "administrator.company.digital_presence.read",
          "administrator.company.identity.read",
          "administrator.company.login_branding.read",
          "administrator.company.communications.read",
          "administrator.company.region.read",
          "administrator.company.subscription.read",
        ],
      },
      {
        label: "nav.services",
        icon: "clipboard-check",
        href: "/administrator/services",
        permissions: ["administrator.services.read"],
      },
      {
        label: "nav.consultationReasons",
        icon: "stethoscope",
        href: "/administrator/consultation-reasons",
        permissions: ["administrator.consultation_reasons.read"],
      },
      {
        label: "nav.vaccines",
        icon: "syringe",
        href: "/administrator/vaccines",
        permissions: ["administrator.vaccines.read"],
      },
      {
        label: "nav.hospitalizationTypes",
        icon: "hospital",
        href: "/administrator/hospitalization-types",
        permissions: ["administrator.hospitalization_types.read"],
      },
      {
        label: "nav.procedures",
        icon: "scissors",
        href: "/administrator/procedures",
        permissions: ["administrator.procedures.read"],
      },
      {
        label: "nav.laboratoryTests",
        icon: "flask-conical",
        href: "/administrator/laboratory-tests",
        permissions: ["administrator.laboratory_tests.read"],
      },
      {
        label: "nav.diagnosticStudies",
        icon: "image",
        href: "/administrator/diagnostic-studies",
        permissions: ["administrator.diagnostic_studies.read"],
      },
      {
        label: "nav.groomingServices",
        icon: "sparkles",
        href: "/administrator/grooming-services",
        permissions: ["administrator.grooming_services.read"],
      },
      {
        label: "nav.companyUsers",
        icon: "users",
        href: "/administrator/users",
        permissions: ["administrator.users.read"],
      },
    ],
  },
  {
    title: "nav.group.clinic",
    items: [
      {
        label: "nav.attentions",
        icon: "stethoscope",
        href: "/clinic/attentions",
        permissions: ["clinic.attentions.read"],
      },
      {
        label: "nav.owners",
        icon: "contact",
        href: "/clinic/owners",
        permissions: ["clinic.owners.read"],
      },
      {
        label: "nav.pets",
        icon: "paw-print",
        href: "/clinic/pets",
        permissions: ["clinic.pets.read"],
      },
    ],
  },
  {
    title: "nav.group.commercial",
    items: [
      { label: "nav.sales", icon: "shopping-cart", href: "/operations/sales", permissions: ["operations.sales.read"] },
      { label: "nav.inventory", icon: "package-search", href: "/operations/inventory", permissions: ["operations.inventory.read"] },
      { label: "nav.electronicBilling", icon: "receipt-text", href: "/operations/billing", permissions: ["operations.billing.read"] },
    ],
  },
  {
    title: "nav.group.scheduling",
    items: [
      { label: "nav.appointments", icon: "calendar-days", href: "/operations/appointments", permissions: ["operations.appointments.read"] },
      { label: "nav.reminders", icon: "bell-ring", href: "/operations/reminders", permissions: ["operations.reminders.read"] },
    ],
  },
  {
    title: "nav.group.reports",
    items: [
      { label: "nav.reports", icon: "chart-no-axes-combined", href: "/operations/reports", permissions: ["operations.reports.read"] },
    ],
  },
];
