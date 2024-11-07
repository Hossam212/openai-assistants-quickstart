import React from "react";
import UserMessage from "./user-message";
import AssistantMessage from "./assistant-message";
import CodeMessage from "./code-message";
import { clr } from "../../lib/colors";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
  image: string;
  avatar: string;
  user: any;
};

export default function Message({
  role,
  text,
  image,
  avatar,
  user,
}: MessageProps) {
  return (
    <>
      {role === "user" && (
        <UserMessage
          style={messageStyle}
          text={text}
          image={image}
          username={user.name}
        />
      )}
      {role === "assistant" && (
        <AssistantMessage style={messageStyle} text={text} avatar={avatar} />
      )}
      {role === "code" && <CodeMessage style={messageStyle} text={text} />}
    </>
  );
}

const messageStyle = {
  borderRadius: "8px",
  maxWidth: "600px",
  overflowWrap: "break-word",
  fontFamily: '"Inter", sans-serif',
  color: "#050400",
  fontSize: "15px",
  fontWeight: 300,
  lineHeight: "20px",
  letterSpacing: "-0.005em",
  padding: "16px 20px 16px 20px",
  gap: "16px",
};
