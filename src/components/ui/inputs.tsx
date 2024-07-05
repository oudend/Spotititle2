import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox"; //chadcn

interface TextInputProps {
  label: string;
  id: string;
  placeholder: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, id, placeholder }) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    // Load saved value from localStorage when component mounts
    const savedValue = localStorage.getItem(id);
    if (savedValue) {
      setValue(savedValue);
    }
  }, [id]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    localStorage.setItem(id, newValue); // Save to localStorage
  };

  return (
    <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
      <label
        htmlFor={id}
        className="w-[120px] align-middle flex items-center ml-8"
      >
        {label}
      </label>
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

interface CheckboxButtonProps {
  label: string;
  checkboxId: string;
  buttonId: string;
  buttonText: string;
}

const CheckboxButton: React.FC<CheckboxButtonProps> = ({
  label,
  checkboxId,
  buttonId,
  buttonText,
}) => {
  const [value, setValue] = useState(false);

  useEffect(() => {
    // Load saved value from localStorage when component mounts
    const savedValue =
      localStorage.getItem(checkboxId) == "true" ? true : false;
    if (savedValue) {
      setValue(savedValue);
    }
  }, [checkboxId]);

  const handleCheckedChange = (checked: boolean) => {
    setValue(checked);
    localStorage.setItem(checkboxId, checked ? "true" : "false"); // Save to localStorage
  };

  return (
    <div className="flex w-[100%] gap-[62px] h-20 bg-[rgba(0,0,0,0.6)] z-3 justify-center items-center">
      <div className="w-[120px] align-middle flex items-center ml-8">
        <label htmlFor={checkboxId} className="">
          {label}
        </label>
        <Checkbox
          checked={value}
          onCheckedChange={handleCheckedChange}
          id={checkboxId}
          className="w-[32px] h-[32px] bg-white/[0.1] border border-2 border-zinc-400"
        />
      </div>
      <button
        id={buttonId}
        className="bg-stone-900 border-b-2 h-14 w-[920px] border-none outline-none rounded-3xl pl-4"
      >
        {buttonText}
      </button>
    </div>
  );
};

export { TextInput, CheckboxButton };
