import "@fontsource-variable/inter";
import { createApp } from "vue";
import App from "./App.vue";
import { erstelleRouter } from "./router";
import "./styles/global.css";

createApp(App).use(erstelleRouter()).mount("#app");
