import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  a: ({ children, href }) => (
    <a href={href} className="underline underline-offset-2">
      {children}
    </a>
  ),
  h1: ({ children }) => <h3 className="font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="font-semibold">{children}</h3>,
  h3: ({ children }) => <h3 className="font-semibold">{children}</h3>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  p: ({ children }) => <p>{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  table: ({ children }) => (
    <table className="w-full border-collapse text-left text-xs">{children}</table>
  ),
  td: ({ children }) => <td className="border px-2 py-1">{children}</td>,
  th: ({ children }) => <th className="border px-2 py-1 font-semibold">{children}</th>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
};

export function MarkdownContent({
  value,
  className,
}: {
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {value ?? ""}
      </ReactMarkdown>
    </div>
  );
}
