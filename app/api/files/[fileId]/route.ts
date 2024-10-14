import { openai } from "@/app/openai";
export const maxDuration = 60;
// download file by file ID
export async function GET(_request, { params: { fileId } }) {
  const [file, fileContent] = await Promise.all([
    openai.files.retrieve(fileId),
    openai.files.content(fileId),
  ]);
  return new Response(fileContent.body, {
    headers: {
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
