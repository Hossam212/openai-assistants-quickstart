import { openai } from "@/app/openai";
export const maxDuration = 60;
export const runtime = "nodejs";

// Create a new thread with a user message
export async function POST() {
  // Step 1: Create the thread
  const thread = await openai.beta.threads.create();

  // Step 2: Send the first message to the thread (as a user or assistant role)
  await openai.beta.threads.messages.create(thread.id, {
    role: "assistant",  // Can be "user" or "assistant"
    content: "You are a helpful assistant that provides detailed and concise answers."
  });

  return Response.json({ threadId: thread.id });
}
