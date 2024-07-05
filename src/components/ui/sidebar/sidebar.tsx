import React from "react";
import Link from "next/link";
import { FiHome, FiSettings, FiInfo } from "react-icons/fi";
import { usePathname } from "next/navigation";
import "./sidebar.css";

// function sidebar() {
//   return (
//     <nav className="flex h-screen">
//       <Link href="/">
//         <FiHome /> Home
//       </Link>
//     </nav>
//   );
// }

/* Sidebar */

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
      className={`flex flex-row gap-5 ${
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

  return (
    <div className="flex flex-col grow px-6 pt-5 pb-20 mx-auto text-3xl whitespace-nowrap shadow-sm bg-stone-900 text-zinc-400 max-md:px-5 w-[300px] h-screen y-0 x-0 absolute shadow-xl">
      <header className="flex gap-5 font-bold">
        <img
          loading="lazy"
          src="./icon.png"
          alt="Spotititle logo"
          className="shrink-0 my-auto w-32px h-32px shadow-[0px_0px_10.5px_-3px_#31A365] aspect-square"
        />
        <div>Spotititle</div>
        <div className="version">v 0.0.1</div>
      </header>
      <nav className="pl-[calc(1.25rem+32px)] mt-10 flex flex-col gap-10">
        {menuItems.map((item, index) => (
          <MenuItem key={index} icon={item.icon} label={item.label} />
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
