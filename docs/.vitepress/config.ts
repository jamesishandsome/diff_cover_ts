import { defineConfig } from "vitepress";

export default defineConfig({
  title: "diff-cover-ts",
  description: "Diff-based coverage and quality gates for TypeScript and JavaScript projects.",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: "/diff-cover-mark.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "CLI", link: "/guide/cli" },
      { text: "中文", link: "/zh/" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "CLI Reference", link: "/guide/cli" },
          { text: "Configuration", link: "/guide/configuration" },
          { text: "Development", link: "/guide/development" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/jamesishandsome/diff_cover_ts" }],
    search: {
      provider: "local",
    },
  },
  locales: {
    root: {
      label: "English",
      lang: "en-US",
    },
    zh: {
      label: "简体中文",
      lang: "zh-CN",
      title: "diff-cover-ts",
      description: "面向增量代码的覆盖率和质量门禁工具。",
      themeConfig: {
        nav: [
          { text: "指南", link: "/zh/guide/getting-started" },
          { text: "CLI", link: "/zh/guide/cli" },
          { text: "English", link: "/" },
        ],
        sidebar: [
          {
            text: "指南",
            items: [
              { text: "快速开始", link: "/zh/guide/getting-started" },
              { text: "CLI 参考", link: "/zh/guide/cli" },
              { text: "配置文件", link: "/zh/guide/configuration" },
              { text: "开发维护", link: "/zh/guide/development" },
            ],
          },
        ],
      },
    },
  },
});
