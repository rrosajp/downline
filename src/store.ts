import { throttle } from "@github/mini-throttle";
import { reactive, ref, Ref, toRaw, toRef, watch } from "vue";
import { invoke } from "@tauri-apps/api/tauri";
import { DownloadableItem } from "./ytdl";

// This is what migration functions will look like
// We could keep the old types around, but we don't need to
function migrate3_0_0to3_0_0(data: any) {
  return data;
}

// Requirements
// - Async loading should be supported
// - Saving happens in async
// - Version numbers
// - Individual keys can be accessed reactively

export type StoreData = {
  downloadables: DownloadableItem[];
  ytdl: {
    path: string;
  };
  ffmpeg: {
    path: string;
  };
  downloadLocation: string;
  maxSimultaneous: number;
  autonumberItems: boolean;
  audioFormatIndex: number;
  videoFormatIndex: number;
};

export function useStore(version: Promise<string>, defaults: StoreData) {
  const data = reactive<StoreData>(JSON.parse(JSON.stringify(defaults)));
  const isFirstRun = ref(false);
  invoke("load_store").then(async (loadedData) => {
    if (!loadedData) {
      isFirstRun.value = true;
      return;
    }
    try {
      let parsedData = JSON.parse(loadedData + "");
      if (parsedData.version === undefined) return;

      if (parsedData.version !== (await version)) {
        // Do migrations here
      }

      data.downloadables = parsedData["downloadables"];
      data.downloadLocation = parsedData["downloadLocation"] + "";
      data.maxSimultaneous = +parsedData["maxSimultaneous"];
      data.autonumberItems = !!parsedData["autonumberItems"];
      data.audioFormatIndex = +parsedData["audioFormatIndex"];
      data.videoFormatIndex = +parsedData["videoFormatIndex"];
    } catch (e) {
      console.warn(e, loadedData);
    }
  });

  async function save() {
    invoke("save_store", {
      data: JSON.stringify({
        version: await version,
        data: toRaw(data),
      }),
    });
  }

  const saveThrottled = throttle(() => save(), 500, {
    middle: false,
  });

  watch(data, () => saveThrottled(), {
    deep: true,
  });

  return {
    data,
    save,
    isFirstRun,
  };
}
