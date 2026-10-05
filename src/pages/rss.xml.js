import rss from "@astrojs/rss";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/pages");

function getPosts(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  const posts = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      posts.push(...getPosts(fullPath));
      continue;
    }

    if (!file.name.endsWith(".md")) continue;

    const content = fs.readFileSync(fullPath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) continue;

    const frontmatter = match[1];

    const getValue = (key) => {
      const result = frontmatter.match(
        new RegExp(`^${key}:\\s*["']?(.*?)["']?\\s*$`, "m")
      );
      return result ? result[1] : "";
    };

    const title = getValue("title");
    const date = getValue("date");
    const description = getValue("description");

    const relative = path.relative(root, fullPath);
    const parts = relative.split(path.sep);

    const category = parts[0];
    const slug = file.name.replace(/\.md$/, "");

    posts.push({
      title,
      pubDate: new Date(date),
      description,
      link: `/${category}/posts/${slug}/`,
    });
  }

  return posts;
}

export async function GET(context) {
  const posts = getPosts(root);

  posts.sort((a, b) => b.pubDate - a.pubDate);

  return rss({
    title: "AKISOU'S BLOG",
    description: "日々 / 旅 / ことば / 好きなもの",
    site: context.site,
    items: posts,
  });
}
