import config from "../assets/auxjs/config";

export default async function({ store, redirect, route }) {
  if (process.server) return;
  if (route.path != route.fullPath && route.path === config.urls.game.calendar.path) return;
  await store.dispatch("initAuth");
  if (!store.state.sessionToken) {
    return redirect(
      `${store.getters.config.urls.login.path}?redirect=${encodeURIComponent(
        route.fullPath
      )}`
    );
  }
}
