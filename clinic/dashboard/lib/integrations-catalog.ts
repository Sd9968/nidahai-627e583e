// Static catalog of connectors shown in the Integrations marketplace.
// Per-clinic enable/config state lives in the `integrations` table.

export type IntegrationField = {
  key: string;
  label: string;
  type?: "text" | "password" | "url";
  placeholder?: string;
};

export type IntegrationDef = {
  provider: string; // stable id stored in DB
  name: string;
  description: string;
  category: "Helpdesk" | "CRM" | "Scheduling" | "Telephony" | "Storage" | "Commerce" | "Developer";
  accent: string; // icon tile color
  fields: IntegrationField[];
};

export const CATEGORIES = [
  "All",
  "CRM",
  "Helpdesk",
  "Scheduling",
  "Telephony",
  "Storage",
  "Commerce",
  "Developer",
] as const;

export const INTEGRATION_CATALOG: IntegrationDef[] = [
  {
    provider: "hubspot",
    name: "HubSpot",
    description: "Capture and sync new leads",
    category: "CRM",
    accent: "#ff7a59",
    fields: [{ key: "api_key", label: "Private App Token", type: "password", placeholder: "pat-na1-…" }],
  },
  {
    provider: "salesforce",
    name: "Agentforce",
    description: "Deploy AI service agents",
    category: "CRM",
    accent: "#00a1e0",
    fields: [
      { key: "instance_url", label: "Instance URL", type: "url", placeholder: "https://your.my.salesforce.com" },
      { key: "access_token", label: "Access Token", type: "password" },
    ],
  },
  {
    provider: "leadsquared",
    name: "LeadSquared",
    description: "Track and nurture leads",
    category: "CRM",
    accent: "#1b4dff",
    fields: [
      { key: "access_key", label: "Access Key", type: "password" },
      { key: "secret_key", label: "Secret Key", type: "password" },
    ],
  },
  {
    provider: "zendesk",
    name: "Zendesk",
    description: "Create tickets from calls",
    category: "Helpdesk",
    accent: "#03363d",
    fields: [
      { key: "subdomain", label: "Subdomain", placeholder: "yourco" },
      { key: "api_token", label: "API Token", type: "password" },
    ],
  },
  {
    provider: "freshworks",
    name: "Freshworks",
    description: "Log support automatically",
    category: "Helpdesk",
    accent: "#5a67d8",
    fields: [
      { key: "domain", label: "Domain", placeholder: "yourco.freshdesk.com" },
      { key: "api_key", label: "API Key", type: "password" },
    ],
  },
  {
    provider: "servicenow",
    name: "ServiceNow",
    description: "Automate support workflows",
    category: "Helpdesk",
    accent: "#62d84e",
    fields: [
      { key: "instance", label: "Instance", placeholder: "yourco.service-now.com" },
      { key: "api_token", label: "API Token", type: "password" },
    ],
  },
  {
    provider: "calendly",
    name: "Calendly",
    description: "Schedule meetings from calls",
    category: "Scheduling",
    accent: "#006bff",
    fields: [{ key: "api_key", label: "Personal Access Token", type: "password" }],
  },
  {
    provider: "zoom",
    name: "Zoom",
    description: "Trigger or join live meetings",
    category: "Scheduling",
    accent: "#2d8cff",
    fields: [
      { key: "account_id", label: "Account ID" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
  },
  {
    provider: "twilio",
    name: "Twilio",
    description: "Power secure voice calls",
    category: "Telephony",
    accent: "#f22f46",
    fields: [
      { key: "account_sid", label: "Account SID" },
      { key: "auth_token", label: "Auth Token", type: "password" },
    ],
  },
  {
    provider: "plivo",
    name: "Plivo",
    description: "Scale cloud voice infrastructure",
    category: "Telephony",
    accent: "#1d2b53",
    fields: [
      { key: "auth_id", label: "Auth ID" },
      { key: "auth_token", label: "Auth Token", type: "password" },
    ],
  },
  {
    provider: "sendbird",
    name: "Sendbird Calls",
    description: "Enable real-time voice routing",
    category: "Telephony",
    accent: "#742ddd",
    fields: [{ key: "app_id", label: "Application ID" }, { key: "api_token", label: "API Token", type: "password" }],
  },
  {
    provider: "google_drive",
    name: "Google Drive",
    description: "Save transcripts to cloud",
    category: "Storage",
    accent: "#1fa463",
    fields: [{ key: "folder_id", label: "Folder ID" }, { key: "service_account", label: "Service Account JSON", type: "password" }],
  },
  {
    provider: "shopify",
    name: "Shopify",
    description: "Manage orders via voice",
    category: "Commerce",
    accent: "#95bf47",
    fields: [
      { key: "shop", label: "Shop Domain", placeholder: "yourco.myshopify.com" },
      { key: "admin_token", label: "Admin API Token", type: "password" },
    ],
  },
  {
    provider: "webhook",
    name: "Webhook / API",
    description: "Build custom voice workflows",
    category: "Developer",
    accent: "#4a3f32",
    fields: [
      { key: "url", label: "Endpoint URL", type: "url", placeholder: "https://api.yourco.com/hooks/nidah" },
      { key: "secret", label: "Signing Secret", type: "password" },
    ],
  },
];
