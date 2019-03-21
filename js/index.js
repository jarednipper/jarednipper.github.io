Vue.component('artist-details', {
  template: `
    <div>
      <div v-if="isLoaded">
        <section class="hero is-dark is-bold">
          <div class="hero-body">
            <div>
              <span v-bind:class="{ 'artist-name': true, strike:event.cancelled }">{{ details.name }}</span>
              <span v-if="event.cancelled">(CANCELLED)</span>
            </div>
            <div>{{ details.home_town }}</div>
            <div class="tags">
              <span v-for="genre in details.genres" class="tag is-black">{{ genre }}</span>
            </div>

            <p>{{ event.venue.name }}</p>
            <p>{{ event.start_time_moment.format("ddd h:mm") }} - {{ event.end_time_moment.format("h:mma") }}</p>
            <div>
              <img v-bind:src="details.image_app_url" style="width: 100%" />
            </div>
            <div>
              <p class="artist-bio">{{ details.bio || "" }}</p>
            </div>
          </div>
        </section>

        <!--<audio v-bind:src="details.song.stream_url" preload="none" controls=""></audio>-->

      </div>

    </div>
  `,
  props: {
    event: {
      type: Object,
    },
  },
  data() {
    return {
      details: null,
      isLoaded: false,
    };
  },
  /*computed: {
    eventDetails() {
      return this.event;
    },
  },*/
  methods: {
    getEvent() {
      var self = this;
      fetch("https://api.tmf.zone/prod/v1/performers/" + this.event.performers[0].id)
        .then(response => response.json())
        .then(function (data) {
          self.details = data.body;
          self.isLoaded = true;
        });
    }
  },
  mounted() {
    this.getEvent();
  },
  watch: {
    event: function () {
      this.isLoaded = false;
      this.getEvent();
    },
  },
});




new Vue({
  el: "#app",
  data: {
    searchValue: "",
    events: [],
    results: null,
    selectedEvent: null,
    showArtistModal: false,
    selectedVenue: null,
    selectedGenre: null,
    performers: [],
  },
  methods: {
    searchArtist() {
      this.results = this.events.filter(e => e.name.toLowerCase().includes(this.searchValue.toLowerCase()));
    },
    sortByTime() {
      this.results.sort(function (a, b) {
        return a.start_time_moment - b.start_time_moment;
      });
    },
    filterEvents() {
      this.events = this.events.filter(
        e =>
          e.forts.includes("Treefort") &&
          e.forts.length == 1 &&
          e.end_time_moment.isAfter()
      );
    },
    momentEvents() {
      this.events.forEach(e => {
        e.start_time_moment = moment(e.start_time);
        e.end_time_moment = moment(e.end_time);
      });
    },
    sortByVenue() {
      this.results = this.results.sort(function (a, b) {
        if (a.venue.name.toLowerCase() < b.venue.name.toLowerCase()) return -1;
        if (a.venue.name.toLowerCase() > b.venue.name.toLowerCase()) return 1;

        return a.start_time_moment - b.start_time_moment;
      });
    },
    sortByArtist() {
      this.results = this.results.sort(function (a, b) {
        if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;

        return a.start_time_moment - b.start_time_moment;
      });
    },
    venueUrl(venue) {
      return "https://www.google.com/maps/search/" + venue.street + "+" + venue.zip;
    },
    setSelectedEvent(event) {
      this.selectedEvent = event;
      this.showArtistModal = true;
    },
    venues() {
      return [...new Set(this.events.map(d => d.venue.name))].sort()
    },
    venueSelected() {
      if (this.selectedVenue === null) {
        this.results = this.events;
      } else {
        this.results = this.events.filter(e => e.venue.name == this.selectedVenue);
      }
    },
    genres() {
      return [...new Set(this.performers.filter(p => p.genres != null).map(p => p.genres).reduce((flat, toFlatten) => flat.concat(toFlatten), []))].sort();
    },
    genreSelected() {
      if (this.selectedGenre === null) {
        this.results = this.events;
      } else {
        var names = this.performers.filter(p => p.genres != null && p.genres.includes(this.selectedGenre)).map(p => p.name);
        this.results = this.events.filter(e => names.includes(e.name))
      }
    },
  },
  mounted() {
    var self = this;

    //window.localStorage.clear("treefortEvents");

    // expire cache after 1 hour
    if (window.localStorage.getItem("treefortEventsTime") && moment().isAfter(moment(window.localStorage.getItem("treefortEventsTime")).add(1, "hours"))) {
      console.log("expiring cache");
      window.localStorage.clear("treefortEvents");
      window.localStorage.clear("treefortPerformers");
    }

    if (window.localStorage.getItem("treefortEvents") !== null) {
      console.log("got from localstorage");
      self.events = JSON.parse(window.localStorage.getItem("treefortEvents"));
      self.performers = JSON.parse(window.localStorage.getItem("treefortPerformers"));
      self.momentEvents();
      self.filterEvents();
      self.results = self.events;
    } else {
      console.log("getting from api");
      fetch("https://api.tmf.zone/prod/v1/events")
        .then(response => response.json())
        .then(function (data) {
          self.events = data.body;
        })
        .then(function () {
          self.momentEvents();
        })
        .then(function () {
          self.filterEvents();
        })
        .then(function () {
          self.results = self.events;
          self.sortByTime();
          window.localStorage.setItem("treefortEvents", JSON.stringify(self.events));
          window.localStorage.setItem("treefortEventsTime", moment());
        });

      fetch("https://api.tmf.zone/prod/v1/performers")
        .then(response => response.json())
        .then(function (data) {
          self.performers = data.body;
        })
        .then(function () {
          window.localStorage.setItem("treefortPerformers", JSON.stringify(self.performers));
        });
    }
  }
});
