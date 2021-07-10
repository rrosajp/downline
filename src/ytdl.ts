export interface DownloadableItem {
  url: string;
  filepath?: string;
  title: string;
  thumbnail?: string;
  duration: string;
  isChosen: boolean;
  state: "stopped" | "completed" | string;
  isSubsChosen: boolean;
  /**
   * Only download audio.
   * @default false, both video and audio will be downloaded
   */
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
