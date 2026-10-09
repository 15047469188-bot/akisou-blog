import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const watchedDirs = ["src", "public"];
let timer;
let publishing = false;
let pending = false;

function run(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function publish() {
  if (publishing) {
    pending = true;
    return;
  }

  publishing = true;
  pending = false;

  try {
    console.log("\n🔎 检查并构建博客……");
    run("npm", ["run", "build"]);

    run("git", ["add", "-A"]);

    try {
      run("git", ["diff", "--cached", "--quiet"]);
      console.log("ℹ️ 没有新的 Git 修改需要发布。");
    } catch {
      run("git", ["commit", "-m", "Auto publish blog"]);
      console.log("📤 正在上传到 GitHub……");
      run("git", ["push", "origin", "main"]);
      console.log("✅ 上传成功！GitHub Actions 将自动部署网站。");
    }
  } catch (error) {
    console.error("❌ 自动发布失败，请检查下面的错误：");
    console.error(error.stderr?.toString() || error.message);
  } finally {
    publishing = false;
    if (pending) {
      pending = false;
      schedulePublish();
    }
  }
}

function schedulePublish() {
  clearTimeout(timer);
  timer = setTimeout(publish, 10000);
}

for (const dir of watchedDirs) {
  fs.watch(path.join(root, dir), { recursive: true }, (event, filename) => {
    if (!filename) return;
    if (filename.startsWith(".") || filename.includes("/.")) return;
    console.log(`📝 检测到文件变化：${dir}/${filename}`);
    schedulePublish();
  });
}

console.log("🌱 博客自动发布已启动。");
console.log("修改 src 或 public 中的文件后，等待 10 秒自动构建并发布。");
console.log("按 Control + C 可以暂停自动发布。");

// 如果项目里已有未提交的修改，启动后也会尝试发布。
try {
  const status = run("git", ["status", "--porcelain"]);
  if (status.trim()) {
    console.log("📦 检测到已有未提交修改，准备构建并发布……");
    schedulePublish();
  }
} catch (error) {
  console.error("无法检查 Git 状态：", error.message);
}
