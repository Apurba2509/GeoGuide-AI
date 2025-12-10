import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, MapMarker } from '../types';
import { Bot, User, MapPin, ExternalLink, Navigation, Star } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const getMarkerIcon = (type?: string) => {
    switch(type) {
        case 'origin': return <div className="w-2 h-2 rounded-full bg-green-500" />;
        case 'destination': return <div className="w-2 h-2 rounded-full bg-red-500" />;
        case 'poi': return <Star size={12} className="text-purple-600" />;
        default: return <MapPin size={12} />;
    }
  };

  const getMarkerStyle = (type?: string) => {
      switch(type) {
          case 'origin': return 'bg-green-50 border-green-200 text-green-700';
          case 'destination': return 'bg-red-50 border-red-200 text-red-700';
          case 'poi': return 'bg-purple-50 border-purple-200 text-purple-700';
          default: return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      }
  };

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
               <div className="flex items-center gap-1 mb-1">
                   {message.markers.some(m => m.type === 'origin' || m.type === 'destination') 
                      ? <Navigation size={12} className="text-blue-500" />
                      : <MapPin size={12} className="text-gray-400" />
                   }
                   <p className="text-xs text-gray-400 font-medium">
                       {message.markers.some(m => m.type === 'origin') ? 'Route & Locations:' : 'Locations found:'}
                   </p>
               </div>
               <div className="flex flex-wrap gap-2">
                  {message.markers.map((marker) => (
                    <button 
                      key={marker.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:brightness-95 transition-all ${getMarkerStyle(marker.type)}`}
                      onClick={() => { /* Handled by parent */ }}
                    >
                      {getMarkerIcon(marker.type)}
                      <span className="truncate max-w-[120px]">{marker.name}</span>
                      {marker.distance && (
                          <span className="opacity-70 text-[10px] ml-1 pl-1 border-l border-current">
                              {marker.distance}
                          </span>
                      )}
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