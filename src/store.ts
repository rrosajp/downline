import { throttle } from "@github/mini-throttle";
import { reactive, ref, Ref, toRef, watch } from "vue";

// This is what migration functions will look like
// We could keep the old types around, but we don't need to
function migrate3_0_0to3_0_0(data: any) {
  return data;
}

// Requirements
// - Async loading should be supported
// - Saving happens in async
// - Version numbers
// - Individual keys can be ref-ed

export type StoreData = {
  downloadables: any[]; // TODO:
  downloadLocation: string;
  maxSimultaneous: number;
  autonumberItems: boolean;
  audioFormatIndex: number;
  videoFormatIndex: number;
};

export function useStore(name: string, version: Promise<string>, defaults: StoreData) {
  const data = reactive<StoreData>(JSON.parse(JSON.stringify(defaults)));

  // TODO: Load data (including migrations)

  function save() {
    // TODO: Update the data on the harddisk in an async manner
    // Save the name, the version and all the data
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
  };
}

/**
 * Async data storage
 */
class Store {
  private data: { [prop: string]: JsonType };
  constructor(name: string, defaults: { [prop: string]: JsonType }) {
    // Renderer process gets 'app' via 'remote' while Main process can get it directly
    // app.getPath('userData') returns a path to the user's app data directory
    //const userDataPath = (electron.app || electron.remote.app).getPath('userData');

    //this.path = path.join(userDataPath, name + '.json');

    // TODO: Load the data here
    // Check if all of the 'defaults' keys exist
    this.data = JSON.parse(JSON.stringify(defaults));
  }

  // Retrieve value stored in key
  get(key: string) {
    return this.data[key];
  }

  //getBooleanRef(key: string): Ref<boolean | null> {}

  // Store key-value pair
  set(key: string, value: JsonType) {
    this.data[key] = JSON.parse(JSON.stringify(value));
    this.save();
  }

  save() {}
}
