const router = require('express').Router();
const Chat = require('../models/Chat');
const User = require('../models/User');

const requireLogin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).send({ error: 'You must log in!' });
  }
  next();
};

// Create or Get Chat
router.post('/', requireLogin, async (req, res) => {
    // participants is array of userIds
    const { participants, type, name } = req.body;

    // Add current user to participants if not there
    if (!participants.includes(req.user._id.toString())) {
        participants.push(req.user._id.toString());
    }

    try {
        if (type === 'private' && participants.length === 2) {
            // Check if chat already exists
            const existingChat = await Chat.findOne({
                type: 'private',
                participants: { $all: participants }
            }).populate('participants', 'name photo');

            if (existingChat) {
                return res.send(existingChat);
            }
        }

        const chat = new Chat({
            participants,
            type,
            name
        });
        await chat.save();
        const fullChat = await Chat.findById(chat._id).populate('participants', 'name photo');
        res.send(fullChat);

    } catch(err) {
        res.status(500).send(err);
    }
});

// Get My Chats
router.get('/', requireLogin, async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: req.user._id
        })
        .populate('participants', 'name photo')
        .sort({ updatedAt: -1 });
        res.send(chats);
    } catch(err) {
        res.status(500).send(err);
    }
});

// Send Message
router.post('/:id/messages', requireLogin, async (req, res) => {
    const { text } = req.body;
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).send("Chat not found");

        const message = {
            sender: req.user._id,
            text,
            timestamp: Date.now()
        };

        chat.messages.push(message);
        await chat.save();

        // Emit socket event to all participants
        const io = req.app.get('io');

        // Populate sender for the new message response
        const fullChat = await Chat.findById(chat._id)
            .populate('messages.sender', 'name photo');

        const newMessage = fullChat.messages[fullChat.messages.length - 1];

        chat.participants.forEach(participantId => {
            io.to(participantId.toString()).emit('new_message', {
                chatId: chat._id,
                message: newMessage
            });
        });

        res.send(newMessage);
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
});

// Get Messages for a Chat
router.get('/:id/messages', requireLogin, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id)
            .populate('messages.sender', 'name photo');
        res.send(chat.messages);
    } catch(err) {
        res.status(500).send(err);
    }
});

module.exports = router;
