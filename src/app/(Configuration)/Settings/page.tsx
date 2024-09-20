"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox"; //chadcn
import Sidebar from "@/components/ui/sidebar/sidebar";
import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { decode } from "base64-arraybuffer";
import {
  BaseDirectory,
  createDir,
  writeBinaryFile,
  writeFile,
  readDir,
  copyFile,
  removeFile,
  exists,
  renameFile,
} from "@tauri-apps/api/fs";
// import { appDataDir } from "@tauri-apps/api/path";

import {
  TextInput,
  CheckboxButton,
  Dropdown,
  SliderInput,
  ImageDropdownInput,
  ImageInputOptionsProps,
  Label,
  ButtonInput,
} from "@/components/ui/inputs";

import { SettingsManager } from "tauri-settings";
import { Store } from "tauri-plugin-store-api";

// let store: any;
// if (typeof window !== "undefined") {
//   const { Store } = require("tauri-plugin-store-api");
//   store = new Store(".settings.dat");
// }

// import dynamic from "next/dynamic";

import { emit, listen } from "@tauri-apps/api/event";

export default function Home() {
  const [backgroundOptions, setBackgroundOptions] = useState<
    Array<ImageInputOptionsProps>
  >([
    {
      label: "Default",
      image: "/assets/backgrounds/default.png",
      extension: "png",
      removeable: false,
      editeable: false,
      path: "/assets/backgrounds/default.png",
      static: false,
    },
  ]);

  const [hideSubtitles, setHideSubtitles] = useState<boolean>(false);

  const store = new Store(".settings.dat");

  // const createBackgroundsDir = async () => {
  //   try {
  //     await createDir("assets/backgrounds", {
  //       dir: BaseDirectory.AppData,
  //       recursive: true,
  //     });
  //   } catch (error) {
  //     console.error("Error creating backgrounds directory:", error);
  //   }
  // };

  const handleFileUpload = async (
    path: string
  ): Promise<null | ImageInputOptionsProps> => {
    var filename = path.replace(/^.*[\\/]/, "").replace(" ", "_");

    if (filename.length < 3) {
      return null;
    }

    // createBackgroundsDir();
    await createDir("assets/backgrounds", {
      dir: BaseDirectory.AppData,
      recursive: true,
    });
    await createDir("assets/thumbnails", {
      dir: BaseDirectory.AppData,
      recursive: true,
    });

    const fileExists = await exists(`assets\\backgrounds\\${filename}`, {
      dir: BaseDirectory.AppData,
    });

    if (fileExists) return null;

    try {
      // import { appDataDir } from "@tauri-apps/api/path";
      const pathModule = await import("@tauri-apps/api/path");

      const appDataDirPath = await pathModule.appDataDir();

      const result = await invoke("create_thumbnail", {
        src: path,
        dest: `${appDataDirPath}assets\\thumbnails\\${
          filename.split(".")[0] as string
        }.png`,
        width: 256,
        height: 256,
      });

      if (result) {
        console.log("rust error:");
        console.error(result);
        return null;
      }

      await copyFile(path, `assets\\backgrounds\\${filename}`, {
        dir: BaseDirectory.AppData,
      });

      const extension = filename.split(".").pop() as string;

      return {
        label: filename.split(".").slice(0, -1).join("."),
        image:
          extension === "mp4"
            ? "assets/backgrounds/fallback.png"
            : convertFileSrc(
                `${appDataDirPath}assets\\thumbnails\\${
                  filename.split(".")[0] as string
                }.png`
              ),
        extension: filename.split(".").pop() as string,
        removeable: true,
        editeable: true,
        path: `${appDataDirPath}assets\\backgrounds\\${filename}`,
        static: false,
      };
    } catch (e) {
      console.log(e);
    }

    return null;
  };

  const handleFileDelete = async (option: ImageInputOptionsProps) => {
    await removeFile(
      `assets\\backgrounds\\${option.label}.${option.extension}`,
      {
        dir: BaseDirectory.AppConfig,
      }
    );
    await removeFile(
      `assets\\thumbnails\\${option.label}.${option.extension}`,
      {
        dir: BaseDirectory.AppConfig,
      }
    );
  };

  const handleFileRename = async (
    option: ImageInputOptionsProps,
    name: string
  ): Promise<ImageInputOptionsProps | null> => {
    const pathModule = await import("@tauri-apps/api/path");

    const appDataDirPath = await pathModule.appDataDir();

    const fileExists = await exists(
      `assets\\backgrounds\\${name}.${option.extension}`,
      {
        dir: BaseDirectory.AppData,
      }
    );

    if (fileExists) return null;

    await renameFile(
      `assets\\backgrounds\\${option.label}.${option.extension}`,
      `assets\\backgrounds\\${name}.${option.extension}`,
      { dir: BaseDirectory.AppData }
    );

    if (option.extension !== "mp4") {
      await renameFile(
        `assets\\thumbnails\\${option.label}.png`,
        `assets\\thumbnails\\${name}.png`,
        { dir: BaseDirectory.AppData }
      );
    }

    // option.image =
    //   option.extension === "mp4"
    //     ? "assets/backgrounds/fallback.png"
    //     : convertFileSrc(
    //         `${appDataDirPath}assets\\thumbnails\\${name}.${option.extension}`
    //       );
    option.path = `${appDataDirPath}assets\\backgrounds\\${name}.${option.extension}`;

    option.label = name;

    console.log(option);

    await store.set("background", option);
    emit("backgroundUpdate", { option });
    // eventBus.dispatch("backgroundUpdate", option);

    return option;
  };

  listen("current-song-updated", async (event) => {
    try {
      const current_song_data = JSON.parse(event.payload as string);

      const images = current_song_data?.item?.album?.images;

      console.log(images);

      if (images && images.length > 0) {
        const newBackgroundOptions = [...backgroundOptions];

        // Check if the index exists
        if (newBackgroundOptions[1]) {
          // Update the properties
          newBackgroundOptions[1].image = images[0].url;
          newBackgroundOptions[1].path = images[0].url;

          // Set the new state
          setBackgroundOptions(newBackgroundOptions);
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  useEffect(() => {
    let options: Array<ImageInputOptionsProps> = [];

    options.push({
      label: "Default",
      image: "/assets/backgrounds/default.png",
      extension: "png",
      removeable: false,
      editeable: false,
      path: "/assets/backgrounds/default.png",
      static: true,
    });

    options.push({
      label: "Current Song Cover",
      image: "/assets/backgrounds/default.png",
      extension: "png",
      removeable: false,
      editeable: false,
      path: null,
      static: true,
    });

    async function loadCoverOption() {
      const current_song_data_string = await invoke("get_current_song");

      const current_song_data = JSON.parse(current_song_data_string as string);

      const images = current_song_data?.item?.album?.images;

      console.log(images);

      if (images && images.length > 0) {
        options[1].image = images[0].url;
        options[1].path = images[0].url;
      }

      setBackgroundOptions(options);
    }

    async function loadBackgroundOptions() {
      // const current_song_data_string = await invoke("get_current_song");

      // const current_song_data = JSON.parse(current_song_data_string as string);

      // const images = current_song_data?.item?.album?.images;

      // if (images && images.length > 0) {
      //   options[1].image = images[0];
      //   options[1].path = images[0];
      // }

      // console.log("current_song_data", current_song_data?.item?.album?.images);

      // const result = await invoke<string>("get_backgrounds", {});

      setHideSubtitles(
        (await loadChange("hideSubtitles")) === "true" ? true : false
      );

      const pathModule = await import("@tauri-apps/api/path");

      const appDataDirPath = await pathModule.appDataDir();

      const assetImages = await readDir("assets/backgrounds/", {
        dir: BaseDirectory.AppData,
        recursive: false,
      });

      assetImages.forEach(async (entry) => {
        const extension = (entry.name || "Name.png").split(".").pop() || "png";

        if (entry.name) {
          options.push({
            label: (entry.name || "Name.png").split(".").slice(0, -1).join("."),
            image:
              extension === "mp4"
                ? "assets/backgrounds/fallback.png"
                : convertFileSrc(
                    `${appDataDirPath}assets\\thumbnails\\${
                      entry.name.split(".")[0] as string
                    }.png`
                  ),
            extension: extension,
            removeable: true,
            editeable: true,
            path: entry.path,
            static: false,
          });
        }
      });

      setBackgroundOptions(options);
    }

    loadBackgroundOptions();
    loadCoverOption();
  }, []);

  const storeChange = async (id: string, value: string) => {
    // console.log(id, value, "storechange");
    await store.set(id, value);
    await store.save();
  };

  const loadChange = async (id: string): Promise<string | null> => {
    const value = await store.get(id);
    // console.log(id, value, "storeget");
    return await store.get(id);
  };

  return (
    <div className=" h-screen overflow-y-scroll overflow-x-hidden scrollbar-hide">
      <Sidebar></Sidebar>
      <main className="flex text-xl text-zinc-400 min-h-screen flex-col items-center pl-[300px] w-full">
        <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
          <Label
            htmlFor=""
            label="Subtitles"
            className="text-center flex items-center h-20 text-white w-full text-3xl"
          />
        </div>
        <ImageDropdownInput
          label="Background"
          tooltip={"Subtitle Background"}
          options={backgroundOptions}
          id="subtitleBackgroundImage"
          fallbackImage={"assets/backgrounds/fallback.png"}
          handleFileUpload={handleFileUpload}
          handleFileDelete={handleFileDelete}
          handleFileRename={handleFileRename}
          minFilenameLength={3}
          maxFilenameLength={30}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit("subtitleUpdate", { value });
            // eventBus.dispatch("backgroundUpdate", value);
          }}
          loadChange={loadChange}
        />
        <Dropdown
          label="Text Alignment"
          tooltip="Alignment for subtitle text"
          id="textAlignment"
          options={["Left", "Center", "Right"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <ButtonInput
          label="Visibility"
          id="SubtitleVisibility"
          text={hideSubtitles ? "Show" : "Hide"}
          onClick={async () => {
            setHideSubtitles(!hideSubtitles);

            await storeChange(
              "hideSubtitles",
              !hideSubtitles ? "true" : "false"
            );

            emit("hideSubtitles", !hideSubtitles);
          }}
        />
        <SliderInput
          label="Background Opacity"
          tooltip="Opacity of the subtitle window background"
          id="backgroundOpacity"
          min={0}
          max={100}
          defaultValue={100}
          step={1}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <SliderInput
          label="Font Size"
          tooltip="Font Size"
          id="fontSize"
          min={10}
          max={100}
          defaultValue={10}
          step={1}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <SliderInput
          label="Fps"
          tooltip="Frames per second"
          id="framesPerSecond"
          min={0}
          max={60}
          defaultValue={15}
          step={1}
          storeChange={storeChange}
          loadChange={loadChange}
        />
        <SliderInput
          label="Update Interval"
          tooltip="Determines how often the lyric progress will be synced, too often updates might lead to rate limiting imposed by spotify."
          id="updateInterval"
          min={500}
          max={10000}
          defaultValue={100}
          step={1}
          storeChange={async (id: string, value: string) => {
            await invoke("set_update_interval", {
              newInterval: parseInt(value),
            });
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <SliderInput
          label="Subtitle Offset"
          tooltip="Offsets the time for the lyrics to display in milliseconds, this can help if the lyrics is out of sync."
          id="subtitleOffset"
          min={-10000}
          max={10000}
          defaultValue={0}
          step={100}
          storeChange={async (id: string, value: string) => {
            await invoke("set_subtitle_offset", {
              newOffset: parseInt(value),
            });
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
          <Label
            htmlFor=""
            label="App"
            className="text-center flex items-center h-20 text-white w-full text-3xl"
          />
        </div>
        <ImageDropdownInput
          label="Background Image"
          tooltip={"Background Image"}
          options={backgroundOptions}
          id="backgroundImage"
          fallbackImage={"assets/backgrounds/fallback.png"}
          handleFileUpload={handleFileUpload}
          handleFileDelete={handleFileDelete}
          handleFileRename={handleFileRename}
          minFilenameLength={3}
          maxFilenameLength={30}
          storeChange={async (id: string, value: string) => {
            console.log(JSON.parse(value), "hello?");
            await storeChange(id, JSON.parse(value));
            emit("backgroundUpdate");
            // eventBus.dispatch("backgroundUpdate", value);
          }}
          loadChange={async (id: string) => {
            console.log(
              "await loadChange, backgroundImage",
              await loadChange(id)
            );

            return JSON.stringify(await loadChange(id));
          }}
        />
        <Dropdown
          label="Background Blur"
          tooltip="Blur amount for background"
          id="backgroundBlur"
          options={["none", "small", "medium", "large"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit("backgroundUpdate", { value });
            // eventBus.dispatch("backgroundUpdate", value);
          }}
          loadChange={loadChange}
        />
        <Dropdown
          label="Background Alignment"
          tooltip="Background Alignment"
          id="backgroundAlignment"
          onSelect={async (option) => {
            // switch (option) {
            //   case "cover":
            //     await store.set("backgroundAlignment", "object-cover");
            //     break;
            //   case "fit":
            //     await store.set("backgroundAlignment", "object-fit");
            //     break;
            // }
            // eventBus.dispatch("backgroundUpdate", option);
            // console.log("option 12121212", option);
          }}
          options={["cover", "fit"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit("backgroundUpdate", { value });
            // eventBus.dispatch("backgroundUpdate", value);
          }}
          loadChange={loadChange}
        />
      </main>
    </div>
  );
}
