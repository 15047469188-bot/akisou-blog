import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = process.cwd();

async function renderAstro(filePath) {
  const source = await fs.readFile(filePath, "utf-8");

  return source.replace(/^---[\s\S]*?---/, "");
}

async function publish(data) {
  const title = String(data.title || "").trim();
  const category = String(data.category || "").trim();
  const date = String(data.date || "").trim();
  const description = String(data.description || "").trim();
  const content = String(data.content || "").trim();

  if (!title || !category || !date || !content) {
    return {
      success: false,
      message: "请把必填内容填写完整。",
    };
  }

  const categoryMap = {
    "日常": "daily",
    "旅行": "travel",
    "字幕": "subtitles",
  };

  const folder = categoryMap[category];

  if (!folder) {
    return {
      success: false,
      message: "分类不正确。",
    };
  }

  const slug = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const fileName = `${slug || "new-post"}.md`;

  const filePath = path.join(
    root,
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

  try {
    await execFileAsync("git", ["add", "."]);
    await execFileAsync("git", [
      "commit",
      "-m",
      `publish: ${title}`,
    ]);
    await execFileAsync("git", ["push"]);
  } catch (error) {
    console.error("Git 自动发布失败：", error);

    return {
      success: false,
      message: "文章已生成，但自动同步到 GitHub 失败，请检查终端。",
    };
  }

  return {
    success: true,
    message: "文章发布成功！",
    url: `/${folder}/posts/${slug}`,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/admin") {
      const html = await renderAstro(
        path.join(root, "local-admin/admin/index.astro")
      );

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });

      res.end(html);
      return;
    }

    if (req.method === "GET" && req.url === "/admin/new") {
      const html = await renderAstro(
        path.join(root, "local-admin/admin/new/index.astro")
      );

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });

      res.end(html);
      return;
    }

    if (req.method === "POST" && req.url === "/api/publish") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const result = await publish(data);

          res.writeHead(result.success ? 200 : 400, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(JSON.stringify(result));
        } catch (error) {
          console.error(error);

          res.writeHead(500, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              success: false,
              message: "发布失败，请检查终端里的错误信息。",
            })
          );
        }
      });

      return;
    }

    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });

    res.end("Not Found");
  } catch (error) {
    console.error(error);

    res.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8",
    });

    res.end("Server Error");
  }
});

server.listen(4322, () => {
  console.log("ADMIN 已启动： http://localhost:4322/admin");
});
