import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import type { NextApiRequest, NextApiResponse } from "next";
import { writeFile } from "fs/promises";
import { fileTypeFromBuffer } from "file-type";

export async function GET() {
  const directoryPath = path.join(
    process.cwd(),
    "public/assets/backgrounds/custom"
  );

  try {
    const files = await fs.readdir(directoryPath);
    const images = files
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file))
      .map((file) => {
        const nameWithoutExtension = file.replace(/\.[^/.]+$/, "");

        return {
          path: `/assets/backgrounds/custom/${file}`,
          name: nameWithoutExtension,
        };
      });

    return NextResponse.json(images, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read images directory" },
      { status: 500 }
    );
  }
}

export const POST = async (req: any, res: any) => {
  const formData = await req.formData();

  const file = formData.get("file");
  if (!file) {
    return NextResponse.json({ error: "No files received." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name.replaceAll(" ", "_");

  // Check if the file is a valid image
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType || !fileType.mime.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid image file." }, { status: 400 });
  }

  try {
    await writeFile(
      path.join(process.cwd(), "public/assets/backgrounds/custom/" + filename),
      buffer
    );
    return NextResponse.json({ Message: "Success", status: 201 });
  } catch (error) {
    // console.log("Error occured ", error);
    return NextResponse.json({ Message: "Failed", status: 500 });
  }
};
