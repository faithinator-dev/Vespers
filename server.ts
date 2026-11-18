import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Content, GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

interface ChatTurnInput {
  role: 'user' | 'model';
  text: string;
}

interface WritingChatRequestBody {
  message?: string;
  history?: ChatTurnInput[];
  mode?: 'companion' | 'quick';
  draftContext?: {
    title?: string;
    mood?: string;
    excerpt?: string;
    shareDraft?: boolean;
  };
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Add it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(draftContext?: WritingChatRequestBody['draftContext']): string {
  const base = [
    'You are the Vespers Writing Companion, a calm, perceptive late-night writing partner inside a personal journal app.',
    'Your ONLY role is to help the user with writing: overcoming blank-page friction, brainstorming ideas, refining prose clarity and rhythm, suggesting vivid sensory details, offering thoughtful journaling prompts, and suggesting titles or gentle structural edits.',
    'Stay strictly focused on writing craft and reflective expression. If the user asks about unrelated topics (coding, trivia, math, news, general tasks), warmly remind them that you are dedicated solely to helping with their writing and steer back to their page.',
    'Keep your tone unhurried, respectful of the writer’s authentic voice, and concise (typically 2–5 sentences or a few crisp options unless the user asks for a longer rewrite).',
    'When offering rewritten lines or paragraphs that the user might insert into their journal, present the suggested prose cleanly without meta-commentary clutter.',
  ];

  if (draftContext?.shareDraft) {
    const parts: string[] = [];
    if (draftContext.mood) parts.push(`Mood: ${draftContext.mood}`);
    if (draftContext.title) parts.push(`Draft title: "${draftContext.title}"`);
    if (draftContext.excerpt) {
      parts.push(`Current draft excerpt:\n"""\n${draftContext.excerpt.slice(0, 4000)}\n"""`);
    }
    if (parts.length > 0) {
      base.push(`Context from the writer's open page:\n${parts.join('\n')}`);
    }
  }

  return base.join('\n\n');
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/writing-chat', async (req: Request, res: Response) => {
    try {
      const body = req.body as WritingChatRequestBody;
      const message = typeof body?.message === 'string' ? body.message.trim() : '';
      if (!message) {
        res.status(400).json({ error: 'Please enter a writing question or request.' });
        return;
      }
      if (message.length > 4000) {
        res.status(400).json({ error: 'Message is too long (max 4,000 characters).' });
        return;
      }

      const model =
        body.mode === 'quick' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

      const rawHistory = Array.isArray(body.history) ? body.history : [];
      const history: Content[] = rawHistory
        .filter(
          (item): item is ChatTurnInput =>
            Boolean(item) &&
            (item.role === 'user' || item.role === 'model') &&
            typeof item.text === 'string' &&
            item.text.trim().length > 0,
        )
        .slice(-24)
        .map((item) => ({
          role: item.role,
          parts: [{ text: item.text.slice(0, 6000) }],
        }));

      const ai = getGeminiClient();
      const chat = ai.chats.create({
        model,
        history,
        config: {
          systemInstruction: buildSystemInstruction(body.draftContext),
        },
      });

      const response = await chat.sendMessage({ message });
      const replyText = (response.text ?? '').trim();

      if (!replyText) {
        res.status(502).json({ error: 'The writing companion returned an empty response.' });
        return;
      }

      res.json({
        reply: replyText,
        model,
      });
    } catch (error) {
      console.error('Gemini writing-chat error:', error);
      const msg =
        error instanceof Error
          ? error.message
          : 'Unable to reach the writing companion right now.';
      const status = msg.includes('GEMINI_API_KEY') ? 500 : 502;
      res.status(status).json({ error: msg });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vespers server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
