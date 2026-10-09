import { visit } from "unist-util-visit";

export default function remarkBlur() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== "textDirective" || node.name !== "blur") {
        return;
      }

      const data = node.data || (node.data = {});
      data.hName = "span";
      data.hProperties = {
        className: ["blur-text"],
        tabindex: 0,
        role: "button",
        "aria-label": "模糊文字，点击切换显示",
      };
    });
  };
}
