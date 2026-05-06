import { createApp } from "vue";
import { createPinia } from "pinia";
import { ThemePlugin, defaultTheme } from "@sgw/ui";
import "virtual:uno.css";
import "./assets/css/base.css";

import App from "./App.vue";
import router from "./router/index";

const app = createApp(App);

app.use(createPinia());
app.use(ThemePlugin, { theme: defaultTheme });
app.use(router);

app.mount("#app");
