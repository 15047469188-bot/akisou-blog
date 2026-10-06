---
layout: ../../../layouts/BlogPost.astro
title: "这个Blog怎么来的"
date: "2026.10.03"
description: "从零开始搭建属于自己的blog"
category: "碎碎念"
---

第一篇blog不知道写什么好，就写一下搭建这个博客的过程（？）吧
## 项目概述
本项目是一个基于Astro构建的个人博客网站，采用Static Site Generation架构。

项目以Markdown作为主要内容载体，通过Astro的组件化开发方式实现页面结构复用，并结合Node.js、Git、GitHub Pages完成从本地开发、内容管理到网站部署的完整流程。

项目整体技术栈：

* Astro：前端框架与静态站点生成器 <br>
* JavaScript / Node.js：开发环境及本地管理后台 <br>
* Markdown：博客文章内容管理 <br>
* JSON：结构化数据存储 <br>
* Shiki：代码语法高亮 <br>
* Git / GitHub：版本控制与代码托管 <br>
* GitHub Pages：静态网站部署 <br>
## 使用Astro构建静态网站
项目没有采用传统的动态服务器渲染模式，而是使用Astro的SSG。

在构建阶段，Astro会读取Markdown、页面组件以及数据文件，并生成可以直接部署的静态HTML、CSS和JavaScript文件。

例如项目中的配置：
```
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://USERNAME.github.io',
  base: '/REPOSITORY',

  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
```
其中```output: 'static' ```明确指定项目采用静态站点生成模式。

而```base: '/REPOSITORY'```用于适配GitHub Pages的项目路径。
## Markdown内容管理
博客文章没有直接写HTML，而用Markdown Content的方式进行管理。

例如：
```
src/
└── pages/
    ├── daily/
    │   ├── index.astro
    │   └── posts/
    │       └── about-this-blog.md
    │
    ├── travel/
    │   ├── index.astro
    │   └── posts/
    │       └── travel.md
    │
    └── subtitles/
        ├── index.astro
        └── posts/
            └── subtitle.md
```
这种方式将```页面结构```和```实际内容```进行分离。

因此后续添加文章时，不需要修改页面组件本身，只需要增加新的Markdown文件即可。
## 使用Layout Component实现页面复用
为了避免每篇文章重复编写HTML结构，项目使用了Astro的Layout Component。

例如：
```
---
const { frontmatter } = Astro.props;
---

<article>
  <p>{frontmatter.date}</p>

  <h1>{frontmatter.title}</h1>

  <slot />
</article>
```
其中```<slot />```用于插入Markdown正文。

这样所有文章可以共享相同的：

* 标题结构 <br>
* 日期信息 <br>
* 正文样式 <br>
* 页面间距 <br>

这也是组件化开发中的典型Separation of Concerns。
## 友链的数据驱动
友情链接页面没有把网站信息直接写死在HTML中，而是使用JSON文件保存结构化数据：
```
src/data/friends.json
```
数据形式类似：
```
[
  {
    "name": "Example",
    "url": "https://example.com",
    "description": "Example Website"
  }
]
```
Astro页面读取JSON：
```
---
import friends from "../data/friends.json";
---
```
再通过循环生成页面：
```
{
  friends.map((friend) => (
    <a href={friend.url}>
      <h2>{friend.name}</h2>
      <p>{friend.description}</p>
    </a>
  ))
}
```
这种方式属于典型的Data-driven Rendering。

如果以后增加友链，只需要修改数据文件，而不需要重新修改页面结构。
## Git版本控制
项目开发过程中使用Git进行版本控制。

基本工作流为：
```
修改代码
   ↓
git add
   ↓
git commit
   ↓
git push
   ↓
GitHub
```
例如：
```
git add src/layouts/BlogPost.astro
git commit -m "style code blocks"
git push origin main
```
其中：

* git add：将修改加入 Staging Area <br>
* git commit：创建版本提交 <br>
* git push：将本地提交同步至远程仓库 <br>

通过这种方式，可以记录项目不同阶段的修改历史，并在出现问题时进行版本回溯。
## GitHub Pages部署
项目最终部署到GitHub Pages。

由于项目采用SSG架构，Astro在Build阶段提前生成静态文件。

整体流程为：
```
Source Code
     ↓
Astro Build
     ↓
Static HTML / CSS / JS
     ↓
GitHub Repository
     ↓
GitHub Pages
     ↓
Public Website
```
因此访问者访问网站时，不需要运行我的本地Node.js管理后台。

Local Admin只负责本地内容管理，而GitHub Pages负责最终的网站展示。

这也实现了开发环境与生产环境之间的基本隔离。
## 还有一些自己的小设计
比如加载页面时会出现的一个很短的糖葫芦loading

本质上就是一个固定在页面最上面的元素：
```
.page-loader {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
```
然后再给图片加一个很轻的浮动动画：
```
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}
```
虽然不是什么很厉害的技术，但是很喜欢这个糖葫芦就决定做了！
## 总结
本项目基于 Astro 构建，采用SSG架构，以Markdown管理博客内容，并通过Layout Component实现页面结构复用。

项目结合Node.js Local CMS、JSON数据管理与Design System，完成了从内容管理到网站部署的完整流程，并使用Git + GitHub Pages进行版本控制与静态部署。

整体采用轻量化架构，在保持简洁的同时兼顾了可维护性与后续扩展能力。

技术栈：Astro · Node.js · Markdown · JSON · Shiki · Git · GitHub Pages

———————————————

这个博客并不是一次性做完的。

很多东西都是做着做着才想到“这里是不是可以加点什么？”

于是这里改一点那里改一点，就变成现在这样子了。

由于并不是专业做前端的，所以动不动就会报错（

此时就需要gpt老师来帮我解决...

在和gpt老师畅聊个夜晚之后终于搭建好了这个博客。

算是走了很多弯路，但在不断修改和调试的过程中，也逐渐理解了Astro、Git、SSG等技术在实际项目中的作用。

感谢互联网愿意分享经验的各位大神和Github以及Chat GPT老师。
