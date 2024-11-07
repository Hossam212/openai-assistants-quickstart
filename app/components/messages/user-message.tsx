import { clr } from "@/app/lib/colors";

type UserMessageProps = {
  text: string;
  image: string;
  style: any;
  username: string;
};

const UserMessage: React.FC<UserMessageProps> = ({
  text,
  image,
  style,
  username,
}) => {
  return (
    <div className="flex gap-[16px] items-end justify-end">
      <div className="flex flex-col items-end">
        <p
          className="h-[16px] mb-[2px] pr-[10px] font-inter text-[11px] font-normal leading-[16px] text-right"
          style={{ color: clr("gray-100") }}
        >
          {username}
        </p>
        <div
          style={{
            ...style,
            borderRadius: "20px 20px 0px 20px",
            backgroundColor: clr("primary-200"),
          }}
        >
          {image && <div className=""></div>}
          {text}
        </div>
      </div>
      <p
        className="rounded-full w-8 h-8 text-white font-normal flex justify-center items-center"
        style={{ backgroundColor: clr("primary-700") }}
      >
        {username
          .split(" ")
          .map((word) => word[0])
          .join("")}
      </p>
    </div>
  );
};

export default UserMessage;
