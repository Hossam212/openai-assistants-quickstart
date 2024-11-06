"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import { getSupabaseClient } from "../utils/supabase";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.assistantMessage}>
      <Markdown>{text}</Markdown>
    </div>
  );
};

const CodeMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.codeMessage}>
      {text.split("\n").map((line, index) => (
        <div key={index}>
          <span>{`${index + 1}. `}</span>
          {line}
        </div>
      ))}
    </div>
  );
};

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
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
  const [userImage, setUserImage] = useState<String | null>(null);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [usageMetrics, setUsageMetrics] = useState({});

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
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: [
            ...(imageUrl ? [{
              type: "image_url",
              image_url: { url: imageUrl }
            }] : []),
            {
              type: "text",
              text: text
            },
          ]
        })
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
    if (!userInput.trim() && !userImage) return;
    sendMessage(userInput, userImage);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setUserImage(null);
    setInputDisabled(true);
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
      const { data: publicURL } = supabase
        .storage
        .from("testing-assistant")
        .getPublicUrl(`images/${file.name}`);
      return publicURL;
    } catch (urlError) {
      if (urlError) {
        console.error("Error getting public URL:", urlError);
        return null;
      }

    };
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const imageUrl = await uploadToSupabase(file);
    console.log(imageUrl['publicUrl'])
    if (imageUrl) {
      setUserImage(imageUrl['publicUrl']);
      setImage(imageUrl['publicUrl']);
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
    };
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  // imageFileDone - show image in chat
  const handleImageFileDone = (image) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  }

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
      if (event.event === "thread.run.completed") {
        event.data.usage && setUsageMetrics(event.data.usage);
        handleRunCompleted();
      }
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
        if (annotation.type === 'file_path') {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      })
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });

  }
  const fileInuputRef = useRef(null);
  const [image, setImage] = useState<string | null>(null);

  const PROMPT_COST_PER_1K = 0.000150 ; // Replace with actual cost per 1,000 prompt tokens
  const COMPLETION_COST_PER_1K = 0.000600; // Replace with actual cost per 1,000 completion tokens

  // Function to calculate the price
  function calculateGPT4MiniCost(usageMetrics) {
    const promptTokens = usageMetrics.prompt_tokens;
    const completionTokens = usageMetrics.completion_tokens;

    // Calculate cost for prompt and completion tokens
    const promptCost = (promptTokens / 1000) * PROMPT_COST_PER_1K;
    const completionCost = (completionTokens / 1000) * COMPLETION_COST_PER_1K;

    // Total cost
    const totalCost = promptCost + completionCost;

    return totalCost.toFixed(4); // Adjust decimal places as needed
  }

  return (
    
<div className="flex flex-col items-center justify-center min-h-screen bg-[#f7f7f7]">

<div className="fixed top-0 w-full h-[48px] py-2 bg-white border-b border-neutral-200 z-10">
  <div className="w-full max-w-[1160px] mx-auto flex items-center justify-between h-full px-6">
    <div className="flex items-center gap-4">
      {/* Logo */}
      <img src="/images/logo.svg" alt="Logo" />
      {/* Demo Badge */}
      <div className="px-3 py-1.5 bg-[#c1eaff] rounded-full flex items-center">
        <div className="text-center text-[#1f1f1f] text-xs font-medium font-['Poppins'] leading-[14px]">Demo</div>
      </div>
    </div>
  </div>
</div>

  {/* Conditionally render the title and subtitle */}
  {messages.length === 0 && (
    <>
      {/* Title */}
      <div className="text-center text-[#1f1f1f] text-[56px] font-semibold font-['Poppins'] leading-[72px]">
        Welcome to Narmer AI
      </div>

      {/* Subtitle with a 24px margin top */}
      <div className="text-center text-[#7a7a7a] text-2xl font-semibold font-['Poppins'] leading-loose mt-6">
        Smarter, faster study help, made fun.
      </div>
    </>
  )}

  {/* Chat and Input Container */}
  <div className="flex flex-col items-center mt-8 w-full h-full bg-[#f7f7f7]">
    {/* Messages Section */}
    <div className={`${styles.chatContainer} flex-grow w-full overflow-auto`} style={{ maxHeight: 'calc(100vh - 150px)' }}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        {/* Spacer to create space below the last message */}
        <div ref={messagesEndRef} className="mb-12" />
      </div>
    </div>

    {/* Centered Input Form */}
    <form
      onSubmit={handleSubmit}
      className={`w-[950px] h-20 mt-12 flex items-center bg-white rounded-2xl shadow border border-[#f0f2f5] pl-5 pr-4 ${messages.length > 0 ? "absolute bottom-0" : ""}`}
    >
      {/* Text Input Field */}
      <input
        type="text"
        className="flex-grow text-[#7a7a7a] text-base font-medium font-['Poppins'] outline-none placeholder-opacity-80"
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
          {/* Add your upload icon here */}
          <svg className="translate-x-[40px]" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="Line Rounded/Photo">
              <path id="Element" d="M1.80005 17.6276L5.66365 12.7129C6.75922 11.3192 8.85497 11.2736 10.0101 12.6183L13.4069 16.5724M10.4736 13.1579C11.9328 11.3017 13.9659 8.67204 14.0983 8.50095C14.1029 8.49483 14.1074 8.48905 14.1122 8.48298C15.2099 7.09833 17.2988 7.05589 18.4515 8.39759L21.8483 12.3517M4.61384 22.2H19.3863C20.9403 22.2 22.2 20.9403 22.2 19.3862V4.61378C22.2 3.05977 20.9403 1.79999 19.3863 1.79999H4.61384C3.05983 1.79999 1.80005 3.05977 1.80005 4.61378V19.3862C1.80005 20.9403 3.05983 22.2 4.61384 22.2Z" stroke="#666F8D" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </svg>

        </div>
        
        {/* Vertical Divider */}
        <div className="self-stretch py-1.5 mx-1 translate-x-[40px]">
  <div className="w-9 self-stretch origin-top-left rotate-90 border border-[#f0f2f5]" />
</div>

        {/* Send Button */}
        <button
          type="submit"
          className="w-12 h-12 bg-[#00aaff] opacity-20 rounded-lg shadow-inner border border-[#00aaff] flex justify-center items-center"
          disabled={inputDisabled}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="Filled/Send">
              <path id="Element" d="M17.185 1.56652L17.1851 1.56648C17.5407 1.45209 17.9255 1.54371 18.1909 1.80915C18.4557 2.0739 18.5491 2.45791 18.4346 2.81657C18.4345 2.81671 18.4345 2.81685 18.4345 2.817L13.6191 17.7927L13.6189 17.7932C13.4976 18.172 13.1806 18.4313 12.7838 18.4754C12.7408 18.4797 12.7019 18.4819 12.6672 18.4819C12.3163 18.4819 11.9991 18.3024 11.8159 17.9889L8.91695 13.0187L13.2271 8.70863C13.7619 8.17378 13.7619 7.30668 13.2271 6.77183C12.6922 6.23698 11.8251 6.23698 11.2903 6.77183L11.2902 6.77187L6.98127 11.0819L2.0107 8.18278L2.0103 8.18255C1.66489 7.98151 1.47997 7.61561 1.52334 7.21915L1.52335 7.21905C1.5668 6.82101 1.82579 6.50375 2.20749 6.38093L17.185 1.56652Z" fill="white" stroke="white"/>
            </g>
          </svg>        
        </button>
      </div>
    </form>
  </div>
</div>






  );
};

export default Chat;
