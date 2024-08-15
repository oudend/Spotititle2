import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FiHome, FiSettings, FiInfo } from "react-icons/fi";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import "./sidebar.css";

type MenuItemProps = {
  icon: JSX.Element;
  label: string;
};

const MenuItem: React.FC<MenuItemProps> = ({ icon, label }) => {
  const pathname = usePathname();
  const isActive = pathname === `/${label}`;

  return (
    <Link
      href={`/${label}`}
      className={`flex flex-row gap-5 py-5 ${
        isActive ? "drop-shadow-[0_0px_10px_rgba(255,255,255,0.7)]" : ""
      }`}
    >
      <div className="shrink-0 my-auto w-32px h-32px aspect-square ">
        {icon}
      </div>
      <div>{label}</div>
    </Link>
  );
};

const Sidebar: React.FC = () => {
  const menuItems = [
    { icon: <FiHome />, label: "Home" },
    { icon: <FiSettings />, label: "Settings" },
    { icon: <FiInfo />, label: "Debug" },
  ];

  // const version = process.env.REACT_APP_VERSION || "0.0.0";

  return (
    <div className="flex flex-col grow px-6 pt-5 mx-auto text-3xl whitespace-nowrap shadow-sm bg-stone-900 text-zinc-400 max-md:px-5 w-[300px] h-screen y-0 x-0 absolute shadow-xl">
      <header className="flex gap-5 font-bold">
        <Image
          loading="lazy"
          src="/assets/icon.png"
          alt="Spotititle logo"
          width={32}
          height={32}
          className="shrink-0 my-auto  aspect-square" //shadow-[0px_0px_10.5px_-3px_#31A365]
        />
        <div>Spotititle</div>
        <div className="version">v 0.0.1</div>
      </header>
      {/* gap-10 */}
      <nav className="pl-[calc(1.25rem+32px)] mt-10 flex flex-col">
        {menuItems.map((item, index) => (
          <MenuItem key={index} icon={item.icon} label={item.label} />
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
