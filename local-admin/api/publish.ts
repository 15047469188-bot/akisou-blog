import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const title = String(data.title || "").trim();
    const category = String(data.category || "").trim();
    const date = String(data.date || "").trim();
    const description = String(data.description || "").trim();
    const content = String(data.content || "").trim();

    if (!title || !category || !date || !content) {
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

    const categoryMap: Record<string, string> = {
      "日常": "daily",
      "旅行": "travel",
      "字幕": "subtitles",
      "作品分享": "works",
      "碎碎念": "daily",
      "到处乱跑": "travel",
      "听写小作坊": "subtitles",
      "书影音游": "works",
    };

    const folder = categoryMap[category];

    if (!folder) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "分类不正确。",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const fileName = `${slug || "new-post"}.md`;

    const filePath = path.join(
      process.cwd(),
      "src",
      "pages",
      folder,
      "posts",
      fileName
    );

    const markdown = `---
layout: ../../../layouts/BlogPost.astro
title: "${title.replace(/"/g, '\\"')}"
date: "${date}"
description: "${description.replace(/"/g, '\\"')}"
category: "${category}"
---

${content}
`;

    await fs.writeFile(filePath, markdown, "utf-8");

    return new Response(
      JSON.stringify({
        success: true,
        message: "文章发布成功！",
        url: `/${folder}/posts/${slug}`,
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
        message: "发布失败，请检查终端里的错误信息。",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};