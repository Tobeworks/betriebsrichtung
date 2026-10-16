import { nextTick } from "vue";
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type RouterHistory,
} from "vue-router";
import { site } from "./config/site";
import { texte } from "./config/texte";
import ImprintPage from "./pages/ImprintPage.vue";
import MethodPage from "./pages/MethodPage.vue";
import NotFoundPage from "./pages/NotFoundPage.vue";
import PrivacyPage from "./pages/PrivacyPage.vue";
import QualityPage from "./pages/QualityPage.vue";
import StatsPage from "./pages/StatsPage.vue";
import StatusPage from "./pages/StatusPage.vue";
import TimelinePage from "./pages/TimelinePage.vue";

const routen: RouteRecordRaw[] = [
  { path: "/", name: "verlauf", component: TimelinePage, meta: { titel: texte.verlaufTitel } },
  { path: "/statistik", name: "statistik", component: StatsPage, meta: { titel: texte.navStatistik } },
  { path: "/prognosegute", name: "guete", component: QualityPage, meta: { titel: texte.navGuete } },
  { path: "/methodik", name: "methodik", component: MethodPage, meta: { titel: texte.navMethodik } },
  { path: "/status", name: "status", component: StatusPage, meta: { titel: texte.status } },
  { path: "/impressum", name: "impressum", component: ImprintPage, meta: { titel: texte.impressum } },
  { path: "/datenschutz", name: "datenschutz", component: PrivacyPage, meta: { titel: texte.datenschutz } },
  {
    path: "/:pfad(.*)*",
    name: "nicht-gefunden",
    component: NotFoundPage,
    meta: { titel: texte.nichtGefundenTitel },
  },
];

export function erstelleRouter(history: RouterHistory = createWebHistory(import.meta.env.BASE_URL)) {
  const router = createRouter({
    history,
    routes: routen,
    scrollBehavior(_zu, _von, gespeichert) {
      return gespeichert ?? { top: 0 };
    },
  });

  let ersteNavigation = true;
  router.afterEach((zu) => {
    document.title = `${zu.meta.titel} · ${site.name}`;
    if (ersteNavigation) {
      ersteNavigation = false;
      return;
    }
    nextTick(() => document.querySelector<HTMLElement>("main h1")?.focus());
  });

  return router;
}
