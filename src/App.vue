<template>
  <section id="titlebar">
    <span class="fas" :class="[{ 'fa-cog': !isExtrasOpen }, { 'fa-arrow-left': isExtrasOpen }]" @click="isExtrasOpen = !isExtrasOpen"></span>
    <h1>Downline</h1>
    <span id="minimize-btn" @click="minimize">&minus;</span>
    <span id="close-btn" @click="close">&times;</span>
  </section>

  <section id="main-page">
    <section id="inputbar">
      <input type="text" spellcheck="false" placeholder="Enter URL" v-model="newURL" @keyup.enter="fetchInfo" />
      <span @click="fetchInfo" class="fas fa-plus"></span>
    </section>

    <section id="center" :class="{ 'center-height': showMoreOptions }">
      <transition-group name="fade">
        <div class="downloadable" :class="{ chosen: item.isChosen }" v-for="item in downloadables" :key="item.url">
          <section class="left">
            <img :src="item.thumbnail" onerror="this.src='./static/images/placeholder.png'" />
            <span class="fas fa-play-circle" v-if="item.state === 'stopped'" @click="download(item.url)"></span>
            <span class="fas fa-pause-circle" v-else-if="item.state === 'downloading' || item.state === 'queued'" @click="pause(item.url)"></span>
            <span v-else-if="isCompleted(item)">
              <span class="fas fa-check"></span>
              <span class="fas fa-redo-alt" @click="restart(item.url)"></span>
            </span>
          </section>

          <section class="middle" @click="choose(item)">
            <h1>{{ item.title }}</h1>
            <span class="duration">{{ item.duration }}</span>
            <div class="options" v-if="item.progress.value == 0 && item.state === 'stopped'">
              <div>
                <span class="fas fa-chevron-circle-left" @dblclick.stop @click.stop="decrement(item)"> </span>
                <span class="quality">{{ chosenQuality(item) || "&mdash;" }}</span>
                <span class="fas fa-chevron-circle-right" @dblclick.stop @click.stop="increment(item)"> </span>
              </div>

              <span
                class="option-icon fas"
                :class="{ 'fa-closed-captioning': item.subtitles.length !== 0, selected: item.isSubsChosen }"
                @dblclick.stop
                @click.stop="updateIsSubsChosen(item)"
              >
              </span>
              <span class="option-icon fas fa-music" :class="{ selected: item.isAudioChosen }" @dblclick.stop @click.stop="updateIsAudioChosen(item)">
              </span>
            </div>

            <div class="progress" v-else>
              <span class="info">
                <span v-if="isCompleted(item)">
                  <span class="fas fa-folder" @click="showInFolder(item.filepath)"></span>
                </span>
                <span v-else-if="isStarting(item)">Starting Download</span>
                <span v-else-if="isQueued(item)">Queued</span>
                <span v-else-if="isPaused(item)">
                  <span>{{ item.progress.value }}% of {{ item.progress.size }}</span>
                  <span>Paused</span>
                </span>
                <span v-else-if="isDownloading(item)">
                  <span>{{ item.progress.value }}% of {{ item.progress.size }} &centerdot; {{ item.progress.speed }}</span>
                  <span>{{ item.progress.eta }}</span>
                </span>
                <span class="postprocessing" v-else-if="isPostprocessing(item)">
                  <span class="spinner"></span>
                  Postprocessing
                </span>
              </span>

              <span v-if="!isCompleted(item) && !isPostprocessing(item)" class="bar">
                <span class="value" :style="progressValue(item.url)"></span>
              </span>
            </div>
          </section>

          <section class="right">
            <span class="close" @click="clear(item.url)">&times;</span>
          </section>
        </div>
      </transition-group>
      <div id="empty-message" :class="{ 'show-empty-message': !existsItems }">
        Type or paste a link above or press the <span>&plus;</span> button to grab link from clipboard
      </div>
    </section>

    <section id="bottom">
      <section id="more-options" :class="{ 'more-options-height': showMoreOptions }">
        <div id="global-options" v-if="existsItems">
          <div
            id="download-or-pause-many"
            v-if="chosenItems.length !== 0"
            @click="downloadOrPauseMany"
            class="fas"
            :class="[{ 'fa-pause-circle': areChosenDownloading }, { 'fa-play-circle': !areChosenDownloading }]"
          ></div>
          <span id="global-quality-select" v-if="anyToBeDownloaded">
            <span class="fas fa-chevron-circle-left" @click="decrement(global)"></span>
            <span id="global-quality">{{ chosenQuality(global) || "&mdash;" }}</span>
            <span class="fas fa-chevron-circle-right" @click="increment(global)"></span>
          </span>
          <span
            class="fas fa-closed-captioning"
            data-tooltip="Download Subtitles"
            v-if="anyToBeDownloaded"
            :class="{ selected: global.isSubsChosen, hidden: !anySubbed }"
            @click="updateChosenProp('subs')"
          >
          </span>
          <span
            class="fas fa-music"
            data-tooltip="Audio Only"
            v-if="anyToBeDownloaded"
            :class="{ selected: global.isAudioChosen }"
            @click="updateChosenProp('audio')"
          >
          </span>
        </div>
        <div id="buttons">
          <button data-tooltip="Undo Clear" v-if="this.undo.downloadables" @click="undoClear" class="undo-button">Undo</button>
          <span data-tooltip="Clear Completed" :class="{ hidden: !anyCompleted }" class="fas fa-minus-circle" @click="clearCompleted"></span>
          <span data-tooltip="Clear All" v-if="existsItems && !anyChosen" class="fas fa-times-circle" @click="clearMany"></span>
          <span data-tooltip="Clear Selected" v-if="existsItems && anyChosen" class="fas fa-times-circle" @click="clearMany"></span>
        </div>
      </section>

      <div id="messages">
        <span id="loading-indicator">
          <span class="spinner hidden"></span>
          <span class="hidden">Loading</span>
        </span>
        <span id="show-hide" @click="toggleShowMore">
          <span class="fas fa-angle-up" :class="{ 'rotate-arrow': showMoreOptions }"></span>
        </span>
        <span :class="{ hidden: !existsItems }" id="status"> {{ downloadables.length == 1 ? "1 Item" : downloadables.length + " Items" }} </span>
      </div>
    </section>
  </section>

  <section id="extras" :class="{ 'show-extras': isExtrasOpen }">
    <ul id="tabs">
      <li @click="activeTab = 'settings'" :class="{ active: activeTab === 'settings' }">Settings</li>
      <li @click="activeTab = 'about'" :class="{ active: activeTab === 'about' }">About</li>
    </ul>

    <section id="settings" v-if="activeTab === 'settings'">
      <div id="download-location">
        <label>Download Location</label>
        <div>
          <span id="location-text">{{ downloadLocation }}</span>
          <button id="choose-location" @click="selectDirectory">Browse</button>
        </div>
      </div>

      <div id="max-simultaneous">
        <label>Simultaneous Downloads <small>max. 5</small></label>
        <div>
          <span class="fas fa-chevron-circle-left" @click="maxSimultaneous = maxSimultaneous > 1 ? --maxSimultaneous : maxSimultaneous"></span>
          <span id="max-simultaneous-text">{{ maxSimultaneous }}</span>
          <span class="fas fa-chevron-circle-right" @click="maxSimultaneous = maxSimultaneous < 5 ? ++maxSimultaneous : maxSimultaneous"></span>
        </div>
      </div>

      <div class="formats">
        <header>Audio Format</header>
        <div>
          <span class="fas fa-chevron-circle-left" @click="audioFormatIndex = audioFormatIndex > 0 ? --audioFormatIndex : audioFormatIndex"></span>
          <span class="format-text">{{ audioFormats[audioFormatIndex] }}</span>
          <span class="fas fa-chevron-circle-right" @click="audioFormatIndex = audioFormatIndex < 6 ? ++audioFormatIndex : audioFormatIndex"></span>
        </div>
      </div>

      <div class="formats">
        <header>Video Format</header>
        <div>
          <span class="fas fa-chevron-circle-left" @click="videoFormatIndex = videoFormatIndex > 0 ? --videoFormatIndex : videoFormatIndex"></span>
          <span class="format-text">{{ videoFormats[videoFormatIndex] }}</span>
          <span class="fas fa-chevron-circle-right" @click="videoFormatIndex = videoFormatIndex < 3 ? ++videoFormatIndex : videoFormatIndex"></span>
        </div>
      </div>

      <div id="autonumber-items" @click="autonumberItems = !autonumberItems">
        <span class="fas" :class="[{ 'fa-square': !autonumberItems }, { 'fa-check-square': autonumberItems }]"></span>
        <label>Autonumber Playlist Items</label>
      </div>
    </section>
    <section id="about" v-else-if="activeTab === 'about'">
      <header @click="openLink('https://jarbun.github.io/downline/')">
        <img src="/icon.png" />
        <span>Downline</span>
      </header>
      <div id="app-version">
        Version
        <strong>{{ appVersion }}</strong>
      </div>
      <p>Free and open-source media downloader for YouTube and many other sites</p>
      <div id="author" @click="openLink('https://github.com/jarbun')">Created by <strong>Arjun B</strong></div>

      <button @click="checkForUpdates">
        <span class="spinner" v-show="newVersionMessage == 'loading'"></span>
        {{ newVersionMessage == "loading" ? "Checking" : "Check for Updates" }}
      </button>
      <span class="update-message" v-if="newVersionMessage && newVersionMessage != 'loading'"> {{ newVersionMessage }} </span>

      <button @click="update">
        <span class="spinner" v-show="ytdlUpdateMessage == 'loading' || ytdlDownloading"></span>
        {{ ytdlUpdateMessage == "loading" ? "Checking" : ytdlDownloading ? "Updating" : "Update youtube-dl" }}
      </button>
      <span class="update-message" v-if="ytdlUpdateMessage && ytdlUpdateMessage != 'loading'"> {{ ytdlUpdateMessage }} </span>
    </section>
  </section>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed } from "vue";

// TODO: On exit
/*

// Save Data
ipcRenderer.on('save', event => {
  store.set('downloadables', vm.downloadables);
  store.set('downloadLocation', vm.downloadLocation);
  store.set('maxSimultaneous', vm.maxSimultaneous);
  store.set('autonumberItems', vm.autonumberItems);
  store.set('etag', vm.etag);
  store.set('latestVersion', vm.latestVersion);
  store.set('audioFormatIndex', vm.audioFormatIndex);
  store.set('videoFormatIndex', vm.videoFormatIndex);

  ipcRenderer.send('quit');
});*/

// TODO: Finish this interface
interface DownloadableItem {
  url: string;
  filepath?: string;
  title: string;
  thumbnail?: string;
  duration: string;
  isChosen: boolean;
  state: "stopped" | "completed" | string;
  isSubsChosen: boolean;
  isAudioChosen: boolean;
  formats: {
    video: any[];
    audio: any[];
    videoIndex: number;
    audioIndex: number;
  };
  subtitles: string[];
  progress: {
    value: number;
    size?: string;
    speed?: string;
    eta?: string;
  };
  playlist: {
    exists: boolean;
    entries: number;
    title: string;
    index: number;
  };
}

export default defineComponent({
  name: "App",
  components: {},
  setup(props, context) {
    /*
const ytdl = new YTDL();

const store = new Store('store', {
  downloadables: [],
  downloadLocation: '../',
  maxSimultaneous: 2,
  autonumberItems: false,
  etag: '',
  latestVersion: '',
  audioFormatIndex: 0,
  videoFormatIndex: 0
});*/

    const newURL = ref("");
    const isExtrasOpen = ref(false);
    const showMoreOptions = ref(false);
    const downloadables = reactive<DownloadableItem[]>([]); // store.get('downloadables'),
    const downloadLocation = ref(""); //store.get('downloadLocation'),
    const maxSimultaneous = ref(1); // store.get('maxSimultaneous'),
    const autonumberItems = ref(false); // store.get('autonumberItems'),
    const audioFormatIndex = ref(0); // store.get('audioFormatIndex'),
    const videoFormatIndex = ref(0); // store.get('videoFormatIndex'),
    const etag = ref(""); // store.get('etag'),
    const latestVersion = ref(""); // store.get('latestVersion'),
    const audioFormats = reactive(["mp3", "aac", "flac", "m4a", "opus", "vorbis", "wav"]);
    const videoFormats = reactive(["default", "mp4", "webm", "mkv"]);
    const ongoingDownloads = ref(0);
    const downloadQueue = reactive([]);
    const appVersion = ref(""); // TODO: Put version heer
    const activeTab = ref("settings");
    const newVersionMessage = ref("");
    const ytdlUpdateMessage = ref("");
    const ytdlDownloading = ref(false);
    const undo = reactive({
      downloadables: undefined,
    });

    /**  Returns selected items if any, otherwise all items, that are not yet complete */
    const chosenItems = computed(() => {
      return downloadables.filter((x) => (x.isChosen || !anyChosen.value) && x.state !== "completed");
    });

    /**  Returns items that are yet to be downloaded */
    const modifiableItems = computed(() => {
      // @ts-ignore
      return chosenItems.value.filter((x) => x.state === "stopped" && x.progress?.value == 0);
    });

    /** Returns true if any modifiable items are to be downloaded */
    const anyToBeDownloaded = computed(() => {
      // @ts-ignore
      return chosenItems.value.some((x) => x.state === "stopped" && x.progress?.value == 0);
    });

    /**  Returns true if any modifiable items have subtitles */
    const anySubbed = computed(() => {
      return chosenItems.value.some((x) => x.subtitles?.length !== 0);
    });

    /**  True if all modifiable items are downloading or queued */
    const areChosenDownloading = computed(() => {
      return chosenItems.value.every((x) => x.state !== "stopped");
    });

    /**  Returns true if any modifiable items are completed */
    const anyCompleted = computed(() => {
      return downloadables.some((x) => (x.isChosen || !anyChosen.value) && x.state === "completed");
    });

    /**  Returns true if any item is chosen */
    const anyChosen = computed(() => {
      return downloadables.some((x) => x.isChosen);
    });

    const existsItems = computed(() => {
      return downloadables.length !== 0;
    });

    const global = computed(() => {
      let global = {
        isGlobal: true,
        isSubsChosen: false,
        isAudioChosen: false,
        formats: {
          video: [] as any[],
          audio: [] as any[],
          videoIndex: 0,
          audioIndex: 0,
        },
      };

      // Set audio and video to union of all audio and video formats
      modifiableItems.value.forEach((x) => {
        global.formats.video.push(...x.formats.video);
        global.formats.audio.push(...x.formats.audio);
      });

      global.formats.video = Array.from(new Set(global.formats.video));
      global.formats.audio = Array.from(new Set(global.formats.audio));

      // Sort in ascending order
      global.formats.video.sort((a, b) => a - b);
      global.formats.audio.sort((a, b) => a - b);

      global.formats.videoIndex = global.formats.video.length - 1;
      global.formats.audioIndex = global.formats.audio.length - 1;

      return global;
    });

    return {
      newURL,
      isExtrasOpen,
      showMoreOptions,
      downloadables,
      downloadLocation,
      maxSimultaneous,
      autonumberItems,
      audioFormatIndex,
      videoFormatIndex,
      etag,
      latestVersion,
      audioFormats,
      videoFormats,
      ongoingDownloads,
      downloadQueue,
      appVersion,
      activeTab,
      newVersionMessage,
      ytdlUpdateMessage,
      ytdlDownloading,
      undo,

      chosenItems,
      modifiableItems,
      anyToBeDownloaded,
      anySubbed,
      areChosenDownloading,
      anyCompleted,
      anyChosen,
      existsItems,
      global,
    };
  },
});
</script>
