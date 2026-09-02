import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import arSettings from "./locales/ar/settings.json";
import arAppointments from "./locales/ar/appointments.json";
import arWelcome from "./locales/ar/welcome.json";
import enSettings from "./locales/en/settings.json";
import enAppointments from "./locales/en/appointments.json";
import enWelcome from "./locales/en/welcome.json";
import enInsurance from "./locales/en/insurance.json";
import arInsurance from "./locales/ar/insurance.json";
import enProviders from "./locales/en/providers.json";
import arProviders from "./locales/ar/providers.json";
import enPatientDetail from "./locales/en/patientDetail.json";
import arPatientDetail from "./locales/ar/patientDetail.json";
import enTriageRules from "./locales/en/triageRules.json";
import arTriageRules from "./locales/ar/triageRules.json";
import enBilling from "./locales/en/billing.json";
import arBilling from "./locales/ar/billing.json";
import enWorkflow from "./locales/en/workflow.json";
import arWorkflow from "./locales/ar/workflow.json";
import enIntegrations from "./locales/en/integrations.json";
import arIntegrations from "./locales/ar/integrations.json";
import enPatients from "./locales/en/patients.json";
import arPatients from "./locales/ar/patients.json";
import enCallCenter from "./locales/en/callCenter.json";
import arCallCenter from "./locales/ar/callCenter.json";
import enAnalytics from "./locales/en/analytics.json";
import arAnalytics from "./locales/ar/analytics.json";
import enDashboard from "./locales/en/dashboard.json";
import arDashboard from "./locales/ar/dashboard.json";
import enLogin from "./locales/en/login.json";
import arLogin from "./locales/ar/login.json";
import enLandingPage from "./locales/en/landingPage.json";
import arLandingPage from "./locales/ar/landingPage.json";
import enAuth from "./locales/en/auth.json";
import arAuth from "./locales/ar/auth.json";
import enSidebar from "./locales/en/sidebar.json";
import arSidebar from "./locales/ar/sidebar.json";
import enAdmin from "./locales/en/admin.json";
import arAdmin from "./locales/ar/admin.json";
import enPlatform from "./locales/en/platform.json";
import arPlatform from "./locales/ar/platform.json";
import enHeader from "./locales/en/header.json";
import arHeader from "./locales/ar/header.json";

i18n.use(initReactI18next).init({
    lng: document.documentElement.lang || "en",
    fallbackLng: "en",
    ns: ["settings", "appointments", "welcome", "insurance", "providers", "patientDetail", "triageRules", "billing", "workflow", "integrations", "patients", "callCenter", "analytics", "dashboard", "login", "landingPage", "auth", "sidebar", "admin", "platform"],
    defaultNS: "settings",
    resources: {
        en: {
            settings: enSettings,
            appointments: enAppointments,
            welcome: enWelcome,
            insurance: enInsurance,
            providers: enProviders,
            patientDetail: enPatientDetail,
            triageRules: enTriageRules,
            billing: enBilling,
            workflow: enWorkflow,
            integrations: enIntegrations,
            patients: enPatients,
            callCenter: enCallCenter,
            analytics: enAnalytics,
            dashboard: enDashboard,
            login: enLogin,
            landingPage: enLandingPage,
            auth: enAuth,
            sidebar: enSidebar,
            admin: enAdmin,
            platform: enPlatform,
            header: enHeader,
        },
        ar: {
            settings: arSettings,
            appointments: arAppointments,
            welcome: arWelcome,
            insurance: arInsurance,
            providers: arProviders,
            patientDetail: arPatientDetail,
            triageRules: arTriageRules,
            billing: arBilling,
            workflow: arWorkflow,
            integrations: arIntegrations,
            patients: arPatients,
            callCenter: arCallCenter,
            analytics: arAnalytics,
            dashboard: arDashboard,
            login: arLogin,
            landingPage: arLandingPage,
            auth: arAuth,
            sidebar: arSidebar,
            admin: arAdmin,
            platform: arPlatform,
            header: arHeader,
        },
    },
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
