import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const fetchCurrentUser = createAsyncThunk(
    'auth/fetchCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/api/current_user');
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response.data);
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
            return rejectWithValue(err.response.data);
        }
    }
);

// We'll update location via socket primarily, but this thunk is useful if we switch to API
export const updateLocation = createAsyncThunk(
    'auth/updateLocation',
    async ({ lat, lng }, { rejectWithValue }) => {
         // Using socket would happen in the component, but if we have an API endpoint:
         // try {
         //    await api.post('/api/user/location', { lat, lng });
         //    return { lat, lng };
         // } catch (err) { ... }

         // For now, we return the payload to update state optimistically
         return { lat, lng };
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isAuthenticated: false,
        loading: true,
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
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCurrentUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.user = action.payload || null;
                state.isAuthenticated = !!action.payload;
                state.loading = false;
            })
            .addCase(fetchCurrentUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateInterests.fulfilled, (state, action) => {
                state.user = action.payload;
            });
    }
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
