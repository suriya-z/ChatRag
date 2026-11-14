// Decide send vs draft from the user message. One definition shared by chat and approval.
export function analyzeEmailIntent(userMessage: string): { shouldSend: boolean; confidence: number; reasoningText: string } {
  const message = userMessage.toLowerCase();

  const sendKeywords = ['send', 'email', 'immediately', 'now', 'dispatch', 'transmit', 'deliver'];
  const strongSendPhrases = ['send an email', 'send email', 'email to', 'send and email'];
  const draftKeywords = ['draft', 'prepare', 'create draft', 'make a draft', 'compose draft'];

  let sendScore = 0;
  let draftScore = 0;
  let reasoning = '';

  for (const phrase of strongSendPhrases) {
    if (message.includes(phrase)) {
      sendScore += 3;
      reasoning += `Strong send phrase: "${phrase}". `;
      break;
    }
  }

  const sendMatches = sendKeywords.filter(keyword => message.includes(keyword));
  if (sendMatches.length > 0) {
    sendScore += sendMatches.length * 2;
    reasoning += `Send keywords: ${sendMatches.join(', ')}. `;
  }

  const draftMatches = draftKeywords.filter(keyword => message.includes(keyword));
  if (draftMatches.length > 0) {
    draftScore += draftMatches.length * 2;
    reasoning += `Draft keywords: ${draftMatches.join(', ')}. `;
  }

  const totalScore = sendScore + draftScore;
  const shouldSend = sendScore > draftScore;
  const confidence = totalScore > 0 ? Math.max(sendScore, draftScore) / (totalScore + 2) : 0.1;

  return {
    shouldSend,
    confidence: Math.min(confidence, 0.95),
    reasoningText: reasoning.trim() || 'No clear indicators found'
  };
}
