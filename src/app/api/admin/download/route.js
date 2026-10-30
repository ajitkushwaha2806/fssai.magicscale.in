import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET(req) {
  try {
    const adminToken = req.cookies.get("admin_token")?.value;
    if (adminToken !== "authenticated") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");
    let filename = searchParams.get("filename") || "document";

    if (!fileUrl) {
      return NextResponse.json({ success: false, message: "Missing file URL" }, { status: 400 });
    }

    // Determine extension from URL
    const urlObj = new URL(fileUrl);
    const pathname = urlObj.pathname;
    const urlExt = pathname.split(".").pop();
    if (urlExt && !filename.toLowerCase().endsWith(`.${urlExt.toLowerCase()}`)) {
      filename = `${filename}.${urlExt}`;
    }

    let buffer = null;
    let contentType = "application/octet-stream";

    // 1. Try direct fetch first
    try {
      const res = await fetch(fileUrl);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        buffer = Buffer.from(ab);
        contentType = res.headers.get("content-type") || contentType;
      }
    } catch (fetchErr) {
      console.warn("Direct fetch failed, falling back to S3 SDK:", fetchErr.message);
    }

    // 2. Fallback to S3 SDK GetObjectCommand if direct fetch failed
    if (!buffer) {
      try {
        const key = pathname.replace(/^\//, "");
        const bucketName = process.env.AWS_S3_BUCKET;
        
        const s3Response = await s3.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          })
        );

        if (s3Response.Body) {
          const streamToBuffer = async (stream) => {
            const chunks = [];
            for await (const chunk of stream) {
              chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
            }
            return Buffer.concat(chunks);
          };
          buffer = await streamToBuffer(s3Response.Body);
          contentType = s3Response.ContentType || contentType;
        }
      } catch (s3Err) {
        console.error("S3 SDK getObject failed:", s3Err);
      }
    }

    if (!buffer) {
      return NextResponse.json(
        { success: false, message: "Unable to retrieve file from storage" },
        { status: 404 }
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

