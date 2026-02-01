import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Send, Loader2, Upload } from 'lucide-react';
import api from '@/services/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const AIChatPage: React.FC = () => {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Add welcome message
        setMessages([
            {
                role: 'assistant',
                content: `Hi ${user?.firstName || 'there'}! 👋 I'm your AI tutor. I can help you with homework, explain concepts, generate practice questions, and more. What would you like to learn today?`,
                timestamp: new Date(),
            },
        ]);
    }, [user]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || loading) return;

        const userMessage: Message = {
            role: 'user',
            content: inputMessage,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        setLoading(true);

        try {
            const response = await api.post(
                '/ai/chat',
                {
                    message: inputMessage,
                    conversationId,
                }
            );

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.data.reply,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setConversationId(response.data.conversationId);
        } catch (error: any) {
            console.error('AI Chat error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: error.response?.data?.error || 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            if (conversationId) {
                formData.append('conversationId', conversationId);
            }

            const response = await api.post('/ai/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const userMessage: Message = {
                role: 'user',
                content: `📎 Uploaded: ${file.name}`,
                timestamp: new Date(),
            };

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.data.reply,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage, assistantMessage]);
            setConversationId(response.data.conversationId);
        } catch (error: any) {
            console.error('File upload error:', error);
            alert(error.response?.data?.error || 'Failed to upload file');
        } finally {
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-8rem)]">
            <Card className="h-full flex flex-col">
                <div className="p-4 border-b bg-gradient-to-r from-brand-blue to-blue-600">
                    <h1 className="text-2xl font-bold text-white">AI Tutor 🤖</h1>
                    <p className="text-blue-100 text-sm">Ask me anything about your studies!</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] p-3 rounded-lg ${message.role === 'user'
                                        ? 'bg-brand-blue text-white'
                                        : 'bg-gray-100 text-gray-900'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{message.content}</p>
                                <span className="text-xs opacity-70 mt-1 block">
                                    {message.timestamp.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 p-3 rounded-lg">
                                <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t bg-gray-50">
                    <div className="flex items-center space-x-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            title="Upload file or image"
                        >
                            <Upload className="w-4 h-4" />
                        </Button>
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your question here..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            disabled={loading}
                        />
                        <Button
                            variant="primary"
                            onClick={handleSendMessage}
                            disabled={loading || !inputMessage.trim()}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        💡 Try asking me to explain a concept, solve a problem, or generate practice questions!
                    </p>
                </div>
            </Card>
        </div>
    );
};
