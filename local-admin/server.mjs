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
    url: `/akisou-blog/videos/${encodeURIComponent(safeName)}`,
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
    url: `/akisou-blog/images/${safeName}`,
  };
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
        const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

        if (!match) {
          throw new Error("文章格式不正确。");
        }

        const frontmatter = match[1];
        const body = match[2].trim();

        const getValue = (key) => {
          const result = frontmatter.match(
            new RegExp('^' + key + ':\\s*"([\s\\S]*?)"$', "m")
          );
          return result ? result[1] : "";
        };

        const title = getValue("title");
        const date = getValue("date");
        const description = getValue("description");
        const category = getValue("category");

        const esc = (value) =>
          String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");

        const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EDIT / AKISOU'S BLOG</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #f7f8f8;
  color: #172536;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
}
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 70px 25px 100px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 100px;
}
.logo, .admin, .label, .back {
  font-family: monospace;
}
.logo { font-size: 14px; letter-spacing: 1px; }
.admin, .label, .back { font-size: 12px; color: #697681; }
h1 { margin: 0 0 50px; font-size: 42px; font-weight: 500; }
.form { display: flex; flex-direction: column; gap: 30px; }
label { display: flex; flex-direction: column; gap: 10px; font-size: 13px; }
input, textarea, select {
  width: 100%;
  border: 1px solid #ccd2d6;
  background: white;
  padding: 14px;
  color: #172536;
  font: inherit;
  outline: none;
}
textarea { min-height: 280px; resize: vertical; line-height: 1.8; }

.image-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.image-button {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  width: auto;
  padding: 10px 14px;
  border: 1px solid #CFE3EF;
  background: #F8FCFB;
  color: #35495E;
  cursor: pointer;
  font-size: 12px;
}

.image-button input {
  display: none;
}

#imageStatus {
  color: #697681;
  font-size: 12px;
}

.small { min-height: auto; }
button {
  align-self: flex-start;
  border: 0;
  background: #172536;
  color: white;
  padding: 14px 24px;
  font-family: monospace;
  cursor: pointer;
}
button:hover { background: #e87532; }
.back {
  display: inline-block;
  margin-top: 25px;
  text-decoration: none;
}
</style>
</head>
<body>
<main class="container">
<header>
<div class="logo">AKISOU'S BLOG</div>
<div class="admin">ADMIN / EDIT</div>
</header>

<div class="label">EDIT / 01</div>
<h1>编辑文章</h1>

<form class="form">
<label>
标题
<input name="title" value="${esc(title)}">
</label>

<label>
分类
<option value="碎碎念" ${category === "碎碎念" ? "selected" : ""}>碎碎念</option>
<option value="到处乱跑" ${category === "到处乱跑" ? "selected" : ""}>到处乱跑</option>
<option value="听写小作坊" ${category === "听写小作坊" ? "selected" : ""}>听写小作坊</option>
<select name="category">
<option value="碎碎念" ${category === "碎碎念" ? "selected" : ""}>碎碎念</option>
<option value="到处乱跑" ${category === "到处乱跑" ? "selected" : ""}>到处乱跑</option>
<option value="听写小作坊" ${category === "听写小作坊" ? "selected" : ""}>听写小作坊</option>
<option value="书影音游" ${category === "书影音游" ? "selected" : ""}>书影音游</option>
</select>
</label>

<label>
日期
<input name="date" type="date" value="${esc(date.replaceAll(".", "-"))}">
</label>

<label>
简介
<textarea name="description" class="small">${esc(description)}</textarea>
</label>

<label>
正文
<textarea name="content">${esc(body)}</textarea>
</label>

<div class="image-upload">
  <button type="button" class="image-button" onclick="document.querySelector('#imageStatus').textContent='按钮正常！'; document.querySelector('#imageFile').click()">
    📷 选择图片
  </button>
  <input type="file" id="imageFile" accept="image/*" style="display:none" onchange="uploadImage(this)">
  <span id="imageStatus"></span>
</div>

<div class="image-upload">
  <button type="button" class="image-button" onclick="document.querySelector('#videoFile').click()">
    🎬 选择视频
  </button>
  <input type="file" id="videoFile" accept="video/mp4,video/webm,video/quicktime" style="display:none" onchange="uploadVideo(this)">
  <span id="videoStatus"></span>
</div>

<button type="submit">SAVE CHANGES ↗</button>
</form>

<a href="/admin/posts" class="back">← BACK TO POSTS</a>
</main>

<script>
const form = document.querySelector(".form");

const imageStatus = document.querySelector("#imageStatus");


window.uploadVideo = async function uploadVideo(videoFile) {
  const selectedFile = videoFile.files?.[0];

  if (!selectedFile) return;

  const videoStatus = document.querySelector("#videoStatus");
  videoStatus.textContent = "正在上传视频……";

  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const response = await fetch("/api/upload-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileData: reader.result
        })
      });

      const result = await response.json();

      if (result.success) {
        const content = document.querySelector('textarea[name="content"]');

        if (content) {
          const markdown =
            '\\n<video controls src="' +
            result.url +
            '"></video>\\n';

          const start = content.selectionStart;
          const end = content.selectionEnd;

          content.value =
            content.value.slice(0, start) +
            markdown +
            content.value.slice(end);

          content.focus();

          const newPosition = start + markdown.length;
          content.selectionStart = newPosition;
          content.selectionEnd = newPosition;
        }

        videoStatus.textContent = "视频上传成功！已插入正文。";
      } else {
        videoStatus.textContent = result.message;
      }
    } catch (error) {
      console.error(error);
      videoStatus.textContent = "视频上传失败。";
    }
  };

  reader.readAsDataURL(selectedFile);
};

window.uploadImage = async function uploadImage(imageFile) {
  const selectedFile = imageFile.files?.[0];

  if (!selectedFile) return;

  imageStatus.textContent = "正在上传……";

  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const response = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileData: reader.result
        })
      });

      const result = await response.json();

      if (result.success) {
        const content = document.querySelector('textarea[name="content"]');

        if (content) {
          const markdown = "\\n![" + result.fileName + "](" + result.url + ")\\n";

          const start = content.selectionStart;
          const end = content.selectionEnd;

          content.value =
            content.value.slice(0, start) +
            markdown +
            content.value.slice(end);

          content.focus();

          const newPosition = start + markdown.length;
          content.selectionStart = newPosition;
          content.selectionEnd = newPosition;
        }

        imageStatus.textContent = "图片上传成功！已插入正文。";
      } else {
        imageStatus.textContent = result.message;
      }
    } catch (error) {
      console.error(error);
      imageStatus.textContent = "图片上传失败。";
    }
  };

  reader.readAsDataURL(selectedFile);
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);

  const data = {
    file: ${JSON.stringify(file)},
    title: formData.get("title"),
    category: formData.get("category"),
    date: formData.get("date"),
    description: formData.get("description"),
    content: formData.get("content")
  };

  const response = await fetch("/api/edit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (result.success) {
    alert("文章修改成功！");
    window.location.href = "/admin/posts";
  } else {
    alert(result.message);
  }
});
</script>
</body>
</html>`;

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

    if (req.method === "GET" && req.url === "/admin/posts") {
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
          const match = source.match(/^---[\s\S]*?---/);

          if (!match) continue;

          const frontmatter = match[0];

          const getValue = (key) => {
            const result = frontmatter.match(
              new RegExp("^" + key + ":\\s*[\\\"]?([^\\\"]*?)[\\\"]?\\s*$", "m")
            );
            return result ? result[1].trim() : "";
          };

          posts.push({
            file: `${category}/posts/${filename}`,
            title: getValue("title"),
            date: getValue("date"),
            description: getValue("description"),
            url: `/akisou-blog/${category}/posts/${filename.replace(/\\.md$/, "")}`,
          });
        }
      }

      posts.sort((a, b) => b.date.localeCompare(a.date));

      const escapeHtml = (value) =>
        String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");

      const postHtml = posts
        .map(
          (post) => `
            <div class="post">
              <div class="date">${escapeHtml(post.date)}</div>
              <div class="main">
                <h2>${escapeHtml(post.title)}</h2>
                <p>${escapeHtml(post.description)}</p>
              </div>
              <div class="actions">
                <a href="${post.url}" class="view">查看 ↗</a>
                <a href="/admin/edit?file=${encodeURIComponent(post.file)}" class="view">编辑 ✎</a>
                <button type="button" class="delete" data-file="${escapeHtml(post.file)}">删除 ×</button>
              </div>
            </div>
          `
        )
        .join("");

      const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>POSTS / AKISOU</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #f7f8f6;
  color: #172536;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", sans-serif;
}
main {
  max-width: 900px;
  margin: 0 auto;
  padding: 55px 30px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 22px;
  border-bottom: 1px solid #172536;
  font-family: monospace;
  font-size: 13px;
}
.logo {
  color: #172536;
  text-decoration: none;
  font-size: 18px;
  letter-spacing: 0.05em;
}
section { padding: 80px 0 120px; }
.number {
  color: #e87532;
  font-family: monospace;
  font-size: 13px;
}
h1 {
  margin: 25px 0 60px;
  font-size: clamp(42px, 7vw, 70px);
  line-height: 1;
  font-weight: 500;
  letter-spacing: -0.05em;
}
.new-post {
  display: inline-block;
  margin-bottom: 40px;
  color: #172536;
  font-family: monospace;
  font-size: 12px;
  text-decoration: none;
  border-bottom: 1px solid #172536;
  padding-bottom: 4px;
}
.post {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 25px;
  align-items: center;
  padding: 25px 0;
  border-bottom: 1px solid #ccd2d6;
}
.date {
  font-family: monospace;
  font-size: 12px;
  color: #697681;
}
.main h2 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 500;
}
.main p {
  margin: 0;
  color: #697681;
  font-size: 13px;
}
.actions {
  display: flex;
  align-items: center;
  gap: 15px;
}
.view, .delete {
  color: #172536;
  text-decoration: none;
  font-family: monospace;
  font-size: 12px;
}
.delete {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.view:hover, .delete:hover {
  color: #e87532;
}
@media (max-width: 600px) {
  main { padding: 35px 20px; }
  .post {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
</head>
<body>
<main>
<header>
<a href="/admin" class="logo">AKISOU'S BLOG</a>
<span>POSTS</span>
</header>
<section>
<p class="number">ADMIN / 03</p>
<h1>文章管理</h1>
<a href="/admin/new" class="new-post">NEW POST ↗</a>
<div class="posts">${postHtml}</div>
</section>
</main>
<script>
document.querySelectorAll(".delete").forEach((button) => {
  button.addEventListener("click", async () => {
    const file = button.dataset.file;
    if (!file) return;

    if (!confirm("确定要删除这篇文章吗？")) return;

    const response = await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file }),
    });

    const result = await response.json();

    if (result.success) {
      alert("文章已删除！");
      location.reload();
    } else {
      alert(result.message);
    }
  });
});
</script>
</body>
</html>`;

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });

      res.end(html);
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

          if (
            !file ||
            !allowedPrefixes.some((prefix) => file.startsWith(prefix))
          ) {
            res.writeHead(403, {
              "Content-Type": "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                success: false,
                message: "无效的文件路径。",
              })
            );

            return;
          }

          const filePath = path.resolve(root, "src/pages", file);
          await fs.unlink(filePath);

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
              message: "删除失败。",
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
category: "${String(data.category || "")}"
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
