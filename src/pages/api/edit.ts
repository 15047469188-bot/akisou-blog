import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const file = String(data.file || "").trim();
    const title = String(data.title || "").trim();
    const category = String(data.category || "").trim();
    const date = String(data.date || "").trim();
    const description = String(data.description || "").trim();
    const content = String(data.content || "").trim();

    if (!file || !title || !category || !date || !content) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "请把必填内容填写完整。",
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

    const allowedFolders = [
      path.resolve(process.cwd(), "src/pages/daily/posts"),
      path.resolve(process.cwd(), "src/pages/travel/posts"),
      path.resolve(process.cwd(), "src/pages/subtitles/posts"),
    ];

    const isAllowed = allowedFolders.some(
      (folder) => filePath.startsWith(folder + path.sep)
    );

    if (!isAllowed) {
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

    const formattedDate = date.replaceAll("-", ".");

    const markdown = `---
layout: ../../../layouts/BlogPost.astro
title: "${title.replace(/"/g, '\\"')}"
date: "${formattedDate}"
description: "${description.replace(/"/g, '\\"')}"
category: "${category}"
---

${content}
`;

    await fs.writeFile(filePath, markdown, "utf-8");

    return new Response(
      JSON.stringify({
        success: true,
        message: "文章修改成功！",
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
        message: "修改失败，请检查终端里的错误信息。",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
