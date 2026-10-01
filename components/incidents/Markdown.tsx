import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Incident write-ups styled like the portfolio's case studies: accent
// headings, ruled lists, rounded mono tables. react-markdown builds React
// elements (no raw HTML), which keeps the strict CSP happy.
const components: Components = {
  h2: ({ children }) => <h2 className="mt-12 font-display text-2xl text-accent first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 font-display text-xl">{children}</h3>,
  p: ({ children }) => <p className="mt-3 leading-relaxed text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 flex flex-col border-b border-foreground/10">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 flex list-inside list-decimal flex-col border-b border-foreground/10">{children}</ol>,
  li: ({ children }) => <li className="border-t border-foreground/10 py-3 text-foreground/90">{children}</li>,
  a: ({ href, children }) => {
    const external = href?.startsWith("http");
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent"
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-2xl bg-anthracite p-6 font-mono text-sm leading-relaxed [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-accent pl-4 text-muted">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div role="region" tabIndex={0} className="mt-4 overflow-x-auto rounded-2xl border border-foreground/10">
      <table className="w-full min-w-[30rem] text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-foreground/[0.04] font-mono text-[11px] uppercase tracking-widest text-muted">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-foreground/10">{children}</tbody>,
  th: ({ children }) => <th scope="col" className="px-4 py-3 font-normal">{children}</th>,
  td: ({ children }) => (
    <td className="px-4 py-3 text-foreground/85 first:whitespace-nowrap first:font-mono first:text-accent">{children}</td>
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
