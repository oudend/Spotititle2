import React, {
  useState,
  useEffect,
  MouseEventHandler,
  useRef,
  useMemo,
  useReducer,
  ChangeEvent,
  EffectCallback,
} from "react";
import { Checkbox } from "@/components/ui/checkbox"; //chadcn
import { Check, ChevronsUpDown, UploadIcon, X, Pen } from "lucide-react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { PasswordInput } from "@/components/ui/password-input";
import Image from "next/image";
import {
  FileUploader,
  FileUploaderContent,
  FileUploaderItem,
  FileInput,
} from "@/components/ui/file-upload";
import { toast } from "sonner";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { open as Open } from "@tauri-apps/api/dialog";
import ImageWithFallback from "@/components/ui/fallbackImage";
// Open a selection dialog for image files

interface LabelProps {
  label: string;
  tooltip?: string;
  htmlFor: string;
  className: string;
}

const Label: React.FC<LabelProps> = ({
  label,
  tooltip,
  htmlFor,
  className,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <label htmlFor={htmlFor} className={className}>
            {label}
          </label>
        </TooltipTrigger>
        <TooltipContent className="flex items-center text-center border-0 bg-stone-900 outline-0 h-7 rounded-3xl">
          <p className="text-xl text-center text-zinc-400">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface SecretInputProps {
  label: string;
  tooltip?: string;
  id: string;
  placeholder: string;
  storeChange?: (id: string, value: string) => void;
  loadChange?: (id: string) => Promise<string | null>;
  incorrect?: boolean;
}

const SecretInput: React.FC<SecretInputProps> = ({
  label,
  tooltip,
  id,
  placeholder,
  storeChange,
  loadChange,
  incorrect,
}) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    async function loadChanges() {
      var savedValue = loadChange !== undefined ? await loadChange(id) : null;

      if (savedValue === null) savedValue = localStorage.getItem(id);

      if (savedValue) {
        if (storeChange !== undefined) {
          storeChange(id, savedValue);
        }
        setValue(savedValue);
      } else {
        if (storeChange !== undefined) {
          storeChange(id, "");
          setValue("");
        }
      }
    }

    loadChanges();
    // Load saved value from localStorage when component mounts
  }, [id, loadChange, storeChange]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    if (storeChange !== undefined) {
      storeChange(id, newValue);
    }
    localStorage.setItem(id, newValue); // Save to localStorage
  };

  return (
    <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
      <Label
        label={label}
        htmlFor={id}
        tooltip={tooltip}
        className="w-[120px] align-middle flex items-center ml-8 text-left"
      />
      <PasswordInput
        name={id}
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="current-password"
        className={`${
          incorrect
            ? "border-dashed border-t-0 border-l-0 border-r-0 border-b-2 border-red-700"
            : "border-none"
        } bg-stone-900 h-14 w-[920px] outline-none rounded-3xl pl-4`}
      />
    </div>
  );
};

interface TextInputProps {
  label: string;
  tooltip?: string;
  id: string;
  placeholder: string;
  storeChange?: (id: string, value: string) => void;
  loadChange?: (id: string) => Promise<string | null>;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  tooltip,
  id,
  placeholder,
  storeChange,
  loadChange,
}) => {
  const [value, setValue] = useState("");

  // useEffect(() => {
  //   // Load saved value from localStorage when component mounts
  //   const savedValue = localStorage.getItem(id);
  //   if (savedValue) {
  //     setValue(savedValue);
  //   }
  // }, [id]);

  // const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const newValue = event.target.value;
  //   setValue(newValue);
  //   localStorage.setItem(id, newValue); // Save to localStorage
  // };

  useEffect(() => {
    async function loadChanges() {
      var savedValue = loadChange !== undefined ? await loadChange(id) : null;

      if (savedValue === null) savedValue = localStorage.getItem(id);

      if (savedValue) {
        if (storeChange !== undefined) {
          storeChange(id, savedValue);
        }
        setValue(savedValue);
      } else {
        if (storeChange !== undefined) {
          storeChange(id, "");
        }
        setValue("");
      }
    }

    loadChanges();

    // Load saved value from localStorage when component mounts
  }, [id, loadChange, storeChange]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    if (storeChange !== undefined) {
      storeChange(id, newValue);
    }
    localStorage.setItem(id, newValue); // Save to localStorage
  };

  return (
    <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
      <Label
        label={label}
        htmlFor={id}
        tooltip={tooltip}
        className="w-[120px] align-middle flex items-center ml-8 text-left"
      />
      {/* <label
        htmlFor={id}
        className="w-[120px] align-middle flex items-center ml-8"
      >
        {label}
      </label> */}
      <input
        name={id}
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="border-dashed border-b-2 border-red-700 bg-stone-900 h-14 w-[920px] outline-none rounded-3xl pl-4"
      />
    </div>
  );
};

interface ButtonInputProps {
  label: string;
  tooltip?: string;
  id: string;
  text: string;
  onClick?: () => void;
}

const ButtonInput: React.FC<ButtonInputProps> = ({
  label,
  tooltip,
  id,
  text,
  onClick,
}) => {
  return (
    <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
      <div className="w-[120px] align-middle flex items-center ml-8">
        <Label
          label={label}
          htmlFor={id}
          tooltip={tooltip}
          className="block w-full text-left"
        />
      </div>
      <button
        id={id}
        className="bg-stone-900 border-b-2 h-14 w-[920px] border-none outline-none rounded-3xl pl-4"
        onClick={onClick}
      >
        {text}
      </button>
    </div>
  );
};

interface CheckboxButtonProps {
  label: string;
  tooltip?: string;
  id: string;
  buttonId: string;
  buttonText: string;
  storeChange?: (id: string, value: string) => void;
  loadChange?: (id: string) => Promise<string | null>;
  onClick?: () => void;
}

const CheckboxButton: React.FC<CheckboxButtonProps> = ({
  label,
  tooltip,
  id,
  buttonId,
  buttonText,
  storeChange,
  loadChange,
  onClick,
}) => {
  const [value, setValue] = useState(false);

  // useEffect(() => {
  //   // Load saved value from localStorage when component mounts
  //   const savedValue =
  //     localStorage.getItem(checkboxId) == "true" ? true : false;
  //   if (savedValue) {
  //     setValue(savedValue);
  //   }
  // }, [checkboxId]);

  // const handleCheckedChange = (checked: boolean) => {
  //   setValue(checked);
  //   localStorage.setItem(checkboxId, checked ? "true" : "false"); // Save to localStorage
  // };

  useEffect(() => {
    // Load saved value from localStorage when component mounts
    async function loadChanges() {
      var savedStringValue =
        loadChange !== undefined ? await loadChange(id) : null;

      if (savedStringValue === null)
        savedStringValue = localStorage.getItem(id);

      const savedValue = savedStringValue == "true" ? true : false;

      if (savedValue) {
        if (storeChange !== undefined) {
          storeChange(id, savedValue ? "true" : "false");
        }
        setValue(savedValue);
      } else {
        if (storeChange !== undefined) {
          storeChange(id, "false");
        }
        setValue(false);
      }
    }

    loadChanges();
  }, [id, loadChange, storeChange]);

  const handleCheckedChange = (checked: boolean) => {
    setValue(checked);
    if (storeChange !== undefined) {
      storeChange(id, checked ? "true" : "false");
    }
    localStorage.setItem(id, checked ? "true" : "false"); // Save to localStorage
  };

  return (
    <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
      <div className="w-[120px] align-middle flex items-center ml-8">
        <Label
          label={label}
          htmlFor={id}
          tooltip={tooltip}
          className="block w-full text-left"
        />
        {/* <label htmlFor={checkboxId} className="">
          {label}
        </label> */}
        <Checkbox
          checked={value}
          onCheckedChange={handleCheckedChange}
          id={id}
          className="w-[32px] h-[32px] bg-white/[0.1] border-2 border-zinc-400"
        />
      </div>
      <button
        id={buttonId}
        className="bg-stone-900 border-b-2 h-14 w-[920px] border-none outline-none rounded-3xl pl-4"
        onClick={onClick}
      >
        {buttonText}
      </button>
    </div>
  );
};

interface DropdownProps {
  label: string;
  tooltip?: string;
  id: string;
  options: Array<string>;
  onSelect?: (option: string) => void;
  storeChange?: (id: string, value: string) => void;
  loadChange?: (id: string) => Promise<string | null>;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  tooltip,
  id,
  onSelect,
  options,
  storeChange,
  loadChange,
}) => {
  const [value, setValue] = useState(options[0]);

  // useEffect(() => {
  //   // Load saved value from localStorage when component mounts
  //   const savedValue = localStorage.getItem(id);
  //   if (savedValue) {
  //     setValue(savedValue);
  //   }
  // }, [id]);

  // const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const newValue = event.target.value;
  //   setValue(newValue);
  //   localStorage.setItem(id, newValue); // Save to localStorage
  // };

  useEffect(() => {
    async function loadChanges() {
      var savedValue = loadChange !== undefined ? await loadChange(id) : null;

      if (savedValue === null) savedValue = localStorage.getItem(id);

      if (savedValue) {
        if (storeChange !== undefined) {
          storeChange(id, savedValue);
        }
        setValue(savedValue);
      } else {
        if (storeChange !== undefined) {
          storeChange(id, options[0]);
          setValue(options[0]);
        }
      }
    }
    loadChanges();
    // Load saved value from localStorage when component mounts
  }, [id, loadChange, storeChange, options]);

  // const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const newValue = event.target.value;
  //   setValue(newValue);
  //   if (storeChange !== undefined) {
  //     storeChange(id, newValue);
  //   }
  //   localStorage.setItem(id, newValue); // Save to localStorage
  // };

  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
      <Label
        label={label}
        htmlFor={id}
        tooltip={tooltip}
        className="w-[120px] align-middle flex items-center ml-8 text-left"
      />
      {/* <label
        htmlFor={id}
        className="w-[120px] align-middle flex items-center ml-8"
      >
        {label}
      </label> */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            role="combobox"
            aria-expanded={open}
            className="w-[920px] bg-stone-900 text-inherit text-xl font-normal justify-between h-14 rounded-3xl"
          >
            {value}
            <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[920px] bg-stone-900/[.95] p-0 border-0 rounded-3xl">
          <Command className=" border-0 text-white rounded-3xl bg-stone-900/[.1]">
            {/* <CommandInput className="border-0 h-7" placeholder="Search option..." />
          <CommandEmpty>No option found.</CommandEmpty> */}
            <CommandList className="bg-stone-900/[.1]">
              {/* <CommandGroup className="text-white" heading="Themes"> */}
              {options.map((option) => (
                <CommandItem
                  className="opacity-50 h-14"
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    setValue(currentValue);
                    if (onSelect) onSelect(currentValue);
                    if (storeChange !== undefined) {
                      storeChange(id, currentValue);
                    }
                    localStorage.setItem(id, currentValue); // Save to localStorage
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
              {/* </CommandGroup> */}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface SliderInputProps {
  label: string;
  tooltip?: string;
  id: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  storeChange?: (id: string, value: string) => void;
  loadChange?: (id: string) => Promise<string | null>;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label = "Slider",
  tooltip,
  id,
  min = 0,
  max = 100,
  step = 1,
  defaultValue = 0,
  storeChange,
  loadChange,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [intervalId, setIntervalId] = useState(0);
  const [timeoutId, setTimeoutId] = useState(0);

  useEffect(() => {
    async function loadChanges() {
      var savedValue = loadChange !== undefined ? await loadChange(id) : null;

      if (savedValue === null) savedValue = localStorage.getItem(id);

      if (savedValue) {
        if (storeChange !== undefined) {
          storeChange(id, savedValue);
        }
        setValue(Math.min(max, Math.max(min, parseInt(savedValue))));
      } else {
        if (storeChange !== undefined) {
          storeChange(id, "0");
        }
        setValue(0);
      }
    }

    loadChanges();
    // Load saved value from localStorage when component mounts
  }, [id, loadChange, storeChange]);

  const handleChangeSlider = (newValue: number[]) => {
    setValue(newValue[0]);
    if (storeChange !== undefined) {
      storeChange(id, newValue[0].toString());
    }
    localStorage.setItem(id, newValue[0].toString()); // Save to localStorage
  };

  const handleChangeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    var newValue = event.target.value;

    if (newValue == "") {
      newValue = `${min}`;
    }

    setValue(parseInt(newValue));
    if (storeChange !== undefined) {
      storeChange(id, newValue);
    }
    localStorage.setItem(id, newValue); // Save to localStorage
  };

  const handleChevronClick = (
    event: React.MouseEvent<SVGElement, MouseEvent>
  ) => {
    const chevronId = event.currentTarget.id;
    var newValue = value;

    if (chevronId == "leftChevron") {
      newValue -= step;
    } else {
      newValue += step;
    }

    newValue = Math.min(max, Math.max(min, newValue));

    setValue(newValue);
    if (storeChange !== undefined) {
      storeChange(id, newValue.toString());
    }
    localStorage.setItem(id, newValue.toString()); // Save to localStorage
  };

  const handleChevronDown = (
    event: React.MouseEvent<SVGElement, MouseEvent>
  ) => {
    const chevronId = event.currentTarget.id;
    const chevronTimeoutId = window.setTimeout(() => {
      var newValue = value;
      const chevronIntervalId = window.setInterval(() => {
        if (chevronId == "leftChevron") {
          newValue -= step;
        } else {
          newValue += step;
        }

        newValue = Math.min(max, Math.max(min, newValue));
        if (newValue === min || newValue === max)
          clearInterval(chevronIntervalId);

        setValue(newValue);
      }, 25); // Adjust the interval as needed
      setIntervalId(chevronIntervalId);
    }, 250);

    setTimeoutId(chevronTimeoutId);
  };

  const handleChevronUp = (event: React.MouseEvent<SVGElement, MouseEvent>) => {
    clearTimeout(timeoutId);
    clearInterval(intervalId);
    localStorage.setItem(id, value.toString()); // Save to localStorage
  };

  return (
    <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
      <Label
        label={label}
        htmlFor={id}
        tooltip={tooltip}
        className="w-[120px] align-middle flex items-center ml-8 block text-left"
      />
      <div className="w-[920px] flex flex-row items-center">
        <Slider
          className="w-[820px] border-none outline-none ring-0"
          onValueChange={handleChangeSlider}
          value={[value]}
          min={min}
          max={max}
          step={step}
        />
        <div className="w-[100px] flex flex-row items-center justify-between">
          <FiChevronLeft
            className="cursor-pointer select-none"
            id="leftChevron"
            onMouseDown={handleChevronDown}
            onMouseUp={handleChevronUp}
            onMouseLeave={handleChevronUp}
            onClick={handleChevronClick}
          />
          <input
            className="w-12 text-center bg-transparent outline-none"
            id={id}
            type="number"
            min={min}
            max={max}
            onChange={handleChangeInput}
            value={value}
          />
          <FiChevronRight
            className="cursor-pointer select-none"
            id="rightChevron"
            onMouseDown={handleChevronDown}
            onMouseUp={handleChevronUp}
            onMouseLeave={handleChevronUp}
            onClick={handleChevronClick}
          />
        </div>
      </div>
    </div>
  );
};

interface ImageInputOptionsProps {
  label: string;
  image: string;
  extension: string;
  removeable: boolean;
  editeable: boolean;
  path: string | null;
  static: boolean;
}

interface ImageInputProps {
  label: string;
  tooltip?: string;
  options: Array<ImageInputOptionsProps>;
  handleFileUpload: (path: string) => Promise<ImageInputOptionsProps | null>;
  handleFileDelete: (option: ImageInputOptionsProps) => void;
  handleFileRename: (
    option: ImageInputOptionsProps,
    name: string
  ) => Promise<ImageInputOptionsProps | null>;
  onFileSelect?: (option: ImageInputOptionsProps) => void;
  minFilenameLength?: number;
  maxFilenameLength?: number;
  fallbackImage?: string;
  id: string;
  storeChange?: (id: string, value: string) => void;
  loadChange?: (id: string) => Promise<string | null>;
}

const ImageDropdownInput: React.FC<ImageInputProps> = ({
  label,
  tooltip,
  options,
  handleFileUpload,
  handleFileDelete,
  handleFileRename,
  onFileSelect,
  minFilenameLength,
  maxFilenameLength,
  fallbackImage,
  id,
  storeChange,
  loadChange,
}) => {
  const [value, setValue] = useState(options[0].label);
  const [image, setImage] = useState(options[0].image);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const selectOption = (index: number, callback: boolean = true) => {
    setValue(options[index].label);
    setImage(`${options[index].image}?${"input"}`); //options[index].image);

    if (storeChange !== undefined) {
      storeChange(id, JSON.stringify(options[index]));
    }

    localStorage.setItem(id, JSON.stringify(options[index]));

    if (onFileSelect && callback) onFileSelect(options[index]);
  };

  useEffect(() => {
    async function loadOption() {
      var savedOption: ImageInputOptionsProps;

      var savedValue = loadChange !== undefined ? await loadChange(id) : null;

      if (savedValue === null) savedValue = localStorage.getItem(id);

      if (!savedValue) {
        selectOption(0, false);
        return;
      }

      try {
        savedOption = JSON.parse(savedValue);
      } catch (error) {
        selectOption(0, false);
        return;
      }

      let savedOptionIndex = options.findIndex(
        (option) => option.label === savedOption.label
      );

      if (savedOptionIndex === -1) return;

      selectOption(savedOptionIndex, false);
    }

    loadOption();
    // Load saved value from localStorage when component mounts
    // const savedOption = localStorage.getItem(id);
  });

  const uploadFile = async () => {
    const imagePath = await Open({
      multiple: false,
      filters: [
        {
          name: "Image",
          extensions: ["png", "jpeg", "jpg", "webp", "gif", "mp4"],
        },
      ],
    });
    if (imagePath === null) {
      toast("Hello World!");
      return; // user cancelled the selection
    } else {
      const data = await handleFileUpload(imagePath as string);
      if (data) {
        options.push(data);

        selectOption(options.length - 1);
      } else {
        toast("Image Upload Failed!");
      }
    }
  };

  const deleteFile = async (deletedOption: ImageInputOptionsProps) => {
    if (value === deletedOption.label) {
      selectOption(0);
    }

    forceUpdate();

    await handleFileDelete(deletedOption);
  };

  const renameFile = async (
    renamedOption: ImageInputOptionsProps,
    name: string
  ): Promise<boolean> => {
    let renamedOptionIndex = options.findIndex(
      (option) => option.label === renamedOption.label
    );

    let nameIndex = options.findIndex((option) => option.label === name);

    if (renamedOptionIndex === -1 || nameIndex !== -1) return false;

    const newOption = await handleFileRename(renamedOption, name);

    if (newOption === null) return false;

    if (value == renamedOption.label) setValue(name);

    // options[renamedOptionIndex].label = name;

    options[renamedOptionIndex] = newOption;

    selectOption(renamedOptionIndex, false);

    forceUpdate();

    return true;
  };

  const [open, setOpen] = React.useState(false);

  const GrowingInput = (props: React.ComponentProps<"input">) => {
    const input = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (input.current) {
        input.current.style.width = "60px";
        input.current.style.width = `${input.current.scrollWidth}px`;
      }
    });

    const handleChangeAndSize = (ev: ChangeEvent<HTMLInputElement>) => {
      const target = ev.target;
      target.style.width = "60px";
      target.style.width = `${target.scrollWidth}px`;
    };

    return <input ref={input} onChange={handleChangeAndSize} {...props} />;
  };

  return (
    <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
      <Label
        label={label}
        htmlFor={id}
        tooltip={tooltip}
        className="w-[120px] align-middle flex items-center ml-8 text-left"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            role="combobox"
            aria-expanded={open}
            className="w-[920px] bg-stone-900 text-inherit text-xl font-normal justify-between h-14 rounded-3xl"
          >
            <div className="flex flex-row gap-5">
              {image && (
                <Image
                  loading="lazy"
                  src={image}
                  alt="image"
                  width={32}
                  height={32}
                  className="my-auto rounded-sm shrink-0 aspect-square object-cover"
                  unoptimized={true}
                />
              )}
              {value}
            </div>
            <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[920px] bg-stone-900/[.95] p-0 border-0 rounded-3xl">
          <Command className=" border-0 text-white rounded-3xl bg-stone-900/[.1]">
            <CommandList className="bg-stone-900/[.1] scrollbar-hide">
              {/* <CommandGroup className="text-white" heading="Themes"> */}
              <CommandItem className="absolute h-0">
                <input
                  title="firstOption"
                  type="text"
                  defaultValue="text"
                  className="h-0"
                />
              </CommandItem>
              {options.map((option, index) => (
                <CommandItem
                  className="opacity-50 h-14 flex gap-4"
                  key={option.label}
                  value={option.label}
                  onSelect={() => {
                    selectOption(index);
                  }}
                >
                  <div className="flex justify-between w-full items-center">
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.label ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-row gap-2 items-center">
                        <ImageWithFallback
                          loading="lazy"
                          src={option.image}
                          fallbackSrc={fallbackImage}
                          alt={option.label}
                          width={32}
                          height={32}
                          className="my-auto rounded-sm shrink-0 aspect-square object-cover"
                          unoptimized={true}
                        />
                        {(option.editeable && (
                          <GrowingInput
                            contentEditable={option.editeable}
                            title={option.label}
                            type="text"
                            defaultValue={option.label}
                            minLength={minFilenameLength}
                            maxLength={maxFilenameLength}
                            onBlur={async (e) => {
                              e.preventDefault();

                              const currentTarget = e.currentTarget;

                              if (
                                (minFilenameLength &&
                                  currentTarget.value.length >
                                    minFilenameLength) ||
                                !minFilenameLength
                              ) {
                                let success = await renameFile(
                                  option,
                                  e.target.value
                                );

                                console.log(success);

                                if (success) return;
                              }

                              currentTarget.value = option.label;

                              currentTarget.style.width = "60px";
                              currentTarget.style.width = `${currentTarget.scrollWidth}px`;
                            }}
                            onKeyDown={async (e) => {
                              if (e.key !== "Enter") {
                                return;
                              }

                              e.preventDefault();

                              const currentTarget = e.currentTarget;

                              if (
                                (minFilenameLength &&
                                  e.currentTarget.value.length >
                                    minFilenameLength) ||
                                !minFilenameLength
                              ) {
                                let success = await renameFile(
                                  option,
                                  currentTarget.value
                                );

                                console.log(success);

                                if (success) return;
                              }

                              currentTarget.value = option.label;

                              currentTarget.style.width = "60px";
                              currentTarget.style.width = `${currentTarget.scrollWidth}px`;
                            }}
                            className="outline-none bg-transparent min-w-12"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          />
                        )) ||
                          option.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pr-2">
                      {option.removeable && (
                        <X
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(option);

                            let deletedOptionIndex = options.findIndex(
                              (opt) => opt.label === option.label
                            );

                            options.splice(deletedOptionIndex, 1);
                          }}
                          className="cursor-pointer"
                        />
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
              <CommandItem
                className="opacity-50 h-14 flex gap-4"
                key={"Custom"}
                value={"Custom"}
                onClick={uploadFile}
                onSelect={uploadFile}
              >
                <div className="flex flex-row gap-2 items-center pl-4 mx-2">
                  <UploadIcon width={32} height={32} />
                  <label htmlFor="fileUpload">Custom</label>
                </div>
              </CommandItem>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export {
  SecretInput,
  TextInput,
  CheckboxButton,
  Dropdown,
  SliderInput,
  ImageDropdownInput,
  Label,
  ButtonInput,
};

export type { ImageInputOptionsProps };
