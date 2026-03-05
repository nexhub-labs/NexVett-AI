import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Box, Code, Paper, Text } from '@mantine/core';
import type { Components } from 'react-markdown';

interface MarkdownMessageProps {
  content: string;
  role?: 'user' | 'assistant';
}

const MarkdownMessage = memo(({ content, role = 'assistant' }: MarkdownMessageProps) => {
  const components: Components = {
    code: ({ className, children, style, ...rest }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isInline = !className;

      if (isInline) {
        return (
          <Code
            style={{
              background: role === 'user' ? 'rgba(255,255,255,0.15)' : 'rgba(124, 58, 237, 0.25)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.9em',
            }}
          >
            {children}
          </Code>
        );
      }

      return (
        <Box
          style={{
            position: 'relative',
            marginTop: '12px',
            marginBottom: '12px',
          }}
        >
          {language && (
            <Text
              size="xs"
              c="dimmed"
              style={{
                position: 'absolute',
                top: '8px',
                right: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
                zIndex: 1,
              }}
            >
              {language}
            </Text>
          )}
          <Paper
            radius="md"
            p="md"
            style={{
              background: role === 'user' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.3)',
              border: role === 'user' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(124, 58, 237, 0.2)',
              overflow: 'auto',
            }}
          >
            <pre
              style={{
                margin: 0,
                padding: 0,
                background: 'transparent',
                fontSize: '0.9em',
                lineHeight: 1.6,
              }}
            >
              <code 
                className={className}
                style={style as React.CSSProperties}
              >
                {children}
              </code>
            </pre>
          </Paper>
        </Box>
      );
    },
    p: ({ children }) => (
      <Text
        size="sm"
        style={{
          lineHeight: 1.7,
          marginBottom: '12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </Text>
    ),
    ul: ({ children }) => (
      <Box
        component="ul"
        style={{
          marginTop: '8px',
          marginBottom: '12px',
          paddingLeft: '24px',
        }}
      >
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box
        component="ol"
        style={{
          marginTop: '8px',
          marginBottom: '12px',
          paddingLeft: '24px',
        }}
      >
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Text
        component="li"
        size="sm"
        style={{
          lineHeight: 1.6,
          marginBottom: '6px',
        }}
      >
        {children}
      </Text>
    ),
    h1: ({ children }) => (
      <Text
        size="xl"
        fw={800}
        style={{
          marginTop: '16px',
          marginBottom: '12px',
          letterSpacing: '-0.02em',
        }}
      >
        {children}
      </Text>
    ),
    h2: ({ children }) => (
      <Text
        size="lg"
        fw={750}
        style={{
          marginTop: '14px',
          marginBottom: '10px',
          letterSpacing: '-0.01em',
        }}
      >
        {children}
      </Text>
    ),
    h3: ({ children }) => (
      <Text
        size="md"
        fw={700}
        style={{
          marginTop: '12px',
          marginBottom: '8px',
        }}
      >
        {children}
      </Text>
    ),
    blockquote: ({ children }) => (
      <Paper
        radius="md"
        p="sm"
        style={{
          background: 'rgba(124, 58, 237, 0.1)',
          borderLeft: '3px solid rgba(124, 58, 237, 0.5)',
          marginTop: '12px',
          marginBottom: '12px',
        }}
      >
        {children}
      </Paper>
    ),
    a: ({ children, href }) => (
      <Text
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'rgba(124, 58, 237, 1)',
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        {children}
      </Text>
    ),
    table: ({ children }) => (
      <Box
        style={{
          overflowX: 'auto',
          marginTop: '12px',
          marginBottom: '12px',
        }}
      >
        <Box
          component="table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9em',
          }}
        >
          {children}
        </Box>
      </Box>
    ),
    th: ({ children }) => (
      <Box
        component="th"
        style={{
          padding: '8px 12px',
          textAlign: 'left',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          fontWeight: 700,
        }}
      >
        {children}
      </Box>
    ),
    td: ({ children }) => (
      <Box
        component="td"
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {children}
      </Box>
    ),
    hr: () => (
      <Box
        component="hr"
        style={{
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          marginTop: '16px',
          marginBottom: '16px',
        }}
      />
    ),
  };

  return (
    <Box>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
});

MarkdownMessage.displayName = 'MarkdownMessage';

export default MarkdownMessage;
