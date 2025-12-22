"use node";

/**
 * Convert PPTX to PDF using ConvertAPI.
 * @param pptxBase64 - Base64-encoded PPTX file data
 * @returns Base64-encoded PDF data
 */
export async function convertPptxToPdf(pptxBase64: string): Promise<string> {
  const token = process.env.CONVERTAPI_TOKEN;
  if (!token) {
    throw new Error("CONVERTAPI_TOKEN environment variable not set");
  }

  const response = await fetch(
    `https://v2.convertapi.com/convert/pptx/to/pdf?Secret=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Parameters: [
          { Name: "File", FileValue: { Data: pptxBase64 } },
          { Name: "StoreFile", Value: true },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[ConvertAPI] Failed:", response.status, errorText);
    throw new Error(`ConvertAPI failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (!result.Files?.[0]?.FileData) {
    console.error("[ConvertAPI] Unexpected response:", result);
    throw new Error("ConvertAPI returned no file data");
  }

  return result.Files[0].FileData;
}
