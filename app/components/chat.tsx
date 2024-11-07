"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import { getSupabaseClient } from "../utils/supabase";
import { clr } from "../lib/colors";
import Message from "./messages/message";
import LoadingDots from "./loading-dots";
import { Icon } from "./icons";

const testUser = {
  name: "User Name",
  email: "email",
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
};

const Chat = ({
  functionCallHandler = () => Promise.resolve(""), // default to return empty string
}: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [usageMetrics, setUsageMetrics] = useState({});
  const [loading, setLoading] = useState(false);

  // automatically scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // create a new threadID when chat component created
  useEffect(() => {
    const createThread = async () => {
      const res = await fetch(`/api/assistants/threads`, {
        method: "POST",
      });
      const data = await res.json();
      setThreadId(data.threadId);
    };
    createThread();
  }, []);

  const sendMessage = async (text, imageUrl) => {
    console.log("sending message", text, imageUrl);
    setLoading(true);
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: [
            ...(imageUrl
              ? [
                  {
                    type: "image_url",
                    image_url: { url: imageUrl },
                  },
                ]
              : []),
            {
              type: "text",
              text: text,
            },
          ],
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const submitActionResult = async (runId, toolCallOutputs) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/actions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runId,
          toolCallOutputs: toolCallOutputs,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    sendMessage(userInput, imageURl);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setImage(null);
    setInputDisabled(false);
    scrollToBottom();
  };

  const supabase = getSupabaseClient();

  const uploadToSupabase = async (file) => {
    const { data, error } = await supabase.storage
      .from("testing-assistant")
      .upload(`images/${file.name}`, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }
    try {
      const { data: publicURL } = supabase.storage
        .from("testing-assistant")
        .getPublicUrl(`images/${file.name}`);
      return publicURL;
    } catch (urlError) {
      if (urlError) {
        console.error("Error getting public URL:", urlError);
        return null;
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const imageUrl = await uploadToSupabase(file);
    console.log(imageUrl["publicUrl"]);
    if (imageUrl) {
      setUserImage(imageUrl["publicUrl"]);
      setImage(imageUrl["publicUrl"]);
    }
  };
  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    appendMessage("assistant", "");
  };

  // textDelta - append text to last assistant message
  const handleTextDelta = (delta) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    }
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  // imageFileDone - show image in chat
  const handleImageFileDone = (image) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  };

  // toolCallCreated - log new tool call
  const toolCallCreated = (toolCall) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  // toolCallDelta - log delta and snapshot for the tool call
  const toolCallDelta = (delta, snapshot) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input);
  };

  // handleRequiresAction - handle function call
  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    // loop over tool calls and call function handler
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await functionCallHandler(toolCall);
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  // handleRunCompleted - re-enable the input form
  const handleRunCompleted = () => {
    setInputDisabled(false);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    setLoading(false);
    // messages
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);

    // image
    stream.on("imageFileDone", handleImageFileDone);

    // code interpreter
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);

    // events without helpers yet (e.g. requires_action and run.done)
    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  /*
    =======================
    === Utility Helpers ===
    =======================
  */

  const appendToLastMessage = (text) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role, text) => {
    setMessages((prevMessages) => [...prevMessages, { role, text }]);
  };

  const annotateLastMessage = (annotations) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation) => {
        if (annotation.type === "file_path") {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      });
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };
  const fileInuputRef = useRef(null);
  const [image, setImage] = useState<string | null>(null);

  return (
    <div
      className={`flex flex-col items-center h-screen bg-[#f7f7f7] ${
        messages.length > 0 ? "justify-end" : "justify-center"
      }`}
    >
      {/* Conditionally render the title and subtitle */}
      {messages.length === 0 && (
        <>
          <div className="text-center text-[#1f1f1f] text-[56px] font-semibold font-poppins leading-[72px]">
            Welcome to Narmer AI
          </div>
          <div className="text-center text-[#7a7a7a] text-2xl font-semibold font-poppins leading-loose mt-6">
            Smarter, faster study help, made fun.
          </div>
        </>
      )}

      {/* Chat and Input Container */}
      <div className={`w-[896px] flex flex-col items-center mt-8 mb-8`}>
        {/* Messages Section */}
        <div
          className={`w-full flex flex-grow w-full overflow-auto`}
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div
            className={`w-full overflow-y-auto p-2.5 flex flex-col order-2 whitespace-pre-wrap gap-4`}
          >
            {messages.map((msg, index) => (
              <Message
                key={index}
                role={msg.role}
                text={msg.text}
                image={msg.image}
                avatar=""
                user={testUser}
              />
            ))}
            {loading && <LoadingDots />}
            <div ref={messagesEndRef} />
          </div>
          {image && (
            <div className="h-[112px] px-[0] py-[16px] flex items-center">
              <div className="relative">
                <button
                  className="absolute text-xs -top-[13px] -right-[11px] w-[32px] h-[32px] rounded-full bg-white text-gray-800 flex items-center justify-center border-[4px]"
                  style={{
                    borderColor: clr("gray-50"),
                  }}
                  onClick={() => setImage(null)}
                >
                  <Icon name={"close"} />
                </button>
                <div className="rounded-[8px] w-[80px] h-[80px] flex items-center justify-center overflow-hidden">
                  <img
                    src={image}
                    className="w-full h-full object-cover rounded-[8px] border-[4px] border-solid border-white"
                    alt="uploaded image"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <form
          onSubmit={handleSubmit}
          className={`w-[896px] h-20 mt-12 flex items-center justify-between bg-white rounded-2xl shadow border border-[#f0f2f5] pl-5 pr-4`}
        >
          {/* Text Input Field */}
          <input
            type="text"
            className="w-full max-w-none text-[#7a7a7a] text-base font-medium font-poppins outline-none placeholder-opacity-80"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask me anything..."
          />

          {/* Actions Section */}
          <div className="flex items-center gap-4 ml-4">
            {/* File Upload */}
            <div
              className="cursor-pointer w-6 h-6 flex justify-center items-center"
              onClick={() => fileInuputRef.current.click()}
            >
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInuputRef}
              />
              <img
                className="translate-x-[40px]"
                width="24"
                height="24"
                src="/photo.svg"
                alt="Logo"
              />
            </div>

            {/* Vertical Divider */}
            <div className="self-stretch py-1.5 mx-1 translate-x-[40px]">
              <div className="w-9 self-stretch origin-top-left rotate-90 border border-[#f0f2f5]" />
            </div>
            <button
              type="submit"
              className="w-12 h-12 bg-[#00aaff] opacity-20 rounded-lg shadow-inner border border-[#00aaff] flex justify-center items-center"
              disabled={inputDisabled}
            >
              <img src="/send.svg" alt="Logo" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;
