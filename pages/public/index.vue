<template>
  <v-app v-if="loading">
    <v-flex class="d-flex" justify-center align-center style="height: 100%;">
      <v-progress-circular :size="100" :width="7" color="discord" indeterminate></v-progress-circular>
    </v-flex>
  </v-app>
  <v-container v-else d-flex flex-column align-center style="height: 100%;">
    <v-row justify="center">
      <v-col cols="6" class="text-right">
        <v-btn
          :href="$store.getters.env.inviteUrl"
          target="_blank"
          @click="invited"
        >{{lang.nav.INVITE}}</v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn :href="$store.getters.env.authUrl" class="bg-discord">{{lang.nav.LOGIN}}</v-btn>
      </v-col>
    </v-row>
    <v-row justify="center" >
      <v-col class="text-center">
        <h1>{{ guildName }}</h1>
      </v-col>
    </v-row>
    <v-row dense>
      <v-col v-for="day in output" v-bind:key="day.date" justify="center" 
            cols="12"
            sm="12"
            md="6"
            lg="4"
            xl="3"
      >
        <div class="day-div">
          <center>
            <h3>{{ day.date }}</h3>
            <table border=1 class="day-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>DURATION</th>
                  <th>TITLE</th>
                  <th>PLAYER</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="game in day.games">
                  <td>{{ game.time }}</td>
                  <td>{{ game.duration }}</td>
                  <td>{{ game.title }}</td>
                  <td>{{ game.players }}</td>
                </tr>
              </tbody>
            </table>
          </center>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import lang from "../../assets/lang/en.json";
import axios from 'axios';

export default {
  layout: "noframe",
  data() {
    return {
      lang: lang,
      windowWidth: 0,
      windowHeight: 0,
      loading: false,
      interval: undefined,
      env: this.$store.getters.env,
      guildName: "",
      output: "",
      onResize: () => {
        this.windowWidth = window.innerWidth;
        this.windowHeight = window.innerHeight;
      }
    };
  },
  computed: {
    stateLang() {
      const lang = this.$store.getters.lang;
      return lang;
    }
  },
  watch: {
    stateLang: {
      handler: "setLang",
      immediate: true
    }
  },
  methods: {
    setLang(newVal) {
      this.lang = newVal;
    },
    addLeadingZero(number) {
      return ( number < 10 ? '0' : '' ) + number;
    },
    requestUpdate() {
       const guildId = this.$route.query.guild;
	  axios.get(this.env.apiUrl+'/api/publictt?guild='+guildId).then((response) => {
            var data = response.data;
	    if (data.status === "success")
	    {
              this.guildName = data.guildName;
	      let games = data.games;
	      games.sort((a,b) => {
                if (a.starttime < b.starttime) {
                  return -1;
                }
                if (b.starttime < a.starttime) {
                  return 1;
                }
                return 0;
              });

	      var output = "";
              var currentDay = "";
              var outData = [];
              var dayObject;
              games.forEach(game => {
                var dateTime = new Date(game.starttime);
                var day = this.addLeadingZero(dateTime.getDate()) + "." + this.addLeadingZero(dateTime.getMonth()+1) + "." + dateTime.getFullYear();

                if (day !== currentDay)
                {
                  currentDay = day;
                  dayObject = { "date": day, games: []};

                  outData.push(dayObject);
                }
                var tableGame = {};
                tableGame.time = this.addLeadingZero(dateTime.getHours()) + ":" + this.addLeadingZero(dateTime.getMinutes());
                tableGame.duration = game.runtime + " hours";
                tableGame.title = game.name;
                tableGame.players = game.players + "/" + game.maxPlayers;
                dayObject.games.push(tableGame);

              });
              this.output = outData;
	    }
	    else
	    {
              this.guildName = "Unknown Guild";
	    }
    });},
    invited() {
      localStorage.setItem("invited", 1);
    }
  },
  created() {
    this.lang = lang;
    this.requestUpdate();
    this.interval = setInterval(this.requestUpdate, 10000);
  },
  async mounted() {
    window.addEventListener("resize", this.onResize);
    this.onResize();
    this.$router

    const tokenCookies = await this.$store.dispatch(
      "getToken",
      this.$cookies.getAll()
    );
    if (tokenCookies.length > 0) {
      await this.$store
        .dispatch("fetchGuilds", {
          app: this
        })
        .then(result => {
          if (result.status === "success") {
            this.account = result.account;
            if (this.$route.path === "/")
              this.$router.replace(localStorage.getItem("redirectToken") || "/games/upcoming");
          }
          return result;
        });
    }

    this.loading = false;
  },
  beforeDestroy() {
    if (this.interval)
    {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    window.removeEventListener("resize", this.onResize);
    if (this.socket) this.socket.close();
  }
};
</script>

<style scoped>
h1 {
  font-size: 64px;
}
h1 img {
  height: 264px;
  margin-top: -10px;
}

h3 {
  text-align: center;
  padding-bottom: 12px;
}

.day-table th {
  padding: 4px 8px;
  text-align: center;
}

.day-table td {
  padding: 2px 4px;
  text-align: center;
}

.day-table {
  border-collapse: collapse;
  border: 3px line;
  padding-bottom: 6px;
  margin-bottom: 12px;
}

.day-div {
  background: #424242 !important;
  padding: 12px;
  text-align: center;
  border-radius: 10px;
}

@media (max-width: 500px) {
  h1 {
    font-size: 48px;
  }
  h1 img {
    margin-top: -8px;
  }
}

@media (max-width: 400px) {
  h1 {
    max-height: 200px;
    font-size: 32px;
  }
  h1 img {
    margin-top: -6px;
  }
}
</style>
