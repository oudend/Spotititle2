"use client";

import Sidebar from "@/components/ui/sidebar/sidebar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import {
  BaseDirectory,
  createDir,
  readDir,
  copyFile,
  removeFile,
  exists,
  renameFile,
} from "@tauri-apps/api/fs";
// import { appDataDir } from "@tauri-apps/api/path";

import {
  Dropdown,
  SliderInput,
  ImageDropdownInput,
  MultiSelectDropdown,
  ImageInputOptionsProps,
  Label,
} from "@/components/ui/inputs";

import { getAppDataDir } from "@/lib/utils";

import { Store } from "tauri-plugin-store-api";

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
  const [subtitleOffset, setSubtitleOffset] = useState<number>(0);

  const store = new Store(".settings.dat");

  const storeRef = useRef(new Store(".settings.dat"));

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

  listen("current-song-offset", async (event) => {
    try {
      const current_song_offset = parseInt(JSON.parse(event.payload as string));

      setSubtitleOffset(current_song_offset);
    } catch (e) {
      console.error(e);
    }
  });

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

  const storeChange = async (id: string, value: string) => {
    // console.log(id, value, "storechange");
    await store.set(id, value);
    await store.save();
  };

  const loadChange = async (id: string): Promise<string | null> => {
    // const value = await store.get(id);
    // console.log(id, value, "storeget");
    return await store.get(id);
  };

  useEffect(() => {
    let store = storeRef.current;

    const defaultCoverOption = {
      label: "Current Song Cover",
      image: "/assets/backgrounds/default.png",
      extension: "png",
      removeable: false,
      editeable: false,
      path: "/assets/backgrounds/default.png",
      static: true,
    }; 

    const loadCoverOption = async () => {
      console.time("loadCoverOption");
      const current_song_data_string = await invoke("get_current_song");
      const current_song_data = JSON.parse(current_song_data_string as string);
      const images = current_song_data?.item?.album?.images;
      console.timeEnd("loadCoverOption");

      if (images && images.length > 0) {
        return {
          label: "Current Song Cover",
          image: images[0].url,
          extension: "png",
          removeable: false,
          editeable: false,
          path: images[0].url,
          static: true,
        };
      }

      return defaultCoverOption; // Fallback if no images are found
    };

    const staticOptions: Array<ImageInputOptionsProps> = [
      {
        label: "Default",
        image: "/assets/backgrounds/default.png",
        extension: "png",
        removeable: false,
        editeable: false,
        path: "/assets/backgrounds/default.png",
        static: true,
      },
      defaultCoverOption
    ];
    

    const loadBackgroundOptions = async () => {
      console.time("loadBackgroundOptions");

      setBackgroundOptions(staticOptions);

      const coverOptionPromise = loadCoverOption();

      // Fetch unrelated data in parallel
      const [res, appDataDirPath, assetImages] = await Promise.all([
        store.get("hideSubtitles"),
        getAppDataDir(),
        readDir("assets/backgrounds/", { dir: BaseDirectory.AppData, recursive: false }),
      ]);

      setHideSubtitles(res === "true");

      // Prepare background options
      assetImages.forEach(async (entry) => {
        try {
          const entryName = entry.name || "Unnamed Image";
          const extension = entryName.split(".").pop() || "png";
    
          const backgroundOption = {
            label: entryName.split(".").slice(0, -1).join("."),
            image:
              extension === "mp4"
                ? "assets/backgrounds/fallback.png"
                : convertFileSrc(`${appDataDirPath}assets\\thumbnails\\${entryName.split(".")[0]}.png`),
            extension,
            removeable: true,
            editeable: true,
            path: entry.path,
            static: false,
          };
    
          // Add new option incrementally
          setBackgroundOptions((prevOptions) => [...prevOptions, backgroundOption]);
        } catch (error) {
          console.error(`Failed to load background option for entry: ${entry.path}`, error);
        }
      });

      const coverOption = await coverOptionPromise;

      // setBackgroundOptions((prevOptions) => [...prevOptions, coverOption]);

      setBackgroundOptions((prevOptions) => {
        if (prevOptions.length < 2) {
          // If the array has less than 2 items, just add the new option
          return [...prevOptions, coverOption];
        }
      
        return [
          prevOptions[0],      // Keep the first option as is
          coverOption,         // Replace the second option
          ...prevOptions.slice(2), // Keep all options after the second
        ];
      });

      console.timeEnd("loadBackgroundOptions");

    };

    loadBackgroundOptions();

    console.log("use effect triggered for page.tsx");
  }, [setBackgroundOptions, setHideSubtitles]);

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
            await storeChange(id, JSON.parse(value));
            emit("subtitleBackgroundUpdate", { value });
            // eventBus.dispatch("backgroundUpdate", value);
          }}
          loadChange={async (id: string) => {
            return JSON.stringify(await loadChange(id));
          }}
        />
        <Dropdown
          label="Background Effect"
          tooltip="Subtitle Background Effect for background"
          id="subtitleBackgroundEffect"
          options={["none", "spin-effect"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit("subtitleBackgroundUpdate", { value });
            // eventBus.dispatch("backgroundUpdate", value);
          }}
          loadChange={loadChange}
        />
        <Dropdown
          label="Background Blur"
          tooltip="Subtitle Blur amount for background"
          id="subtitleBackgroundBlur"
          options={["none", "small", "medium", "large"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit("subtitleBackgroundUpdate", { value });
            // eventBus.dispatch("backgroundUpdate", value);
          }}
          loadChange={loadChange}
        />
        <Dropdown
          label="Background Type"
          tooltip="Whether the background should apply to the text or the window."
          id="backgroundType"
          options={["Window", "Text"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <MultiSelectDropdown
          label="Convert Text"
          tooltip="Whether the background should apply to the text or the window."
          id="ConvertText"
          options={["KanjiToRomaji", "toPinyin"]}
          storeChange={async (id: string, value: string) => {
            console.log("ConvertText", value);
            await storeChange(id, JSON.parse(value));
          }}
          loadChange={async (id: string) => {
            return JSON.stringify(await loadChange(id));
          }}
        />
        <Dropdown
          label="Horizontal Text Alignment"
          tooltip="Alignment for subtitle text"
          id="horizontalTextAlignment"
          options={["Left", "Center", "Right"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <Dropdown
          label="Vertical Text Alignment"
          tooltip="Alignment for subtitle text"
          id="verticalTextAlignment"
          options={["Start", "Center", "End"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <Dropdown
          label="Visbility"
          tooltip="Visibility for subtitles"
          id="SubtitleVisibility"
          options={["Visible", "Hidden"]}
          storeChange={async (id: string, value: string) => {
            // setHideSubtitles(value === "Hidden");

            await storeChange(
              "hideSubtitles",
              value === "Hidden" ? "true" : "false"
            );

            emit("hideSubtitles", value === "Hidden");

            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <Dropdown
          label="Text Animation"
          tooltip="Animation for subtitle text"
          id="textAnimation"
          options={["None", "Typing", "Bounce", "Rotate"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        />
        <SliderInput
          label="Animation letter percentage"
          tooltip="Animation for subtitle text"
          id="animationDurationPercentage"
          min={0}
          max={1}
          defaultValue={0.1}
          step={0.01}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
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
        {/* <CheckboxSlider
          label="Subtitle Offset"
          tooltip="Offsets the time for the lyrics to display in milliseconds; this can help if the lyrics are out of sync."
          id="subtitleOffset"
          min={-10000}
          max={10000}
          defaultValue={0}
          step={100}
          checkboxId="subtitleOffsetCheckbox"
          newValue={subtitleOffset}
          storeChange={async (id: string, value: string) => {
            if (id === "subtitleOffset" && parseInt(value) !== null) {
              console.log("value", value);
              await invoke("set_subtitle_offset", {
                newOffset: parseInt(value),
              });
            } else {
              await invoke("set_save_subtitle_offset", {
                save: value === "true",
              });
            }
            await storeChange(id, value);
            emit(id, value);
          }}
          loadChange={loadChange}
        /> */}

        <Dropdown
          label="Subtitle Offset Syncing"
          tooltip="How and if the Subtitle Offset should be synced"
          id="subtitleOffsetSync"
          options={["none", "song"]}
          storeChange={async (id: string, value: string) => {
            await invoke("set_save_subtitle_offset", {
              save: value === "song",
            });
            await storeChange(id, value);
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
            await storeChange(id, JSON.parse(value));
            emit("backgroundUpdate");
            // eventBus.dispatch("backgroundUpdate", value);
          }}
          loadChange={async (id: string) => {
            return JSON.stringify(await loadChange(id));
          }}
        />
        <Dropdown
          label="Background Effect"
          tooltip="Background Effect for background"
          id="backgroundEffect"
          options={["none", "spin-effect"]}
          storeChange={async (id: string, value: string) => {
            await storeChange(id, value);
            emit("backgroundUpdate", { value });
            // eventBus.dispatch("backgroundUpdate", value);
          }}
          loadChange={loadChange}
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
