import React from 'react';
import { Avatar as MuiAvatar } from '@mui/material';

const Avatar = ({ user, sx = {}, ...props }) => {
    if (!user) return null;

    const { displayName, profilePhoto } = user;

    if (profilePhoto) {
        return <MuiAvatar src={profilePhoto} alt={displayName} sx={sx} {...props} />;
    }

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ').filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Generate a consistent color based on the name
    const stringToColor = (string) => {
        let hash = 0;
        let i;
        for (i = 0; i < string.length; i += 1) {
            hash = string.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (i = 0; i < 3; i += 1) {
            const value = (hash >> (i * 8)) & 0xff;
            color += `00${value.toString(16)}`.slice(-2);
        }
        return color;
    };

    return (
        <MuiAvatar
            sx={{
                bgcolor: stringToColor(displayName || 'User'),
                ...sx
            }}
            {...props}
        >
            {getInitials(displayName)}
        </MuiAvatar>
    );
};

export default Avatar;
