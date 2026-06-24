import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

const markdown = `
| 题型 | 核心策略 | 注意事项 |
|-------|---------|----------|
| 给值求值 | 拼凑角、整体代换 | 符号必须由范围确定 |
`;

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeHighlight)
  .use(rehypeKatex)
  .use(rehypeStringify);

processor.process(markdown).then((file) => {
  console.log(String(file));
}).catch((err) => {
  console.error(err);
});
