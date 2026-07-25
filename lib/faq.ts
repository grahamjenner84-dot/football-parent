export interface FaqItem {
  question: string;
  answer: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// FAQ sections follow "## <heading containing FAQ>" then "### Question" pairs,
// each with a plain-text answer below - see AGENTS/CLAUDE.md editorial rules.
export function extractFaqs(content: string): FaqItem[] {
  const lines = content.split("\n");

  const faqHeadingIndex = lines.findIndex(
    (line) => /^##\s+/.test(line) && /faq|frequently asked questions/i.test(line)
  );

  if (faqHeadingIndex === -1) {
    return [];
  }

  const nextH2Index = lines.findIndex(
    (line, i) => i > faqHeadingIndex && /^##\s+/.test(line)
  );

  const block = lines.slice(
    faqHeadingIndex + 1,
    nextH2Index === -1 ? lines.length : nextH2Index
  );

  const faqs: FaqItem[] = [];
  let currentQuestion: string | null = null;
  let currentAnswerLines: string[] = [];

  const pushCurrent = () => {
    if (currentQuestion) {
      const answer = stripMarkdown(currentAnswerLines.join(" "));
      if (answer) {
        faqs.push({ question: stripMarkdown(currentQuestion), answer });
      }
    }
  };

  for (const line of block) {
    const match = line.match(/^###\s+(.+)/);
    if (match) {
      pushCurrent();
      currentQuestion = match[1];
      currentAnswerLines = [];
    } else if (currentQuestion !== null) {
      currentAnswerLines.push(line);
    }
  }
  pushCurrent();

  return faqs;
}
