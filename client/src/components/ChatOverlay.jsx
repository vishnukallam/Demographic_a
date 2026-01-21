import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, TextField, Button, IconButton, Divider, List, ListItem, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

const ChatOverlay = ({ socket, user, targetUser, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [roomId, setRoomId] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!socket || !targetUser) return;

        // Initiate Chat (if starting fresh) OR set ID (if accepting)
        if (targetUser.roomId) {
            setRoomId(targetUser.roomId);
            // Already joined via accept_chat in Map.jsx, or assume connection is good.
        } else {
            socket.emit('join_chat', targetUser.socketId);
        }

        // Listeners
        const handleChatJoined = ({ roomId }) => {
            setRoomId(roomId);
        };

        const handleReceiveMessage = (data) => {
            setMessages(prev => [...prev, data]);
        };

        socket.on('chat_joined', handleChatJoined);
        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('chat_joined', handleChatJoined);
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [socket, targetUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (input.trim() && roomId) {
            socket.emit('send_message', {
                roomId,
                message: input,
                toName: targetUser.name
            });
            // Optimistically add own message? No, wait for echo to keep sync simple or add strictly local
            // Server currently broadcasts to room, so we will receive our own message back if we are in the room.
            setInput('');
        }
    };

    return (
        <Paper sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            width: 300,
            height: 400,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: 3
        }}>
            {/* Header */}
            <Box sx={{ p: 2, bgcolor: '#1976d2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">{targetUser.name}</Typography>
                <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
                {messages.length === 0 && (
                    <Typography variant="caption" color="textSecondary" align="center" display="block">
                        Start the conversation!
                    </Typography>
                )}
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === socket.id;
                    return (
                        <Box key={idx} sx={{
                            display: 'flex',
                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                            mb: 1
                        }}>
                            <Paper sx={{
                                p: 1,
                                maxWidth: '80%',
                                bgcolor: isMe ? '#e3f2fd' : 'white',
                                borderRadius: 2
                            }}>
                                {!isMe && <Typography variant="caption" color="textSecondary" display="block">{msg.senderName}</Typography>}
                                <Typography variant="body2">{msg.text}</Typography>
                            </Paper>
                        </Box>
                    );
                })}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Box sx={{ p: 1, display: 'flex', gap: 1, bgcolor: 'white', borderTop: '1px solid #ddd' }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <IconButton color="primary" onClick={handleSend} disabled={!roomId}>
                    <SendIcon />
                </IconButton>
            </Box>
        </Paper>
    );
};

export default ChatOverlay;
