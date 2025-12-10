import React, { useState, useEffect, useRef } from 'react';
import { Send, Map as MapIcon, Globe, MessageSquare, Compass, Loader2, Moon, Sun, Layers, Share2, Timer } from 'lucide-react';
import MapComponent from './components/MapComponent';
import ChatMessage from './components/ChatMessage';
import { ChatMode, Message, MapMarker, Location } from './types';
import { sendMessageToGemini } from './services/gemini';

const DEFAULT_LOCATION: Location = { lat: 37.7749, lng: -122.4194 }; // San Francisco

const App: React.FC = () => {
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm GeoGuide. I can help you find places, plan routes, or check the weather. Where would you like to start?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>(ChatMode.MAPS);
  
  // Map State
  const [userLocation, setUserLocation] = useState<Location>(DEFAULT_LOCATION);
  const [mapCenter, setMapCenter] = useState<Location>(DEFAULT_LOCATION);
  const [mapZoom, setMapZoom] = useState(13);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('street');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          setMapCenter(loc);
        },
        (error) => {
          console.warn("Geolocation denied or error:", error);
        }
      );
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsgText = inputValue;
    setInputValue('');
    setIsLoading(true);

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userMsgText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);

    try {
      const response = await sendMessageToGemini(userMsgText, mode, userLocation);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: new Date(),
        markers: response.markers,
        sources: response.sources
      };

      setMessages(prev => [...prev, botMsg]);

      // If new markers found, update map
      if (response.markers && response.markers.length > 0) {
        setMarkers(response.markers);
        // Center on the first marker (often the subject or origin)
        setMapCenter({ lat: response.markers[0].lat, lng: response.markers[0].lng });
        setMapZoom(14);
      }

    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, something went wrong. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkerClick = (marker: MapMarker) => {
    setMapCenter({ lat: marker.lat, lng: marker.lng });
    setMapZoom(16);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleShareLocation = () => {
      const url = `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`;
      if (navigator.share) {
          navigator.share({
              title: 'My Location',
              text: 'Here is my current location via GeoGuide',
              url: url
          }).catch(console.error);
      } else {
          navigator.clipboard.writeText(url);
          alert("Location link copied to clipboard!");
      }
  };

  // Extract Route Info if available
  const activeRouteInfo = markers.find(m => m.routeInfo)?.routeInfo;

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-gray-50 overflow-hidden">
      
      {/* LEFT SIDE: MAP */}
      <div className={`relative h-[40vh] md:h-full md:w-1/2 lg:w-3/5 border-b md:border-b-0 md:border-r border-gray-200 order-1 md:order-2 transition-all duration-300`}>
         <MapComponent 
            center={mapCenter} 
            zoom={mapZoom} 
            markers={markers} 
            onMarkerClick={handleMarkerClick}
            isDarkMode={isDarkMode}
            mapLayer={mapLayer}
         />
         
         {/* Route Info Overlay */}
         {activeRouteInfo && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] animate-in fade-in slide-in-from-top-4 duration-500">
                 <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-blue-100 dark:border-gray-700 flex items-center gap-3">
                     <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full text-blue-600 dark:text-blue-300">
                        <Timer size={18} />
                     </div>
                     <div>
                         <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estimated Trip</p>
                         <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{activeRouteInfo.duration}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">({activeRouteInfo.distance})</span>
                         </div>
                     </div>
                 </div>
             </div>
         )}

         {/* Floating Controls Overlay */}
         <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-3">
            {/* Mode Indicator */}
            <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md text-xs font-semibold text-gray-700 flex items-center gap-2 border border-gray-200">
               <Compass size={14} className="text-blue-500" />
               {mode === ChatMode.MAPS ? 'Live Map Mode' : mode === ChatMode.SEARCH ? 'Web Search Mode' : 'Chat Mode'}
            </div>

            <div className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl shadow-md border border-gray-200">
                {/* Share Location */}
                <button 
                    onClick={handleShareLocation}
                    className="p-2 rounded-xl bg-white text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                    title="Share My Location"
                >
                    <Share2 size={18} />
                </button>

                {/* Map Layer Toggle */}
                <button 
                    onClick={() => setMapLayer(prev => prev === 'street' ? 'satellite' : 'street')}
                    className={`p-2 rounded-xl transition-all border
                        ${mapLayer === 'satellite'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-500 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-100'
                        }`}
                    title="Toggle Satellite View"
                >
                    <Layers size={18} />
                </button>

                {/* Dark Mode Toggle */}
                <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`p-2 rounded-xl transition-all border
                        ${isDarkMode 
                            ? 'bg-gray-800 text-yellow-400 border-gray-700 hover:bg-gray-700' 
                            : 'bg-white text-gray-500 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-100'
                        }`}
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
         </div>
      </div>

      {/* RIGHT SIDE: CHAT INTERFACE */}
      <div className="flex flex-col h-[60vh] md:h-full md:w-1/2 lg:w-2/5 order-2 md:order-1 bg-white">
        
        {/* Header */}
        <header className="flex-none p-4 border-b border-gray-100 bg-white z-10">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Globe className="text-blue-600" />
            GeoGuide AI
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Powered by Gemini 2.5 Flash & 3.0 Pro
          </p>
        </header>

        {/* Mode Selector */}
        <div className="flex-none px-4 py-3 bg-gray-50 border-b border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide">
            <button 
                onClick={() => setMode(ChatMode.MAPS)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                ${mode === ChatMode.MAPS 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
            >
                <MapIcon size={16} />
                Map Grounding
            </button>
            <button 
                onClick={() => setMode(ChatMode.SEARCH)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                ${mode === ChatMode.SEARCH 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
            >
                <Globe size={16} />
                Google Search
            </button>
            <button 
                onClick={() => setMode(ChatMode.CHAT)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                ${mode === ChatMode.CHAT 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
            >
                <MessageSquare size={16} />
                Pro Chat
            </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex justify-start w-full mb-4">
               <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Thinking...</span>
               </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-none p-4 border-t border-gray-100 bg-white">
          <div className="relative flex items-center">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === ChatMode.MAPS ? "Ask for places nearby..." :
                mode === ChatMode.SEARCH ? "Search the web for news..." :
                "Ask me anything..."
              }
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none text-sm md:text-base max-h-32 min-h-[50px]"
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-400">
               Gemini can make mistakes. Check important info.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;