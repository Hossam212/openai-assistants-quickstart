import Markdown from "react-markdown";
import { clr } from "@/app/lib/colors";

const AssistantMessage = ({ text, style, avatar }) => {
  return (
    <div className="flex gap-[16px] items-end">
      <p className="rounded-full w-8 h-8 flex justify-center items-center">
        <img
          src="/AIAvatar.svg"
          className="w-[32px] h-[32px]"
          alt="AI Avatar"
        />
      </p>
      <div className="flex flex-col">
        <p
          className="h-[16px] mb-[2px] pl-[10px] font-inter text-[11px] font-normal leading-[16px]"
          style={{ color: clr("gray-100") }}
        >
          Narmer Ai
        </p>
        <div
          style={{
            ...style,
            alignSelf: "flex-start",
            backgroundColor: "#3A464D0F",
            borderRadius: "20px 20px 20px 0px",
          }}
        >
          <Markdown>{text}</Markdown>
        </div>
      </div>
    </div>
  );
};

export default AssistantMessage;
