<template>
  <section id="titlebar">
    <span
      class="fas"
      :class="[
        { 'fa-cog': activeTab === 'main' },
        { 'fa-arrow-left': activeTab !== 'main' },
      ]"
      @click="activeTab = activeTab === 'main' ? 'settings' : 'main'"
    ></span>
    <h1>Downline</h1>
    <span></span>
  </section>

  <section id="main-page">
    <section id="inputbar">
      <input
        type="text"
        spellcheck="false"
        placeholder="Enter URL"
        v-model="newURL"
        @keyup.enter="fetchInfo"
      />
      <span @click="fetchInfo" class="fas fa-plus"></span>
    </section>

    <section id="center" :class="{ 'center-height': showMoreOptions }">
      <transition-group name="fade">
        <div
          class="downloadable"
          :class="{ chosen: item.isChosen }"
          v-for="item in store.data.downloadables"
          :key="item.url"
        >
          <section class="left">
            <img
              :src="item.thumbnail"
              onerror="this.src='./static/images/placeholder.png'"
            />
            <span
              class="fas fa-play-circle"
              v-if="item.state === 'stopped'"
              @click="download(item.url)"
            ></span>
            <span
              class="fas fa-pause-circle"
              v-else-if="
                item.state === 'downloading' || item.state === 'queued'
              "
              @click="pause(item.url)"
            ></span>
            <span v-else-if="isCompleted(item)">
              <span class="fas fa-check"></span>
              <span class="fas fa-redo-alt" @click="restart(item.url)"></span>
            </span>
          </section>

          <section class="middle" @click="(ev) => choose(ev, item)">
            <h1>{{ item.title }}</h1>
            <span class="duration">{{ formatDuration(item.duration) }}</span>
            <div
              class="options"
              v-if="item.progress.value == 0 && item.state === 'stopped'"
            >
              <div>
                <span
                  class="fas fa-chevron-circle-left"
                  @dblclick.stop
                  @click.stop="decrement(item)"
                >
                </span>
                <span class="quality">{{
                  chosenQuality(item) || "&mdash;"
                }}</span>
                <span
                  class="fas fa-chevron-circle-right"
                  @dblclick.stop
                  @click.stop="increment(item)"
                >
                </span>
              </div>

              <span
                class="option-icon fas"
                :class="{
                  'fa-closed-captioning': item.subtitles.length !== 0,
                  selected: item.isSubsChosen,
                }"
                @dblclick.stop
                @click.stop="updateIsSubsChosen([item])"
              >
              </span>
              <span
                class="option-icon fas fa-music"
                data-tooltip="Audio Only"
                :class="{ selected: item.isAudioChosen }"
                @dblclick.stop
                @click.stop="updateIsAudioChosen([item])"
              >
              </span>
            </div>

            <div class="progress" v-else>
              <span class="info">
                <span v-if="isCompleted(item)">
                  <span
                    class="fas fa-folder"
                    @click="showInFolder(item.filepath)"
                  ></span>
                </span>
                <span v-else-if="isStarting(item)">Starting Download</span>
                <span v-else-if="isQueued(item)">Queued</span>
                <span v-else-if="isPaused(item)">
                  <span
                    >{{ item.progress.value }}% of
                    {{ item.progress.size }}</span
                  >
                  <span>Paused</span>
                </span>
                <span v-else-if="isDownloading(item)">
                  <span
                    >{{ item.progress.value }}% of
                    {{ item.progress.size }} &centerdot;
                    {{ item.progress.speed }}</span
                  >
                  <span>{{ item.progress.eta }}</span>
                </span>
                <span class="postprocessing" v-else-if="isPostprocessing(item)">
                  <span class="spinner"></span>
                  Postprocessing
                </span>
              </span>

              <span
                v-if="!isCompleted(item) && !isPostprocessing(item)"
                class="bar"
              >
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
        Type or paste a link above or press the <span>&plus;</span> button to
        grab link from clipboard
      </div>
    </section>

    <section id="bottom">
      <section
        id="more-options"
        :class="{ 'more-options-height': showMoreOptions }"
      >
        <div id="global-options" v-if="existsItems">
          <div
            id="download-or-pause-many"
            v-if="chosenItems.length !== 0"
            @click="downloadOrPauseMany"
            class="fas"
            :class="[
              { 'fa-pause-circle': areChosenDownloading },
              { 'fa-play-circle': !areChosenDownloading },
            ]"
          ></div>
          <span id="global-quality-select" v-if="anyToBeDownloaded">
            <span
              class="fas fa-chevron-circle-left"
              @click="() => modifiableItems.forEach((item) => decrement(item))"
            ></span>
            <span id="global-quality">{{
              chosenQuality(multiDownloadItem) || "&mdash;"
            }}</span>
            <span
              class="fas fa-chevron-circle-right"
              @click="() => modifiableItems.forEach((item) => increment(item))"
            ></span>
          </span>
          <span
            class="fas fa-closed-captioning"
            data-tooltip="Download Subtitles"
            v-if="anyToBeDownloaded"
            :class="{
              selected: multiDownloadItem.isSubsChosen,
              hidden: !anySubbed,
            }"
            @click="
              updateIsSubsChosen(
                modifiableItems,
                !multiDownloadItem.isSubsChosen
              )
            "
          >
          </span>
          <span
            class="fas fa-music"
            data-tooltip="Audio Only"
            v-if="anyToBeDownloaded"
            :class="{ selected: multiDownloadItem.isAudioChosen }"
            @click="
              updateIsAudioChosen(
                modifiableItems,
                !multiDownloadItem.isAudioChosen
              )
            "
          >
          </span>
        </div>
        <div id="buttons">
          <button
            data-tooltip="Undo Clear"
            v-if="this.undo.downloadables"
            @click="undoClear"
            class="undo-button"
          >
            Undo
          </button>
          <span
            data-tooltip="Clear Completed"
            :class="{ hidden: !anyCompleted }"
            class="fas fa-minus-circle"
            @click="clearCompleted"
          ></span>
          <span
            data-tooltip="Clear All"
            v-if="existsItems && !anyChosen"
            class="fas fa-times-circle"
            @click="clearMany"
          ></span>
          <span
            data-tooltip="Clear Selected"
            v-if="existsItems && anyChosen"
            class="fas fa-times-circle"
            @click="clearMany"
          ></span>
        </div>
      </section>

      <div id="messages">
        <span id="loading-indicator" :class="{ hidden: !isLoading }">
          <span class="spinner"></span>
          <span class="">Loading</span>
        </span>
        <span id="show-hide" @click="toggleShowMore">
          <span
            class="fas fa-angle-up"
            :class="{ 'rotate-arrow': showMoreOptions }"
          ></span>
        </span>
        <span :class="{ hidden: !existsItems }" id="status">
          {{
            store.data.downloadables.length == 1
              ? "1 Item"
              : store.data.downloadables.length + " Items"
          }}
        </span>
      </div>
    </section>
  </section>

  <section id="extras" :class="{ 'show-extras': activeTab !== 'main' }">
    <ul id="tabs">
      <li
        @click="activeTab = 'settings'"
        :class="{ active: activeTab === 'settings' }"
      >
        Settings
      </li>
      <li
        @click="activeTab = 'dependencies'"
        :class="{ active: activeTab === 'dependencies' }"
      >
        Dependencies
      </li>
      <li
        @click="activeTab = 'about'"
        :class="{ active: activeTab === 'about' }"
      >
        About
      </li>
    </ul>

    <section id="settings" v-if="activeTab === 'settings'">
      <div class="file-location">
        <label>Download Location</label>
        <div>
          <span class="location-text">{{ store.data.downloadLocation }}</span>
          <button class="choose-location" @click="selectDirectory">
            Browse
          </button>
        </div>
      </div>

      <div id="max-simultaneous">
        <label>Simultaneous Downloads <small>max. 5</small></label>
        <div>
          <span
            class="fas fa-chevron-circle-left"
            @click="
              store.data.maxSimultaneous +=
                store.data.maxSimultaneous > 1 ? -1 : 0
            "
          ></span>
          <span id="max-simultaneous-text">{{
            store.data.maxSimultaneous
          }}</span>
          <span
            class="fas fa-chevron-circle-right"
            @click="
              store.data.maxSimultaneous +=
                store.data.maxSimultaneous < 5 ? 1 : 0
            "
          ></span>
        </div>
      </div>

      <div class="formats">
        <header>Audio Format</header>
        <div>
          <span
            class="fas fa-chevron-circle-left"
            @click="
              store.data.audioFormatIndex +=
                store.data.audioFormatIndex > 0 ? -1 : 0
            "
          ></span>
          <span class="format-text">{{
            audioFormats[store.data.audioFormatIndex]
          }}</span>
          <span
            class="fas fa-chevron-circle-right"
            @click="
              store.data.audioFormatIndex +=
                store.data.audioFormatIndex < audioFormats.length - 1 ? 1 : 0
            "
          ></span>
        </div>
      </div>

      <div class="formats">
        <header>Video Format</header>
        <div>
          <span
            class="fas fa-chevron-circle-left"
            @click="
              store.data.videoFormatIndex +=
                store.data.videoFormatIndex > 0 ? -1 : 0
            "
          ></span>
          <span class="format-text">{{
            videoFormats[store.data.videoFormatIndex]
          }}</span>
          <span
            class="fas fa-chevron-circle-right"
            @click="
              store.data.videoFormatIndex +=
                store.data.videoFormatIndex < videoFormats.length - 1 ? 1 : 0
            "
          ></span>
        </div>
      </div>

      <div
        id="autonumber-items"
        @click="store.data.autonumberItems = !store.data.autonumberItems"
      >
        <span
          class="fas"
          :class="[
            { 'fa-square': !store.data.autonumberItems },
            { 'fa-check-square': store.data.autonumberItems },
          ]"
        ></span>
        <label>Autonumber Playlist Items</label>
      </div>
    </section>
    <section id="dependencies" v-else-if="activeTab === 'dependencies'">
      <div class="file-location">
        <!-- TODO: Download button -->
        <label>YouTube-DL Location</label>
        <div>
          <span class="location-text location-input">
            <input
              type="text"
              spellcheck="false"
              placeholder="Enter path or name"
              v-model="store.data.ytdl.path"
            />
          </span>
          <button class="choose-location" @click="selectYoutubeDl">
            Browse
          </button>
        </div>
        <div v-if="!store.data.ytdl.valid">
          <small>YouTube-DL could not be found.</small>
        </div>
        <div v-else>
          <small>Version {{ store.data.ytdl.version ?? "unknown" }}.</small>
        </div>
      </div>
      <button @click="update">
        <span
          class="spinner"
          v-show="ytdlUpdateMessage == 'loading' || ytdlDownloading"
        ></span>
        {{
          ytdlUpdateMessage == "loading"
            ? "Checking"
            : ytdlDownloading
            ? "Updating"
            : "Update youtube-dl"
        }}
      </button>
      <span
        class="update-message"
        v-if="ytdlUpdateMessage && ytdlUpdateMessage != 'loading'"
      >
        {{ ytdlUpdateMessage }}
      </span>
      <div class="file-location">
        <!-- TODO: Download button -->
        <label>FFMPEG Location</label>
        <div>
          <span class="location-text location-input">
            <input
              type="text"
              spellcheck="false"
              placeholder="Enter path or name"
              v-model="store.data.ffmpeg.path"
            />
          </span>
          <button class="choose-location" @click="selectFfmpeg">Browse</button>
        </div>
      </div>
    </section>
    <section id="about" v-else-if="activeTab === 'about'">
      <header @click="openLink('https://stefnotch.github.io/downline/')">
        <img src="/icon.png" />
        <span>Downline</span>
      </header>
      <div id="app-version">
        Version
        <strong>{{ appVersion }}</strong>
      </div>
      <p>
        Free and open-source media downloader for YouTube and many other sites
      </p>
      <div id="author-list">
        Created by
        <strong @click="openLink('https://github.com/jarbun')" class="author"
          >Arjun B</strong
        >
        and
        <strong @click="openLink('https://github.com/stefnotch')" class="author"
          >Stefnotch</strong
        >
      </div>
    </section>
  </section>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed, watch, toRef } from "vue";
import { app, event, shell, path, dialog, clipboard } from "@tauri-apps/api";
import { useStore } from "./store";
import { DownloadableItem, Downloader } from "./ytdl";
import { debounce } from "@github/mini-throttle";

// TODO: Simply putting this next to a youtube-dl.exe works, except that the antivirus program will hate you for it. Weird.

// TODO: Auto-updater
// TODO: Update readme
// TODO: Update website
// TODO: Advertise a bit
// TODO: Rewrite in Rust candidates
// - findYoutubeDl(path) which checks if there is a valid youtube-dl at a given path and returns the version and notes it down so that later function calls can simply use that youtube-dl
// - findYoutubeDl() which checks if there is a valid youtube-dl in some 'expected' location (youtube-dl, yt-dlp, and also the %appdata% directory of the application) and notes it down
// - callYoutubeDl()
// - download() which also has to deal with stuff like path manipulations
// - path.downloadDir()
// - showInFolder(item path)
// - openLink(homepage/authorStefnotch/authorJarbun)
// - downloadYoutubeDl
// - downloadFfmpeg
// - findFfmpeg

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
    valid: true,
  },
  ffmpeg: {
    path: "ffmpeg",
    valid: true,
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
    const showMoreOptions = ref(false);
    const etag = ref(""); // remove
    const latestVersion = ref(""); // remove
    const audioFormats = reactive(Downloader.audioFormats);
    const videoFormats = reactive(Downloader.videoFormats);
    const ongoingDownloads = ref(0);
    const downloadQueue = reactive<string[]>([]);
    const appVersion = ref("");
    const activeTab = ref<"main" | "settings" | "dependencies" | "about">(
      "main"
    );
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
          downloader.checkYoutubeDl(["youtube-dl", "yt-dlp"]).then((result) => {
            if (!result) {
              store.data.ytdl.valid = false;
              activeTab.value = "dependencies";
            } else {
              store.data.ytdl.path = result.binary;
              store.data.ytdl.valid = true;
              store.data.ytdl.version = result.version;
            }
          });
        }
      },
      { immediate: true }
    );
    {
      // TODO: Those promises don't have to terminate in the 'correct' order. Fix that by rewriting it in Rust :)
      const checkDebounced = debounce(
        (path: string) =>
          downloader.checkYoutubeDl([path]).then((result) => {
            store.data.ytdl.valid = result !== null;
            store.data.ytdl.version = result?.version;
          }),
        100
      );

      watch(
        () => store.data.ytdl.path,
        (value) => checkDebounced(value)
      );
    }

    /**  Returns selected items if any, otherwise all items, that are not yet complete */
    const chosenItems = computed(() => {
      return store.data.downloadables.filter(
        (x) => (x.isChosen || !anyChosen.value) && x.state !== "completed"
      );
    });

    /**  Returns items that are yet to be downloaded */
    const modifiableItems = computed(() => {
      return chosenItems.value.filter(
        (x) => x.state === "stopped" && x.progress?.value == 0
      );
    });

    /** Returns true if any modifiable items are to be downloaded */
    const anyToBeDownloaded = computed(() => {
      return chosenItems.value.some(
        (x) => x.state === "stopped" && x.progress?.value == 0
      );
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
      return store.data.downloadables.some(
        (x) => (x.isChosen || !anyChosen.value) && x.state === "completed"
      );
    });

    /**  Returns true if any item is chosen */
    const anyChosen = computed(() =>
      store.data.downloadables.some((x) => x.isChosen)
    );

    const existsItems = computed(() => store.data.downloadables.length !== 0);

    const multiDownloadItem = computed(() => {
      const globalItem: MultipleDownloadableItem = {
        isSubsChosen: modifiableItems.value.every(
          (x) => x.subtitles.length === 0 || x.isSubsChosen
        ),
        isAudioChosen: modifiableItems.value.every((x) => x.isAudioChosen),
        formats: {
          video: [] as any[],
          audio: [] as any[],
          videoIndex: 0,
          audioIndex: 0,
        },
      };

      // Set audio and video to union of all audio and video formats
      globalItem.formats.video = Array.from(
        new Set(modifiableItems.value.flatMap((v) => v.formats.video))
      );
      globalItem.formats.audio = Array.from(
        new Set(modifiableItems.value.flatMap((v) => v.formats.audio))
      );

      // Sort in ascending order
      globalItem.formats.video.sort((a, b) => a - b);
      globalItem.formats.audio.sort((a, b) => a - b);

      globalItem.formats.videoIndex = modifiableItems.value
        .map((v) => v.formats.videoIndex)
        .reduce((p, v) => (p > v ? p : v), 0);
      globalItem.formats.audioIndex = modifiableItems.value
        .map((v) => v.formats.audioIndex)
        .reduce((p, v) => (p > v ? p : v), 0);

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
        store.data.downloadables.forEach((x) => (x.isChosen = false));
      }
    }

    function chosenQuality(item: DownloadableItem | MultipleDownloadableItem) {
      return item.isAudioChosen
        ? item.formats.audio[item.formats.audioIndex]
        : item.formats.video[item.formats.videoIndex];
    }

    function increment(item: DownloadableItem) {
      if (
        item.isAudioChosen &&
        item.formats.audioIndex < item.formats.audio.length - 1
      ) {
        item.formats.audioIndex++;
      } else if (
        !item.isAudioChosen &&
        item.formats.videoIndex < item.formats.video.length - 1
      ) {
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
          // TODO: Use fetchInfoQuick
          await downloader.fetchInfo(
            [newURL.value],
            store.data.ytdl.path,
            (item) => {
              if ("formats" in item) {
                addItem(item);
              } else {
                // TODO: Support for those basic items
              }
            }
          );
        } catch (e) {
          // TODO: Maybe something is wrong with youtube-dl?
          console.error(e);
        } finally {
          isLoading.value = false;
        }

        newURL.value = "";
      } else {
        const clipboardText = (await clipboard.readText()) ?? "";
        const isUrl = clipboardText.startsWith("http");
        if (isUrl) {
          newURL.value = clipboardText;
        }
      }
    }

    function addItem(item: DownloadableItem) {
      // Add downloadable to list if not already present
      if (
        store.data.downloadables.findIndex((x) => x.url === item.url) === -1
      ) {
        store.data.downloadables.push(item); // TODO: Use unshift? What about playlists? Or should I have item groups?
      }
    }

    async function download(url: string | undefined) {
      if (url === undefined) return;

      const item = store.data.downloadables.find((x) => x.url === url);
      if (!item) return;

      // Stop if an invalid quality is chosen
      if (chosenQuality(item) == null) return;

      if (ongoingDownloads.value < store.data.maxSimultaneous) {
        item.state = "downloading";

        let outputFormat;
        if (item.playlist && store.data.autonumberItems) {
          outputFormat = `${item.playlist.index} - %(title)s.%(ext)s`;
          //item.filepath = path.join(downloadLocation.value, item.playlist.title, "*");
        } else if (item.playlist) {
          outputFormat = "%(title)s.%(ext)s";
          //item.filepath = path.join(downloadLocation.value, item.playlist.title, "*");
        } else {
          outputFormat = "%(title)s.%(ext)s";
          //item.filepath = path.join(downloadLocation.value, "*");
        }

        ongoingDownloads.value++;
        try {
          await downloader
            .download(
              item,
              {
                outputTemplate: outputFormat,
                downloadLocation: store.data.downloadLocation, // TODO: Append `item.playlist.title`
                videoFormat: videoFormats[store.data.videoFormatIndex],
                audioFormat: audioFormats[store.data.audioFormatIndex],
                compatibilityMode: /youtube-dl(\.exe)?$/.test(
                  store.data.ytdl.path
                ),
              },
              store.data.ytdl.path,
              (data) => {
                if (data.progress != null) item.progress = data.progress;
                if (data.filepath != null) item.filepath = data.filepath;
                // if (data.progressStatus) item.state = "postprocessing"; // TODO:
              }
            )
            .finally(() => {
              ongoingDownloads.value--;
            });
        } catch (e) {
          // TODO: Error during downloading
          console.error(e);
        }

        // If process was exit after downloading and not after pausing
        if (item.state === "downloading" || item.state === "postprocessing") {
          item.state = "completed";
        }

        downloadFromQueue();
      } else {
        item.state = "queued";
        downloadQueue.push(url);
      }
    }

    // TODO: This is a reactive function??
    function progressValue(url: string) {
      const value =
        store.data.downloadables.find((x) => x.url === url)?.progress?.value ??
        0;
      return { width: `${value}%` };
    }

    function clear(url: string) {
      pause(url);
      const index = store.data.downloadables.findIndex((x) => x.url === url);

      store.data.downloadables.splice(index, 1);
    }

    function clearCompleted() {
      undo.downloadables = store.data.downloadables.slice();

      store.data.downloadables
        .filter((x) => x.state === "completed")
        .forEach((x) => clear(x.url));
    }

    function clearMany() {
      undo.downloadables = store.data.downloadables.slice();

      store.data.downloadables
        .filter((x) => x.isChosen || !anyChosen.value)
        .forEach((x) => clear(x.url));
    }

    function undoClear() {
      if (undo.downloadables !== undefined) {
        store.data.downloadables.push(...undo.downloadables);
        undo.downloadables = undefined;
      }
    }

    function toggleShowMore() {
      showMoreOptions.value = !showMoreOptions.value;
    }

    function pause(url: string) {
      const item = store.data.downloadables.find((x) => x.url === url);
      if (!item) return;
      if (item.state === "downloading") {
        item.state = "stopped";
        ongoingDownloads.value--;

        downloader.pause(url).finally(() => {
          downloadFromQueue();
        });
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
        store.data.downloadables.forEach((x) => {
          if ((x.isChosen || !anyChosen.value) && x.state !== "completed")
            pause(x.url);
        });
      } else {
        // Download all chosen
        store.data.downloadables.forEach((x) => {
          if ((x.isChosen || !anyChosen.value) && x.state === "stopped")
            download(x.url);
        });
      }
    }

    function restart(url: string) {
      const item = store.data.downloadables.find((x) => x.url === url);
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
      return shell.open(link);
    }

    function selectDirectory() {
      dialog
        .open({
          directory: true,
          defaultPath: store.data.downloadLocation,
        })
        .then((dir) => {
          if (!dir) return;
          store.data.downloadLocation = Array.isArray(dir) ? dir[0] : dir;
        });
    }

    function selectYoutubeDl() {
      dialog
        .open({
          multiple: false,
        })
        .then((file) => {
          if (!file) return;
          store.data.ytdl.path = Array.isArray(file) ? file[0] : file;
        });
    }

    function selectFfmpeg() {
      dialog
        .open({
          multiple: false,
        })
        .then((file) => {
          if (!file) return;
          store.data.ffmpeg.path = Array.isArray(file) ? file[0] : file;
        });
    }

    /** Update Youtube-DL */
    async function update() {
      if (ytdlDownloading.value) return;
      ytdlUpdateMessage.value = "loading";
      ytdlDownloading.value = true;
      await downloader
        .updateYoutubeDl(store.data.ytdl.path, (message) => {
          ytdlUpdateMessage.value = message;
        })
        .catch((error) => {
          ytdlUpdateMessage.value = "Failed to update " + error;
        });
      ytdlDownloading.value = false;
    }

    function formatDuration(seconds: number) {
      const hoursPart = Math.floor(seconds / (60 * 60));
      const minutesPart = Math.floor((seconds - hoursPart * 60 * 60) / 60);
      const secondsPart = Math.ceil(
        seconds - hoursPart * 60 * 60 - minutesPart * 60
      );
      let result = minutesPart + ":" + (secondsPart + "").padStart(2, "0");

      if (hoursPart > 0) {
        result = result.padStart(5, "0"); // 00:00
        result = hoursPart + ":" + result;
      }
      return result;
    }

    return {
      store,

      newURL,
      showMoreOptions,
      etag,
      latestVersion,
      audioFormats,
      videoFormats,
      ongoingDownloads,
      downloadQueue,
      appVersion,
      activeTab,
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
      selectYoutubeDl,
      selectFfmpeg,
      update,
      formatDuration,
    };
  },
});
</script>
