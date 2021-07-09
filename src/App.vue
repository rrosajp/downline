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

          <section class="middle" @click="(ev) => choose(ev, item)">
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
        <span id="loading-indicator" :class="{ hidden: !isLoading }">
          <span class="spinner"></span>
          <span class="">Loading</span>
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
import { app } from "@tauri-apps/api";

// TODO: On exit (and also every once in a while) https://tauri.studio/en/docs/api/js/modules/event
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
    const appVersion = ref("");
    const activeTab = ref("settings");
    const newVersionMessage = ref("");
    const ytdlUpdateMessage = ref("");
    const ytdlDownloading = ref(false);
    const undo = reactive({
      downloadables: undefined as undefined | DownloadableItem[],
    });
    const isLoading = ref(false);

    app.getVersion().then((version) => (appVersion.value = version));

    /**  Returns selected items if any, otherwise all items, that are not yet complete */
    const chosenItems = computed(() => {
      return downloadables.filter((x) => (x.isChosen || !anyChosen.value) && x.state !== "completed");
    });

    /**  Returns items that are yet to be downloaded */
    const modifiableItems = computed(() => {
      return chosenItems.value.filter((x) => x.state === "stopped" && x.progress?.value == 0);
    });

    /** Returns true if any modifiable items are to be downloaded */
    const anyToBeDownloaded = computed(() => {
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

    // TODO: Fix this
    /** A 'combined' item where one can set settings for all videos to download at the same time */
    const global = computed(() => {
      const globalItem = {
        isGlobal: true,
        isSubsChosen: modifiableItems.value.every((x) => x.subtitles.length === 0 || x.isSubsChosen),
        isAudioChosen: modifiableItems.value.every((x) => x.isAudioChosen),
        formats: {
          video: [] as any[],
          audio: [] as any[],
          videoIndex: 0,
          audioIndex: 0,
        },
      };

      // Set audio and video to union of all audio and video formats
      modifiableItems.value.forEach((x) => {
        globalItem.formats.video.push(...x.formats.video);
        globalItem.formats.audio.push(...x.formats.audio);
      });

      globalItem.formats.video = Array.from(new Set(globalItem.formats.video));
      globalItem.formats.audio = Array.from(new Set(globalItem.formats.audio));

      // Sort in ascending order
      globalItem.formats.video.sort((a, b) => a - b);
      globalItem.formats.audio.sort((a, b) => a - b);

      globalItem.formats.videoIndex = globalItem.formats.video.length - 1;
      globalItem.formats.audioIndex = globalItem.formats.audio.length - 1;

      return globalItem;
    });

    function isStarting(item: DownloadableItem) {
      return item.progress.value == 0 && item.state !== "queued";
    }

    function isQueued(item: DownloadableItem) {
      return item.state === "queued";
    }

    function isPaused(item: DownloadableItem) {
      return item.progress.value != 0 && item.state === "stopped";
    }

    function isDownloading(item: DownloadableItem) {
      return item.progress.value != 0 && item.state === "downloading";
    }

    function isCompleted(item: DownloadableItem) {
      return item.state === "completed";
    }

    function isPostprocessing(item: DownloadableItem) {
      return item.state === "postprocessing";
    }

    function choose(ev: MouseEvent, item: DownloadableItem) {
      if (ev.ctrlKey) {
        // If ctrl key is pressed, select clicked item
        item.isChosen = !item.isChosen;
        showMoreOptions.value = true;
      } else {
        // Else unselect all
        showMoreOptions.value = false;
        downloadables.forEach((x) => (x.isChosen = false));
      }
    }

    function chosenQuality(item: DownloadableItem) {
      return item.isAudioChosen ? item.formats.audio[item.formats.audioIndex] : item.formats.video[item.formats.videoIndex];
    }

    function increment(item: DownloadableItem) {
      if (item.isAudioChosen && item.formats.audioIndex < item.formats.audio.length - 1) {
        item.formats.audioIndex++;
      } else if (!item.isAudioChosen && item.formats.videoIndex < item.formats.video.length - 1) {
        item.formats.videoIndex++;
      }

      updateChosenQuality(item);
    }

    function decrement(item: DownloadableItem) {
      if (item.isAudioChosen && item.formats.audioIndex > 0) {
        item.formats.audioIndex--;
      } else if (!item.isAudioChosen && item.formats.videoIndex > 0) {
        item.formats.videoIndex--;
      }

      updateChosenQuality(item);
    }

    function updateChosenQuality(item) {
      // If global audio/video were modified, update audio/video of selected items
      if (item.isGlobal) {
        const newQuality = this.chosenQuality(this.global);

        this.downloadables.forEach((x) => {
          if (x.isChosen || !this.anyChosen) {
            const index = item.isAudioChosen ? x.formats.audio.indexOf(newQuality) : x.formats.video.indexOf(newQuality);

            if (index !== -1) {
              if (item.isAudioChosen) x.formats.audioIndex = index;
              else x.formats.videoIndex = index;
            }
          }
        });
      }
      this.$forceUpdate();
    }

    function updateChosenProp(prop) {
      if (prop === "audio") this.global.isAudioChosen = !this.global.isAudioChosen;
      else this.global.isSubsChosen = !this.global.isSubsChosen;

      this.downloadables.forEach((x) => {
        if ((x.isChosen || !this.anyChosen) && x.state === "stopped" && x.progress.value == 0) {
          if (prop === "audio") x.isAudioChosen = this.global.isAudioChosen;
          else x.isSubsChosen = this.global.isSubsChosen;
        }
      });
    }

    function updateIsAudioChosen(item: DownloadableItem) {
      item.isAudioChosen = !item.isAudioChosen;
    }

    function updateIsSubsChosen(item: DownloadableItem) {
      item.isSubsChosen = !item.isSubsChosen;
    }

    function fetchInfo() {
      if (newURL.value.trim().length !== 0) {
        // Load link if url field is not empty
        isLoading.value = true;

        ytdl.fetchInfo({
          urls: [this.newURL],
          onSuccess: (info) => {
            if (info != null) this.addItem(info);
          },
          onError: (err) => console.log(err),
          onExit: () => {
            isLoading.value = false;
          },
        });

        this.newURL = "";
      } else {
        // Get link from clipboard
        this.newURL = clipboard.readText();
      }
    }

    function addItem(item: DownloadableItem) {
      // Add downloadable to list if not already present
      if (downloadables.findIndex((x) => x.url === item.url) === -1) {
        downloadables.push(item);
      }
    }

    function download(url) {
      const index = this.downloadables.findIndex((x) => x.url === url);
      const item = this.downloadables[index];
      // Stop if an invalid quality is chosen
      if (this.chosenQuality(item) == null) return;

      if (this.ongoingDownloads < this.maxSimultaneous) {
        this.downloadables[index].state = "downloading";

        let outputFormat;
        if (this.downloadables[index].playlist.exists && this.autonumberItems) {
          outputFormat = path.join(
            this.downloadLocation,
            this.downloadables[index].playlist.title,
            `${this.downloadables[index].playlist.index} - %(title)s.%(ext)s`
          );
          this.downloadables[index].filepath = path.join(this.downloadLocation, this.downloadables[index].playlist.title, "*");
        } else if (this.downloadables[index].playlist.exists) {
          outputFormat = path.join(this.downloadLocation, this.downloadables[index].playlist.title, "%(title)s.%(ext)s");
          this.downloadables[index].filepath = path.join(this.downloadLocation, this.downloadables[index].playlist.title, "*");
        } else {
          outputFormat = path.join(this.downloadLocation, "%(title)s.%(ext)s");
          this.downloadables[index].filepath = path.join(this.downloadLocation, "*");
        }

        this.ongoingDownloads++;

        ytdl.download({
          item: item,
          outputFormat: outputFormat,
          audioFormat: this.audioFormats[this.audioFormatIndex],
          videoFormat: this.videoFormats[this.videoFormatIndex],
          onStart: () => console.log("Download Started"),
          onDownload: (url, { progress, filepath, isPostprocessing }) => {
            const index = this.downloadables.findIndex((x) => x.url === url);
            if (progress != null) this.downloadables[index].progress = progress;
            if (filepath != null) this.downloadables[index].filepath = filepath;
            if (isPostprocessing) this.downloadables[index].state = "postprocessing";
          },
          onComplete: (url) => {
            const index = this.downloadables.findIndex((x) => x.url === url);
            // If process was exit after downloading and not after pausing
            if (this.downloadables[index].state === "downloading" || this.downloadables[index].state === "postprocessing") {
              this.downloadables[index].state = "completed";

              this.ongoingDownloads--;
              this.downloadFromQueue();
            }
          },
        });
      } else {
        this.downloadables[index].state = "queued";
        this.downloadQueue.push(url);
      }
    }

    // TODO: This is a reactive function??
    function progressValue(url: string) {
      const value = downloadables.find((x) => x.url === url)?.progress?.value ?? 0;
      return { width: `${value}%` };
    }

    function clear(url: string) {
      pause(url);
      const index = downloadables.findIndex((x) => x.url === url);

      downloadables.splice(index, 1);
    }

    function clearCompleted() {
      undo.downloadables = downloadables.slice();

      downloadables.filter((x) => x.state === "completed").forEach((x) => clear(x.url));
    }

    function clearMany() {
      undo.downloadables = downloadables.slice();

      downloadables.filter((x) => x.isChosen || !anyChosen.value).forEach((x) => clear(x.url));
    }

    function undoClear() {
      if (undo.downloadables !== undefined) {
        downloadables.push(...undo.downloadables);
        undo.downloadables = undefined;
      }
    }

    function toggleShowMore() {
      showMoreOptions.value = !showMoreOptions.value;
    }

    function pause(url) {
      const index = this.downloadables.findIndex((x) => x.url === url);

      if (index !== -1) {
        if (this.downloadables[index].state === "downloading") {
          this.downloadables[index].state = "stopped";
          this.ongoingDownloads--;

          ytdl.pause(url);

          this.downloadFromQueue();
        } else if (this.downloadables[index].state === "queued") {
          this.downloadables[index].state = "stopped";
          // Remove downloadable from queue
          this.downloadQueue.splice(this.downloadQueue.indexOf(url), 1);
        }
      }
    }

    function downloadFromQueue() {
      // If download queue is not empty, request download
      if (downloadQueue.length !== 0) {
        download(downloadQueue.shift());
      }
    }

    function downloadOrPauseMany() {
      if (areChosenDownloading.value) {
        // Pause all chosen
        this.downloadables.forEach((x) => {
          if ((x.isChosen || !this.anyChosen) && x.state !== "completed") this.pause(x.url);
        });
      } else {
        // Download all chosen
        this.downloadables.forEach((x) => {
          if ((x.isChosen || !this.anyChosen) && x.state === "stopped") this.download(x.url);
        });
      }
    }

    function restart(url: string) {
      const item = downloadables.find((x) => x.url === url);
      if (!item) return;

      item.filepath = undefined;
      item.state = "stopped";
      item.isChosen = false;
      item.progress = {
        value: 0,
        size: undefined,
        speed: undefined,
        eta: undefined,
      };
    }

    function showInFolder(filepath) {
      console.log(filepath);
      console.log(shell.showItemInFolder(filepath));
    }

    function openLink(link) {
      shell.openExternal(link);
    }

    function selectDirectory() {
      dialog.showOpenDialog(
        remote.getCurrentWindow(),
        {
          properties: ["openDirectory"],
        },
        (filePaths) => (this.downloadLocation = filePaths[0])
      );
    }

    function minimize() {
      remote.getCurrentWindow().minimize();
    }

    function close() {
      remote.getCurrentWindow().close();
    }

    function checkForUpdates() {
      newVersionMessage.value = "loading";
      fetch("https://api.github.com/repos/jarbun/downline/releases/latest", {
        headers: {
          "If-None-Match": this.etag,
        },
      })
        .then(
          function (response) {
            if (response.status == 200) {
              this.etag = response.headers.get("etag");

              response.json().then(
                function (data) {
                  const currentVersion = `v${this.appVersion}`;
                  this.latestVersion = data.tag_name;
                  if (currentVersion == this.latestVersion) {
                    this.newVersionMessage = "No updates available";
                  } else {
                    this.newVersionMessage = `New version ${this.latestVersion} available. Please download from website`;
                  }
                }.bind(this)
              );
            } else if (response.status == 304) {
              const currentVersion = `v${this.appVersion}`;
              if (currentVersion == this.latestVersion) {
                this.newVersionMessage = "No updates available";
              } else {
                this.newVersionMessage = `New version ${this.latestVersion} available. Please download from website`;
              }
            }
          }.bind(this)
        )
        .catch((err) => {
          newVersionMessage.value = "";
          console.log("Fetch Error: ", err);
        });
    }

    function update() {
      this.ytdlUpdateMessage = "loading";
      this.ytdlDownloading = false;
      ytdl.update((message, status) => {
        this.ytdlUpdateMessage = message;
        if (status == 1) {
          this.ytdlDownloading = true;
        } else {
          this.ytdlDownloading = false;
        }
      });
    }

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
      isLoading,

      // Computed
      chosenItems,
      modifiableItems,
      anyToBeDownloaded,
      anySubbed,
      areChosenDownloading,
      anyCompleted,
      anyChosen,
      existsItems,
      global,

      // Functions
      isStarting,
      isQueued,
      isPaused,
      isDownloading,
      isCompleted,
      isPostprocessing,
      choose,
      chosenQuality,
      increment,
      decrement,
      updateChosenQuality,
      updateChosenProp,
      updateIsAudioChosen,
      updateIsSubsChosen,
      fetchInfo,
      addItem,
      download,
      progressValue,
      clear,
      clearCompleted,
      clearMany,
      undoClear,
      toggleShowMore,
      pause,
      downloadFromQueue,
      downloadOrPauseMany,
      restart,
      showInFolder,
      openLink,
      selectDirectory,
      minimize,
      close,
      checkForUpdates,
      update,
    };
  },
});
</script>
