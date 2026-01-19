import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';
import { Box, List, ListItem, ListItemText, ListItemAvatar, Avatar, TextField, Button, Paper, Typography, Divider, ListItemButton } from '@mui/material';

const Chat = () => {
    const { user } = useContext(AuthContext);
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const socketRef = useRef();
    const messagesEndRef = useRef(null);

    useEffect(() => {
        socketRef.current = io('http://localhost:3000');
        socketRef.current.emit('join', user._id);

        socketRef.current.on('new_message', (data) => {
            // Update messages if chat is active
            if (activeChat && activeChat._id === data.chatId) {
                setMessages(prev => [...prev, data.message]);
            }
            // Update last message in chat list
            setChats(prev => prev.map(c => {
                if (c._id === data.chatId) {
                    // Update the last message preview
                    const updatedMessages = c.messages ? [...c.messages] : [];
                    updatedMessages.push(data.message);
                    return { ...c, messages: updatedMessages, updatedAt: new Date().toISOString() };
                }
                return c;
            }).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
        });

        return () => socketRef.current.disconnect();
    }, [user, activeChat]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await axios.get('/api/chats');
                setChats(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchChats();
    }, []);

    useEffect(() => {
        if (activeChat) {
            const fetchMessages = async () => {
                try {
                    const res = await axios.get(`/api/chats/${activeChat._id}/messages`);
                    setMessages(res.data);
                } catch(err) {
                    console.error(err);
                }
            };
            fetchMessages();
        }
    }, [activeChat]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || !activeChat) return;
        try {
            await axios.post(`/api/chats/${activeChat._id}/messages`, { text: newMessage });
            setNewMessage('');
        } catch(err) {
            console.error(err);
        }
    };

    const getChatName = (chat) => {
        if (chat.type === 'group') return chat.name;
        // Private: Find other user
        const other = chat.participants.find(p => p._id !== user._id);
        return other ? other.name : 'Unknown';
    };

    return (
        <Box sx={{ display: 'flex', height: '80vh', gap: 2, p: 2 }}>
            <Paper sx={{ width: '30%', overflow: 'auto' }}>
                <List>
                    {chats.map(chat => (
                        <React.Fragment key={chat._id}>
                            <ListItemButton onClick={() => setActiveChat(chat)} selected={activeChat?._id === chat._id}>
                                <ListItemAvatar>
                                    <Avatar>{getChatName(chat)[0]}</Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={getChatName(chat)}
                                    secondary={chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : 'No messages yet'}
                                    primaryTypographyProps={{ noWrap: true }}
                                    secondaryTypographyProps={{ noWrap: true }}
                                />
                            </ListItemButton>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            </Paper>

            <Paper sx={{ width: '70%', display: 'flex', flexDirection: 'column', p: 2 }}>
                {activeChat ? (
                    <>
                        <Typography variant="h6" gutterBottom>{getChatName(activeChat)}</Typography>
                        <Divider />
                        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
                            {messages.map((msg, idx) => (
                                <Box key={idx} sx={{
                                    display: 'flex',
                                    justifyContent: msg.sender._id === user._id ? 'flex-end' : 'flex-start',
                                    mb: 1
                                }}>
                                    <Paper sx={{
                                        p: 1,
                                        bgcolor: msg.sender._id === user._id ? '#1976d2' : '#f0f0f0',
                                        color: msg.sender._id === user._id ? 'white' : 'black'
                                    }}>
                                        <Typography variant="body1">{msg.text}</Typography>
                                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', opacity: 0.7 }}>
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </Typography>
                                    </Paper>
                                </Box>
                            ))}
                            <div ref={messagesEndRef} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message..."
                            />
                            <Button variant="contained" onClick={handleSend}>Send</Button>
                        </Box>
                    </>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" color="textSecondary">Select a chat to start messaging</Typography>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default Chat;
