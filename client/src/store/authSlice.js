import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const registerUser = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await api.post('/api/auth/register', userData);
            localStorage.setItem('token', response.data.token);
            return response.data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data || { error: 'Registration failed' });
        }
    }
);

export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await api.post('/api/auth/login', credentials);
            localStorage.setItem('token', response.data.token);
            return response.data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data || { error: 'Login failed' });
        }
    }
);

export const fetchCurrentUser = createAsyncThunk(
    'auth/fetchCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/api/current_user');
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { error: 'Failed to fetch user' });
        }
    }
);

export const updateInterests = createAsyncThunk(
    'auth/updateInterests',
    async (interests, { rejectWithValue }) => {
        try {
            const response = await api.post('/api/user/interests', { interests });
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { error: 'Update failed' });
        }
    }
);

// We'll update location via socket primarily, but this thunk is useful if we switch to API
export const updateLocation = createAsyncThunk(
    'auth/updateLocation',
    async ({ lat, lng }, { rejectWithValue }) => {
         // Optimistic update
         return { lat, lng };
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isAuthenticated: false,
        loading: false, // Default to false, let fetchCurrentUser set it to true if needed
        error: null
    },
    reducers: {
        setUser(state, action) {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
            state.loading = false;
        },
        logout(state) {
            state.user = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
        },
        clearError(state) {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Register
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.loading = false;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Login
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.loading = false;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch Current User
            .addCase(fetchCurrentUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.loading = false;
            })
            .addCase(fetchCurrentUser.rejected, (state, action) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.user = null;
                // Don't set error here to avoid flashing error on initial load if not logged in
            })
            // Update Interests
            .addCase(updateInterests.fulfilled, (state, action) => {
                state.user = action.payload; // Update user with new interests
            });
    }
});

export const { setUser, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
