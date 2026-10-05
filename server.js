const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Your Supabase Configuration
const SUPABASE_URL = 'https://nygjosmqbfggyrfncmqc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2VlsTbHolLB8PrqsVgij_w_GasxhUTB';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. Sign In / Register Route
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (existingUser) {
            if (existingUser.password === password) {
                return res.json({ success: true, message: 'Login successful!', user: existingUser });
            } else {
                return res.status(401).json({ success: false, message: 'Incorrect password.' });
            }
        } else {
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{ email, password, xp: 0, role: 'user' }])
                .select()
                .single();

            if (insertError) throw insertError;

            return res.json({ success: true, message: 'Account created successfully!', user: newUser });
        }
    } catch (err) {
        console.error('Supabase Error:', err);
        return res.status(500).json({ success: false, message: 'Server database error.' });
    }
});

// 2. Leaderboard Route (Now includes role/badges)
app.get('/leaderboard', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('email, xp, role')
            .order('xp', { ascending: false });

        if (error) throw error;
        res.json(users || []);
    } catch (err) {
        console.error('Leaderboard Error:', err);
        res.status(500).json([]);
    }
});

// 3. Update XP Route
app.post('/update-xp', async (req, res) => {
    const { email, xpEarned } = req.body;

    try {
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('xp')
            .eq('email', email)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const newXp = (user.xp || 0) + xpEarned;

        const { error: updateError } = await supabase
            .from('users')
            .update({ xp: newXp })
            .eq('email', email);

        if (updateError) throw updateError;

        return res.json({ success: true, newXp });
    } catch (err) {
        console.error('Update XP Error:', err);
        return res.status(500).json({ success: false, message: 'Error updating XP' });
    }
});

// 4. Admin: Get all users
app.get('/admin/users', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('email, xp, role')
            .order('xp', { ascending: false });

        if (error) throw error;
        res.json(users || []);
    } catch (err) {
        console.error('Admin Fetch Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// 5. Admin: Update user role / badge
app.post('/admin/update-role', async (req, res) => {
    const { email, role } = req.body;
    try {
        const { error } = await supabase
            .from('users')
            .update({ role })
            .eq('email', email);

        if (error) throw error;
        res.json({ success: true, message: 'Role updated successfully' });
    } catch (err) {
        console.error('Update Role Error:', err);
        res.status(500).json({ success: false, message: 'Failed to update role' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} with Supabase connected!`);
});