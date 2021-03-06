import config from "../assets/auxjs/config";

export default async function({ store, redirect, route }) {
  if (process.server) return;
  if (
    route.path != route.fullPath &&
    route.path === config.urls.game.calendar.path
  )
    return;
  if (new Date().getTime() - store.getters.lastAuthed > 60 * 60 * 1000) {
    store.commit("setLastAuthed", new Date().getTime());
  } else return;
  try {
    await store.dispatch("initAuth", {
      $store: store,
      $route: route
    }).catch(err => {});
    if (!store.state.sessionToken) {
      return redirect(
        `${store.getters.config.urls.login.path}?redirect=${encodeURIComponent(
          route.fullPath
        )}`
      );
    }
  } catch (err) {
    store.dispatch("signOut");
    redirect(
      `${store.getters.config.urls.login.path}?redirect=${encodeURIComponent(
        route.fullPath
      )}`
    );
  }
}
