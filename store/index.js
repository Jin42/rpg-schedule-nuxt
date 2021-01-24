import { cloneDeep } from "lodash";

import aux from "../assets/auxjs/appaux";
import config from "../assets/auxjs/config";
import authAux from "../assets/auxjs/auth";
import moment from "moment";

const resetItems = {
  sessionToken: null,
  lastRefreshed: 0,
  account: null
};

const baseState = {
  ...resetItems,
  langs: [],
  lang: {},
  env: {
    baseUrl: process.env.BASE_URL,
    apiUrl: process.env.API_URL,
    authUrl: process.env.AUTH_URL,
    inviteUrl: process.env.INVITE_URL,
    githubUIUrl: "https://github.com/Jin42/rpg-schedule-nuxt",
    githubAPIUrl: "https://github.com/Jin42/rpg-schedule",
    paypalUrl: "https://paypal.me/Sillvva",
    donateUrl: "https://www.patreon.com/rpg_schedule",
    twitterUrl: "https://twitter.com/SillvvaSensei",
    cashappUrl: "https://cash.app/$SillvvaSensei"
  },
  enums: {
    GameWhen: {
      DATETIME: "datetime",
      NOW: "now"
    },
    MonthlyType: {
      WEEKDAY: "weekday",
      DATE: "date"
    },
    GameMethod: {
      AUTOMATED: "automated",
      CUSTOM: "custom"
    },
    RescheduleMode: {
      REPOST: "repost",
      UPDATE: "update"
    },
    FrequencyType: {
      NO_REPEAT: "0",
      DAILY: "1",
      WEEKLY: "2",
      BIWEEKLY: "3",
      MONTHLY: "4"
    }
  },
  config: config,
  settings: {},
  userSettings: {},
  snackBars: [],
  socketData: {},
  pushEnabled: false,
  lastListingPage: null,
  lastAuthed: 0,
  lastGuildFetch: 0
};

const reauthenticate = async (vuexContext, app, redirect) => {
  if (app && app.$cookies) {
    vuexContext.dispatch("removeToken", app.$cookies);
    localStorage.setItem("redirect", redirect);
  }
  vuexContext.commit("resetState", resetItems);
  if (app && app.$router) {
    if (app.$router) app.$router.replace("/");
    else window.location = "/";
  }
};

export const state = () => baseState;

export const mutations = {
  resetState(state, resetItems) {
    state.sessionToken = resetItems.sessionToken;
    state.lastRefreshed = resetItems.lastRefreshed;
    state.account = resetItems.account;
  },
  setAccount(state, account) {
    try {
      const guilds = account.guilds
        .map(guild => {
          guild.games = guild.games
            .map(game => {
              const reserved = game.reserved;
              const players = parseInt(game.players);
              game.guildAccount = guild;
              game.slot = Array.isArray(reserved)
                ? reserved.findIndex(r => aux.checkRSVP(r, account.user)) + 1
                : 0;
              game.waitlisted = false;
              game.signedup = false;
              if (game.slot > players) game.waitlisted = true;
              else if (game.slot > 0) game.signedup = true;
              return game;
            })
            .sort((a, b) => {
              return a.timestamp < b.timestamp ? -1 : 1;
            });
          return guild;
        })
        .sort((a, b) => {
          if (a.games.length === 0 && b.games.length === 0)
            return (a.name || "").replace(/^the /i, "") <
              (b.name || "").replace(/^the /i, "")
              ? -1
              : 1;
          if (a.games.length > 0 && b.games.length > 0)
            return (a.name || "").replace(/^the /i, "") <
              (b.name || "").replace(/^the /i, "")
              ? -1
              : 1;
          if (a.games.length === 0) return 1;
          if (b.games.length === 0) return -1;
        });
      account.guilds = guilds;
      account.user.avatarURL = `https://cdn.discordapp.com/avatars/${account.user.id}/${account.user.avatar}.png?size=128`;
      state.account = account;
    } catch (err) {
      aux.log("setAccount", err.message);
    }
  },
  setToken(state, sessionToken) {
    state.sessionToken = sessionToken;
  },
  setLangs(state, langs) {
    state.langs = langs;
  },
  setLang(state, lang) {
    state.lang = lang;
  },
  setGuilds(state, guilds) {
    const account = cloneDeep(state.account);
    guilds = (guilds || [])
      .map(guild => {
        guild.games = guild.games
          .map(game => {
            const reserved = game.reserved;
            const players = parseInt(game.players);
            game.guildAccount = guild;
            game.slot = Array.isArray(reserved)
              ? reserved.findIndex(r => aux.checkRSVP(r, account.user)) + 1
              : 0;
            game.waitlisted = false;
            game.signedup = false;
            if (game.slot > players) game.waitlisted = true;
            else if (game.slot > 0) game.signedup = true;
            return game;
          })
          .sort((a, b) => {
            return a.timestamp < b.timestamp ? -1 : 1;
          });
        return guild;
      })
      .sort((a, b) => {
        if (a.games.length === 0 && b.games.length === 0)
          return (a.name || "").replace(/^the /i, "") <
            (b.name || "").replace(/^the /i, "")
            ? -1
            : 1;
        if (a.games.length > 0 && b.games.length > 0)
          return (a.name || "").replace(/^the /i, "") <
            (b.name || "").replace(/^the /i, "")
            ? -1
            : 1;
        if (a.games.length === 0) return 1;
        if (b.games.length === 0) return -1;
      });
    account.guilds = guilds;
    state.account = account;
  },
  deleteGame(state, gameId) {
    const account = cloneDeep(state.account);
    const guilds = (account.guilds || []).map(guild => {
      const index = guild.games.findIndex(game => game._id === gameId);
      if (index >= 0) guild.games.splice(index, 1);
      return guild;
    });
    account.guilds = guilds;
    state.account = account;
  },
  setSiteSettings(state, settings) {
    state.settings = settings;
  },
  setUserSettings(state, settings) {
    state.userSettings = settings;
  },
  setLastRefreshed(state, time) {
    state.lastRefreshed = time;
  },
  setSnackBars(state, snackBars) {
    state.snackBars = snackBars;
  },
  setSocketData(state, data) {
    state.socketData = data;
  },
  setPushState(state, enabled) {
    state.pushEnabled = enabled;
  },
  setLastListingPage(state, listingPage) {
    state.lastListingPage = listingPage;
  },
  setLastAuthed(state, lastAuthed) {
    state.lastAuthed = lastAuthed;
  },
  setLastGuildFetch(state, time) {
    state.lastGuildFetch = time;
  }
};

export const actions = {
  async nuxtServerInit(vuexContext, context) {
    try {
      vuexContext.commit("resetState", resetItems);
    } catch (err) {
      aux.log("actions.nuxtServerInit", (err && err.message) || err);
    }
  },
  setUser({ commit }, user) {
    commit("setAccount", user);
  },
  async signOut(vuexContext, app) {
    vuexContext.commit("resetState", resetItems);
    vuexContext.dispatch("removeToken", app && app.$cookies);
  },
  authenticate(vuexContext, code) {
    vuexContext.commit("setAuthenticating", true);
    return this.$axios
      .get(`${this.getters.env.apiUrl}/api/login?code=${code}`)
      .then(async result => {
        const authResult = result.data;
        vuexContext.dispatch("setToken", authResult.token);
        return authResult;
      });
  },
  async initAuth(vuexContext, app) {
    if (process.server) vuexContext.commit("setToken", null);

    const tokenCookies = await vuexContext.dispatch(
      "getToken",
      this.$cookies.getAll()
    );

    return new Promise(async (resolve, reject) => {
      let savedAuthResult = {
          message: "No session tokens found",
          reauthenticate: true
        },
        successes = 0;
      try {
        if (
          process.client &&
          vuexContext.getters.sessionToken &&
          (moment().unix() - vuexContext.getters.lastRefreshed) / (60 * 60) < 12
        ) {
          return resolve({ status: "success" });
        }

        const guildFetch = vuexContext.getters.lastGuildFetch === 0;
        for (let i = 0; i < tokenCookies.length; i++) {
          let result = await this.$axios.get(
            `${this.getters.env.apiUrl}/auth-api/${
              guildFetch ? "guilds?page=manage-server&games=true" : "user"
            }`,
            {
              headers: {
                authorization: `Bearer ${tokenCookies[i]}`,
                locale: localStorage.getItem("lang") || "en"
              }
            }
          );
          const authResult = result.data;
          savedAuthResult = authResult;
          if (guildFetch)
            vuexContext.commit("setLastGuildFetch", moment().unix());
          if (authResult.status == "success") {
            successes++;
            vuexContext.dispatch(
              "setToken",
              authResult.token || tokenCookies[i]
            );
            vuexContext.commit("setLastRefreshed", moment().unix());
            if (guildFetch) {
              vuexContext.commit("setAccount", authResult.account);
            }
            if (authResult.user) {
              vuexContext.commit("setUserSettings", authResult.user);
              vuexContext.dispatch("setSelectedLang", authResult.user.lang);
            }
            if (authResult.version) {
              const newVersion = authResult.version.split(".");
              const storedVersion = localStorage.getItem("apiVersion");
              const oldVersion = (storedVersion || "2.0.0").split(".");
              localStorage.setItem("apiVersion", authResult.version);
              if (
                storedVersion &&
                (parseInt(newVersion[0]) > parseInt(oldVersion[0]) ||
                  parseInt(newVersion[1]) > parseInt(oldVersion[1]))
              ) {
                vuexContext.dispatch("signOut").then(() => {
                  vuexContext.dispatch("removeToken", this.$cookies);
                  this.$router.push("/", () => {
                    // window.location.reload(true);
                  });
                });
              }
            }
            break;
          }
        }
      } catch (err) {
        aux.log("actions.initAuth", err);
      }
      if (successes > 0) resolve(savedAuthResult);
      else {
        aux.log(savedAuthResult);
        if (savedAuthResult && savedAuthResult.reauthenticate) {
          reauthenticate(
            vuexContext,
            app,
            /\/games/.test(app.$route.fullPath)
              ? app.$route.fullPath
              : `/games/upcoming`
          );
        }
        reject(savedAuthResult);
      }
    });
  },
  fetchLangs({ commit, dispatch }) {
    try {
      let lang = "en";
      const langCookie = localStorage.getItem("lang");
      if (langCookie) lang = langCookie;

      commit("setLang", require(`../assets/lang/${lang}.json`));
      const langOptions = require(`../assets/lang/langs.json`);
      const langs = langOptions.langs.map(lang => {
        const langData = require(`../assets/lang/${lang}.json`);
        return {
          name: langData.name,
          code: lang
        };
      });
      commit("setLangs", langs);

      dispatch("setSelectedLang", lang);
    } catch (err) {
      aux.log("actions.fetchLangs", (err && err.message) || err);
    }
  },
  setSelectedLang(vuexContext, selectedLang) {
    try {
      const langCookie = localStorage.getItem("lang");
      const lang = require(`../assets/lang/${selectedLang}.json`);

      vuexContext.commit("setLang", lang);

      const userSettings = cloneDeep(vuexContext.getters.userSettings);
      userSettings.lang = selectedLang;
      vuexContext.commit("setUserSettings", userSettings);

      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      localStorage.setItem("lang", selectedLang);
    } catch (err) {
      aux.log("setSelectedLang", err.message);
    }
  },
  async fetchGuilds(vuexContext, { page, games, search, app, guildId }) {
    if (
      !guildId &&
      (moment().unix() - vuexContext.getters.lastGuildFetch) / (60 * 60) < 2
    ) {
      return { status: "success" };
    }

    vuexContext.commit("setLastGuildFetch", moment().unix());
    const tokenCookies = await vuexContext.dispatch(
      "getToken",
      this.$cookies.getAll()
    );

    try {
      if (tokenCookies.length > 0 && !vuexContext.getters.sessionToken)
        await vuexContext.dispatch("initAuth", app);
    } catch (err) {
      vuexContext.dispatch("signOut");
      const url = `${
        store.getters.config.urls.login.path
      }?redirect=${encodeURIComponent(route.fullPath)}`;
      if (app.$router) app.$router.replace(url);
      else window.location = url;
    }

    return new Promise(async (resolve, reject) => {
      try {
        let result = await this.$axios.get(
          `${this.getters.env.apiUrl}/auth-api/${
            guildId ? "guild" : "guilds"
          }?${page ? `&page=${page}` : ""}${games ? `&games=${games}` : ""}${
            guildId ? `&guildId=${guildId}` : ""
          }${search ? `&search=${search}` : ""}`,
          {
            headers: {
              authorization: `Bearer ${vuexContext.getters.sessionToken}`
            }
          }
        );
        const authResult = result.data;
        if (
          authResult.token &&
          authResult.token != vuexContext.getters.sessionToken
        ) {
          vuexContext.dispatch("setToken", authResult.token);
          vuexContext.commit("setLastRefreshed", moment().unix());
          // console.log(1, authResult);
          await authAux.setToken(app, authResult.token);
        }
        if (authResult.status == "success") {
          // console.log(2, authResult);
          if (guildId) {
            vuexContext.commit(
              "setGuilds",
              cloneDeep(vuexContext.getters.account.guilds).map(g => {
                if (g.id === guildId) {
                  g = authResult.guild;
                }
                return g;
              })
            );
          } else {
            vuexContext.commit("setAccount", authResult.account);
            vuexContext.commit("setLastGuildFetch", moment().unix());
          }
          if (authResult.user) {
            vuexContext.commit("setUserSettings", authResult.user);
            vuexContext.dispatch("setSelectedLang", authResult.user.lang);
          }
        } else if (result.data.status == "error") {
          // console.log(3, authResult);
          throw new Error(JSON.stringify(authResult));
        }
        resolve(authResult);
      } catch (err) {
        let authResult = err.message.startsWith("{")
          ? JSON.parse(err.message)
          : null;
        if (authResult && authResult.reauthenticate) {
          return reauthenticate(vuexContext, app, `/games/${page}`);
        }
        aux.log("fetchGuilds", err && err.message);
        reject(err && err.message);
      }
    });
  },
  emptyGuilds({ commit }) {
    if (this.getters.account) {
      const guilds = cloneDeep(this.getters.account.guilds);
      commit(
        "setGuilds",
        guilds.map(g => {
          g.games = [];
          return g;
        })
      );
    }
  },
  async rsvpGame(vuexContext, { gameId, guildId }) {
    try {
      return await this.$axios
        .post(
          `${this.getters.env.apiUrl}/api/rsvp`,
          {
            guild: guildId,
            game: gameId,
            id: vuexContext.getters.account.user.id
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              locale: localStorage.getItem("lang") || "en",
              "Content-Type": "application/json"
            }
          }
        )
        .then(response => {
          const result = response.data;
          if (result.status === "error") {
            vuexContext.dispatch("addSnackBar", {
              message: result.message,
              color: "error",
              timeout: 5
            });
            return false;
          }
          return result;
        });
    } catch (err) {
      console.log(err);
      return false;
    }
  },
  async rsvpGameOld(vuexContext, { gameId, route, app }) {
    const tokenCookies = await vuexContext.dispatch(
      "getToken",
      this.$cookies.getAll()
    );

    if (process.env.NODE_ENV === "development")
      aux.log("rsvpGame", tokenCookies);

    return new Promise(async (resolve, reject) => {
      let savedAuthResult,
        successes = 0,
        reauthenticated = 0;
      for (let i = 0; i < tokenCookies.length; i++) {
        try {
          let result = await this.$axios.post(
            `${this.getters.env.apiUrl}/auth-api/rsvp`,
            {
              g: gameId
            },
            {
              headers: {
                Authorization: `Bearer ${tokenCookies[i]}`,
                locale: localStorage.getItem("lang") || "en",
                "Content-Type": "application/json"
              }
            }
          );
          const authResult = result.data;
          if (authResult.token && authResult.token != tokenCookies[i]) {
            vuexContext.dispatch("setToken", authResult.token);
            await authAux.setToken(app, authResult.token);
          }
          if (authResult.status == "success") {
            successes++;
            savedAuthResult = authResult;
          } else if (result.data.status == "error") {
            if (authResult.reauthenticate) reauthenticated++;
            throw new Error(authResult && authResult.message);
          }
        } catch (err) {
          aux.log(3, err);
        }
      }
      if (successes > 0) resolve(savedAuthResult);
      else {
        if (reauthenticated > 0) reauthenticate(commit, app, route.path);
        reject();
      }
    });
  },
  async fetchGame(vuexContext, { app, param, value }) {
    const tokenCookies = await vuexContext.dispatch(
      "getToken",
      this.$cookies.getAll()
    );

    if (process.env.NODE_ENV === "development")
      aux.log("fetchGame", tokenCookies);

    return new Promise(async (resolve, reject) => {
      let savedResult,
        successes = 0,
        reauthenticated = 0;
      for (let i = 0; i < tokenCookies.length; i++) {
        try {
          const result = await this.$axios.get(
            `${this.getters.env.apiUrl}/auth-api/game?${param}=${value}`,
            {
              headers: {
                Authorization: `Bearer ${tokenCookies[i]}`,
                locale: localStorage.getItem("lang") || "en",
                "Content-Type": "application/json"
              }
            }
          );

          const authResult = result.data;
          if (authResult.token && authResult.token != tokenCookies[i]) {
            vuexContext.dispatch("setToken", authResult.token);
            await authAux.setToken(app, authResult.token);
          }
          if (authResult.status == "success") {
            successes++;
            savedResult = authResult;
          } else if (authResult.status == "error") {
            if (authResult.reauthenticate) reauthenticated++;
            throw new Error(authResult && authResult.message);
          }
        } catch (err) {
          aux.log(3, err);
        }
      }
      if (successes > 0) resolve(savedResult.game);
      else {
        if (reauthenticated > 0) reauthenticate(commit, app, route.path);
        reject();
      }
    });
  },
  async saveGame(vuexContext, { gameData, app }) {
    const tokenCookies = await vuexContext.dispatch(
      "getToken",
      this.$cookies.getAll()
    );

    if (process.env.NODE_ENV === "development")
      aux.log("saveGame", tokenCookies);

    return new Promise(async (resolve, reject) => {
      let savedResult,
        successes = 0,
        reauthenticated = 0;
      for (let i = 0; i < tokenCookies.length; i++) {
        try {
          const result = await this.$axios.post(
            `${this.getters.env.apiUrl}/auth-api/game?${
              gameData._id ? `g=${gameData._id}` : `s=${gameData.s}`
            }`,
            gameData,
            {
              headers: {
                Authorization: `Bearer ${tokenCookies[i]}`,
                locale: localStorage.getItem("lang") || "en",
                "Content-Type": "application/json"
              }
            }
          );

          const authResult = result.data;
          if (authResult.token && authResult.token != tokenCookies[i]) {
            vuexContext.dispatch("setToken", authResult.token);
            await authAux.setToken(app, authResult.token);
          }
          if (authResult.status == "success") {
            successes++;
            savedResult = authResult;
          } else if (authResult.status == "error") {
            if (authResult.reauthenticate) reauthenticated++;
            throw new Error(authResult && authResult.message);
          }
        } catch (err) {
          aux.log(3, err);
        }
      }
      if (successes > 0) resolve(savedResult);
      else {
        if (reauthenticated > 0) reauthenticate(commit, app, route.path);
        reject();
      }
    });
  },
  async deleteGame(vuexContext, { gameId, route, app }) {
    const tokenCookies = await vuexContext.dispatch(
      "getToken",
      this.$cookies.getAll()
    );

    if (process.env.NODE_ENV === "development")
      aux.log("rsvpGame", tokenCookies);

    return new Promise(async (resolve, reject) => {
      let savedAuthResult,
        successes = 0,
        reauthenticated = 0;
      for (let i = 0; i < tokenCookies.length; i++) {
        try {
          let result = await this.$axios.delete(
            `${this.getters.env.apiUrl}/auth-api/game?g=${gameId}`,
            {
              headers: {
                Authorization: `Bearer ${tokenCookies[i]}`,
                locale: localStorage.getItem("lang") || "en",
                "Content-Type": "application/json"
              }
            }
          );
          const authResult = result.data;
          savedAuthResult = authResult;
          if (authResult.token && authResult.token != tokenCookies[i]) {
            await authAux.setToken(app, authResult.token);
          }
          if (authResult.status == "success") {
            successes++;
            vuexContext.dispatch("setToken", authResult.token);
            vuexContext.commit("deleteGame", gameId);
          } else if (result.data.status == "error") {
            if (authResult.reauthenticate) reauthenticated++;
            throw new Error(authResult && authResult.message);
          }
        } catch (err) {
          aux.log(3, err);
        }
      }
      if (successes > 0) resolve(savedAuthResult);
      else {
        if (reauthenticated > 0) reauthenticate(commit, app, route.path);
        reject();
      }
    });
  },
  async restoreGame(vuexContext, { gameId, route, app }) {
    const tokenCookies = await vuexContext.dispatch(
      "getToken",
      this.$cookies.getAll()
    );

    return new Promise(async (resolve, reject) => {
      let savedAuthResult,
        successes = 0,
        reauthenticated = 0;
      for (let i = 0; i < tokenCookies.length; i++) {
        try {
          let result = await this.$axios.get(
            `${this.getters.env.apiUrl}/auth-api/game-restore?g=${gameId}`,
            {
              headers: {
                Authorization: `Bearer ${tokenCookies[i]}`,
                locale: localStorage.getItem("lang") || "en",
                "Content-Type": "application/json"
              }
            }
          );
          const authResult = result.data;
          savedAuthResult = authResult;
          if (authResult.token && authResult.token != tokenCookies[i]) {
            await authAux.setToken(app, authResult.token);
          }
          if (authResult.status == "success") {
            successes++;
            vuexContext.dispatch("setToken", authResult.token);
          } else if (result.data.status == "error") {
            if (authResult.reauthenticate) reauthenticated++;
            throw new Error(authResult && authResult.message);
          }
        } catch (err) {
          aux.log(3, err);
        }
      }
      if (successes > 0) resolve(savedAuthResult);
      else {
        if (reauthenticated > 0) reauthenticate(commit, app, route.path);
        reject();
      }
    });
  },
  fetchSiteSettings(vuexContext) {
    return this.$axios
      .get(`${this.getters.env.apiUrl}/api/site`)
      .then(result => {
        vuexContext.commit("setSiteSettings", result.data.settings);
      });
  },
  saveSiteSettings(vuexContext, { settings, route, app }) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.$axios.post(
          `${this.getters.env.apiUrl}/auth-api/site`,
          settings,
          {
            headers: {
              Authorization: `Bearer ${vuexContext.getters.sessionToken}`,
              "Content-Type": "application/json"
            }
          }
        );

        const authResult = result.data;
        if (
          authResult.token &&
          authResult.token != vuexContext.getters.sessionToken
        ) {
          vuexContext.dispatch("setToken", authResult.token);
          vuexContext.commit("setLastRefreshed", moment().unix());
          await authAux.setToken(app, authResult.token);
        }
        if (authResult.status == "success") {
        } else if (result.data.status == "error") {
          throw new Error(authResult);
        }
        resolve(authResult);
      } catch (err) {
        aux.log("saveSiteSettings", err && err.message);
        if (err.reauthenticate) reauthenticate(vuexContext, app, route);
        reject(err && err.message);
      }
    });
  },
  async saveGuildConfig(vuexContext, { config, route, app }) {
    const tokenCookies = await vuexContext.dispatch(
      "getToken",
      this.$cookies.getAll()
    );

    if (process.env.NODE_ENV === "development")
      aux.log("saveGuildConfig", tokenCookies);

    return new Promise(async (resolve, reject) => {
      let savedAuthResult,
        successes = 0,
        reauthenticated = 0;
      for (let i = 0; i < tokenCookies.length; i++) {
        try {
          const result = await this.$axios.post(
            `${this.getters.env.apiUrl}/auth-api/guild-config?s=${config.guild}`,
            {
              id: config.guild,
              ...config
            },
            {
              headers: {
                Authorization: `Bearer ${tokenCookies[i]}`,
                locale: localStorage.getItem("lang") || "en",
                "Content-Type": "application/json"
              }
            }
          );

          const authResult = result.data;
          if (authResult.token && authResult.token != tokenCookies[i]) {
            vuexContext.dispatch("setToken", authResult.token);
            await authAux.setToken(app, authResult.token);
          }
          if (authResult.status == "success") {
            successes++;
            savedAuthResult = authResult;
            const guilds = cloneDeep(this.getters.account.guilds).map(guild => {
              if (guild.id === config.guild) {
                guild.config = authResult.guildConfig;
              }
              return guild;
            });
            vuexContext.commit("setGuilds", guilds);
          } else if (authResult.status == "error") {
            if (authResult.reauthenticate) reauthenticated++;
            throw new Error(authResult && authResult.message);
          }
        } catch (err) {
          aux.log(3, err);
        }
      }
      if (successes > 0) resolve(savedAuthResult);
      else {
        if (reauthenticated > 0) reauthenticate(commit, this, route.path);
        reject();
      }
    });
  },
  async saveUserSettings(vuexContext, { settings, route, app }) {
    const tokenCookies = await vuexContext.dispatch(
      "getToken",
      this.$cookies.getAll()
    );

    if (process.env.NODE_ENV === "development")
      aux.log("saveUserSettings", tokenCookies);

    return new Promise(async (resolve, reject) => {
      let savedAuthResult,
        successes = 0,
        reauthenticated = 0;
      for (let i = 0; i < tokenCookies.length; i++) {
        try {
          const result = await this.$axios.post(
            `${this.getters.env.apiUrl}/auth-api/user`,
            settings,
            {
              headers: {
                Authorization: `Bearer ${tokenCookies[i]}`,
                locale: localStorage.getItem("lang") || "en",
                "Content-Type": "application/json"
              }
            }
          );

          const authResult = result.data;
          if (authResult.token && authResult.token != tokenCookies[i]) {
            // aux.log(1, authResult.token, tokenCookies[i]);
            await authAux.setToken(app, authResult.token);
          }
          if (authResult.status == "success") {
            successes++;
            savedAuthResult = authResult;
          } else if (result.data.status == "error") {
            // aux.log(5, tokenCookies[i]);
            if (authResult.reauthenticate) reauthenticated++;
            throw new Error(authResult && authResult.message);
          }
        } catch (err) {
          aux.log(3, err);
        }
      }
      if (successes > 0) resolve(savedAuthResult);
      else {
        if (reauthenticated > 0) reauthenticate(commit, this, route.path);
        reject();
      }
    });
  },
  fetchPledges() {
    return this.$axios
      .get(`${this.getters.env.apiUrl}/api/pledges`)
      .then(result => {
        return result.data;
      });
  },
  addSnackBar(vuexContext, snackBar) {
    let snackBars = cloneDeep(vuexContext.getters.snackBars);
    if (!Array.isArray(snackBars)) snackBars = [];
    snackBars.push(snackBar);
    vuexContext.commit("setSnackBars", snackBars);
  },
  removeSnackBar(vuexContext, b) {
    let snackBars = cloneDeep(vuexContext.getters.snackBars);
    if (!Array.isArray(snackBars)) snackBars = [];
    snackBars.splice(b, 1);
    vuexContext.commit("setSnackBars", snackBars);
  },
  isMobile() {
    if (window.innerWidth > 768) return false;
    var hasTouchScreen = false;
    if ("maxTouchPoints" in navigator) {
      hasTouchScreen = navigator.maxTouchPoints > 0;
    } else if ("msMaxTouchPoints" in navigator) {
      hasTouchScreen = navigator.msMaxTouchPoints > 0;
    } else {
      var mQ = window.matchMedia && matchMedia("(pointer:coarse)");
      if (mQ && mQ.media === "(pointer:coarse)") {
        hasTouchScreen = !!mQ.matches;
      } else if ("orientation" in window) {
        hasTouchScreen = true; // deprecated, but good fallback
      } else {
        // Only as a last resort, fall back to user agent sniffing
        var UA = navigator.userAgent || navigator.vendor || window.opera;
        hasTouchScreen =
          /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
            UA
          ) ||
          /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
            UA.substr(0, 4)
          );
      }
    }
    return hasTouchScreen;
  },
  removeToken(vuexContext, $cookies) {
    localStorage.removeItem("token");
    if ($cookies) $cookies.remove("token", { path: "/" });
    if ($cookies) $cookies.remove("token", { path: "/games" });
  },
  getToken(vuexContext, $cookies) {
    if (localStorage.getItem("token")) {
      return [localStorage.getItem("token")];
    } else if ($cookies) {
      const tokenCookies = [];
      for (const name in $cookies) {
        if (name == "token") tokenCookies.push($cookies[name]);
      }
      return tokenCookies;
    } else return [];
  },
  setToken(vuexContext, token) {
    vuexContext.commit("setToken", token);
    if (token) localStorage.setItem("token", token);
  }
};

export const getters = {
  sessionToken(state) {
    return state.sessionToken;
  },
  lastRefreshed(state) {
    return state.lastRefreshed;
  },
  langs(state) {
    return state.langs;
  },
  lang(state) {
    return state.lang;
  },
  userSettings(state) {
    return state.userSettings;
  },
  account(state) {
    return state.account;
  },
  config(state) {
    return state.config;
  },
  env(state) {
    return state.env;
  },
  enums(state) {
    return state.enums;
  },
  siteSettings(state) {
    return state.settings;
  },
  snackBars(state) {
    return state.snackBars;
  },
  socketData(state) {
    return state.socketData;
  },
  pushEnabled(state) {
    return state.pushEnabled;
  },
  lastListingPage(state) {
    return state.lastListingPage;
  },
  lastAuthed(state) {
    return state.lastAuthed;
  },
  lastGuildFetch(state) {
    return state.lastGuildFetch;
  }
};
