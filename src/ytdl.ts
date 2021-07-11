import { shell } from "@tauri-apps/api";

/**
 * Generates commandline arguments for yt-dl. Optionally also generates ffmpeg arguments.
 */
export class Downloader {
  constructor() {}

  /** Video extension */
  static get videoFormats() {
    // Format order taken from https://github.com/yt-dlp/yt-dlp#sorting-formats
    return ["default/best", "mp4", "webm", "mkv"] as const;
  }

  /** Audio extension */
  static get audioFormats() {
    // No idea if I should remove some of those formats
    return ["default/best", "m4a", "aac", "mp3", "ogg", "opus", "webm", "flac", "vorbis", "wav"] as const;
  }

  /** Fetches very basic information for a list of URLs */
  fetchInfoQuickArgs(urls: string[]) {
    const args = ["--dump-json", "--flat-playlist", "--ignore-errors", ...urls];
    return args;
  }

  /** Fetches information for a list of URLs */
  fetchInfoArgs(urls: string[]) {
    const args = ["--all-subs", "--dump-json", "--no-playlist", "--ignore-errors", ...urls];
    return args;
  }

  downloadArgs({
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

    let audioQuality = item.formats.audioIndex === 0 ? "" : `[abr<=${item.formats.audio[item.formats.audioIndex]}]`;
    let videoQuality = item.formats.videoIndex === 0 ? "" : `[height<=${item.formats.video[item.formats.videoIndex]}]`;

    // Choose format (file extension)
    if (item.isAudioChosen) {
      args.push("--format");

      let format = `best*[vcodec=none]${audioQuality}`; // Pick best format by default
      if (audioFormat !== "default/best") {
        // Pick format with a given extension
        format = `ba[ext=${audioFormat}]${audioQuality} / ${format}`;
      }
      args.push(format);
    } else {
      args.push("--format");
      let format = `bv*${videoQuality}+ba${videoQuality}/b${videoQuality}`; // Pick best format by default
      if (videoFormat !== "default/best") {
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

  updateYoutubeDlArgs() {
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

  /** Checks if youtube-dl or an alternative exists. Will return the version number, if possible */
  async checkYoutubeDl(path?: string) {
    const pathsToCheck = ["youtube-dl", "yt-dlp"];
    if (path) pathsToCheck.unshift(path);

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

  // TODO: checkFfmpeg(path?: string)
  // TODO: downloadYoutubeDl() which tries to download it from multiple mirrors (first yt-dlc then youtube-dl)
  // TODO: downloadFfmpeg() which tries to download it from multiple mirrors
  // TODO: updateYoutubeDl() which tries to update the youtube-dl binary

  // TODO: fetchInfoQuick which fetches some quick info and returns really barebones items
  // TODO: fetchInfo which fetches all the missing info for a given item and puts it in there
  // TODO: download(item, args, ...) which reports {progress percentage, current progress status (fetching/downloading/converting), destination file path}
  // TODO: pause which just kills the child process
}

export interface DownloadableItemBasic {
  url: string;
  title: string;
  duration: string;
  uploader?: string;
}

export interface DownloadableItem extends DownloadableItemBasic {
  filepath?: string;
  thumbnail?: string;
  isChosen: boolean;
  state: "stopped" | "completed" | string;
  isSubsChosen: boolean;
  /**
   * Only download audio.
   * @default false, both video and audio will be downloaded
   */
  isAudioChosen: boolean;
  formats: {
    /** Video resolution, sorted from best to worst */
    video: number[];
    /** Audio quality, sorted from best to worst */
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
  playlist: {
    exists: boolean;
    entries: number;
    title: string;
    index: number;
  };
}

// TODO: Rename to VideoExtension
type VideoFormat = typeof Downloader.videoFormats[number];
type AudioFormat = typeof Downloader.audioFormats[number];

function assertUnreachable(value: never): never {
  throw new Error("Didn't expect to get here" + value);
}
