<template>
  <section id="titlebar">
    <span class="fas" :class="[{ 'fa-cog': !isExtrasOpen }, { 'fa-arrow-left': isExtrasOpen }]" @click="isExtrasOpen = !isExtrasOpen"></span>
    <h1>Downline</h1>
    <span></span>
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
                @click.stop="updateIsSubsChosen([item])"
              >
              </span>
              <span
                class="option-icon fas fa-music"
                :class="{ selected: item.isAudioChosen }"
                @dblclick.stop
                @click.stop="updateIsAudioChosen([item])"
              >
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
            <span class="fas fa-chevron-circle-left" @click="() => modifiableItems.forEach((item) => decrement(item))"></span>
            <span id="global-quality">{{ chosenQuality(multiDownloadItem) || "&mdash;" }}</span>
            <span class="fas fa-chevron-circle-right" @click="() => modifiableItems.forEach((item) => increment(item))"></span>
          </span>
          <span
            class="fas fa-closed-captioning"
            data-tooltip="Download Subtitles"
            v-if="anyToBeDownloaded"
            :class="{ selected: multiDownloadItem.isSubsChosen, hidden: !anySubbed }"
            @click="updateIsSubsChosen(modifiableItems, !multiDownloadItem.isSubsChosen)"
          >
          </span>
          <span
            class="fas fa-music"
            data-tooltip="Audio Only"
            v-if="anyToBeDownloaded"
            :class="{ selected: multiDownloadItem.isAudioChosen }"
            @click="updateIsAudioChosen(modifiableItems, !multiDownloadItem.isSubsChosen)"
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
          <span id="location-text">{{ store.data.downloadLocation }}</span>
          <button id="choose-location" @click="selectDirectory">Browse</button>
        </div>
      </div>

      <div id="max-simultaneous">
        <label>Simultaneous Downloads <small>max. 5</small></label>
        <div>
          <span class="fas fa-chevron-circle-left" @click="store.data.maxSimultaneous -= store.data.maxSimultaneous > 1 ? -1 : 0"></span>
          <span id="max-simultaneous-text">{{ store.data.maxSimultaneous }}</span>
          <span class="fas fa-chevron-circle-right" @click="store.data.maxSimultaneous += store.data.maxSimultaneous < 5 ? 1 : 0"></span>
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

      <div id="autonumber-items" @click="store.data.autonumberItems = !store.data.autonumberItems">
        <span class="fas" :class="[{ 'fa-square': !store.data.autonumberItems }, { 'fa-check-square': store.data.autonumberItems }]"></span>
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
      <div id="author-list">
        Created by <strong @click="openLink('https://github.com/jarbun')" class="author">Arjun B</strong> and
        <strong @click="openLink('https://github.com/stefnotch')" class="author">Stefnotch</strong>
      </div>

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
import { defineComponent, reactive, ref, computed, watch, toRef } from "vue";
import { app, event, shell, path, dialog } from "@tauri-apps/api";
import { useStore } from "./store";
import { DownloadableItem, Downloader } from "./ytdl";

// TODO: If youtube-dl or ffmpeg are missing: show a download/browse dialog
// TODO: Get ytdl.js to work (Javascript for now)
// TODO: Finish hooking up the store (store.get('downloadables') and co.)

// TODO: Auto-updater
// TODO: Clipboard

event.listen("tauri://close-requested", () => {
  store.save();
});

/**
 * Represent multiple items that can be downloaded. Used for showing a single item that lets the user configure many items simultaneously
 */
interface MultipleDownloadableItem {
  isSubsChosen: boolean;
  isAudioChosen: boolean;
  formats: {
    /** Video resolution */
    video: number[];
    /** Audio quality */
    audio: number[];
    videoIndex: number;
    audioIndex: number;
  };
}

const store = useStore(app.getVersion(), {
  downloadables: [],
  downloadLocation: "",
  maxSimultaneous: 2,
  autonumberItems: false,
  audioFormatIndex: 0,
  videoFormatIndex: 0,
  ytdl: {
    path: "youtube-dl",
  },
  ffmpeg: {
    path: "ffmpeg",
  },
});

path.downloadDir().then((dir) => {
  if (store.data.downloadLocation == "") {
    store.data.downloadLocation = dir;
  }
});

export default defineComponent({
  name: "App",
  components: {},
  setup(props, context) {
    const downloader = new Downloader(); // ytdl

    const newURL = ref("");
    const isExtrasOpen = ref(false);
    const showMoreOptions = ref(false);
    const downloadables = reactive<DownloadableItem[]>([]); // TODO: store.get('downloadables'),
    const downloadLocation = ref(""); // remove
    const audioFormatIndex = ref(0); // store.get('audioFormatIndex'),
    const videoFormatIndex = ref(0); // store.get('videoFormatIndex'),
    const etag = ref(""); // remove
    const latestVersion = ref(""); // remove
    const audioFormats = reactive(Downloader.audioFormats);
    const videoFormats = reactive(Downloader.videoFormats);
    const ongoingDownloads = ref(0);
    const downloadQueue = reactive<string[]>([]);
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
    watch(
      store.isFirstRun,
      (value) => {
        if (value) {
          // downloader.checkYoutubeDl(); // TODO:
        }
      },
      { immediate: true }
    );

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
    const anyChosen = computed(() => downloadables.some((x) => x.isChosen));

    const existsItems = computed(() => downloadables.length !== 0);

    // TODO: Maybe I'll need deep watchers
    const multiDownloadItem = computed(() => {
      const globalItem: MultipleDownloadableItem = {
        // TODO: Do a better job at showing 'multiple different values' (e.g. 2 true, 1 false)
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

      // TODO: Do a better job at showing the 'combined' video index
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

    function chosenQuality(item: DownloadableItem | MultipleDownloadableItem) {
      return item.isAudioChosen ? item.formats.audio[item.formats.audioIndex] : item.formats.video[item.formats.videoIndex];
    }

    function increment(item: DownloadableItem) {
      if (item.isAudioChosen && item.formats.audioIndex < item.formats.audio.length - 1) {
        item.formats.audioIndex++;
      } else if (!item.isAudioChosen && item.formats.videoIndex < item.formats.video.length - 1) {
        item.formats.videoIndex++;
      }
    }

    function decrement(item: DownloadableItem) {
      if (item.isAudioChosen && item.formats.audioIndex > 0) {
        item.formats.audioIndex--;
      } else if (!item.isAudioChosen && item.formats.videoIndex > 0) {
        item.formats.videoIndex--;
      }
    }

    function updateIsAudioChosen(items: DownloadableItem[], value?: boolean) {
      items.forEach((item) => {
        item.isAudioChosen = value !== undefined ? value : !item.isAudioChosen;
      });
    }

    function updateIsSubsChosen(items: DownloadableItem[], value?: boolean) {
      items.forEach((item) => {
        item.isSubsChosen = value !== undefined ? value : !item.isSubsChosen;
      });
    }

    async function fetchInfo() {
      if (newURL.value.trim().length !== 0) {
        // Load link if url field is not empty
        isLoading.value = true;

        try {
          await downloader.fetchInfoQuick([newURL.value], store.data.ytdl.path, (item) => {
            if ("formats" in item) {
              addItem(item);
            } else {
              // TODO: Support for those basic items
            }
          });
        } catch (e) {
          // TODO: Maybe something is wrong with youtube-dl?
          console.error(e);
        } finally {
          isLoading.value = false;
        }

        newURL.value = "";
      } else {
        // Get link from clipboard
        // TODO: Hopefully the next Tauri update gets clipboard support
        newURL.value = clipboard.readText();
      }
    }

    function addItem(item: DownloadableItem) {
      // Add downloadable to list if not already present
      if (downloadables.findIndex((x) => x.url === item.url) === -1) {
        downloadables.push(item); // TODO: Use unshift? What about playlists? Or should I have item groups?
      }
    }

    function download(url: string | undefined) {
      if (url === undefined) return;

      const item = downloadables.find((x) => x.url === url);
      if (!item) return;

      // Stop if an invalid quality is chosen
      if (chosenQuality(item) == null) return;

      if (ongoingDownloads.value < store.data.maxSimultaneous) {
        item.state = "downloading";

        let outputFormat;
        if (item.playlist.exists && store.data.autonumberItems) {
          outputFormat = path.join(downloadLocation.value, item.playlist.title, `${item.playlist.index} - %(title)s.%(ext)s`);
          item.filepath = path.join(downloadLocation.value, item.playlist.title, "*");
        } else if (item.playlist.exists) {
          outputFormat = path.join(downloadLocation.value, item.playlist.title, "%(title)s.%(ext)s");
          item.filepath = path.join(downloadLocation.value, item.playlist.title, "*");
        } else {
          outputFormat = path.join(downloadLocation.value, "%(title)s.%(ext)s");
          item.filepath = path.join(downloadLocation.value, "*");
        }

        ongoingDownloads.value++;

        ytdl.download({
          item: item,
          outputFormat: outputFormat,
          audioFormat: audioFormats[audioFormatIndex.value],
          videoFormat: videoFormats[videoFormatIndex.value],
          onStart: () => console.log("Download Started"),
          onDownload: (url, { progress, filepath, isPostprocessing }) => {
            const item = downloadables.find((x) => x.url === url);
            if (!item) return;
            if (progress != null) item.progress = progress;
            if (filepath != null) item.filepath = filepath;
            if (isPostprocessing) item.state = "postprocessing";
          },
          onComplete: (url) => {
            const item = downloadables.find((x) => x.url === url);
            if (!item) return;
            // If process was exit after downloading and not after pausing
            if (item.state === "downloading" || item.state === "postprocessing") {
              item.state = "completed";

              ongoingDownloads.value--;
              downloadFromQueue();
            }
          },
        });
      } else {
        item.state = "queued";
        downloadQueue.push(url);
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

    function pause(url: string) {
      const item = downloadables.find((x) => x.url === url);
      if (!item) return;
      if (item.state === "downloading") {
        item.state = "stopped";
        ongoingDownloads.value--;

        ytdl.pause(url);

        downloadFromQueue();
      } else if (item.state === "queued") {
        item.state = "stopped";
        // Remove downloadable from queue
        downloadQueue.splice(downloadQueue.indexOf(url), 1);
      }
    }

    function downloadFromQueue() {
      // If download queue is not empty, request download
      download(downloadQueue.shift());
    }

    function downloadOrPauseMany() {
      if (areChosenDownloading.value) {
        // Pause all chosen
        downloadables.forEach((x) => {
          if ((x.isChosen || !anyChosen.value) && x.state !== "completed") pause(x.url);
        });
      } else {
        // Download all chosen
        downloadables.forEach((x) => {
          if ((x.isChosen || !anyChosen.value) && x.state === "stopped") download(x.url);
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

    function showInFolder(filepath: string | undefined) {
      if (filepath === undefined) return;
      // TODO: Not allowed!
      // TODO: Replace this with something more rock-solid
      return shell.open(filepath.substring(0, filepath.lastIndexOf("/")));
    }

    function openLink(link: string) {
      // TODO: Not allowed!
      return shell.open(link);
    }

    function selectDirectory() {
      dialog
        .open({
          directory: true,
          defaultPath: store.data.downloadLocation,
        })
        .then((dir) => {
          store.data.downloadLocation = Array.isArray(dir) ? dir[0] : dir;
        });
    }

    // TODO: Not needed, because Tauri has a built-in updater
    function checkForUpdates() {
      return;
      newVersionMessage.value = "loading";
      fetch("https://api.github.com/repos/jarbun/downline/releases/latest", {
        headers: {
          "If-None-Match": etag.value,
        },
      })
        .then(
          function (response) {
            if (response.status == 200) {
              etag.value = response.headers.get("etag");

              response.json().then(
                function (data) {
                  const currentVersion = `v${appVersion.value}`;
                  latestVersion.value = data.tag_name;
                  if (currentVersion == latestVersion.value) {
                    newVersionMessage.value = "No updates available";
                  } else {
                    newVersionMessage.value = `New version ${latestVersion.value} available. Please download from website`;
                  }
                }.bind(this)
              );
            } else if (response.status == 304) {
              const currentVersion = `v${appVersion.value}`;
              if (currentVersion == latestVersion.value) {
                newVersionMessage.value = "No updates available";
              } else {
                newVersionMessage.value = `New version ${latestVersion.value} available. Please download from website`;
              }
            }
          }.bind(this)
        )
        .catch((err) => {
          newVersionMessage.value = "";
          console.log("Fetch Error: ", err);
        });
    }

    /** Update Youtube-DL */
    function update() {
      ytdlUpdateMessage.value = "loading";
      ytdlDownloading.value = false;
      ytdl.update((message, status) => {
        ytdlUpdateMessage.value = message;
        if (status == 1) {
          ytdlDownloading.value = true;
        } else {
          ytdlDownloading.value = false;
        }
      });
    }

    return {
      store,

      newURL,
      isExtrasOpen,
      showMoreOptions,
      downloadables,
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
      multiDownloadItem,

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
      checkForUpdates,
      update,
    };
  },
});
</script>
