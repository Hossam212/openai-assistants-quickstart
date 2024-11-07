import { useState } from "react";
import { Icon } from "../icons";
import { clr } from "@/app/lib/colors";

type AsideProps = {
  user: any;
};

const Aside: React.FC<AsideProps> = ({ user }) => {
  return (
    <div
      className="w-[280px] h-screen bg-white flex flex-col border-r-[1px] border-solid pt-[24px] gap-[32px]"
      style={{ borderColor: clr("gray-200") }}
    >
      <button className="pl-4 gap-[10px] h-[24px] w-[24px]">
        <Icon name={"menu"} />
      </button>
      <div className="flex flex-col justify-between h-full">
        <button
          className="ml-4 flex justify-center items-center text-[white] h-[48px] w-[248px] px-[24px] py-[16px] gap-[8px] rounded-[8px]"
          style={{ backgroundColor: clr("primary-700") }}
        >
          <Icon className="" name={"plus-circle"} />
          <span className="font-poppins text-sm font-medium leading-none">
            New Chat
          </span>
        </button>

        <div
          className="flex h-16 w-full border-t-[1px] border-solid items-center"
          style={{ borderColor: clr("gray-200") }}
        >
          <div className="h-14 px-[16px] py-[8px] flex gap-2 w-full items-center">
            <p
              className="rounded-full w-10 h-10 text-white font-normal flex justify-center items-center"
              style={{ backgroundColor: clr("primary-700") }}
            >
              {user.name
                .split(" ")
                .map((word) => word[0])
                .join("")}
            </p>
            <div className="font-poppins h-7 w-40 flex flex-col justify-between">
              <span
                className="text-[12px] font-normal leading-none"
                style={{ color: clr("gray-900") }}
              >
                {user.name}
              </span>
              <span
                className="text-[10px] font-normal leading-none"
                style={{ color: clr("gray-600") }}
              >
                {user.email}
              </span>
            </div>
            <Icon
              className="w-8 h-8 p-2 gap-2 rounded-3xl"
              name={"chevron-down"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aside;
