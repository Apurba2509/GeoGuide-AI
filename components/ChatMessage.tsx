import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { Bot, User, MapPin, ExternalLink } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-emerald-600'}`}>
          {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
        </div>

        {/* Message Body */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed overflow-hidden
            ${isUser 
              ? 'bg-blue-600 text-white rounded-tr-sm' 
              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
            }`}
          >
            <ReactMarkdown 
                components={{
                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noreferrer" className="underline font-medium hover:text-blue-200" />,
                    ul: ({node, ...props}) => <ul {...props} className="list-disc pl-4 my-2" />,
                    ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-4 my-2" />,
                    p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />
                }}
            >
              {message.text}
            </ReactMarkdown>
          </div>

          {/* Sources / Citations */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.sources.map((source, idx) => (
                <a 
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                >
                  <ExternalLink size={10} />
                  <span className="truncate max-w-[150px]">{source.title}</span>
                </a>
              ))}
            </div>
          )}

          {/* Found Locations Buttons */}
          {!isUser && message.markers && message.markers.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 w-full">
               <p className="text-xs text-gray-400 font-medium ml-1">Locations found:</p>
               <div className="flex flex-wrap gap-2">
                  {message.markers.map((marker) => (
                    <button 
                      key={marker.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                      // Note: On click logic handled by parent via map state, but strictly visual here
                      onClick={() => { /* In a real app, this might dispatch an event to center the map */ }}
                    >
                      <MapPin size={12} />
                      {marker.name}
                    </button>
                  ))}
               </div>
            </div>
          )}

          <div className={`mt-1 text-xs text-gray-300 ${isUser ? 'mr-1' : 'ml-1'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;