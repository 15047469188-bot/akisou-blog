import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const file = String(data.file || "").trim();

    if (!file) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "没有找到文章。",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const filePath = path.resolve(
      process.cwd(),
      "src/pages/admin/posts",
      file
    );

    const allowedPath = path.resolve(
      process.cwd(),
      "src/pages"
    );

    if (!filePath.startsWith(allowedPath + path.sep)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "无效的文件路径。",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await fs.unlink(filePath);

    return new Response(
      JSON.stringify({
        success: true,
        message: "文章已删除。",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "删除失败。",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
