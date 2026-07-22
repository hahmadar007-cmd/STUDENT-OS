import React, { useState, useEffect } from 'react';
import { WidgetComponentProps } from '../../../lib/workspace/registry';
import { useWorkspace } from '../../../lib/workspace/WorkspaceContext';

interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
}

export const ChatWidget: React.FC<WidgetComponentProps> = ({ isActive }) => {
  const { state, socket } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id || Date.now().toString(),
          senderName: msg.sender?.name || 'Peer',
          content: msg.content,
        },
      ]);
    };

    socket.on('onMessage', handleNewMessage);
    return () => {
      socket.off('onMessage', handleNewMessage);
    };
  }, [socket]);

  const handleSend = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      if (socket) {
        socket.emit('sendMessage', {
          groupId: state.shared.roomId,
          content: inputValue.trim(),
          slideId: state.shared.activeStage.assetId,
        });
      } else {
        // Fallback for local testing if socket isn't connected
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            senderName: 'You (Local)',
            content: inputValue.trim(),
          },
        ]);
      }
      setInputValue('');
    }
  };

  return (
    <div className={`flex flex-col h-64 p-4 bg-fouzar-bg border border-fouzar-border rounded-xl ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      <h3 className="text-[10px] font-mono text-fouzar-accent uppercase tracking-widest mb-2 border-b border-fouzar-border pb-2 shrink-0">Chat</h3>
      <div className="flex-1 overflow-auto space-y-2 mt-2 pr-2 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-[10px] text-fouzar-text-tertiary font-mono uppercase tracking-widest flex items-center justify-center h-full">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-xs">
              <span className="text-fouzar-accent/80 font-mono tracking-wide">{msg.senderName}:</span>{' '}
              <span className="text-fouzar-text-primary">{msg.content}</span>
            </div>
          ))
        )}
      </div>
      <div className="mt-2 shrink-0 relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleSend}
          placeholder="Type a message..."
          className="w-full bg-fouzar-surface border border-white/5 rounded-lg p-2.5 text-xs text-fouzar-text-primary outline-none focus:border-fouzar-accent/50 transition-colors"
        />
      </div>
    </div>
  );
};
