'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConversationStore } from '@/stores/useConversationStore';

/**
 * Global keyboard shortcuts:
 *  Ctrl+N / Cmd+N  — start a new chat
 *  Ctrl+/ / Cmd+/  — focus the chat input
 */
export function useKeyboardShortcuts(chatInputId?: string) {
  const router = useRouter();
  const { setActiveConversation } = useConversationStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === 'n' || e.key === 'N') {
        // Prevent browser's default "new window" action on some OSes
        e.preventDefault();
        setActiveConversation(undefined);
        router.push('/');
      }

      if (e.key === '/') {
        e.preventDefault();
        const input = document.getElementById(chatInputId ?? 'input-yes');
        if (input) {
          input.focus();
          // Move cursor to end
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(input);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, setActiveConversation, chatInputId]);
}
