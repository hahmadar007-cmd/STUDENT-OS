---
name: testing-student-os-frontend
description: Test the Student OS frontend (Next.js) end-to-end. Use when verifying UI changes to the dashboard, AI Core, chat, or file upload features.
---

# Testing Student OS Frontend

## Environment Setup

1. Navigate to the frontend directory:
   ```bash
   cd /home/ubuntu/STUDENT-OS/frontend
   npm install
   ```

2. Start dev server with backend URL:
   ```bash
   NEXT_PUBLIC_API_URL=https://ammeeee-student-os.hf.space npm run dev
   ```
   Server runs at `http://localhost:3000`

3. The Vercel preview deployments may require Vercel SSO login. If you get redirected to `vercel.com/login`, run locally instead.

## Navigation

- **Dashboard:** `http://localhost:3000/dashboard`
- **AI Core tab:** Click the 3rd sidebar icon (Cpu icon labeled "AI Core") or press the 'A' keyboard shortcut
- **Focus Timer tab:** 1st sidebar icon or 'S' key
- **Study Nodes tab:** 2nd sidebar icon or 'G' key
- **Auth is not required** to view the dashboard UI — the page renders without login (user data shows as null)

## Key Components

- **FascaAiCore** (`frontend/components/ai/FascaAiCore.tsx`): Model selector with pills, "+ Add Your AI" button
- **IntegratedAiChat** (`frontend/components/ai/IntegratedAiChat.tsx`): Chat area with drag-and-drop, file upload, model dropdown
- **Dashboard page** (`frontend/app/dashboard/page.tsx`): Main layout with sidebar nav and tab panels

## Testing Drag-and-Drop

You cannot physically drag files from the file manager in the test environment. Use JavaScript to simulate drag events:

```javascript
// Trigger drag overlay
const chatContainer = document.querySelector('[class*="flex flex-col h-full"]');
const dt = new DataTransfer();
dt.items.add(new File(['test content'], 'test.pdf', { type: 'application/pdf' }));
const dragOverEvent = new DragEvent('dragover', {
  bubbles: true, cancelable: true, dataTransfer: dt
});
chatContainer.dispatchEvent(dragOverEvent);

// Dismiss overlay
chatContainer.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
```

## Testing File Upload (Paperclip Button)

The hidden file input accepts: `.pdf,.pptx,.txt,.md,.js,.ts,.tsx,.py,.css,.html,.cpp,.java`

Verify with:
```javascript
const fileInput = document.querySelector('input[type="file"]');
console.log('Accept:', fileInput.accept);
```

## Backend

- Backend runs on HF Spaces: `https://ammeeee-student-os.hf.space`
- Backend Vercel deployment always fails (Prisma types issue) — this is expected and pre-existing
- AI responses require `DEFAULT_GEMINI_KEY` and `DEFAULT_DEEPSEEK_KEY` secrets configured on HF Space

## Devin Secrets Needed

No secrets required for frontend-only UI testing. Backend API testing would need the HF Space to be running with the AI keys configured.
