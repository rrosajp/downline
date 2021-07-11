import { shell } from "@tauri-apps/api";

/**
 * Generates commandline arguments for yt-dl. Optionally also generates ffmpeg arguments.
 */
export class Downloader {
  private readonly runningProcesses = new Map<string, shell.Child>();

  constructor() {}

  /** Video extension */
  static get videoFormats() {
    // Format order taken from https://github.com/yt-dlp/yt-dlp#sorting-formats
    return ["best", "mp4", "webm", "mkv"] as const;
  }

  /** Audio extension */
  static get audioFormats() {
    // No idea if I should remove some of those formats
    return ["best", "m4a", "aac", "mp3", "ogg", "opus", "webm", "flac", "vorbis", "wav"] as const;
  }

  /** Checks if youtube-dl or an alternative exists. Will return the version number, if possible */
  async checkYoutubeDl(pathsToCheck: string[]) {
    for (let i = 0; i < pathsToCheck.length; i++) {
      const youtubeDlVersion = await this.checkIfBinaryExists(pathsToCheck[i], ["--version"]);
      if (youtubeDlVersion !== null) {
        return {
          binary: pathsToCheck[i],
          version: youtubeDlVersion,
        };
      }
    }

    // TODO: Also check the save file location (where the config file is saved) ^

    return null;
  }

  async fetchInfoQuick(urls: string[], path: string, dataCallback: (data: DownloadableItemBasic | DownloadableItem) => void) {
    if (urls.length === 0) return;

    const args = this.fetchInfoQuickArgs(urls);

    return this.callYoutubeDl(urls[0], path, args, (data) => {
      const item = this.parseDownloadableItem(data);
      if (!item) return;
      dataCallback(item);
    });
  }

  async fetchInfo(urls: string[], path: string, dataCallback: (data: DownloadableItem) => void) {
    if (urls.length === 0) return;

    const args = this.fetchInfoArgs(urls);

    return this.callYoutubeDl(urls[0], path, args, (data) => {
      const item = this.parseDownloadableItem(data);
      if (item && "formats" in item) {
        dataCallback(item);
      }
    });
  }

  /** Fetches very basic information for a list of URLs */
  private fetchInfoQuickArgs(urls: string[]) {
    const args = ["--dump-json", "--flat-playlist", "--ignore-errors", ...urls];
    return args;
  }

  /** Fetches information for a list of URLs */
  private fetchInfoArgs(urls: string[]) {
    const args = ["--all-subs", "--dump-json", "--no-playlist", "--ignore-errors", ...urls];
    return args;
  }

  private downloadArgs({
    item,
    videoFormat,
    audioFormat,
    outputTemplate,
  }: {
    item: DownloadableItem;
    videoFormat: VideoFormat;
    audioFormat: AudioFormat;
    outputTemplate: string;
  }) {
    const args = [];

    let audioQuality = item.formats.audioIndex === item.formats.audio.length - 1 ? "" : `[abr<=${item.formats.audio[item.formats.audioIndex]}]`;
    let videoQuality = item.formats.videoIndex === item.formats.video.length - 1 ? "" : `[height<=${item.formats.video[item.formats.videoIndex]}]`;

    // Choose format (file extension)
    if (item.isAudioChosen) {
      args.push("--format");

      let format = `best*[vcodec=none]${audioQuality}`; // Pick best format by default
      if (audioFormat !== "best") {
        // Pick format with a given extension
        format = `ba[ext=${audioFormat}]${audioQuality} / ${format}`;
      }
      args.push(format);
    } else {
      args.push("--format");
      let format = `bv*${videoQuality}+ba${videoQuality}/b${videoQuality}`; // Pick best format by default
      if (videoFormat !== "best") {
        // Pick format with a given extension
        format = `bv*[ext=${videoFormat}]${videoQuality}+ba[ext=${videoFormat}]${videoQuality}/b[ext=${videoFormat}]${videoQuality} / ${format}`;
      }
      args.push(format);
    }

    // Output file name
    if ((outputTemplate + "").trim().length > 0) {
      args.push(...["--output", outputTemplate]);
    }

    args.push("--embed-subs"); // Subtitles (TODO: Does this need --write-subs)
    args.push("--embed-thumbnail"); // Pretty thumbnails (TODO: Does this need --write-thumbnail )
    args.push("--embed-metadata"); // More metadata

    // TODO: --limit-rate

    // https://github.com/yt-dlp/yt-dlp#post-processing-options
    // TODO: Optionally convert it with ffmpeg, if ffmpeg exists

    args.push(item.url);

    return args;
  }

  private updateYoutubeDlArgs() {
    const args = ["--update"];
    return args;
  }

  private async checkIfBinaryExists(name: string, args: string[]) {
    try {
      const result = await new shell.Command(name, args).execute();
      if (result.code === null || result.code === 0) {
        return result.stdout;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  private parseDownloadableItem(data: string): DownloadableItemBasic | DownloadableItem | null {
    try {
      let item = JSON.parse(data);
      if (item.formats) {
        // It's a typical DownloadableItem
        let video: number[] = [];
        let audio: number[] = [];
        item.formats.forEach((format: { vcodec?: string; acodec?: string; height?: null | number; abr?: null | number; tbr?: null | number }) => {
          if (format.vcodec !== "none" && video.indexOf(format.height ?? 0) === -1) {
            video.push(format.height ?? 0);
          } else if (format.acodec !== "none" && audio.indexOf(format.abr ?? format.tbr ?? 0) === -1) {
            audio.push(format.abr ?? format.tbr ?? 0);
          }
        });
        // Sort in ascending order
        video.sort((a, b) => a - b);
        audio.sort((a, b) => a - b);

        let downloadableItem: DownloadableItem = {
          // Basic
          url: item.webpage_url || item.url,
          title: item.title,
          duration: item.duration,
          uploader: item.uploader,
          // More stuff directly taken from the item
          thumbnail: item.thumbnail,
          // Stuff parsed from the item
          formats: {
            video: video,
            audio: audio,
            videoIndex: video.length - 1,
            audioIndex: audio.length - 1,
          },
          playlist: item.playlist
            ? {
                entries: item.n_entries,
                title: item.playlist_title,
                id: item.playlist_id + "",
                index: item.playlist_index,
              }
            : undefined,
          subtitles: item.requested_subtitles == null ? [] : Object.keys(item.requested_subtitles),
          // UI state
          progress: {
            value: 0,
          },
          state: "stopped",
          isChosen: false,
          isSubsChosen: false,
          isAudioChosen: false,
        };
        return downloadableItem;
        //
      } else {
        // It's a DownloadableItemBasic
        let downloadableItem: DownloadableItemBasic = {
          url: item.url,
          title: item.title,
          duration: item.duration,
          uploader: item.uploader,
        } as DownloadableItemBasic;
        return downloadableItem;
      }
    } catch (e) {
      console.warn("Unable to parse", e, data);
    }
    return null;
  }

  /**
   * Calls youtube-dl with the given arguments and returns some info. Throws an error if youtube-dl cannot be found
   */
  private callYoutubeDl(id: string, path: string, args: string[], dataCallback: (data: any) => void) {
    const command = new shell.Command(path, args);
    console.info(path, args); // Always print this!

    // Data
    command.stdout.on("data", (data) => {
      // Every new playlist entry will be on its own line
      console.log(data);
      dataCallback(data);
    });
    command.stderr.on("data", (error) => {
      // TODO: Better error handling, for now this is fine
      console.error(error);
    });

    // Done
    let resolveFinishedPromise = () => {};
    let rejectFinishedPromise = (reason?: any) => {};
    const finishedPromise = new Promise<void>((resolve, reject) => {
      resolveFinishedPromise = resolve;
      rejectFinishedPromise = reject;
    });
    command.on("close", (data) => {
      if (data.code === null || data.code === 0) {
        resolveFinishedPromise();
      } else {
        rejectFinishedPromise("Unexpected result: " + data);
      }
    });
    command.on("error", (error) => rejectFinishedPromise(error));

    // Start the child process
    const childPromise = command.spawn().then((childProcess) => {
      this.runningProcesses.set(id, childProcess);
    });

    // And wait for everything to be done
    return finishedPromise.finally(() => {
      return childPromise.finally(() => {
        this.runningProcesses.delete(id);
      });
    });
  }

  /** Simply kills the child process */
  async pause(id: string) {
    const child = this.runningProcesses.get(id);
    if (child) {
      try {
        await child.kill();
      } catch (e) {
        console.warn(e);
      }
      // And now the usual handler will take care of deleting the child process
    }
  }

  // TODO: checkFfmpeg(path?: string)
  // TODO: downloadYoutubeDl() which tries to download it from multiple mirrors (first yt-dlc then youtube-dl)
  // https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest
  // https://api.github.com/repos/ytdl-org/youtube-dl/releases/latest
  // Take the .exe asset on Windows, and the no extension asset otherwise
  // Oh, it should also be able to ask the locally installed package manager to do so?
  // TODO: downloadFfmpeg() which tries to download it from multiple mirrors
  // Butt how? https://ffmpeg.org/download.html
  // TODO: updateYoutubeDl() which tries to update the youtube-dl binary

  // TODO: download(item, args, ...) which reports {progress percentage, current progress status (fetching/downloading/converting), destination file path}
}

export interface DownloadableItemBasic {
  url: string;
  title: string;
  /** Duration in seconds */
  duration: number;
  uploader?: string;
}

export interface DownloadableItem extends DownloadableItemBasic {
  filepath?: string;
  thumbnail?: string;
  isChosen: boolean;
  state: "stopped" | "completed" | "downloading" | "queued" | "postprocessing";
  isSubsChosen: boolean;
  /**
   * Only download audio.
   * @default false, both video and audio will be downloaded
   */
  isAudioChosen: boolean;
  formats: {
    /** Video resolution, sorted from worst to best */
    video: number[];
    /** Audio quality, sorted from worst to best */
    audio: number[];
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
  playlist?: {
    entries: number;
    title: string;
    id: string;
    index: number;
  };
}

// TODO: Rename to VideoExtension
type VideoFormat = typeof Downloader.videoFormats[number];
type AudioFormat = typeof Downloader.audioFormats[number];

function assertUnreachable(value: never): never {
  throw new Error("Didn't expect to get here" + value);
}
