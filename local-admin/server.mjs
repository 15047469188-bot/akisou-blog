import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = process.cwd();

async function renderAstro(filePath, vars = {}) {
  const source = await fs.readFile(filePath, "utf-8");

  // 只删除真正位于行首的 Astro Frontmatter，
  // 避免误删正文/代码里的 "---"。
  const withoutFrontmatter = source.replace(
    /^---\r?\n[\s\S]*?\r?\n---\r?\n/,
    ""
  );

  let html = withoutFrontmatter;

  for (const [key, value] of Object.entries(vars)) {
    const escaped = String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

    html = html.replaceAll(`{${key}}`, escaped);
    html = html.replaceAll(`__${key.toUpperCase()}__`, escaped);
  }

  if (vars.category === "日常") {
    html = html.replaceAll("__SELECT_DAILY__", "selected");
  } else if (vars.category === "旅行") {
    html = html.replaceAll("__SELECT_TRAVEL__", "selected");
  } else if (vars.category === "字幕") {
    html = html.replaceAll("__SELECT_SUBTITLES__", "selected");
  } else if (vars.category === "作品分享") {
    html = html.replaceAll("__SELECT_WORKS__", "selected");
  }

  html = html.replaceAll(
    /__SELECT_(?:DAILY|TRAVEL|SUBTITLES|WORKS)__/g,
    ""
  );

  return html;
}

async function uploadVideo(data) {
  const fileName = String(data.fileName || "").trim();
  const fileData = String(data.fileData || "").trim();

  if (!fileName || !fileData) {
    return {
      success: false,
      message: "没有收到视频。",
    };
  }

  const ext = path.extname(fileName).toLowerCase();
  const allowedExt = [".mp4", ".webm", ".mov"];

  if (!allowedExt.includes(ext)) {
    return {
      success: false,
      message: "只支持 MP4、WEBM、MOV 视频。",
    };
  }

  const safeName = `${Date.now()}-${path
    .basename(fileName, ext)
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")}${ext}`;

  const videoDir = path.join(root, "public", "videos");

  await fs.mkdir(videoDir, { recursive: true });

  const base64 = fileData.replace(/^data:video\/[^;]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const videoPath = path.join(videoDir, safeName);

  await fs.writeFile(videoPath, buffer);

  return {
    success: true,
    fileName: safeName,
    url: `/videos/${encodeURIComponent(safeName)}`,
  };
}


async function uploadImage(data) {
  const fileName = String(data.fileName || "").trim();
  const fileData = String(data.fileData || "").trim();

  if (!fileName || !fileData) {
    return {
      success: false,
      message: "没有收到图片。",
    };
  }

  const ext = path.extname(fileName).toLowerCase();
  const allowedExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

  if (!allowedExt.includes(ext)) {
    return {
      success: false,
      message: "只支持 JPG、PNG、GIF、WEBP 图片。",
    };
  }

  const safeName = `${Date.now()}-${path
    .basename(fileName, ext)
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")}${ext}`;

  const imageDir = path.join(root, "public", "images");

  await fs.mkdir(imageDir, { recursive: true });

  const base64 = fileData.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const imagePath = path.join(imageDir, safeName);

  await fs.writeFile(imagePath, buffer);

  return {
    success: true,
    fileName: safeName,
    url: `/images/${safeName}`,
  };
}

async function publish(data) {
  const title = String(data.title || "").trim();
  const category = String(data.category || "").trim();
  const date = String(data.date || "").trim();
  const description = String(data.description || "").trim();
  const cover = String(data.cover || "").trim();
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
  "作品分享": "works",
  "碎碎念": "daily",
  "到处乱跑": "travel",
  "听写小作坊": "subtitles",
  "书影音游": "works",
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
category: "${category}"${cover ? `\ncover: "${cover.replace(/"/g, '\\"')}"` : ""}
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
    if (req.method === "GET" && req.url === "/admin/friends") {
      const html = await renderAstro(
        path.join(root, "local-admin/admin/friends/index.astro")
      );

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });

      res.end(html);
      return;
    }

    if (req.method === "GET" && req.url === "/admin/about") {
      const html = await renderAstro(
        path.join(root, "local-admin/admin/about/index.astro")
      );

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });

      res.end(html);
      return;
    }

    if (req.method === "GET" && req.url === "/admin/posts") {
      const html = await renderAstro(
        path.join(root, "local-admin/admin/posts/index.astro")
      );

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });

      res.end(html);
      return;
    }

    if (req.method === "GET" && req.url === "/api/posts") {
      const categories = ["daily", "travel", "subtitles", "works"];
      const posts = [];

      for (const category of categories) {
        const dir = path.join(root, "src/pages", category, "posts");

        let files = [];

        try {
          files = await fs.readdir(dir);
        } catch {
          continue;
        }

        for (const filename of files) {
          if (!filename.endsWith(".md")) continue;

          const filePath = path.join(dir, filename);
          const source = await fs.readFile(filePath, "utf-8");
          const match = source.match(/^---\s*\n([\s\S]*?)\n---/);

          if (!match) continue;

          const frontmatter = match[1];

          const getValue = (key) => {
            const result = frontmatter.match(
              new RegExp("^" + key + ":\\s*[\"']?([^\"']*?)[\"']?\\s*$", "m")
            );

            return result ? result[1].trim() : "";
          };

          const slug = filename.replace(/\.md$/, "");

          posts.push({
            file: `${category}/posts/${filename}`,
            category,
            slug,
            title: getValue("title"),
            date: getValue("date"),
            description: getValue("description"),
            url: `/${category}/posts/${slug}`,
          });
        }
      }

      posts.sort((a, b) => b.date.localeCompare(a.date));

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });

      res.end(JSON.stringify({
        success: true,
        posts,
      }));
      return;
    }

    if (req.method === "GET" && req.url === "/api/about") {
      const filePath = path.join(root, "src", "pages", "about.astro");
      const source = await fs.readFile(filePath, "utf-8");

      const match = source.match(/<div class="text">([\s\S]*?)<\/div>/);

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });

      res.end(JSON.stringify({
        success: true,
        content: match ? match[1].trim() : "",
      }));
      return;
    }

    if (req.method === "POST" && req.url === "/api/about") {
      let body = "";

      for await (const chunk of req) {
        body += chunk;
      }

      const data = JSON.parse(body || "{}");
      const content = String(data.content || "");

      const filePath = path.join(root, "src", "pages", "about.astro");
      const source = await fs.readFile(filePath, "utf-8");

      const updated = source.replace(
        /(<div class="text">)[\s\S]*?(<\/div>)/,
        `$1
          ${content}
        $2`
      );

      await fs.writeFile(filePath, updated, "utf-8");

      try {
        await execFileAsync("git", ["add", "src/pages/about.astro"]);
        await execFileAsync("git", ["commit", "-m", "update: about"]);
        await execFileAsync("git", ["push", "origin", "main"]);
      } catch (error) {
        console.error("About Git 自动发布失败：", error);
      }

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });

      res.end(JSON.stringify({
        success: true,
        message: "About 文案保存成功！",
      }));
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/admin/edit")) {
      const url = new URL(req.url, "http://localhost:4322");
      const file = url.searchParams.get("file");

      const allowedPrefixes = [
        "daily/posts/",
        "travel/posts/",
        "subtitles/posts/",
        "works/posts/",
      ];

      if (
        !file ||
        !allowedPrefixes.some((prefix) => file.startsWith(prefix))
      ) {
        res.writeHead(400, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        res.end("无效的文章文件。");
        return;
      }

      const filePath = path.resolve(root, "src/pages", file);

      try {
        const source = await fs.readFile(filePath, "utf-8");

        const match = source.match(
          /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
        );

        if (!match) {
          throw new Error("文章格式不正确。");
        }

        const frontmatter = match[1];
        const body = match[2].trim();

        const getValue = (key) => {
          const result = frontmatter.match(
            new RegExp('^' + key + ':\\s*"([\\s\\S]*?)"$', "m")
          );

          return result ? result[1] : "";
        };

        const title = getValue("title");
        const date = getValue("date");
        const description = getValue("description");
        const category = getValue("category");

        const html = await renderAstro(
          path.join(root, "local-admin/admin/edit/index.astro"),
          {
            file,
            title,
            date: date.replaceAll(".", "-"),
            description,
            category,
            body,
          }
        );

        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
        });

        res.end(html);
      } catch (error) {
        console.error(error);
        res.writeHead(500, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        res.end("无法读取文章。");
      }

      return;
    }

    if (req.method === "POST" && req.url === "/api/delete") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const file = String(data.file || "").trim();

          const allowedPrefixes = [
            "daily/posts/",
            "travel/posts/",
            "subtitles/posts/",
            "works/posts/",
          ];

          const allowed = allowedPrefixes.some((prefix) =>
            file.startsWith(prefix)
          );

          if (!allowed || !file.endsWith(".md")) {
            res.writeHead(400, {
              "Content-Type": "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                success: false,
                message: "无效的文章文件。",
              })
            );

            return;
          }

          const filePath = path.resolve(root, "src/pages", file);

          await fs.unlink(filePath);

          try {
            await execFileAsync("git", ["add", "-A"], { cwd: root });

            await execFileAsync(
              "git",
              ["commit", "-m", `delete post: ${path.basename(file, ".md")}`],
              { cwd: root }
            );

            await execFileAsync(
              "git",
              ["push", "origin", "main"],
              { cwd: root }
            );
          } catch (gitError) {
            console.error("Git 操作失败：", gitError);
          }

          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              success: true,
              message: "文章已删除。",
            })
          );
        } catch (error) {
          console.error(error);

          res.writeHead(500, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              success: false,
              message: "删除文章失败。",
            })
          );
        }
      });

      return;
    }

    if (req.method === "POST" && req.url === "/api/edit") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);

          const file = String(data.file || "").trim();

          const allowedPrefixes = [
            "daily/posts/",
            "travel/posts/",
            "subtitles/posts/",
            "works/posts/",
          ];

          const allowed = allowedPrefixes.some((prefix) =>
            file.startsWith(prefix)
          );

          if (!allowed) {
            res.writeHead(400, {
              "Content-Type": "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                success: false,
                message: "无效的文件路径",
              })
            );

            return;
          }

          const filePath = path.resolve(process.cwd(), "src/pages", file);

          const content = `---
layout: ../../../layouts/BlogPost.astro
title: "${String(data.title || "").replace(/"/g, '\\"')}"
date: "${String(data.date || "").replace(/-/g, ".")}"
description: "${String(data.description || "").replace(/"/g, '\\"')}"
category: "${String(data.category || "")}"${String(data.cover || "").trim() ? `\ncover: "${String(data.cover || "").trim().replace(/"/g, '\\"')}"` : ""}
---

${String(data.content || "")}
`;

          await fs.writeFile(filePath, content, "utf-8");

          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              success: true,
              message: "修改成功",
            })
          );
        } catch (error) {
          console.error(error);

          res.writeHead(500, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              success: false,
              message: "修改失败",
            })
          );
        }
      });

      return;
    }
    if (req.method === "POST" && req.url === "/api/upload-image") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const result = await uploadImage(data);

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
              message: "图片上传失败，请检查终端。",
            })
          );
        }
      });

      return;
    }

    if (req.method === "POST" && req.url === "/api/upload-video") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const result = await uploadVideo(data);

          res.writeHead(result.success ? 200 : 400, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(JSON.stringify(result));
        } catch (error) {
          console.error("视频上传失败：", error);

          res.writeHead(500, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              success: false,
              message: "视频上传失败，请检查终端。",
            })
          );
        }
      });

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

    if (req.method === "GET" && req.url === "/api/friends") {
      const filePath = path.join(root, "src/data/friends.json");

      try {
        const content = await fs.readFile(filePath, "utf8");
        const friends = JSON.parse(content);

        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
        });

        res.end(JSON.stringify(friends));
      } catch (error) {
        console.error("读取友链失败：", error);

        res.writeHead(500, {
          "Content-Type": "application/json; charset=utf-8",
        });

        res.end(JSON.stringify([]));
      }

      return;
    }

    if (req.method === "POST" && req.url === "/api/friends/delete") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const index = Number(data.index);

          const filePath = path.join(root, "src/data/friends.json");
          const content = await fs.readFile(filePath, "utf8");
          const friends = JSON.parse(content);

          if (!Number.isInteger(index) || index < 0 || index >= friends.length) {
            res.writeHead(400, {
              "Content-Type": "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                success: false,
                message: "无效的友链。",
              })
            );

            return;
          }

          const deleted = friends[index];
          friends.splice(index, 1);

          await fs.writeFile(
            filePath,
            JSON.stringify(friends, null, 2),
            "utf8"
          );

          try {
            await execFileAsync("git", ["add", "src/data/friends.json"], {
              cwd: root,
            });

            await execFileAsync(
              "git",
              ["commit", "-m", `delete friend: ${deleted.name}`],
              { cwd: root }
            );

            await execFileAsync("git", ["push", "origin", "main"], {
              cwd: root,
            });
          } catch (gitError) {
            console.error("Git 删除发布失败：", gitError);

            res.writeHead(500, {
              "Content-Type": "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                success: false,
                message: "友链已修改，但自动发布到 GitHub 失败。",
              })
            );

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              success: true,
              message: "友链已删除！",
            })
          );
        } catch (error) {
          console.error("删除友链失败：", error);

          if (!res.headersSent) {
            res.writeHead(500, {
              "Content-Type": "application/json; charset=utf-8",
            });
          }

          res.end(
            JSON.stringify({
              success: false,
              message: "删除失败，请检查终端里的错误信息。",
            })
          );
        }
      });

      return;
    }

    if (req.method === "POST" && req.url === "/api/friends") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);

          if (!data.name || !data.url) {
            res.writeHead(400, {
              "Content-Type": "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                success: false,
                message: "请填写名字和 URL。",
              })
            );

            return;
          }

          const filePath = path.join(root, "src/data/friends.json");

          let friends = [];

          try {
            const content = await fs.readFile(filePath, "utf8");
            friends = JSON.parse(content);
          } catch {
            friends = [];
          }

          friends.push({
            name: String(data.name).trim(),
            url: String(data.url).trim(),
            description: String(data.description || "").trim(),
          });

          await fs.writeFile(
            filePath,
            JSON.stringify(friends, null, 2),
            "utf8"
          );

          try {
            await execFileAsync("git", ["add", "src/data/friends.json"], {
              cwd: root,
            });

            await execFileAsync(
              "git",
              ["commit", "-m", `add friend: ${String(data.name).trim()}`],
              { cwd: root }
            );

            await execFileAsync("git", ["push", "origin", "main"], {
              cwd: root,
            });
          } catch (gitError) {
            console.error("Git 发布失败：", gitError);

            res.writeHead(500, {
              "Content-Type": "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                success: false,
                message: "友链已保存，但自动发布到 GitHub 失败。",
              })
            );

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              success: true,
              message: "友链添加成功！",
            })
          );
        } catch (error) {
          console.error("友链添加失败：", error);

          if (!res.headersSent) {
            res.writeHead(500, {
              "Content-Type": "application/json; charset=utf-8",
            });
          }

          res.end(
            JSON.stringify({
              success: false,
              message: "添加失败，请检查终端里的错误信息。",
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

    if (!res.headersSent) {
      res.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
    }

    res.end("Server Error");
  }
});

server.listen(4322, () => {
  console.log("ADMIN 已启动： http://localhost:4322/admin");
});
