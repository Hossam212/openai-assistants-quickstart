"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import { getSupabaseClient } from "../utils/supabase";
import { track } from "../lib/analytics";

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
  const [cost, setCost] = useState<number>(0);

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
    track("Custom Ruu Token Price", {
      metrics: cost,
    })
    scrollToBottom();

  };

  useEffect(() => {
    const tokenCost = calculateGPT4MiniCost(usageMetrics);
    setCost(cost + tokenCost);
  }, [usageMetrics])

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

  const PROMPT_COST_PER_1K = 0.000150;
  const COMPLETION_COST_PER_1K = 0.000600;


  function calculateGPT4MiniCost(usageMetrics): number {
    const promptTokens = usageMetrics.prompt_tokens;
    const completionTokens = usageMetrics.completion_tokens;

    const promptCost = (promptTokens / 1000) * PROMPT_COST_PER_1K;
    const completionCost = (completionTokens / 1000) * COMPLETION_COST_PER_1K;

    const totalCost = promptCost + completionCost;
    if (isNaN(totalCost)) {
      return 0;
    }

    return Math.round(totalCost * 1e5) / 1e5;
  }

  return (

    <div className="flex w-full h-full flex-col-reverse">
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex p-2"
      >
        <div
          className="bg-blue-500 flex items-center rounded-full p-5 text-white cursor-pointer"
          onClick={() => fileInuputRef.current.click()}
        >
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInuputRef}
          />
          Upload Image
        </div>
        {image && <img src={image} className="w-10" alt="uploaded image" />}
        <input
          type="text"
          className="w-[50%] border-2 border-gray-200 rounded-full p-4 mx-4"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your question"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-full"
          disabled={inputDisabled}
        >
          Send
        </button>
      </form>
      <div className="absolute top-0 left-2">
      {usageMetrics && (
          <div className="flex flex-col">
            <div>
              <strong>Total Cost:</strong>
              <p>{Math.round(cost * 1e5) / 1e5}</p>
            </div>
            <div>
              <strong>Single Prompt Cost:</strong> <p>{calculateGPT4MiniCost(usageMetrics)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
